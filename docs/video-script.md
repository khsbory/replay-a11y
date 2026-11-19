# Task 11 · 다시듣기 (Replay A11y) 데모 영상

**편집본 목표 02:48 / 상한 02:50.** 한국어 내레이션, 영어 자막: [video-script.en.srt](video-script.en.srt). 표의 시간은 `MM:SS.mmm`, `<br>`은 자막 줄바꿈이다. **모바일 TalkBack 전·후 영상과 음성은 아직 미촬영 자리표시자다.** 아래 대본은 촬영·편집용이며, 새 추론이나 모바일 검증을 완료했다는 보고가 아니다.

## 1 · 오프닝 (00:00.000–00:13.000)

**화면:** 제목 `다시듣기 / Replay A11y`, 같은 배송지 변경 아이콘이 있는 전·후 페이지를 나란히 보여 준다. 모바일 캡처가 없으면 페이지 화면만 쓰고 `Page preview — no TalkBack audio`라고 표시한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 1 | 00:01.000–00:06.000 | 버튼에 이름이 없으면, 누르기 전에 무슨 일을 하는지 알기 어렵습니다. | An unnamed button is hard to identify<br>before you activate it. |
| 2 | 00:06.500–00:12.000 | 다시듣기는 수정 전후의 낭독을 비교하고, 이슈 카드에 넣을 문구를 검토하는 도구입니다. | Replay A11y compares announcements<br>and lets you review the issue card text. |

## 2 · 모바일 수정 전 (00:13.000–00:27.000)

**화면:** `[실제 Android TalkBack BEFORE 영상 삽입 대기]`. Android Chrome에서 TalkBack을 켜고 `/before.html`의 연필 모양 버튼으로 접근성 초점을 옮긴다. 누르지 말고, 초점 표시와 발화를 끝까지 녹음한다. 이 버튼에는 접근 가능한 이름이 없다. 이 사실은 페이지 구현에서 확인했으며, 실제 발화는 아직 확인하지 않았다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 3 | 00:13.500–00:17.500 | 수정 전 페이지에는 버튼 이름이 없습니다. | Before the fix, the button has no name. |
| 4 | 00:18.000–00:26.500 | — 내레이션 없음. 실제 클립 대기. | [Before: TalkBack recording pending] |

## 3 · 모바일 수정 후 (00:27.000–00:41.000)

**화면:** `[실제 Android TalkBack AFTER 영상 삽입 대기]`. 같은 기기·브라우저·TalkBack 언어와 설정으로 `/after.html`의 같은 버튼에 초점을 옮기고 다시 끝까지 녹음한다. 구현상 접근 가능한 이름은 `Change delivery address`다. 이것은 코드에서 확인한 이름이지 발화 인용이 아니다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 5 | 00:27.500–00:31.500 | 수정 후에는 배송지를 바꾸는 버튼이라는 이름을 붙였습니다. | After the fix, the name tells you<br>it changes the delivery address. |
| 6 | 00:32.000–00:40.500 | — 내레이션 없음. 실제 클립 대기. | [After: TalkBack recording pending] |

**모바일 편집 규칙:** 두 발화 구간에는 내레이션·음악·효과음을 넣지 않는다. 녹음을 확보하면 4·6번을 발화 시작과 끝에 맞춰 실제로 들린 내용의 영어 자막으로 교체하고, 기록의 원어 표현과 순서는 그대로 둔다. 이름·역할·힌트나 그 순서가 합성 예시와 달라도 녹음에 맞춘다. 예상한 차이가 들리지 않는다면 더 잘 들린다고 설명하지 말고, 페이지의 이름 유무만 설명하거나 같은 조건에서 다시 촬영한다. 클립이 없으면 자리표시자와 무음을 유지하고, 합성 음성이나 데스크톱 화면으로 모바일 검증을 대신하지 않는다. 시간이 더 필요하면 다른 무음 홀드를 줄이고, 발화는 자르거나 빠르게 돌리지 않는다. 변경 시 대본과 SRT를 함께 다시 맞춘다.

## 4 · 두 기록, 파일 하나 (00:41.000–01:05.000)

**화면:** 두 발화에서 비교할 구절을 한 개의 UTF-8 `.txt`(최대 8,000자)에 한 줄씩 `Before:` / `After:`로 적는다. 예시는 아래와 같으며, **촬영 전에는 합성 문구**로 표시한다. 실제 발화가 다르면 파일의 각 라벨 뒤를 들린 구절로 바꾼다. 합성 배송 페이지에서 녹음한 발화 중 공개 검토를 거친 버튼 구절만 사용한다. 전체 발화 로그나 실제 배송 정보는 넣지 않는다. 본편의 파일 선택 창은 파일명만 보이도록 잘라낸다.

```text
Before: Button
After: Change delivery address, Button
```

**동작:** 작업 공간 `/` → **UTF-8 텍스트 파일 선택** → 파일 **하나** 선택. 파일을 읽으면 영어 체크가 해제된 상태에서 패턴 가림 초안이 자동으로 만들어지고 **2. 수정 전후 비교**에 두 항목이 나타난다. 두 파일을 선택하거나 앱이 오디오를 전사하는 연출은 하지 않는다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 7 | 00:42.000–00:47.000 | 여기서는 비교할 전후 문구를 두 줄로 준비합니다. | We prepare two excerpts to compare. |
| 8 | 00:47.500–00:54.000 | 한 파일에 ‘수정 전’과 ‘수정 후’를 표시해, 텍스트 파일 하나를 선택합니다. | Label them Before and After<br>in one UTF-8 text file, then select it. |
| 9 | 00:55.000–01:01.000 | 파일을 읽으면, 앱이 패턴 가림을 적용하고 두 문구를 비교 화면에 보여 줍니다. | The app applies pattern masking<br>and shows both excerpts for comparison. |

**01:01.000–01:05.000:** 비교 화면 홀드, 내레이션 없음.

## 5 · 영어 합성 샘플: 기기 내 추가 가림 (01:05.000–01:41.000)

**동작:** 여기서 가져온 기록과 구분해 **영어 합성 샘플 불러오기**를 누른다. 이 버튼은 영어를 지정하고 패턴 가림 초안도 바로 준비한다. 초안에서 전화번호·이메일·금액·주소 표기는 가려졌고 가상 이름 `Avery Example`은 남아 있는 것을 보여 준다. **기기 내 모델 제안 받기**를 직접 누르고 준비/생성 상태로 잠시 기다린다. 대기는 필요하면 점프 컷 후 실제 결과로 이어 붙인다.

**증거 컷:** 설치된 데스크톱 Chrome의 일반 프로필에서 실제로 얻은 성공 화면을 쓴다. 다시 촬영할 때는 빌드된 로컬 페이지와 실제 Prompt API를 사용한다. 이미 검증된 화면을 쓰면 `Previously verified on desktop Chrome`으로 표시하고 새 실행처럼 붙이지 않는다. 앱의 실제 성공 상태는 **`기기 내 모델 응답을 확인했습니다. 제안 문구를 검토한 다음 적용할 수 있습니다.`** 이 상태와 제안 미리보기의 `[Additional redaction]`을 함께 잡는다. `ON_DEVICE`는 SDK 응답을 거르는 값이지 UI 문구가 아니다. 보충 표기가 필요하면 성공 화면 밖의 편집 오버레이에만 `SDK check: ON_DEVICE`를 넣고 앱 배지처럼 만들지 않는다. 사용 가능 상태, 다운로드 상태, 모의 응답만으로 성공이라고 표시하지 않는다. 모델이 없으면 수동 편집을 보여 주거나 이미 검증된 캡처를 명시해서 쓴다. 클라우드로 자동 전환하지 않는다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 10 | 01:06.000–01:11.000 | 추가 가림은 별도의 영어 합성 샘플로 보여 드릴게요. | For extra masking, we switch<br>to a separate English synthetic sample. |
| 11 | 01:11.500–01:17.500 | 패턴이 연락처, 금액, 주소를 가렸지만, 가상 이름은 남아 있습니다. | Rules mask contact details,<br>the amount and address, but not the name. |
| 12 | 01:18.000–01:22.500 | 기기 내 모델에 추가 가림을 요청합니다. | We ask the on-device model<br>for another redaction. |
| 13 | 01:29.000–01:34.000 | 이 화면은 기기 내 응답을 확인한 결과입니다. | The app verified the response<br>came from the device. |
| 14 | 01:34.500–01:40.000 | 두 비교 문구는 그대로 두고, 가상 이름만 더 가리자고 제안했습니다. | It suggests masking the fictional name<br>without changing either excerpt. |

**01:22.500–01:29.000:** 대기/결과 전환, 내레이션 없음. 13번부터는 실제 확인된 결과만 사용한다. 영어로 지정한 적격 기록만 모델 제안을 요청할 수 있다. 한국어·혼합 기록은 패턴 가림과 직접 편집을 사용한다.

## 6 · 이 기기에서 카드 만들기 (01:41.000–01:54.000)

**동작:** 제안을 검토하고 **추가 가림 제안 적용** → **카드에 들어갈 정확한 문구** 검토 → 로컬 동의 체크 → **이 기기에서 카드 만들기**. 편집하거나 제안을 적용하면 이전 동의는 풀리므로, 적용과 검토 뒤에 동의한다. 카드의 **아무에게도 보내지 않았습니다.**를 잠시 보여 준다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 15 | 01:41.500–01:47.000 | 제안을 적용하고 카드에 들어갈 문구를 다시 확인합니다. | We apply the suggestion<br>and review the exact card text. |
| 16 | 01:47.500–01:53.000 | 이 문구로 카드 만들기에 동의합니다. 카드는 기기 안에서만 만듭니다. | We approve making the card<br>on this device. Nothing is sent. |

## 7 · 별도 클라우드 데모: 선택 → 검토 → 승인 → 전송 (01:54.000–02:20.000)

**동작:** 푸터의 **Approved cloud demo**로 이동 또는 승인된 Hosted 데모에서 해당 페이지를 별도로 연다. **Select approved synthetic sample** 클릭 → **Review the exact outgoing prompt**에서 지시문과 고정 전후 문구 전체를 읽을 수 있게 홀드 → 사람이 **I approve sending exactly this synthetic prompt to Gemini in the cloud.** 체크 → **Send approved sample to Gemini**를 직접 누른다. 체크만으로 전송되지 않는다. 화면 전환 시 `Separate demo · fixed synthetic sample`이라고 구분한다. 로컬 파일·모바일 발화·편집 초안·로컬 모델 결과는 이 프롬프트로 전달되지 않는다. 고정 샘플은 실제 모바일 발화가 달라도 바꾸지 않는다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 17 | 01:54.500–02:00.500 | 이제 별도 클라우드 데모에서 고정된 합성 샘플을 선택합니다. | In a separate cloud demo,<br>we select a fixed synthetic sample. |
| 18 | 02:01.000–02:06.500 | 보낼 프롬프트 전체를 확인합니다. 방금 편집한 기록은 여기에 들어오지 않습니다. | We review the full outgoing prompt.<br>The local draft is not carried over. |
| 19 | 02:08.000–02:15.000 | 사람이 이 프롬프트 전송에 동의한 뒤, 전송 버튼을 따로 누릅니다. | A person approves this prompt,<br>then presses Send as a separate step. |

**02:15.000–02:20.000:** 상태 표시 홀드, 내레이션 없음. 기다림은 필요시 컷으로 표시한다. 이 릴리스 저장소의 기본 빌드에서는 전송이 비활성화되어 있다. 성공 컷은 기존에 검증된 공개 데모의 성공 영상이 있으면 출처를 붙여 쓰고, 새 촬영이 필요하면 별도 승인된 Hosted 데모에서만 수행한다. 저장소에 키나 설정을 추가하지 않는다.

## 8 · 확인된 클라우드 응답과 이중 언어 카드 (02:20.000–02:38.000)

**화면:** 실제 성공 컷에서 **Cloud issue card received.**와 **Source: Firebase AI Logic · Gemini Developer API · cloud (IN_CLOUD)**를 잡고, English와 한국어 섹션을 차례로 보여 준다. 관찰 결과·사용자 영향·재검증 절차·가능한 수정을 보여 주되, 로그만으로 원인을 확정할 수 없다는 문장을 남긴다. 이쪽은 `IN_CLOUD`가 **실제 UI 문구**에 들어 있다. Gemini가 고르는 것은 가능한 수정 코드 하나이며, 비교 인용과 이중 언어 문구는 앱이 제공한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 20 | 02:20.500–02:25.500 | 출처 표시에서 클라우드 응답임을 확인합니다. | The source label confirms<br>this response came from the cloud. |
| 21 | 02:26.000–02:31.500 | 제미나이는 가능한 수정안 하나를 고릅니다. 전후 인용은 그대로입니다. | Gemini selects one possible fix.<br>The comparison quotes stay fixed. |
| 22 | 02:32.000–02:37.000 | 앱은 이슈 카드를 영어와 한국어로 보여 줍니다. | The app shows the issue card<br>in English and Korean. |

**실패 시:** **View the saved bilingual example card**만 보인다면 `Saved example — not a new response`로 표시한다. 실제 성공 컷이 없으면 20·21번을 성공 주장 없이 교체한다. 예: 20번 “이번에는 저장된 예시를 보여 드립니다.” / `This is the saved example.`; 21번 “새 클라우드 응답은 아닙니다.” / `It is not a new cloud response.`. `IN_CLOUD` 오버레이를 추가하지 않는다.

## 9 · 마무리 (02:38.000–02:48.000)

**화면:** `다시듣기 / Replay A11y`. 작은 글씨 대신 읽을 수 있는 크기로 `Local records stay in the workspace`와 `Cloud demo: approved synthetic sample only`를 표시한다.

| # | 시간 | 한국어 내레이션 | English captions |
|---|---|---|---|
| 23 | 02:38.500–02:46.000 | 전후를 비교하고, 필요한 부분을 가리세요. 카드에 담을 문구는 사람이 마지막으로 확인합니다. | Compare the excerpts and redact them.<br>A person reviews what goes in the card. |

**02:46.000–02:48.000:** 엔드 카드 홀드, 내레이션 없음.

## 촬영 근거와 한계

- **구현:** `phone/before.html`과 `phone/after.html`은 동일한 버튼의 이름 유무를 보여 준다. `v2/index.html`과 `v2/src/main.js`는 파일 하나만 읽고 자동으로 초안을 준비한다. `v2/src/device.js`는 `ON_DEVICE` 응답만 사용한다. `v2/approved-demo.html`과 `v2/src/approved-demo.js`는 별도 선택·승인·전송과 `IN_CLOUD` 확인을 구현한다.
- **실제 로컬 근거:** 데스크톱 Chrome 일반 프로필의 실추론 검증 메모와 성공 화면에서 한국어 상태 및 가상 이름의 추가 가림을 확인했다. 이 근거는 영어 합성 샘플 한 건에 해당하며 모바일 발화나 가림의 완전성을 입증하지 않는다.
- **실제 클라우드 근거:** 공개 Hosting 브라우저 검증에서 승인 전 공급자 요청 0건, 고정 요청 본문 일치, App Check 헤더 존재, `Cloud issue card received.` 및 두 언어 카드가 확인됐다. 이 결과는 보관된 검증 기록의 요약이며 새 출력이나 성공 영상이 아니다. 모의 테스트와 저장된 예시 카드는 실추론 증거로 쓰지 않는다.
- **공개 전 확인:** 자막은 앱 상태·초점·카드 제목을 가리지 않게 배치한다. 파일 선택창·브라우저 프로필·알림·개발자 도구는 숨기거나 잘라낸다. 실제 로그, 사설 절대 경로, 설정값, 키나 토큰은 영상과 문서에 싣지 않는다. 실제 클립에 맞춰 대본과 SRT를 함께 갱신하고 상한 02:50 내에서 발화와 자막을 재검수한다.
