# Whiteboard verification — 2026-11-16

## Automated checks

| Suite | Result | Coverage |
|---|---:|---|
| `dotnet test tests/DameDast.Tests/DameDast.Tests.csproj` | 63 passed | Existing financial behavior and migrations; element CAS; idempotency; CSRF; view/share/revoke authorization; two real SignalR clients reconnecting through Long Polling, independent edits, cursor delivery and preserving a peer's element after undo |
| `npm test` | 71 passed | Existing finance, organizer, assets, numbers, calendar, bridge and desk behavior |
| `npm run test:whiteboard` | 8 passed | Corrupt data, bindings, independent merges/conflicts, in-flight edits, serial writes, quota retry, operation retry and ordinal fractional layer order |
| Hosted Worker `npm test` | 27 passed | Existing OAuth/finance/market behavior; actual SQLite CAS and receipts with an R2 test adapter; tenant isolation; CSRF; storage failures and preserving canvas metadata during legacy edits |
| `npm run build:whiteboard` | Passed | TypeScript checking, pinned official package, Vite bundle, self-hosted fonts and asset manifest |
| `.NET Release build` | Passed | 0 warnings, 0 errors |
| Hosted Worker build | Passed | Embedded PWA bundle, D1/R2 storage and honest capability flags |

169 automated tests passed. The R2 adapter test verifies the contract with an in-memory object store; it is not a production R2 outage drill. OAuth security was tested with provider fixtures; a real Google account flow was not completed because the user's Client ID and Client Secret are absent.

## Browser acceptance

| Scenario | Observed result |
|---|---|
| Open canvas from handwriting notes | Fullscreen iframe, floating controls; existing note is indexed and saved |
| Three shapes, Persian/English labels, two bound arrows and image | Inserted with the official conversion API; native clipboard and editable export contain nine elements, one binary image and both start/end bindings |
| Drag and resize first shape | Label moves with shape; attached arrow reroutes |
| Undo and redo a resize; zoom in; Fit content | Native buttons operated successfully |
| Close editor, reload parent app and reopen note | Modified geometry, Persian text, arrows, image and note preview recovered |
| Import a valid editable file | Recovered diagram and image |
| Import malformed JSON document | Persian error message shown; open diagram retained |
| Editable, PNG and SVG export | Actual files retrieved and parsed; PNG 2× measured 1800×780 on the moved diagram; SVG 2× measured 1860×780 on the freshly inserted sample; embedded raster and Vazir font present |
| Distinct drawing/app menus | Drawing menu is pencil + three dots; app menu remains a hamburger; both operated |
| App menu over editor | Glass sidebar/backdrop overlays canvas, without pushing its content |
| Responsive 390×844 viewport | Actual app rendered in a same-origin QA frame; toolbar, title, actions and misc tools separated, Fit content available; native file drawer and diagram operated |
| Light/dark and Fa/EN | Native tools and custom controls switch; bundled Persian locale explicitly registered; some advanced upstream strings fall back to English |

Browser export artifacts were retrieved from the standalone editor. The browser automation bridge cannot download blob links inside embedded frames; this is a verification limit for the embedded download interaction. The ordinary embedded export UI uses the same prepared file and download link.

No physical Android device, stylus hardware, pressure sensitivity, Android IME, IIS WebSocket deployment or multi-replica backplane was available for hands-on testing. Two-client disconnect/reconnect was checked in the .NET integration suite, not with two separately signed-in browser accounts. Storage-error recovery was exercised with a quota-failing writer, without exhausting a real browser profile.

The hosted preview supports authenticated document storage with D1/R2 after Google OAuth configuration. SignalR rooms and share links require the .NET server and are explicitly disabled on the Worker host. Personal component libraries currently persist locally; the .NET library API exists but the UI does not sync that library to other devices.

## Sample and implementation contracts

- `samples/sample-flowchart.excalidraw`: actual editable diagram copied/exported from the browser, with the first shape moved/resized.
- `samples/sample-flowchart.png`: raster output of the moved diagram.
- `samples/sample-flowchart.svg`: portable SVG output of a fresh three-shape sample, with a font embedded.
- Document schema v1 excludes selection, hover and viewport. Excalidraw's own element version/index/binding fields and binary files remain intact.
- Server patches compare one expected version per changed element. Same-element conflicts are explicit; independent elements merge. Remote updates use `CaptureUpdateAction.NEVER` so they do not enter local engine history.
- Limits and hosting/deployment instructions: [WHITEBOARD-fa.md](WHITEBOARD-fa.md).
