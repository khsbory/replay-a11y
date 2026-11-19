export const chromiumCase = {
  source: 'https://issues.chromium.org/issues/542033685',
  pair: { before: 'Button', after: 'Search, Button' },
  fields: {
    device: 'Samsung Galaxy S23', os: 'Android 16', browser: 'Android System WebView 152.0.7977.8',
    reader: 'Samsung TalkBack 16.2.00.12', notes: 'With TalkBack on, open the test page in WebView. Focus the Search icon button named via aria-labelledby. Only its role was spoken.',
    expected: 'Search, button', tested: '154.0.8029.0',
  },
  en: {
    summary: 'Samsung TalkBack announced the role but not the accessible name of the Search icon button in Android System WebView.',
    steps: ['Turn on Samsung TalkBack.', 'Open the issue’s test page in an app that embeds Android System WebView.', 'Move accessibility focus to the Search icon button whose name comes from aria-labelledby. Listen without activating it.'],
    history: 'The reporter still heard only the role in WebView Canary 154.0.8026.0 (#25). In 154.0.8029.0 (#26), the reporter confirmed that TalkBack announced the accessible names. The report does not provide a verbatim retest transcript.',
    provenance: 'Illustrative reconstruction based on the public report, not captured verbatim.',
  },
  ko: {
    summary: 'Android System WebView에서 삼성 TalkBack이 검색 아이콘 버튼의 역할만 낭독하고 접근 가능한 이름은 낭독하지 않았습니다.',
    steps: ['삼성 TalkBack을 켭니다.', 'Android System WebView를 사용하는 앱에서 이슈의 테스트 페이지를 엽니다.', 'aria-labelledby로 이름이 지정된 검색 아이콘 버튼에 접근성 초점을 옮기고 실행하지 않은 채 낭독을 듣습니다.'],
    history: '보고자는 WebView Canary 154.0.8026.0(#25)에서 여전히 역할만 들었다고 보고했습니다. 154.0.8029.0(#26)에서는 TalkBack이 접근 가능한 이름을 낭독한다고 확인했습니다. 재검증에서 실제로 낭독된 원문은 제공되지 않았습니다.',
    provenance: '공개 보고를 바탕으로 재구성한 예시이며 실제 낭독을 그대로 기록한 것이 아닙니다.',
  },
};
