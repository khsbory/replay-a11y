import { contentLanguage, setStatus } from './ui-locale.js';
import { evidenceClass, neutralAssessment, normalize, scanProse } from './connected-card.js';
import { chromiumCase } from './chromium-case.js';
import { sameMetadata } from './tracker-cloud.js';

const labels = {
  en: {
    title: 'English', headings: ['Summary', 'Environment', 'Steps to reproduce', 'Expected result', 'Actual result', 'Fix verification'],
    env: ['Device', 'OS', 'Browser / WebView', 'Screen reader'], missing: 'Not provided',
    actual: 'Original announcement (before)', after: 'Retest announcement (after)', tested: 'Tested version', reply: 'Draft tracker reply',
    suggest: 'AI suggestion', neutral: 'This comparison alone does not establish a defect or a fix.',
    summary: 'The recording compares two screen reader announcements.',
    naming: 'The original announcement contains only the role; the later announcement includes additional wording.',
    absent: 'No complete before / after pair was provided.', notes: 'Tester notes',
    steps: ['Use the recorded screen reader and settings, if available.', 'Repeat the documented action on the same control and listen without activating it when testing focus.'],
    resolved: v => `Confirmed resolved in ${v}.`, persists: v => `Still reproduces in ${v}.`,
    pending: v => `Retested in ${v}; resolution not established.`, unversioned: 'Retest version not provided; resolution not established.',
  },
  ko: {
    title: '한국어', headings: ['요약', '환경', '재현 절차', '예상 결과', '실제 결과', '수정 검증'],
    env: ['기기', '운영체제', '브라우저 / WebView', '스크린 리더'], missing: '제공되지 않음',
    actual: '원래 낭독 (수정 전)', after: '재검증 낭독 (수정 후)', tested: '테스트 버전', reply: '이슈 답글 초안',
    suggest: 'AI 제안', neutral: '이 비교만으로는 결함이나 수정 여부를 확인할 수 없습니다.',
    summary: '스크린 리더의 두 낭독을 비교한 기록입니다.',
    naming: '원래 낭독에는 역할만 있고, 이후 낭독에는 추가 문구가 있습니다.',
    absent: '수정 전·후 낭독이 모두 제공되지는 않았습니다.', notes: '테스터 메모',
    steps: ['기록된 스크린 리더와 설정이 있으면 그대로 사용합니다.', '같은 컨트롤에서 기록된 동작을 반복합니다. 초점 테스트라면 실행하지 않고 낭독을 듣습니다.'],
    resolved: v => `${v}에서 수정된 것을 확인했습니다.`, persists: v => `${v}에서 여전히 재현됩니다.`,
    pending: v => `${v}에서 재검증했으나 수정 여부는 확인되지 않았습니다.`, unversioned: '테스트 버전이 제공되지 않아 수정 여부를 확인할 수 없습니다.',
  },
};

const fieldKeys = ['device', 'os', 'browser', 'reader'];
const hasValue = value => value?.trim() && value !== '[Private detail redacted]';
const literal = (text, lang = contentLanguage(text)) => ({ text, lang });
const quote = text => literal(`“${text}”`, contentLanguage(text));
const prose = (text, pair) => {
  let start = 0;
  const parts = [];
  for (const ref of scanProse(text, pair).references) {
    parts.push(text.slice(start, ref.start), quote(pair[ref.key]));
    start = ref.end;
  }
  return [...parts, text.slice(start)];
};

export function trackerModel(pair, fields, { generated, outcome, sample = false, delivery = false } = {}) {
  const real = sample && pair?.before === chromiumCase.pair.before && pair.after === chromiumCase.pair.after;
  const verifiedSample = real && sameMetadata(fields, chromiumCase.fields);
  const kind = pair && evidenceClass(pair);
  const neutral = !pair || Boolean(neutralAssessment(pair));
  const version = hasValue(fields.tested) ? fields.tested : null;
  const equal = pair && normalize(pair.before) === normalize(pair.after);
  // The model never owns verdicts. A tester must report an outcome, with evidence
  // and a version. An ordinary state comparison cannot establish a fix.
  const resolved = version && pair && !neutral && ((verifiedSample && !outcome) || (outcome === 'met' && hasValue(fields.expected)));
  const persists = version && equal && outcome === 'same';
  return ['en', 'ko'].map(lang => {
    const l = labels[lang], ai = generated?.[lang], sampleText = real ? chromiumCase[lang] : null;
    const value = key => fields[key]?.trim() ? literal(fields[key]) : l.missing;
    const summary = sampleText?.summary ?? (!pair ? l.absent : kind === 'role-to-label' ? l.naming : l.summary);
    const verification = resolved ? l.resolved(version) : persists ? l.persists(version) : version ? l.pending(version) : l.unversioned;
    const deliverySteps = lang === 'en' ? ['Focus the delivery address control with a screen reader. Listen without activating it.'] : ['스크린 리더로 배송지 변경 컨트롤에 초점을 맞추고 실행하지 않은 채 낭독을 듣습니다.'];
    return { lang, title: l.title, sections: [
      [l.headings[0], [ai ? prose(ai.summary, pair) : [summary], ...(fields.notes?.trim() ? [[`${l.notes}: `, value('notes')]] : []),
        ...(real ? [[{ text: 'Chromium 542033685', href: chromiumCase.source }]] : [])]],
      [l.headings[1], fieldKeys.map((key, i) => [`${l.env[i]}: `, value(key)])],
      [l.headings[2], [], ai ? ai.steps.map(step => prose(step, pair)) : (sampleText?.steps ?? (delivery ? deliverySteps : l.steps)).map(step => [step])],
      [l.headings[3], [fields.expected?.trim() ? [value('expected')] : ai ? [`${l.suggest}: `, ...prose(ai.expected, pair)] : [l.missing]]],
      [l.headings[4], pair ? [[`${l.actual}: `, { ...quote(pair.before), evidence: 'before' }], ...(real ? [[sampleText.provenance]] : [])] : [[l.missing]]],
      [l.headings[5], [[`${l.tested}: `, value('tested')], ...(pair ? [[`${l.after}: `, { ...quote(pair.after), evidence: 'after' }]] : []),
        ...(neutral ? [[l.neutral]] : []), ...(real ? [[sampleText.history]] : []),
        [`${l.reply}: `, verification, ...(pair ? [` ${l.after}: `, quote(pair.after)] : []), ...(real ? [` ${sampleText.provenance}`] : [])]]],
    ] };
  });
}

const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
};
const render = (tag, parts) => {
  const element = node(tag);
  for (const part of parts) {
    if (typeof part === 'string') element.append(part);
    else {
      const child = node(part.href ? 'a' : 'span', part.text);
      if (part.href) { child.href = part.href; child.rel = 'noreferrer'; }
      if (part.lang) child.lang = part.lang;
      if (part.evidence) child.dataset.evidence = part.evidence;
      element.append(child);
    }
  }
  return element;
};

// Treat all field/prose characters as literal text, including CommonMark and
// tracker extensions; retain the same heading/list/link structure as the card.
const escape = text => text.replace(/[\\`*_{}\[\]()#+!<>|~&-]/gu, '\\$&').replace(/^([ \t]*\d{1,9})\.(?=[ \t]|$)/gm, '$1\\.').replace(/\r?\n/g, '  \n');
const markdown = parts => parts.map(p => typeof p === 'string' ? escape(p) : p.href ? `[${escape(p.text)}](${p.href})` : escape(p.text)).join('');
export const toMarkdown = model => model.map(({ title, sections }) => [
  `### ${title}`,
  ...sections.map(([heading, paragraphs, steps]) => [`#### ${heading}`, ...paragraphs.map(markdown),
    ...(steps ? [steps.map((step, i) => `${i + 1}. ${markdown(step)}`).join('\n')] : [])].join('\n\n')),
].join('\n\n')).join('\n\n') + '\n';

export function renderTracker(target, model) {
  target.replaceChildren(...model.map(({ lang, title, sections }) => {
    const article = node('article');
    article.lang = lang;
    article.append(node('h3', title));
    for (const [heading, paragraphs, steps] of sections) {
      article.append(node('h4', heading), ...paragraphs.map(parts => render('p', parts)));
      if (steps) {
        const list = node('ol');
        list.append(...steps.map(parts => render('li', parts)));
        article.append(list);
      }
    }
    return article;
  }));
}

export function cardOutput(target, button, status) {
  let model = null;
  button.addEventListener('click', async event => {
    if (!event.isTrusted || !model) return;
    const reviewed = model;
    let message;
    try {
      await navigator.clipboard.writeText(toMarkdown(reviewed));
      message = ['Tracker card copied as Markdown.', '이슈 카드를 Markdown으로 복사했습니다.'];
    } catch { message = ['Could not copy the tracker card.', '이슈 카드를 복사하지 못했습니다.']; }
    if (model === reviewed) setStatus(status, message);
  });
  return next => {
    model = next;
    setStatus(status);
    if (model) renderTracker(target, model);
    else target.replaceChildren();
  };
}
