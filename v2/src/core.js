export const LIMIT = 8000;
export const SAMPLE = `수정 전: 버튼
수정 후: 배송지 변경, 버튼
연락처: 010-0000-0000
이메일: replay@example.invalid
금액: 12,300원
주소: 서울특별시 가상구 예시로 123, 101호`;
export const EN_SAMPLE = `Before: Button
After: Change shipping address, button
Customer name: Avery Example
Phone: (202) 555-0100
Email: replay@example.invalid
Total: $12.30
Address: 101 Sample Street`;

// This is an explicit opt-in plus a conservative character check, not language
// detection. Uncertain or mixed scripts stay on the manual path.
export function canUseEnglishModel(language, text) {
  return language === 'en' && /[A-Za-z]/.test(text) && !/[^\t\n\r\x20-\x7e\u00a0£€‘’“”–—…]/u.test(text);
}

// Heuristics only. Process labeled addresses first so their contents are not split.
const patterns = [
  ['주소', /(^|\n)([ \t]*(?:(?:배송지|수령지)[ \t]*)?주소[ \t]*[:：][ \t]*)(?![ \t]*\[주소 가림\][ \t]*$)([^\r\n]+)/gmu, '$1$2'],
  ['주소', /(?:[가-힣\d·]+(?:대로|로|길)|[가-힣\d]+(?:동|리|가|읍|면))[ \t]+\d+(?:-\d+)?(?:[ \t,]+(?:\d+[ \t]*(?:층|동|호)|지하[ \t]*\d+))*/gu, ''],
  ['주소', /(^|\n)([ \t]*(?:(?:shipping|delivery|mailing)[ \t]+)?address[ \t]*[:：][ \t]*)(?![ \t]*\[(?:주소 가림|Address redacted|추가 가림|Additional redaction)\][ \t]*\r?$)([^\r\n]+)/gimu, '$1$2'],
  ['이메일', /[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}\-]+(?:\.[\p{L}\p{N}\-]+)+/gu, ''],
  ['전화번호', /(?<![\d\p{Nd}])(?:\+82[ .\-]?(?:\(0\))?(?:10|1[16789]|2|[3-6][1-5]|70|50[2-8])|0(?:1[016789]|2|[3-6][1-5]|70|50[2-8]))[ .\-]?\d{3,4}[ .\-]?\d{4}(?!\d)|(?<!\d)1[568]\d{2}[- .]?\d{4}(?!\d)/gu, ''],
  ['전화번호', /(?<![\d(])(?:\+1[ .-]?)?(?:\([2-9]\d{2}\)[ .-]?|[2-9]\d{2}[ .-])\d{3}[ .-]\d{4}(?!\d)/gu, ''],
  ['금액', /(?:[₩$€£][ \t]*[\d０-９]+(?:[,\.][\d０-９]+)*|[\d０-９]+(?:[,\.][\d０-９]+)*[ \t]*(?:(?:억|만|천|백)[ \t]*)?(?:원|달러|유로|KRW|USD|EUR))/giu, ''],
];
// Extend an unlabeled road/lot match backwards over common administrative units.
patterns[1][1] = new RegExp(`(?:(?:[가-힣]+(?:특별자치시|특별자치도|특별시|광역시|시|군|구|도|읍|면|동|리))[ \\t]+){0,4}${patterns[1][1].source}`, 'gu');

const englishKinds = { 주소: 'Address', 이메일: 'Email', 전화번호: 'Phone', 금액: 'Amount' };

export function redact(text, language) {
  return patterns.reduce((value, [kind, expression, prefix]) => {
    const marker = language === 'en' ? `[${englishKinds[kind]} redacted]` : `[${kind} 가림]`;
    return value.replace(expression, prefix + marker);
  }, text);
}

export function compare(text) {
  for (const [start, end] of [
    [/^[ \t]*수정[ \t]*전[ \t]*[:：][ \t]*(.+)$/m, /^[ \t]*수정[ \t]*후[ \t]*[:：][ \t]*(.+)$/m],
    [/^[ \t]*before[ \t]*:[ \t]*(.+)$/im, /^[ \t]*after[ \t]*:[ \t]*(.+)$/im],
  ]) {
    const before = text.match(start)?.[1].trim();
    const after = text.match(end)?.[1].trim();
    if (before && after) return { before, after };
  }
  return null;
}

export function applySuggestion(draft, candidates, language) {
  // Build offsets against the original; never redact generated markers or insert model text.
  const spans = [];
  const markers = Array.from(draft.matchAll(/\[(?:(?:전화번호|이메일|금액|주소|추가) 가림|(?:Phone|Email|Amount|Address) redacted|Additional redaction)\]/gu), match => [match.index, match.index + match[0].length]);
  for (const candidate of candidates.slice(0, 20)) {
    const text = candidate?.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 160 || /[\[\]\r\n]/u.test(text)) continue;
    for (let i = draft.indexOf(text); i !== -1; i = draft.indexOf(text, i + text.length)) {
      if (!markers.some(([start, end]) => i < end && i + text.length > start)) spans.push([i, i + text.length]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && span[0] < last[1]) last[1] = Math.max(span[1], last[1]);
    else merged.push(span);
  }
  let end = 0;
  let result = '';
  for (const [start, stop] of merged) {
    result += draft.slice(end, start) + (language === 'en' ? '[Additional redaction]' : '[추가 가림]');
    end = stop;
  }
  return result + draft.slice(end);
}

export function makeReview() {
  let snapshot = null;
  return {
    approve(text) {
      snapshot = text.trim() ? text : null;
      return snapshot !== null;
    },
    revoke() { snapshot = null; },
    get(text) { return snapshot === text ? snapshot : null; },
  };
}
