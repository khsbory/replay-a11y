# 다시듣기 (Replay A11y) 데모 영상

**편집 목표 02:48 / 상한 02:50.** 한국어 내레이션, 영어 자막: [video-script.en.srt](video-script.en.srt). 시간은 `MM:SS.mmm`, `<br>`은 자막 줄바꿈이다. 클라우드 경로는 [공개 작업 공간](https://replay-a11y-hybrid-2026.web.app/)에서 촬영한다. 앱에는 합성 기록만 입력한다.

## 1 · 오프닝 (00:00.000–00:13.000)

**화면:** 제목 `다시듣기 / Replay A11y`, 같은 배송지 변경 아이콘이 있는 전·후 페이지를 나란히 보여 준다. 모바일 캡처가 없으면 페이지 화면만 쓰고 `Page preview — no TalkBack audio`라고 표시한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 1 | 00:01.000–00:06.000 | 버튼에 이름이 없으면, 누르기 전에 무슨 일을 하는지 알기 어렵습니다. | An unnamed button is hard to identify<br>before you activate it. |
| 2 | 00:06.500–00:12.000 | 다시듣기는 수정 전후의 낭독을 비교하고, 이슈 카드에 넣을 문구를 검토하는 도구입니다. | Replay A11y compares announcements<br>and lets you review the issue card text. |

## 2 · 모바일 수정 전 (00:13.000–00:27.000)

**화면:** `[TODO: 실제 Android TalkBack BEFORE 영상과 음성]`. Android Chrome에서 TalkBack을 켜고 `/before.html`의 연필 모양 버튼으로 접근성 초점을 옮긴다. 누르지 말고, 초점 표시와 발화를 끝까지 녹음한다. 이 버튼에는 접근 가능한 이름이 없다. 이 사실은 페이지 구현에서 확인했으며, 실제 발화는 아직 확인하지 않았다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 3 | 00:13.500–00:17.500 | 수정 전 페이지에는 버튼 이름이 없습니다. | Before the fix, the button has no name. |
| 4 | 00:18.000–00:26.500 | — 내레이션 없음. 실제 클립 대기. | [TODO: Before TalkBack recording] |

## 3 · 모바일 수정 후 (00:27.000–00:41.000)

**화면:** `[TODO: 실제 Android TalkBack AFTER 영상과 음성]`. 같은 기기·브라우저·TalkBack 언어와 설정으로 `/after.html`의 같은 버튼에 초점을 옮기고 다시 끝까지 녹음한다. 구현상 접근 가능한 이름은 `Change delivery address`다. 이것은 코드에서 확인한 이름이지 발화 인용이 아니다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 5 | 00:27.500–00:31.500 | 수정 후에는 배송지를 바꾸는 버튼이라는 이름을 붙였습니다. | After the fix, the name tells you<br>it changes the delivery address. |
| 6 | 00:32.000–00:40.500 | — 내레이션 없음. 실제 클립 대기. | [TODO: After TalkBack recording] |

**모바일 편집 규칙:** 두 발화 구간에는 내레이션·음악·효과음을 넣지 않는다. 녹음을 확보하면 4·6번을 발화 시작과 끝에 맞춰 실제로 들린 내용의 영어 자막으로 교체하고, 기록의 원어 표현과 순서는 그대로 둔다. 이름·역할·힌트나 그 순서가 합성 예시와 달라도 녹음에 맞춘다. 예상한 차이가 들리지 않는다면 더 잘 들린다고 설명하지 말고, 페이지의 이름 유무만 설명하거나 같은 조건에서 다시 촬영한다. 클립이 없으면 자리표시자와 무음을 유지하고, 합성 음성이나 데스크톱 화면으로 모바일 검증을 대신하지 않는다. 시간이 더 필요하면 다른 무음 홀드를 줄이고, 발화는 자르거나 빠르게 돌리지 않는다. 변경 시 대본과 SRT를 함께 다시 맞춘다.

## 4 · 한국어 합성 기록 불러오기 (00:41.000–01:01.000)

**동작:** `Synthetic transcript — not recorded speech` 표시. 아래 예시를 UTF-8 `.txt` 파일 하나에 넣고 (입력 한도 8,000자) **UTF-8 텍스트 파일 선택**으로 읽는다. 파일명 외의 경로는 가린다. 파일을 읽으면 패턴 가림이 적용된 초안과 **2. 수정 전후 비교**가 표시된다. 전사나 두 파일을 대조하는 연출은 하지 않는다. 합성 발화는 모바일 영상과 별개의 예시다.

```text
수정 전: 버튼
수정 후: 예시고객님, 배송지 변경, 버튼
연락처: 010-0000-0000
```

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 7 | 00:41.500–00:46.000 | 여기부터는 한국어 합성 기록을 사용합니다. | We'll use a synthetic Korean transcript. |
| 8 | 00:46.500–00:53.000 | 수정 전과 후를 한 줄씩 적고, 텍스트 파일 하나를 엽니다. | Label the before and after excerpts<br>in one text file, then open it. |
| 9 | 00:53.500–01:00.000 | 앱이 패턴으로 연락처를 가리고, 비교할 두 낭독 문구를 보여 줍니다. | Rules mask the phone number.<br>The app shows both excerpts. |

## 5 · 영어 추가 가림은 선택 사항 (01:01.000–01:27.000)

**동작:** 한국어 초안 탭은 그대로 두고 별도의 데스크톱 Chrome 작업 공간에서 **영어 합성 샘플 불러오기** → **기기 내 모델 제안 받기**. 가상 이름 `Avery Example`과 제안 미리보기의 `[Additional redaction]`을 보여 준다. 실제 앱 문구 **기기 내 모델 응답을 확인했습니다. 제안 문구를 검토한 다음 적용할 수 있습니다.**를 함께 담는다. `ON_DEVICE`는 SDK 확인값이지 앱 배지가 아니다. 기존 검증 화면이면 `Previously verified on desktop Chrome`으로 표시한다. 실제 성공 컷이 없으면 12·13번을 빼고, 지원되는 환경에서만 영어 제안을 선택할 수 있다고 설명하거나 수동 편집으로 넘어간다. 모의 응답이나 준비 상태를 성공으로 쓰지 않는다. 마지막에 원래 한국어 탭으로 돌아온다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 10 | 01:01.500–01:07.000 | 영어 기록에는 기기 내 추가 가림을 선택할 수 있습니다. | Eligible English text can use<br>optional on-device redaction. |
| 11 | 01:07.500–01:12.000 | 별도의 영어 합성 샘플로 제안을 요청합니다. | We request a suggestion<br>on a separate English sample. |
| 12 | 01:16.000–01:20.500 | 앱이 기기 내 응답임을 확인했습니다. | The app verified an on-device response. |
| 13 | 01:21.000–01:26.500 | 두 비교 문구는 그대로 두고, 가상 이름만 더 가리자고 제안합니다. | It suggests masking the fictional name<br>without changing either excerpt. |

**01:12.000–01:16.000:** 대기 컷, 내레이션 없음. 필요하면 기다림을 점프 컷으로 줄인다. 기기 내 제안이 불가능해도 자동으로 클라우드에 보내지 않는다.

## 6 · 한국어 초안 직접 가림과 로컬 카드 (01:27.000–01:46.000)

**동작:** 원래 한국어 탭의 **카드에 들어갈 정확한 문구**에서 `예시고객님, `을 직접 지운다. `수정 후: 배송지 변경, 버튼`과 가린 연락처 줄을 그대로 두어 다음 장면에서 비교 문구만 추출되는 것을 보여 준다. **현재 문구를 이 기기에서 카드로 만드는 데 동의합니다.** → **이 기기에서 카드 만들기**. **아무에게도 보내지 않았습니다.**를 보여 준다. 이 체크는 클라우드 승인과 별개이며, 클라우드 카드만 만들 때는 필요 없다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 14 | 01:27.500–01:33.000 | 한국어 가림에는 모델을 쓰지 않습니다. 남은 이름은 직접 지웁니다. | Korean redaction uses no model.<br>We remove the remaining name by hand. |
| 15 | 01:34.000–01:40.000 | 검토한 문구로 이 기기에서 카드를 만들 수 있습니다. | The reviewed text can become<br>a card on this device. |
| 16 | 01:40.500–01:45.000 | 이 카드에는 전송이 필요 없습니다. | No upload is needed for this card. |

## 7 · 같은 작업 공간에서 전체 미리보기 → 승인 → 전송 (01:46.000–02:17.000)

**동작:** 별도 고정 샘플 페이지로 가지 않는다. 같은 한국어 초안에서 **클라우드에 보낼 정확한 문구 미리보기** → **Gemini로 보낼 전체 텍스트 (최대 1,000자)**. 비어 있지 않은 수정 전 한 줄과 수정 후 한 줄의 발화만 추출한다. `Before: 버튼`, `After: 배송지 변경, 버튼`과 그 위의 지시문 전체를 읽을 수 있게 보여 준다. 한도는 지시문을 포함해 1,000 UTF-16 코드 단위이며, 원문·전체 초안·연락처 줄은 전송하지 않는다. 자동 검사에 잡히지 않는 개인정보가 있으면 직접 지우거나 전송하지 않는다. 편집하면 미리보기와 승인이 초기화되므로 다시 검토한다.

**승인과 전송:** **개인정보가 없음을 확인했고, 위 문구 그대로 Gemini 클라우드에 보내는 데 동의합니다.** 체크 → 승인 상태에서 잠시 홀드 → **승인한 문구를 Gemini에 전송 (새 탭)**을 별도로 누른다. 체크만으로 새 탭이나 요청이 시작되지 않는다. 전송을 누르면 격리된 새 탭이 열린다. 이 탭이 reCAPTCHA Enterprise로 App Check 확인을 마친 뒤, 작업 공간에서 재확인한 승인 문구를 넘겨받아 요청 설정과 함께 Gemini에 보낸다. 새 탭은 완료 안내가 나올 때까지 열어 둔다. 이미 나간 요청은 회수할 수 없다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 17 | 01:46.500–01:53.000 | 같은 작업 공간에서 클라우드 카드를 선택할 수도 있습니다. 초안에서 전후 발화만 가져옵니다. | In the same workspace, the cloud option<br>takes only the before and after quotes. |
| 18 | 01:53.500–02:00.000 | 지시문까지 포함한 전체를 미리 봅니다. 천 자가 한도입니다. | Review the full prompt with instructions.<br>The limit is 1,000 UTF-16 code units. |
| 19 | 02:01.000–02:08.000 | 개인정보가 없는지 확인하고 승인합니다. 그런 다음 전송을 따로 누릅니다. | Check for private details and approve.<br>Then click Send separately. |
| 20 | 02:09.000–02:15.500 | 격리된 새 탭이 브라우저를 확인한 뒤, 승인한 문구를 보냅니다. | An isolated tab verifies the browser,<br>then sends the approved text. |

**02:15.500–02:17.000:** 새 탭의 대기 상태 홀드. 기다림을 줄이면 컷으로 표시한다.

## 8 · 실제 Gemini 응답: 두 언어, 같은 인용 (02:17.000–02:40.000)

**화면:** 실제 성공 컷에서 새 탭의 **Cloud card received. Return to the workspace.**를 잡고 원래 탭으로 돌아온다. **Gemini가 작성한 이중 언어 이슈 카드**와 **Firebase AI Logic · Gemini Developer API · IN_CLOUD**를 보여 준다. English와 한국어 섹션을 차례로 보여 주고, 두 카드의 관찰 결과가 미리보기와 같은 원어 인용임을 비교한다. Gemini가 실제로 작성한 사용자 영향, 재검증 절차와 조건부 수정 제안을 보여 준다. 로그만으로 원인을 확인할 수 없다는 앱의 문구도 남긴다. 기존 성공 영상이라면 이전 실행으로 표시한다. 모의 응답이나 저장된 예시를 이 성공 컷에 넣지 않는다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 21 | 02:17.500–02:22.500 | 원래 탭에서 클라우드 응답과 두 언어 카드를 확인합니다. | Back in the workspace, we see<br>the cloud result in both languages. |
| 22 | 02:23.000–02:29.500 | 제미나이가 사용자 영향, 재검증 절차와 가능한 수정안을 두 언어로 씁니다. | Gemini writes the impact, retest steps,<br>and a possible fix in both languages. |
| 23 | 02:30.000–02:35.000 | 두 카드에 승인한 전후 발화가 원문 그대로 들어갑니다. | Both cards keep the approved quotes<br>exactly as written. |
| 24 | 02:35.500–02:39.500 | 원인은 로그만으로 확정할 수 없습니다. | The log alone can't confirm the cause. |

**실패 시:** 연결 흐름에서는 자동 재전송이나 카드 대체가 없다. 다시 시도할 때는 재검토하고 새로 승인한 뒤 전송한다. 성공 컷을 쓸 수 없다면 21–24번의 내레이션과 자막을 실제 실패 상태에 맞춰 함께 바꾼다. 선택 사항인 별도 **Approved cloud demo**의 **View the saved bilingual example card**를 보여 줄 수 있지만, 작업 공간 기록과 무관한 고정 합성 샘플임을 알리고 `Saved example — not a new response`로 표시한다. `IN_CLOUD` 표시는 실제 응답 컷에서만 쓴다.

## 9 · 마무리 (02:40.000–02:48.000)

**화면:** `다시듣기 / Replay A11y`. `Original and full draft stay in the workspace` / `Cloud: reviewed excerpts only, after approval and Send`를 읽을 수 있는 크기로 표시한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 25 | 02:40.500–02:46.000 | 무엇을 가리고, 어떤 문구를 보낼지는 사람이 결정합니다. | A person decides what to redact<br>and which excerpts, if any, to send. |

**02:46.000–02:48.000:** 엔드 카드 홀드, 내레이션 없음.

## 촬영·편집 확인

- 기기 내 제안과 연결된 클라우드 응답은 각각 합성 기록으로 확인된 경로다. 결과 화면은 실제 캡처를 쓴다. 모바일 버튼의 접근 가능한 이름과 TalkBack이 실제로 읽은 말은 구분한다.
- 자막은 초점, 상태, 카드 제목을 가리지 않는다. 알림, 프로필, 개발자 도구, 비공개 기록과 경로는 노출하지 않는다.
- 녹음과 실제 화면에 맞춰 내레이션과 영어 SRT를 함께 갱신하고, 편집본이 02:50을 넘지 않는지 다시 확인한다.
