# Replay A11y (다시듣기)

Compare before/after screen-reader speech, redact a draft, and review the exact text before creating an accessibility issue card. The phone pages demonstrate the same delivery control with and without a descriptive accessible name. All included examples are fictional.

## Install and run

Use Node.js 25 with npm and, for browser tests, an installed desktop Google Chrome. From the repository root:

```sh
cd v2
npm ci
npm run build
npm run preview
```

Open <http://127.0.0.1:4173/>. The app lives in `v2/`; the two source pages in sibling `phone/` are copied byte-for-byte into `v2/dist/`. No Firebase account, CLI, secrets, QA files, or parent checkout are needed. `/before.html` and `/after.html` demonstrate the accessibility comparison, and `/approved-demo.html` shows the separate cloud approval flow. The normal build leaves live cloud Send disabled.

## Local workspace

1. Load an English or Korean synthetic sample, paste text, or select a local UTF-8 `.txt` file (up to 8,000 JavaScript string units). `Before:` / `After:` and `수정 전:` / `수정 후:` pairs are optional.
2. Prepare the draft. Rules mask common phone, email, amount, and address formats. These rules miss things; review and edit the draft yourself. Only explicitly marked English source **and** eligible English draft text can request optional on-device redaction suggestions. This is a conservative character check, not reliable language detection. Korean, mixed-script, unconfirmed, and unavailable-model cases use rules and manual editing without cloud fallback. Model availability depends on Chrome, the profile and hardware; Chrome can download model components itself.
3. Inspect the exact draft, check the local approval box, and create the card. Approval is tied to that draft; changes invalidate it. The app reapplies the masking rules and uses the before/after pair, if safe to display, rather than publishing the whole draft. This is not approval to share, and there is no upload from the workspace.

Each card has the same four sections in English and Korean. The observation quotes are preserved in their original language rather than translated. Review the card before using it.

| English | 한국어 | What to include |
| --- | --- | --- |
| Observed | 관찰 결과 | Before/after utterances, when both are safe to show |
| User impact | 사용자 영향 | How the change affects screen-reader users |
| Retest steps | 재검증 절차 | How to reproduce the comparison |
| Possible fix | 가능한 수정 | A suggestion, not a confirmed cause |

## Privacy and cloud boundary

The workspace uses no app-side persistence or telemetry and has `connect-src 'none'`. The optional model path requires the Chrome Prompt API, asks Firebase AI Logic for on-device inference only, and accepts only a verified on-device result. The browser/OS and installed extensions are outside these app controls. Redaction is not an anonymization guarantee; use fictional data for demonstrations and review manually before sharing any card.

The cloud page has no editor, import, or data handoff. Its model prompt is the fixed instruction plus the literal synthetic comparison (`Before: Button` and `After: Change delivery address, Button` on separate lines). Gemini may choose only one of two recommendation codes; the bilingual card wording is preset. The UI previews the complete prompt, requires human approval, and requires a distinct Send action before requesting Firebase settings, reCAPTCHA Enterprise App Check attestation, and Gemini via Firebase AI Logic. Transport also includes a response schema, routing and attestation metadata; revocation cannot recall an already dispatched request. There is no route for raw transcripts, draft text, local model output, or the fictional address on the phone page to be sent by this UI. Approval is not a server-side abuse control.

This standalone candidate does not target a live Firebase project. The example issue card is hand-written, not a stored model response. Cloud transport is exercised only against intercepted synthetic responses in tests. A reCAPTCHA Enterprise **site ID/site key** is a public browser identifier, not an App Check debug token, service credential, or private key. No production site ID, Firebase API key, token, or private credential is bundled here. Do not add credentials to this repository.

## Tests

From `v2/`, run `npm test` for local and permission-restricted simulation unit tests, a regular production build, and Playwright + axe using installed Chrome. Playwright uses a separate test build with inert App Check data; the browser provider and cloud transport are simulated, not live Gemini runs. The suite does not replace manual screen-reader testing. If port 4173 is occupied, set `REPLAY_TEST_PORT` to another loopback port (for example, `REPLAY_TEST_PORT=4183 npm test` in a POSIX shell or `$env:REPLAY_TEST_PORT='4183'; npm test` in PowerShell).

## License

[MIT](LICENSE). Third-party dependencies are distributed under their own licenses.
