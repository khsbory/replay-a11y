# 다시듣기 (Replay A11y) 데모 영상

**편집 러닝타임 02:48 / 상한 02:50.** 한국어 내레이션, 기본 영어 UI, 영어 자막: [video-script.en.srt](video-script.en.srt). 시간은 `MM:SS.mmm`, `<br>`은 자막 줄바꿈이다. PC 편집 구간은 00:27.000에 시작하며, 처음 14초(00:27.000–00:41.000)는 모바일 AFTER 영상용 검은 화면으로 예약한다. PC 장면에서 사용하는 기록은 모두 합성이다. 편집에는 영어 UI로 다시 녹화한 `pc-scenes-3-8-en.mp4`를 사용한다. 이전 한국어 UI 녹화본은 사용하지 않는다.

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
| 5 | 00:27.500–00:31.500 | 수정 후 버튼의 이름은 ‘배송지 변경’입니다. | The button is now named<br>“Change delivery address”. |
| 6 | 00:32.000–00:40.500 | — 내레이션 없음. 실제 클립 대기. | [TODO: After TalkBack recording] |

**모바일 편집 규칙:** 두 발화 구간에는 내레이션·음악·효과음을 넣지 않는다. 녹음을 확보하면 4·6번을 발화 시작과 끝에 맞춰 실제로 들린 내용의 영어 자막으로 교체하고, 기록의 원어 표현과 순서는 그대로 둔다. 이름·역할·힌트나 그 순서가 합성 예시와 달라도 녹음에 맞춘다. 예상한 차이가 들리지 않는다면 더 잘 들린다고 설명하지 말고, 페이지의 이름 유무만 설명하거나 같은 조건에서 다시 촬영한다. 클립이 없으면 자리표시자와 무음을 유지하고, 합성 음성이나 데스크톱 화면으로 모바일 검증을 대신하지 않는다. 시간이 더 필요하면 다른 무음 홀드를 줄이고, 발화는 자르거나 빠르게 돌리지 않는다. 변경 시 대본과 SRT를 함께 다시 맞춘다.

## 4 · 영어 합성 텍스트 파일 불러오기 (00:41.000–01:01.000)

**화면:** 내장 샘플 흐름과 별도의 파일 불러오기 컷이다. **Choose a UTF-8 text file**과 영어 합성 `.txt` 하나를 불러온 결과를 보여 준다. OS 파일 선택 창은 넣지 않는다. **2. Before and after comparison**에 `Button`과 `Change delivery address, Button`이 그대로 표시되고, 앱의 규칙이 초안에서 가상 전화번호를 가린다. `Synthetic transcript — not recorded speech`로 표시한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 7 | 00:41.500–00:46.000 | 영어 합성 기록을 불러오려면 UTF-8 텍스트 파일을 선택합니다. | To import synthetic text, select<br>“Choose a UTF-8 text file”. |
| 8 | 00:46.500–00:53.000 | UTF-8 파일 하나에서 수정 전후 문구를 그대로 읽어 비교합니다. | One UTF-8 file supplies both excerpts.<br>The app shows them as written. |
| 9 | 00:53.500–01:00.000 | 앱의 규칙이 초안에서 가상 전화번호를 가립니다. | Rules mask the fictional phone number<br>in the draft. |

## 5 · 내장 영어 샘플에서 기기 내 가림 제안 검토·적용 (01:01.000–01:27.000)

**화면:** 여기서부터 8장면까지 [공개 작업 공간](https://replay-a11y-hybrid-2026.web.app/)의 같은 실행을 사용한다. 기본 영어 UI에서 **Load English synthetic sample** → **Get on-device model suggestions**. 실제 응답이 오면 **Received the on-device model response. Review the suggested text before applying it.**와 **Text with suggestions applied**를 보여 준다. 두 인용은 그대로 두고 가상 이름 `Avery Example`을 `[Additional redaction]`으로 바꾼 제안을 확인한 뒤 **Apply additional redactions**를 누른다. `ON_DEVICE`는 앱이 검증한 응답 출처이며 화면 배지는 아니다. 이렇게 나온 실제 제안이 있는 테이크에만 이 내레이션을 사용한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 10 | 01:01.500–01:07.000 | 이제 내장 영어 합성 샘플을 불러옵니다. | Choose “Load English synthetic sample”. |
| 11 | 01:07.500–01:12.000 | 이 초안에서 기기 내 모델 제안을 요청합니다. | Choose “Get on-device model suggestions”. |
| 12 | 01:16.000–01:20.500 | 앱이 기기 내 응답임을 확인했습니다. | The app verified an on-device response. |
| 13 | 01:21.000–01:26.500 | 두 인용은 그대로 두고 추가 가림을 적용합니다. | Choose “Apply additional redactions”.<br>Keep both excerpts unchanged. |

**01:12.000–01:16.000:** 모델 응답 대기, 내레이션 없음.

## 6 · 같은 초안으로 기기에서 카드 만들기 (01:27.000–01:46.000)

**화면:** **Exact text for the card**에 가림 제안이 적용된 같은 초안을 보여 준다. **I consent to making a card from the current text on this device.** 체크 → **Make a card on this device**. **4. Card made on this device**와 **Nothing was sent.**를 보여 준다. 이 단계는 선택 사항이며 로컬 카드 동의는 클라우드 승인과 별개다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 14 | 01:27.500–01:33.000 | 이름을 가린 같은 초안으로 기기에서 카드를 만들기로 동의합니다. | We give separate consent for a local<br>card from the same redacted draft. |
| 15 | 01:34.000–01:40.000 | 이 기기에서 카드 만들기를 누르면 검토한 두 문구가 카드에 들어갑니다. | Choose “Make a card on this device”.<br>It includes both reviewed excerpts. |
| 16 | 01:40.500–01:45.000 | 이 카드를 만들 때는 아무것도 보내지 않았습니다. | Nothing was sent. |

## 7 · 같은 초안에서 전체 미리보기 → 승인 → 전송 (01:46.000–02:17.000)

**화면:** 같은 초안에서 **Preview exact text to send to the cloud** → **Utterances that will be sent** → **Instructions sent with them**. 새 화면에서는 전후 문구가 지시문보다 먼저 나온다. 전체 미리보기에는 지시문과 `Before: Button`, `After: Change delivery address, Button`이 들어간다. 가상 이름이나 다른 줄, 원문과 전체 초안은 보내지 않는다.

**승인과 전송:** **I checked that there is no private information and approve sending this exact text to Gemini in the cloud.** 체크 → **You approved this text. The request starts only when you press Send.** 표시 → **Send approved text to Gemini (new tab)**을 따로 누른다. 체크만으로 요청이 시작되지 않는다. 격리된 **Gemini relay** 탭이 App Check 확인 후 승인한 문구를 전달한다. 이 장면은 **Waiting for Gemini…** 상태로 끝난다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 17 | 01:46.500–01:53.000 | 같은 초안에서 클라우드에 보낼 정확한 문구를 미리 봅니다. | Choose<br>“Preview exact text to send to the cloud”. |
| 18 | 01:53.500–02:00.000 | 전송할 전체 텍스트에는 지시문과 영어 인용 두 개만 들어갑니다. | The full prompt shows the instructions<br>and both English quotes. |
| 19 | 02:01.000–02:08.000 | 개인정보가 없는지 확인하고 승인합니다. 전송은 따로 누릅니다. | Check, approve, then select<br>“Send approved text to Gemini (new tab)”. |
| 20 | 02:09.000–02:15.500 | 격리된 새 탭이 승인한 문구를 보내고 응답을 기다립니다. | An isolated tab sends the approved text<br>and waits for the response. |

**02:15.500–02:17.000:** 새 탭의 대기 상태 홀드.

## 8 · 실제 Gemini 응답: 두 언어, 같은 영어 인용 (02:17.000–02:40.000)

**화면:** 같은 실행에서 실제 응답을 받으면 새 탭에 **Cloud card received. Return to the workspace.**가 표시된다. **Close relay tab**을 눌러 돌아와 **Bilingual issue card written by Gemini**와 **Firebase AI Logic · Gemini Developer API · IN_CLOUD**를 보여 준다. 기본 영어 UI에서도 카드 섹션 이름은 **English**, **한국어**다. 두 섹션의 관찰 결과에 승인한 영어 인용 `Button`과 `Change delivery address, Button`이 그대로 남아 있는지 보여 준다. 영어 섹션의 **The cause cannot be confirmed from the log alone.**도 보여 준다. 저장된 예시 카드를 실제 응답 대신 쓰지 않는다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 21 | 02:17.500–02:22.500 | 응답이 도착하면 전송 탭을 닫고 작업 공간으로 돌아갑니다. | After the card arrives, choose<br>“Close relay tab”. |
| 22 | 02:23.000–02:29.500 | 제미나기가 사용자 영향, 재검증 절차와 가능한 수정안을 두 언어로 씁니다. | Gemini writes the impact, retest steps,<br>and a possible fix in both languages. |
| 23 | 02:30.000–02:35.000 | 두 카드 모두 승인한 영어 인용을 번역하지 않고 그대로 담습니다. | Both cards keep the approved English<br>quotes exactly as written. |
| 24 | 02:35.500–02:39.500 | 원인은 로그만으로 확정할 수 없습니다. | The cause cannot be confirmed<br>from the log alone. |

## 9 · 마무리 (02:40.000–02:48.000)

**화면:** `다시듣기 / Replay A11y`. `Original and full draft stay in the workspace` / `Cloud: reviewed excerpts only, after approval and Send`를 읽을 수 있는 크기로 표시한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 25 | 02:40.500–02:46.000 | 무엇을 가리고, 어떤 문구를 보낼지는 사람이 결정합니다. | A person decides what to redact<br>and which excerpts, if any, to send. |

**02:46.000–02:48.000:** 엔드 카드 홀드, 내레이션 없음.

## 촬영·편집 확인

- 4장면은 파일 불러오기 별도 테이크로, 5–8장면은 내장 영어 샘플 하나로 이어지는 테이크로 편집한다. 모바일 버튼의 접근 가능한 이름과 TalkBack이 실제로 읽은 말은 구분한다.
- 자막은 초점, 상태, 카드 제목을 가리지 않는다. 알림, 프로필, 개발자 도구, 비공개 기록과 경로는 노출하지 않는다.
- 녹음과 실제 화면에 맞춰 내레이션과 영어 SRT를 함께 갱신하고, 편집본이 02:50을 넘지 않는지 다시 확인한다.
