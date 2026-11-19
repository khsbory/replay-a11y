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

On desktop Chrome, leave the hosted workspace in its default English UI and choose **Load English synthetic sample**. The fictional delivery case compares `Button` with `Change delivery address, Button`. Review **Exact text for the card**. On a supported Chrome profile, you can optionally choose **Get on-device model suggestions**, review the proposed mask for the fictional name, and choose **Apply additional redactions** if both excerpts are unchanged. Otherwise, edit by hand as needed. The local card is optional too.

From that same draft, choose **Preview exact text to send to the cloud**. Read **Utterances that will be sent** first, then **Instructions sent with them**. If you want to send and nothing private remains, check **I checked that there is no private information and approve sending this exact text to Gemini in the cloud.** Approval alone sends nothing. Separately choose **Send approved text to Gemini (new tab)**. Keep **Gemini relay** open until it says **Cloud card received. Return to the workspace.** Choose **Close relay tab**, then check that both languages of **Bilingual issue card written by Gemini** preserve the approved English quotes.

To test Korean sample text without changing the English UI, choose **Load Korean synthetic sample** and use pattern redaction and manual editing instead of the on-device model.
