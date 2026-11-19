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

Open <http://127.0.0.1:4173/>. The normal build needs no Firebase account, CLI, credentials, or parent checkout. It supports local cards and previewing the cloud prompt, but neither cloud flow can send. The source pages in `phone/` are copied byte-for-byte into `v2/dist/` as `/before.html` and `/after.html`; try focusing the delivery edit button to compare its accessible name.

## Local workspace

1. Load an English or Korean synthetic sample, paste text, or select a local UTF-8 `.txt` file (up to 8,000 JavaScript string units). `Before:` / `After:` and `수정 전:` / `수정 후:` pairs are optional.
2. Prepare the draft. Rules mask common phone, email, amount, and address formats. These rules miss things; review and edit the draft yourself. Only explicitly marked English source **and** eligible English draft text can request optional on-device redaction suggestions. This is a conservative character check, not reliable language detection. Korean, mixed-script, unconfirmed, and unavailable-model cases use rules and manual editing without cloud fallback. Model availability depends on Chrome, the profile and hardware; Chrome can download model components itself.
3. Inspect the exact draft, check the local approval box, and create the card. Approval is tied to that draft; changes invalidate it. The app reapplies the masking rules and uses the before/after pair, if safe to display, rather than publishing the whole draft. Local approval does not authorize a cloud request, and cloud approval does not require a local card.

Each card has the same four sections in English and Korean. The observation quotes are preserved in their original language rather than translated. Review the card before using it.

| English | 한국어 | What to include |
| --- | --- | --- |
| Observed | 관찰 결과 | Before/after utterances, when both are safe to show |
| User impact | 사용자 영향 | How the change affects screen-reader users |
| Retest steps | 재검증 절차 | How to reproduce the comparison |
| Possible fix | 가능한 수정 | A suggestion, not a confirmed cause |

## Connected cloud workflow

On a live-configured deployment, the workspace can ask Gemini to write a bilingual issue card from the reviewed comparison, not just from a fixed sample.

1. Edit the draft to contain exactly one `Before:` / `After:` pair (or `수정 전:` / `수정 후:`). Preview the **entire Gemini user message**, including its instructions, up to 1,000 UTF-16 code units. Other lines are excluded. The app blocks known private values and redaction markers in the selected quotes, but it can miss private details. Read the whole preview and don't approve if anything private remains.
2. Check the separate cloud approval box, then click **Send**. Preview and approval alone make no cloud requests. Send opens a same-origin relay at `/cloud-relay.html` without a window opener. The URL fragment carries only a random, short-lived channel identifier and is removed before provider code loads. After App Check attestation, the workspace rechecks the source, draft, preview, and approval and grants the relay only the exact previewed message. The workspace itself retains `connect-src 'none'`. Raw records and full drafts are not handed to the relay or saved by the app; App Check may store its own attestation state. The cloud request also carries SDK settings, routing, and attestation metadata.
3. Keep the relay open and return to the workspace for the result. The relay accepts one completed `IN_CLOUD` bilingual JSON result; the workspace validates the card again and renders it as text. Both editions must quote the before/after lines verbatim. Review Gemini's impact, retest steps and tentative fix before using the card: the log alone cannot confirm the cause.

Changing the original or draft, applying a redaction suggestion, withdrawing approval, leaving the workspace, or closing the relay cancels the attempt. The app discards stale results; cancellation cannot recall a request already sent. Failure consumes approval. A retry requires new approval and another Send; there is no automatic retry or local fallback for the cloud card.

`/approved-demo.html` is optional. It previews a fixed fictional delivery comparison and never receives workspace data. If configured, it lets Gemini choose from two recommendation codes; the card text is preset. Its saved example is explicitly not a model response.

The local suggestion flow is separate: it requires Chrome's Prompt API, requests only on-device inference, and accepts only an on-device response. The workspace has no app-side persistence or telemetry. These controls do not cover the browser, OS, or extensions. Redaction is not anonymization; use fictional data for demos and review any card before sharing.

## Enable live mode (project owners only)

The repository has no live project binding. Provision a Firebase web app and Hosting on the project's own origin, enable Firebase AI Logic with the Gemini Developer API backend and access to `gemini-3.5-flash-lite`, and configure App Check with a domain-restricted reCAPTCHA Enterprise score key. Restrict the Firebase browser key to the intended origins and required APIs; configure quotas and App Check enforcement on the project. The UI approval gate is not a server-side abuse control.

In `v2/`, create the ignored `cloud-config.json.local` with exactly these three public browser identifiers, replacing the example values with those of your own project:

```json
{
  "projectId": "your-firebase-project",
  "appId": "1:000000000000:web:0000000000000000000000",
  "siteKey": "replace_with_public_recaptcha_site_key"
}
```

Run `npm run build -- --mode connected-live` to generate `dist/`. This explicit mode requires a valid local config file; the ordinary build ignores it. The live build embeds these public identifiers and narrows the cloud pages' CSP to the configured App Check and model routes. No Firebase API key is read from the file: after Send, the relay or demo reads the same-origin Firebase Hosting endpoint `/__/firebase/init.json` and checks the returned project and app IDs before using its browser settings. Do not add API keys, App Check debug tokens, service accounts, or other credentials to this repository. The project owner supplies the Hosting target separately and serves `dist/` at the origin root with the headers in `v2/firebase.json`. Vite preview does not provide Firebase's reserved settings or Hosting headers. A normal build (including `npm test`) regenerates `dist/` with live Send disabled.

## Tests

From `v2/`, run `npm test` for local unit tests, a network-denied SDK simulation, a regular production build, and Playwright + axe using installed Chrome. Browser tests use synthetic fixtures in a separate `dist-test/` build (never deploy it). They intercept App Check and Gemini traffic, substitute the Chrome model boundary, and cover relay isolation, exact payloads, approval and cancellation, invalid responses, and the default build's disabled cloud controls. They do not download a browser or model, call live Google services, verify live Hosting or inference, or replace manual screen-reader testing. If port 4173 is occupied, set `REPLAY_TEST_PORT` to another loopback port (for example, `REPLAY_TEST_PORT=4183 npm test` in a POSIX shell or `$env:REPLAY_TEST_PORT='4183'; npm test` in PowerShell).

## License

[MIT](LICENSE). Third-party dependencies are distributed under their own licenses.
