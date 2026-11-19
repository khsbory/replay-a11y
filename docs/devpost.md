## Inspiration

Replay A11y (다시듣기) started with an Android TalkBack logger used by a blind accessibility specialist. A screenshot can show where an icon sits, but it can't tell a developer that TalkBack gave the tester only “Button” and no clue what the button did. A speech log can supply that missing evidence. It can also pick up a name, address, or order total that has no business being in a bug report. We built Replay to help testers separate the two.

## What it does

Replay compares before-and-after screen-reader announcements and helps testers write an issue card in English and Korean. Load a fictional sample, paste a transcript, or open a local UTF-8 text file. Rules mask common phone number, email, amount, and address formats; the tester edits what the rules miss. Korean and mixed-language drafts use rules and manual editing, with no on-device model call.

From the same workspace, you can make a bilingual card on your device without sending anything, or explicitly opt in to have Gemini write one. The cloud path extracts exactly one nonempty before excerpt and one nonempty after excerpt from the corresponding lines in the edited draft. It previews the entire Gemini text prompt, including instructions and both excerpts, up to 1,000 UTF-16 code units. Unrelated lines, the full draft, and the original transcript stay in the workspace. Checking the approval box doesn't send anything. A separate Send click is required; local card approval is not cloud approval.

## How we built it

The workspace is built with HTML, CSS, JavaScript, and Vite. For explicitly marked English records that pass the source and draft checks, supported desktop Chrome profiles can optionally suggest extra redactions. The app checks for the Chrome Prompt API, asks Firebase AI Logic for on-device inference only, and accepts only an on-device result. You can review the suggestion before applying it. If the model isn't available, the editor still works; it never switches to cloud inference on its own.

The workspace blocks direct network connections. Send opens an isolated relay tab on Firebase Hosting. After Firebase App Check attestation through reCAPTCHA Enterprise, the workspace rechecks approval and hands off the exact previewed text. The relay uses Firebase AI Logic to send that text and the request settings to Gemini. The transcript isn't placed in the relay's URL, page content, or storage.

Gemini writes the user impact, retest steps, and a conditional possible fix in both languages. The workspace displays the returned card only if both versions preserve the exact approved before-and-after excerpts without translating or rewriting them. The app notes that the log alone cannot confirm the cause.

## Challenges

Pattern checks can block recognized private details or masking markers in the cloud excerpts, but they can't catch every name, address, or order number. Remove private details from both quotes and review the entire preview, or don't send. Editing the source or draft clears approval and any previous result. Withdrawing approval prevents an obsolete result from showing, but can't recall a request already sent. If a request fails, another attempt needs fresh approval and a new Send. Nothing retries or substitutes a result automatically.

## Accomplishments

We built two practice pages for the same delivery button: one has no accessible name, and the other is named “Change delivery address.” On fictional data, we verified an English on-device suggestion that found an extra name to mask. We also verified the hosted connected flow: approval alone made no cloud request, Send used the reviewed prompt, and Gemini returned both versions with the approved excerpts intact.

## What we learned

A transcript can show what changed for a tester without proving why. We keep the observed words separate from the explanation so a developer can retest the button's name and role rather than treating a suggested fix as a diagnosis.

## What's next

We want to make it easier to tell what changed between draft reviews and to retest a wider range of controls with assistive technology.

<!-- TODO (internal, source release): The source repository is private. Confirm authorization before publishing or adding a source link. -->
<!-- TODO (internal, phone): Consented Android TalkBack before/after footage is still pending. Replace the filming placeholders using actual speech; the example quotes are synthetic. Do not claim iOS VoiceOver support or testing. -->

## Built with

HTML, CSS, JavaScript, Vite, Chrome Prompt API (Gemini Nano), Firebase AI Logic, Gemini 3.5 Flash-Lite (Gemini Developer API), Firebase Hosting, Firebase App Check with reCAPTCHA Enterprise, Playwright, and axe-core.

## How to test

Open the [hosted workspace](https://replay-a11y-hybrid-2026.web.app/). Use fictional text; no personal log or local model is needed for these steps.

1. **Compare the accessible names.** Open [Before: unlabeled delivery button](https://replay-a11y-hybrid-2026.web.app/before.html) and [After: named delivery button](https://replay-a11y-hybrid-2026.web.app/after.html). Move focus to the delivery button on each page. The first has no accessible name; the second is named “Change delivery address.” Exact spoken wording depends on the screen reader and its settings.
2. **Review a Korean draft.** Click **합성 샘플 불러오기** (load the synthetic sample). The sample prepares a pattern-masked draft. In **카드에 들어갈 정확한 문구** (the exact draft text), review and manually remove any private details. If you want a local card, check **현재 문구를 이 기기에서 카드로 만드는 데 동의합니다.** and click **이 기기에서 카드 만들기**. Editing the draft clears that approval and hides the card.
3. **Try the connected cloud card from the same draft.** Keep one `수정 전:` line and one `수정 후:` line, with no private details or masking placeholders in either excerpt. Click **클라우드에 보낼 정확한 문구 미리보기** and review the instructions and both excerpts in the full preview. Only if you want Gemini to receive that exact text, check **개인정보가 없음을 확인했고, 위 문구 그대로 Gemini 클라우드에 보내는 데 동의합니다.** Then click **승인한 문구를 Gemini에 전송 (새 탭)** separately. Keep the relay tab open until it reports completion, then return to the workspace to read the English and Korean card and compare both sets of quotes with the preview. You don't need to make or approve a local card first.
4. **Optional fixed-sample alternative.** The separate [Approved cloud demo](https://replay-a11y-hybrid-2026.web.app/approved-demo.html) never receives your workspace draft. It uses a fixed synthetic prompt with its own approval and Send. You can open **View the saved bilingual example card** without sending anything. It is a labeled example, not a fresh Gemini response.
