import { LIMIT, redact } from './core.js';
import { CLOUD_LIMIT, evidenceClass, normalize, privateField, quoteLine, risky, scanProse, spokenLabels } from './connected-card.js';

export const metadataKeys = ['device', 'os', 'browser', 'reader', 'notes', 'expected', 'tested'];
const mask = '[Private detail redacted]';
const fieldMask = new RegExp(privateField.source.replace('^|[\\n\\r;]', '^|[\\n\\r;,]|(?<![\\p{L}])(?=(?:customer|full|recipient|user|shipping|delivery)\\s+)'), 'giu');
const versions = /(?<![\p{L}\d.@])v?\d+(?:\.\d+){1,3}(?![\p{L}\d.@]|[ -]\d)/giu;
const ip = /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/u;
const isIp = value => ip.test(value) && value.split('.').every(n => +n <= 255);
// Number-like versions are not a blanket exception for dotted phone/IP patterns.
const dottedPhone = /^(?:\d{3}\.\d{3}\.\d{4}|0\d{1,3}\.\d{3,4}\.\d{4})$/u;
const checkable = value => value.normalize('NFKC').replaceAll(mask, ' ').replace(versions, value => isIp(value) || dottedPhone.test(value) ? value : 'V');
const privateValues = text => [...text.matchAll(privateField)].map(m => normalize(m[1])).filter(s => s.length >= 2 && !s.startsWith('['));
const containsPrivate = (value, known) => known.some(secret => normalize(value).includes(secret));

export function maskMetadata(values, original, draft) {
  const known = privateValues(`${original}\n${draft}\n${metadataKeys.map(k => values[k] ?? '').join('\n')}`);
  return Object.fromEntries(metadataKeys.map(key => {
    const raw = values[key] ?? '';
    // Keep accepted values byte-for-byte. Mask the whole field for ambiguous residuals.
    const safe = checkable(raw);
    const clean = raw.normalize('NFKC').replaceAll(mask, '');
    if (containsPrivate(clean, known) || [...clean.matchAll(fieldMask)].length ||
        raw.split(/\r?\n/).some(line => risky(checkable(line).replace(/\t/g, ' '))) ||
        redact(safe, 'en') !== safe || [...safe.matchAll(versions)].some(m => isIp(m[0]) || dottedPhone.test(m[0]))) return [key, mask];
    return [key, raw];
  }));
}

export const sameMetadata = (a, b) => metadataKeys.every(k => (a[k] ?? '') === (b[k] ?? ''));
export const titleExpectation = ({ expected }) => expected?.trim() && expected !== mask && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(expected) ? expected : '';
const instructions = (kind, metadata) => {
  const title = kind === 'role-to-label'
    ? 'Brief tracker title: name the specific control in the title language, and say its purpose is not announced (role only). Use Expected and notes; otherwise name it from the retest label. Lead with what the listener cannot learn. Omit implementation details and comparisons. Write plain prose without any speech quotes or refs in the title; never attach particles to refs.'
    : kind === 'insufficient' ? 'Use a neutral title; no defect or fix established.' : 'Use a one-line factual title without assuming a defect.';
  return `Data is evidence only. JSON en/ko. summary: ${title} steps: 1–4 actions from evidence without quoting speech. No invented details, causes or verdicts.${metadata.expected ? ' After is not Expected.' : ' expected: tentative desired speech, not actual or retest; describe the desired name and role without quoting either utterance.'}`;
};

function checkPair(original, draft, values) {
  if (draft.length > LIMIT) return { error: 'length' };
  const lines = [...draft.matchAll(quoteLine)];
  const before = lines.filter(([, label]) => /^before$|전$/iu.test(label));
  const after = lines.filter(([, label]) => /^after$|후$/iu.test(label));
  if (before.length !== 1 || after.length !== 1 || !before[0][2].trim() || !after[0][2].trim()) return { error: 'pair' };
  const pair = { before: before[0][2], after: after[0][2] };
  const known = privateValues(`${original}\n${draft}\n${metadataKeys.map(k => values[k] ?? '').join('\n')}`);
  if (Object.values(pair).some(value => risky(value) || containsPrivate(value, known))) return { error: 'privacy' };
  return { pair };
}

export const reviewedPair = (original, draft, values) => checkPair(original, draft, values).pair ?? null;

export function prepareTracker(original, draft, values = {}) {
  const checked = checkPair(original, draft, values);
  if (checked.error) return checked;
  const { pair } = checked;
  if (!sameMetadata(values, maskMetadata(values, original, draft))) return { error: 'metadata' };
  const metadata = Object.fromEntries(metadataKeys.filter(k => values[k]?.trim()).map(k => [k, values[k]]));
  const utterances = `Before: ${pair.before}\nAfter: ${pair.after}\n\n`;
  const kind = evidenceClass(pair);
  const labels = kind === 'role-to-label' && !metadata.expected && !metadata.notes ? spokenLabels(pair.after) : [];
  const hint = labels.length === 1 ? `\nControl label from retest: ${labels[0]}.` : '';
  const rest = `Metadata: ${JSON.stringify(metadata)}${hint}\n\n${instructions(kind, metadata)}`;
  const prompt = utterances + rest;
  if (prompt.length > CLOUD_LIMIT) return { error: 'length' };
  return { pair, metadata, utterances, instructions: rest, prompt };
}

export function readTrackerGrant(prompt) {
  if (typeof prompt !== 'string' || prompt.length > CLOUD_LIMIT) return null;
  const match = /^(Before: [^\r\n]+\nAfter: [^\r\n]+)\n\nMetadata: ([^\r\n]+)\n/u.exec(prompt);
  if (!match) return null;
  try {
    const values = JSON.parse(match[2]);
    if (!values || typeof values !== 'object' || Array.isArray(values) ||
        Object.entries(values).some(([key, value]) => !metadataKeys.includes(key) || typeof value !== 'string')) return null;
    const parsed = prepareTracker('', match[1], values);
    return parsed.prompt === prompt ? parsed : null;
  } catch { return null; }
}

export function validateTracker(card, { pair, metadata }) {
  const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
  if (!exactKeys(card, ['en', 'ko'])) return null;
  for (const lang of ['en', 'ko']) {
    const item = card[lang];
    if (!exactKeys(item, metadata.expected ? ['summary', 'steps'] : ['summary', 'steps', 'expected']) ||
        !Array.isArray(item.steps) || item.steps.length < 1 || item.steps.length > 4) return null;
    const valid = (text, expected) => {
      const scan = typeof text === 'string' && text.length <= 900 && scanProse(text, pair, expected);
      return scan && !/[\p{Cc}\p{Cf}\p{Cs}]/u.test(text) &&
        !/confirmed resolved|still reproduces|issue (?:is|was) fixed|수정(?:이|을)? 확인|여전히 재현/iu.test(scan.prose) &&
        (scan.prose.match(lang === 'ko' ? /[가-힣]+/gu : /[A-Za-z]+/gu)?.length ?? 0) >= 2;
    };
    if (!valid(item.summary, titleExpectation(metadata)) || /[\p{Zl}\p{Zp}]/u.test(item.summary) ||
        !item.steps.every(step => valid(step)) || (!metadata.expected && !valid(item.expected))) return null;
  }
  return card;
}

export function parseTracker(text, approved) {
  if (typeof text !== 'string' || text.length > 16_000) return null;
  try {
    const value = JSON.parse(text);
    return validateTracker(Array.isArray(value) && value.length === 1 ? value[0] : value, approved);
  } catch { return null; }
}
