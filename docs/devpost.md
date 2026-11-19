## Inspiration

Replay A11y (다시듣기) started with a real Android TalkBack logger used by a blind accessibility specialist. A screenshot can show where an icon sits, but it can't tell a developer that TalkBack gave the tester only “Button” and no clue what the button did. A speech log can supply that missing evidence. It can also pick up a name, address, or order total that has no business being in a bug report. We built Replay to help a tester keep the useful words and review what to leave out.

## What it does

Replay compares before-and-after screen-reader announcements and turns a reviewed comparison into an issue card in English and Korean. In the local-only workspace, you can load a fictional sample, paste a transcript, or open a local UTF-8 text file. Rules mask common phone number, email, amount, and address formats. You edit the draft and approve its exact wording before creating the card. An edit clears that approval and hides the previous card. The card quotes the comparison when both lines can be shown; it doesn't reproduce the whole transcript. Nothing is uploaded from the workspace.

The public site also has a separate cloud demo. It previews one fixed synthetic comparison and asks for explicit approval followed by a separate Send click. It has no editor, upload field, or handoff from the local workspace. Your transcript, edits, and local model suggestions never become the cloud demo's input.

## How we built it

The workspace is a browser app built with HTML, CSS, JavaScript, and Vite. Rules run first, and manual review works without a model. For an explicitly marked English record that passes the source and draft checks, we can ask Chrome's built-in model for extra redaction suggestions through Firebase AI Logic. The workspace checks for the Chrome Prompt API, requests on-device inference only, and accepts only an on-device result. Its content security policy blocks app network connections. Any suggestions are previewed before you apply them.

On the separate Firebase Hosting cloud page, the Send action obtains production Firebase App Check attestation through reCAPTCHA Enterprise before making the Gemini request through Firebase AI Logic. Gemini can choose one of two tentative fix codes. The app supplies the bilingual report wording and preserves the comparison quotes in their original language.

## Challenges

Korean and mixed-language records use rules and manual editing; they don't call the model. If desktop Chrome can't run the optional English model on your device or profile, the editor still works, with no cloud fallback. The rules miss things, so a redacted draft still needs a human review before anyone shares it.

Production App Check is part of the hosted cloud path. A live run succeeded in QA, but a new request can still fail attestation or inference. If that happens, the page offers a labeled saved example, not a new Gemini result. The standalone release candidate has no live App Check configuration and leaves cloud Send disabled by design.

## Accomplishments

We made two practice pages for the same delivery button: one has no accessible name, and the other is named “Change delivery address.” We also verified two distinct model paths on fictional data: in one desktop Chrome setup, the English on-device suggestion found an extra name to mask; in a separate hosted QA run, production App Check and Gemini succeeded on the fixed cloud sample. Neither run used a real user log.

## What we learned

A transcript can show what changed for a tester without proving why it changed. That's why the card separates the observed words from user impact, retest steps, and a possible fix. The next developer can check the button's name and role instead of treating a suggested fix as a diagnosis.

## What's next

We want to retest the before and after pages with TalkBack on an Android phone and add a consented recording. An actual phone recording hasn't been supplied for this submission; the sample quotes are synthetic. This release does not include iOS VoiceOver support or testing. The demo is public, but public release of the source has not yet been authorized.

## Built with

HTML, CSS, JavaScript, Vite, Chrome Prompt API (Gemini Nano), Firebase AI Logic, Gemini 3.5 Flash-Lite (Gemini Developer API), Firebase Hosting, Firebase App Check with reCAPTCHA Enterprise, Playwright, and axe-core.

## How to test

Open the [public demo](https://replay-a11y-hybrid-2026.web.app/). You can try all three flows without Chrome's local model. Use the fictional samples; you don't need to provide a personal log.

1. **Compare the button's accessible name.** Open [Before: unlabeled delivery button](https://replay-a11y-hybrid-2026.web.app/before.html) and [After: named delivery button](https://replay-a11y-hybrid-2026.web.app/after.html). In each page, move focus to the delivery button (Tab on desktop, or use TalkBack navigation on Android). The first button has no accessible name; the second is named “Change delivery address.” Exact spoken wording depends on the screen reader and settings.
2. **Make a local card without a model.** In the [local-only workspace](https://replay-a11y-hybrid-2026.web.app/), click **합성 샘플 불러오기** (load the Korean synthetic sample). The sample button prepares the pattern-masked draft automatically. Edit **카드에 들어갈 정확한 문구** (the exact draft text), then check **현재 문구를 이 기기에서 카드로 만드는 데 동의합니다.** (approve creating a card on this device). Click **이 기기에서 카드 만들기** (create the card on this device) and read the English and Korean versions. Edit the draft again to see the card disappear and approval reset. If you'd rather start with English sample text, click **영어 합성 샘플 불러오기** and skip the optional model button.
3. **Inspect the separate synthetic cloud demo.** Open [Approved cloud demo](https://replay-a11y-hybrid-2026.web.app/approved-demo.html) and click **Select approved synthetic sample**. Read the exact prompt: the instruction plus `Before: Button` and `After: Change delivery address, Button`. To try a live request, check **I approve sending exactly this synthetic prompt to Gemini in the cloud.** and click **Send approved sample to Gemini**. Or open **View the saved bilingual example card** without sending anything. The saved example is also available if the live request fails, and it isn't a fresh response. Neither route uses the text from step 2.
