# CLAUDE.md

Portfolio website for Maria Pozdnyakova (architectural designer, New Zealand). React 18 + Vite 5 + Firebase (Hosting, Auth, Firestore, Storage). No backend server.

**Read `HANDOVER.md` first**: architecture, data model, security model, layout editor, setup and known gaps. Keep it up to date when you change behaviour.

## Working in a fresh cloud session (repo comes from git)
- The repo is `myinsaneai/mparch-nz` on GitHub (private). The session has no `.env`, no Firebase login and no secrets, and must not ask for them. `npm install` and `npm run build` work without them; the Firebase-backed pages cannot load real data, so to check UI changes use a small throw-away Vite harness with mock project data (as done for the layout editor: mock images, no Firebase), and delete it afterwards.
- Work on a branch, not `main`; commit and push only when the owner asks, and tell the owner which branch to pull. The owner runs `npm run dev` and `npm run deploy` on their own machine.
- Before starting, read `HANDOVER.md` fully; update it in the same commit when behaviour changes.

## Commands
- `npm install`, `npm run dev` (local), `npm run build` (must pass before finishing), `npm run deploy` (build + `firebase deploy`, only when the owner asks).
- There is no test suite and no linter; verify UI changes by running the dev server and looking at the page (Playwright is a good way to check drag/resize behaviour).

## Rules
- **Never read, print, commit or paste secrets:** `.env`, service-account JSON, admin password, Firebase keys. `.env` is git-ignored; `.env.example` lists the variables. The admin email lives in `firestore.rules` / `storage.rules` as `REPLACE_WITH_ADMIN_EMAIL` in git.
- Do not run `firebase deploy` or change Firebase project settings unless asked.
- The owner works on Windows (`C:\React\mparch-nz`), repo `myinsaneai/mparch-nz`. Commit only when asked.
- Owner prefers being handed changes as complete files or a short summary of what to replace; explain in plain language.

## Things that are easy to get wrong
- **Page width is 860 px.** `.site` in `src/styles.css` and `PAGE_WIDTH` in `src/lib/layout.js` must stay in sync (editor canvas = 860 + 12 px item padding).
- **Layout grid is 192 x 192** (`COLS`, `ROW_DIV` in `layout.js`). `src/styles.css` (`.layout-grid`) hard-codes the same 192; change both together. Saved layouts store `cols`/`rowDiv`, and `rescale()` converts older ones.
- Layout items are `{id, x, y, w, h}` in grid cells, `id` = image id or `'legend'`. Image heights are always re-derived from width (`rowsForImage`), never trusted from storage.
- Public renderer (`ProjectLayout.jsx`) images fill their cells exactly (absolute, object-fit cover); do not give them intrinsic height or rows will stretch and misalign with the editor. Below 640 px everything stacks.
- `react-grid-layout` v2 API (hooks style, `gridConfig`, `compactor`, `constraints`). Its `createScaledStrategy` is wrapped in `LayoutEditor.jsx` to fix a drag-offset bug; keep that wrapper. `noOverlapCompactor` is used so moving one item never pushes others.
- Public button class is `.site-btn`; admin buttons use `.btn` in `admin.css`. Do not reuse one for the other.
- Themes are CSS-variable blocks `[data-theme='x']` in `styles.css` plus an entry in `src/lib/themes.js`.
- Images: originals up to 3840 px are uploaded untouched, larger ones resized to WebP; a 1600 px thumbnail is stored alongside (`projects/{id}/thumbs/`). Deleting a project deletes everything under `projects/{id}/`.
