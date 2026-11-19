// UI language is presentation only. Never use it for a draft, consent snapshot,
// model language, or outgoing request. Pages can opt in to #ko explicitly.
const statuses = new Map();

export const uiLanguage = () => document.documentElement.lang;
const update = (node, text) => { if (node.textContent !== text) node.textContent = text; };

function renderStatus(node, message) {
  update(node, message?.[uiLanguage() === 'ko' ? 1 : 0] ?? '');
}

export function setStatus(node, message = null) {
  if (message) statuses.set(node, message);
  else statuses.delete(node);
  renderStatus(node, message);
}

export const hasStatus = (node, message) => statuses.get(node) === message;

export function initLocale(initial = location.hash === '#ko' ? 'ko' : 'en') {
  const toggle = document.getElementById('ui-language');
  const staticText = [...document.querySelectorAll('[data-ko]')].map(node => [node, node.textContent]);
  const labels = [...document.querySelectorAll('[data-ko-label]')].map(node => [node, node.getAttribute('aria-label')]);
  const links = [...document.querySelectorAll('[data-locale-link]')].map(node => [node, node.getAttribute('href')]);
  function render(locale) {
    const korean = locale === 'ko';
    document.documentElement.lang = locale;
    for (const [node, english] of staticText) {
      if (!statuses.has(node)) update(node, korean ? node.dataset.ko : english);
    }
    for (const [node, english] of labels) node.setAttribute('aria-label', korean ? node.dataset.koLabel : english);
    for (const [node, href] of links) node.setAttribute('href', korean ? `${href}#ko` : href);
    toggle.lang = korean ? 'en' : 'ko';
    update(toggle, korean ? 'English' : '한국어');
    for (const [node, message] of statuses) renderStatus(node, message);
  }
  toggle.addEventListener('click', () => render(uiLanguage() === 'ko' ? 'en' : 'ko'));
  render(initial);
  toggle.hidden = false;
}

// This is for speech markup only, not eligibility for on-device processing.
export function contentLanguage(text) {
  if (/[가-힣]/u.test(text)) return 'ko';
  if (/^[\t\n\r\x20-\x7e\u00a0£€‘’“”–—…]*$/u.test(text) && /[A-Za-z]/u.test(text)) return 'en';
  return '';
}
