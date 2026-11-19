import { neutralAssessment } from './connected-card.js';

// Only reviewed utterances are inserted as text. All narrative is vetted copy.
export { DELIVERY_OBSERVATIONS } from './core.js';
export const CLOUD_FIXES = Object.freeze(['visible_label', 'programmatic_name']);

const copy = {
  en: {
    language: 'English', observed: 'Observed', before: 'Before', after: 'After',
    impact: 'User impact', retest: 'Retest steps', fix: 'Possible fix',
    missing: 'No complete, safe-to-display before/after pair is available. Review the draft and supply both utterances.',
    impacts: {
      delivery: 'Hearing only the role does not tell screen reader users what the button does. The after announcement identifies the action before activation.',
      generic: 'A change in the announcement can affect whether screen reader users can identify the control and predict its action before activating it.',
      missing: 'Without both announcements, the effect on screen reader users cannot be assessed from this comparison.',
    },
    steps: [
      'Use the same screen reader, language, and settings on the before and after versions.',
      'Navigate to the same control with the screen reader and record the full announcement in each version.',
      'Compare both recordings. Verify that the after announcement identifies the intended action and includes the correct role.',
    ],
    deliveryStep: 'Open the before and after delivery pages and focus the delivery button with the screen reader. Record the full announcement on each page.',
    uncertainty: 'The cause cannot be confirmed from the log alone.',
    fixes: {
      missing: 'No fix is justified without a complete comparison.',
      visible_label: 'Inspect the button’s computed name and role. If the name is missing or unclear, give the button a descriptive visible label that supplies its accessible name.',
      programmatic_name: 'Inspect the button’s computed name and role. If the button is icon-only and lacks a useful name, provide a descriptive accessible name that matches its action.',
      generic: 'Inspect the control’s computed accessible name and role. If the name is missing or unclear, give it a descriptive name that matches its action.',
    },
  },
  ko: {
    language: '한국어', observed: '관찰 결과', before: '수정 전', after: '수정 후',
    impact: '사용자 영향', retest: '재검증 절차', fix: '가능한 수정',
    missing: '카드에 표시할 수 있는 수정 전·후 낭독 문구가 모두 갖춰지지 않았습니다. 초안을 확인한 뒤 두 문구를 입력하세요.',
    impacts: {
      delivery: '역할만 들으면 스크린리더 사용자는 버튼의 기능을 알기 어렵습니다. 수정 후에는 버튼을 누르기 전에 어떤 동작을 하는지 알 수 있습니다.',
      generic: '낭독 문구가 바뀌면 스크린리더 사용자가 컨트롤을 식별하고 실행 전에 어떤 동작을 할지 예상하는 데 영향을 줄 수 있습니다.',
      missing: '두 낭독 문구가 모두 없으면 이 비교만으로 스크린리더 사용자에게 미치는 영향을 판단할 수 없습니다.',
    },
    steps: [
      '수정 전·후 버전에서 같은 스크린리더, 언어 및 설정을 사용합니다.',
      '스크린리더로 같은 컨트롤에 초점을 옮기고 각 버전의 전체 낭독 문구를 기록합니다.',
      '두 기록을 비교합니다. 수정 후 문구가 의도한 동작을 설명하고 올바른 역할을 포함하는지 확인합니다.',
    ],
    deliveryStep: '수정 전·후 배송 페이지를 열고 스크린리더로 배송지 변경 버튼에 초점을 옮깁니다. 두 페이지의 전체 낭독 문구를 기록합니다.',
    uncertainty: '로그만으로는 원인을 확인할 수 없습니다.',
    fixes: {
      missing: '낭독 비교가 완전하지 않아 수정을 제안할 수 없습니다.',
      visible_label: '버튼에 실제로 적용된 접근 가능한 이름과 역할을 확인합니다. 이름이 없거나 모호하면, 접근 가능한 이름으로도 사용되는 설명적인 버튼 텍스트를 화면에 표시합니다.',
      programmatic_name: '버튼에 실제로 적용된 접근 가능한 이름과 역할을 확인합니다. 아이콘만 있는 버튼에 적절한 이름이 없다면, 동작을 설명하는 접근 가능한 이름을 지정합니다.',
      generic: '컨트롤에 실제로 적용된 접근 가능한 이름과 역할을 확인합니다. 이름이 없거나 모호하면, 동작을 설명하는 접근 가능한 이름을 지정합니다.',
    },
  },
};

export function readRecommendation(text) {
  const value = JSON.parse(text);
  if (!value || Object.keys(value).length !== 1 || !CLOUD_FIXES.includes(value.fix)) {
    throw new Error('Invalid recommendation');
  }
  return value.fix;
}

export function renderReport(target, observations, { delivery = false, fix = 'generic' } = {}) {
  const add = (parent, tag, text, lang) => {
    const node = parent.ownerDocument.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (lang) node.lang = lang;
    return parent.appendChild(node);
  };
  const fragment = target.ownerDocument.createDocumentFragment();
  // Redaction markers are useful in the editor, not as quoted evidence in a card.
  const canQuote = observations && [observations.before, observations.after].every(
    text => text?.trim() && !/\[[^\]\r\n]*(?:redact(?:ed|ion)|가림)[^\]\r\n]*\]/iu.test(text),
  );
  const assessment = canQuote && neutralAssessment(observations);
  for (const [lang, t] of Object.entries(copy)) {
    const article = add(fragment, 'article', undefined, lang);
    article.className = 'report-variant';
    add(article, 'h3', t.language);
    add(article, 'h4', t.observed);
    if (canQuote) {
      const list = add(article, 'dl');
      for (const side of ['before', 'after']) {
        const utterance = observations[side];
        add(list, 'dt', t[side]);
        add(list, 'dd', utterance, /\p{Script=Hangul}/u.test(utterance) ? 'ko' : 'en');
      }
    } else {
      add(article, 'p', t.missing);
    }
    add(article, 'h4', t.impact);
    add(article, 'p', assessment ? assessment[lang].impact : t.impacts[canQuote ? delivery ? 'delivery' : 'generic' : 'missing']);
    add(article, 'h4', t.retest);
    const steps = add(article, 'ol');
    const retest = assessment ? assessment[lang].retest : [t.steps[0], canQuote && delivery ? t.deliveryStep : t.steps[1]];
    if (canQuote && !assessment && delivery) retest.push(t.steps[2]);
    for (const step of retest) add(steps, 'li', step);
    add(article, 'h4', t.fix);
    add(article, 'p', t.uncertainty);
    add(article, 'p', assessment ? assessment[lang].fix : t.fixes[canQuote ? fix : 'missing']);
  }
  target.replaceChildren(fragment);
}
