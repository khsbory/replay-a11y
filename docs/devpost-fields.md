# Devpost submission fields

## Project name

Replay A11y (다시듣기)

## Tagline / elevator pitch (200 characters max)

Turn before-and-after screen reader transcripts into bilingual accessibility bug reports. Review exactly what goes into the report and what, if anything, goes to Gemini.

## Try it out / project URL

https://replay-a11y-hybrid-2026.web.app/

## Source code / repository URL

`<APPROVED_PUBLIC_REPOSITORY_URL>`

<!-- The source is private. Replace the placeholder only after publication is authorized; do not submit a private link. -->

## Demo video URL

Pending

<!-- Add the public video URL when the final cut is uploaded. Android TalkBack footage is pending; synthetic examples are not recordings. -->

## Platform / browser

Web / Chrome

## Built with

HTML, CSS, JavaScript, Vite, Chrome Prompt API (Gemini Nano), Firebase AI Logic, Gemini 3.5 Flash-Lite (Gemini Developer API), Firebase Hosting, Firebase App Check, reCAPTCHA Enterprise, Playwright, axe-core

## Project story

A screenshot can show where a button is, but it can't tell a developer what a screen reader said when a tester reached it. A transcript can, but it might also contain a name, an address, or an order total that doesn't belong in a bug report.

Replay A11y compares before-and-after announcements. It masks common patterns and lets the tester edit what the rules missed. Korean and mixed-language redaction uses rules and manual editing. Eligible English text can get optional redaction suggestions on supported desktop Chrome profiles through the Prompt API, without a cloud fallback.

The workspace can create an English and Korean issue card locally. If you choose the Gemini option, the app previews the full text prompt: instructions and one reviewed before excerpt and one reviewed after excerpt. Checking the approval box does not send anything. A separate Send opens an isolated tab that sends the approved prompt via Firebase AI Logic after App Check. The original and full draft stay in the workspace. Both versions of the card retain the approved quotes verbatim. The report suggests a retest and a possible fix; the transcript alone can't establish the cause.

The practice pages show the same control before and after it gets the accessible name “Change delivery address.” That name is part of the page, not a quote from a TalkBack recording.

## How to try it

Judges should start with **영어 합성 샘플 불러오기** in the hosted workspace. The built-in English delivery case compares `Button` with `Change delivery address, Button`. Review **카드에 들어갈 정확한 문구**. On a supported desktop Chrome profile, you can optionally use **기기 내 모델 제안 받기** and **추가 가림 제안 적용** to mask the fictional name after reviewing the proposal. If the model isn't available, skip it and edit the draft by hand as needed. The local card is also optional.

From that same draft, choose **클라우드에 보낼 정확한 문구 미리보기** and check the full prompt, including the two English quotes. To send it, check **개인정보가 없음을 확인했고, 위 문구 그대로 Gemini 클라우드에 보내는 데 동의합니다.** and then separately click **승인한 문구를 Gemini에 전송 (새 탭)**. Keep **Gemini relay** open until it says **Cloud card received. Return to the workspace.** Return to the workspace and check that both languages of **Gemini가 작성한 이중 언어 이슈 카드** preserve the approved English quotes.

For the Korean alternative, choose **합성 샘플 불러오기** and use pattern masking and manual editing instead of the on-device model.
