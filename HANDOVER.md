# Handover: Maria Pozdnyakova portfolio site

Written so a new person (or a fresh Claude session) can pick this up with no other context.
Contains no secrets. Never add keys, passwords or `.env` contents to this file.

## 1. What this is

A portfolio website for **Maria Pozdnyakova**, Architectural Designer, BArch (Hons), New Zealand Licensed Building Practitioner.

- **Stack:** React 18 + Vite 5, React Router 6, Firebase (Hosting, Auth, Firestore, Storage). No backend server.
- **Public site:** menus, project lists, project pages, contact form.
- **Admin at `/admin`:** one email/password account manages everything.
- **Local folder (owner's machine):** `C:\React\mparch-nz`. Firebase project ID: `mparch-nz`, CLI alias `default`.

## 2. Original requirements (all built)

1. Design matches the three original screenshots: Work list (alternating image/title panels), Project page, Contact form.
2. Menus: Interior Design, Work, Contact. More menus can be added later, each with its own link.
3. Interior Design and Work are project lists. Each project has its own page at its own link.
4. Project page: title, location, main image, custom detail fields, gallery, "You may also like".
5. Admin: add projects, reorder projects (per list), manage a project, reorder images, delete images, delete projects (with all their image files).
6. Images resized to max 4K (3840 px long side) before saving to Firebase; smaller images are not upscaled.
7. Drop zone for image upload.
8. Admin can switch the site design on the fly.
9. Five alternative designs were requested and made as mockups.

## 3. Decisions made with the owner

| Question | Decision |
|---|---|
| Admin accounts | One email/password account |
| Categories | A project mainly belongs to one list, but can be on both |
| Project fields | Admin defines them per project (label/value pairs), not hard-coded |
| Contact form | Saved to Firestore for now. Email sending later (Firebase function/extension or third party) |
| Image storage | Images within 4K (JPEG/PNG/WebP/GIF, under 18 MB) are stored as the untouched original. Larger or other formats are scaled to max 3840 px and re-encoded (WebP q0.95). A 1600 px thumbnail is also stored for list/gallery pages |
| Deleting | Admin can delete single images and whole projects including all files |
| Default design | The original. Other themes are selectable in the admin |

## 4. Design board (mockups)

A private Claude design canvas holds the mockups: https://claude.ai/artifact/6GPFeNc4WNxnfzRL79RGoP (only the owner can open it unless shared).

- Row 1: five alternative directions: Editorial Index, Dark Gallery, Swiss Grid, Soft Studio, Blueprint.
- Row 2: the original Work, Project page and Contact pages.
- Mockups use placeholder blocks, not real images. The live themes are CSS variable sets, so they approximate the mockups (Blueprint has no sidebar menu in the live site).

## 5. How the code is organised

```
src/
  main.jsx, App.jsx        Routes. Admin is lazy-loaded (separate chunk)
  firebase.js              Firebase init from VITE_* env vars
  styles.css               All public styling. Themes = [data-theme='x'] CSS variable blocks
  context/
    SiteContext.jsx        Live settings/site doc (name, subtitle, menus, theme). Applies theme + font
    ProjectsContext.jsx    Live published projects. sortForCategory() orders by orders[categoryId]
  lib/
    themes.js              Theme registry: label, layout (rows|grid|index), fonts, swatches
    defaults.js            Default settings, default project field labels, reserved URL names
    image.js               Resize (max 3840) + thumbnail, upload, delete files, delete project folder
    slug.js
    layout.js              Page-layout model: grid constants, normalizeLayout, snapping, alignment helpers
  components/
    PublicLayout.jsx       Header/nav/footer shell
    ProjectLayout.jsx      Public renderer of a saved page layout (CSS grid)
    Legend.jsx             Project details text (shared by public page and editor)
  pages/
    MenuPage.jsx           One route for every menu: dispatches on menu.kind
    ProjectList.jsx        Rows / Grid / Index layouts
    ProjectPage.jsx        Project detail, lightbox, related
    ContactPage.jsx        Form -> Firestore `messages` (honeypot field included)
    ContentPage.jsx        Text page for future menus (e.g. About)
  admin/
    AdminApp.jsx, AuthContext.jsx, AdminLogin.jsx, AdminLayout.jsx
    ProjectsAdmin.jsx      List, drag-reorder per category, publish toggle, create, delete
    ProjectEditor.jsx      Details, categories, custom fields, images, delete
    LayoutEditor.jsx       Visual page-layout editor (react-grid-layout), see section 11
    ImageUploader.jsx      Drop zone, 2 parallel uploads
    SortableList.jsx       dnd-kit wrapper
    SettingsAdmin.jsx      Theme picker, site name/subtitle, menus
    MessagesAdmin.jsx      Contact messages
firestore.rules, storage.rules, firebase.json, .env.example
```

Routes: `/` redirects to the first menu, `/:menuPath` (menu page), `/project/:slug`, `/admin/*`.
Reserved URL names (cannot be used as menu or project slugs): `admin`, `project`.

## 6. Data model

**`settings/site`**
```
name, subtitle, theme ('original' | 'editorial' | 'dark' | 'swiss' | 'soft' | 'blueprint'),
menus: [{ id, label, path, kind: 'projects' | 'page' | 'contact', content? }]
```
A menu with `kind: 'projects'` is also a category projects can belong to (matched by menu `id`).
Until this doc is saved once from the admin, code falls back to `DEFAULT_SETTINGS`.

**`projects/{id}`**
```
title, slug, year, location,
categories: [menuId],            // can be more than one
orders: { [menuId]: number },    // position within each list (drag-reorder writes this)
fields: [{ label, value }],      // custom detail fields, shown beside the main image
images: [{ id, name, path, url, thumbPath, thumbUrl, width, height, size }],  // order = display order, first = cover
published: boolean, createdAt, updatedAt,
layout?: { v: 1, mode: 'grid', cols: 24, items: [{ id, x, y, w, h }] }   // optional, see section 11
```

**`messages/{id}`**: `{ name, email, message, createdAt }` (create allowed for anyone with validation; read/delete admin only).

**Storage:** `projects/{projectId}/{imageId}.webp` and `projects/{projectId}/thumbs/{imageId}.webp` (JPEG fallback if the browser can't encode WebP).

## 7. Security model

- Enforced by `firestore.rules` and `storage.rules`: only the admin email can write. Public can read published projects and settings, and create (not read) messages.
- The admin email is hard-coded in both rules files (placeholder `REPLACE_WITH_ADMIN_EMAIL` in the template). It must match `VITE_ADMIN_EMAIL` in `.env`.
- The UI check in `AuthContext.jsx` is cosmetic only; the rules are the real protection.
- Sign-up must be disabled in Firebase Auth (Authentication > Settings > User actions) so nobody else can register.
- The Firebase web API key is public by design and not a secret, but `.env` is still kept out of git.

## 8. Local setup (new machine)

1. Install Node 18+ and `npm install -g firebase-tools`.
2. `git clone <repo>` then `npm install`.
3. Create `.env` from `.env.example` (values from Firebase console > Project settings > Your apps > Web app config, plus `VITE_ADMIN_EMAIL`). Restart the dev server after any `.env` change.
4. Put the real admin email into `firestore.rules` and `storage.rules` if the placeholder is committed.
5. `firebase login`. `.firebaserc` comes with the repo (alias `default`, project `mparch-nz`).
6. `npm run dev` for local, `npm run deploy` for build + deploy of hosting and rules.

First run on a fresh Firebase project: sign in at `/admin`, open **Site, menus & design**, press **Save changes** once to create `settings/site`, then add projects (they start as drafts; switch to Published).

## 9. Status

- Public site, admin, theme switching, image pipeline, rules and the visual page-layout editor (section 11) are implemented and deployed; `npm run build` succeeds.
- The public page is 860 px wide on desktop (`.site` in `styles.css`; `PAGE_WIDTH` in `layout.js` must match).
- The code was written and build-checked without access to the real Firebase project. The owner has since run it and reports it works "more or less", so small issues may remain.
- Not yet done: real content/images, final choice of design, contact email delivery.
- Re-upload old images if they were uploaded before the quality fix (originals up to 3840 px are now kept untouched; thumbnails 1600 px).

## 10. Known gaps and ideas for next steps

- **Contact email:** messages only land in Firestore. Add the "Trigger Email from Firestore" extension or a Cloud Function on `messages/{id}` create (needs the Blaze plan), or a third-party form service.
- **Spam protection:** only a honeypot field. Consider Firebase App Check if spam appears.
- **Settings cache:** `SiteContext` keeps the last site settings (menus, name, theme) in `localStorage` (`site-settings-v1`) and shows them instantly on the next visit; on a visitor's very first visit the menu stays empty until Firestore answers, so the built-in default menu never flashes.
- **Theme fidelity:** themes share three list layouts and the same page structures. Matching a mockup exactly (e.g. Blueprint sidebar) needs component changes.
- **Bundle size:** main chunk ~690 KB (180 KB gzipped); Vite warns. Could split Firebase/React vendor chunks with `build.rollupOptions.output.manualChunks`.
- **SEO/sharing:** only a per-page `<title>`. Add meta description and Open Graph tags per project if needed (SPA, so consider prerendering).
- **Admin polish:** reorder is disabled in the "All projects" tab by design (order is per list). No bulk image caption/alt-text editing; gallery images have empty alt text.
- **Image processing** happens in the browser (canvas). Very large images on low-memory phones may fail; desktop recommended for uploads.
- **Deleting a project** lists and removes everything under `projects/{id}/` in Storage, then deletes the Firestore doc. If it is interrupted midway, retry the delete.

## 11. Page layout editor (grid), added after the first release

Each project page can be arranged visually in the admin (Project editor > "Page layout"). Library: `react-grid-layout` v2 (MIT).

- **What can be arranged:** every image, plus the details text (fields + "Year Created") as one rectangle (`id: 'legend'`). Items are dragged and resized on a fine 192 x 192 grid (about 4.5 px steps on an 872 px canvas; one row is 1/192 of the page width), drawn with vertical and horizontal grid lines.
- **Images** keep their proportions on resize (built-in `aspectRatio` constraint, and `rowsForImage()` re-derives the height from the width on every load, so it cannot drift).
- **Text box** keeps the site's text style, wraps inside its width, and can never be made shorter than its text (measured in the editor). On the public page its rows are `minmax(row, auto)`, so on narrow screens the box grows instead of clipping.
- **Editor fidelity:** the canvas is drawn at 872 px (the 860 px content width plus item padding; `PAGE_WIDTH` in layout.js, keep in sync with `.site` in styles.css) and scaled down to fit, so text wraps like on a desktop visitor's screen. It uses the active theme's colours and fonts.
- **Public rendering:** `src/components/ProjectLayout.jsx` is a CSS grid with the same 192 columns and row size (`container-type: inline-size`, rows `calc(100cqw / 192)`). Below 640 px width everything stacks in reading order (top to bottom, then left to right).
- **Backwards compatible:** a project with no saved `layout` still renders the original fixed arrangement (`ProjectPage.jsx` legacy branch). The layout is only used after the admin presses "Save layout".
- **Self-healing:** `normalizeLayout()` drops items for deleted images and appends new images at the bottom, three per row, so adding or deleting images never breaks a saved layout.
- **Snapping and guides:** while moving or resizing, edges and centres snap to neighbours within 3 cells (about 13 px; can be turned off with the "Snap to neighbours" checkbox or by holding Alt) (`neighbourSnap` constraint in `LayoutEditor.jsx`, helpers `snapPosition/snapSize/alignmentGuides` in `layout.js`) and pink guide lines show what lines up.
- **Align buttons:** click an item to select it, then Left / Centre / Right (against the nearest item above or below) or Top / Middle / Bottom (against the nearest item beside it). `alignNeighbour` / `alignedPosition` in `layout.js`.
- **Old layouts:** layouts saved with another `cols`/`rowDiv` (the first release used 24 x 48) are scaled to 192 x 192 automatically by `rescale()` in `normalizeLayout`.
- **Scaled canvas drag:** react-grid-layout's `createScaledStrategy` ignores the canvas offset on the page, so `LayoutEditor.jsx` wraps it with its own `calcDragPosition`. Keep that if you upgrade the library.
- **CSS note:** the public button class is `.site-btn` (it used to be `.btn`, which leaked into the admin and made admin buttons unreadable).
- **Layout is saved separately** from "Save changes" (its own button), and writes only the `layout` field.

### Moving to free positioning later

The stored numbers are plain cell units, so nothing has to be redone per project. To go finer or fully free:
1. Increase `COLS` and `ROW_DIV` in `src/lib/layout.js` (for example 384 / 384) and multiply every saved x, y, w, h by the same factor in a one-off migration (the layout stores `cols`, so old and new layouts can be told apart).
2. Or replace the editor with a free-drag component (react-rnd or react-moveable) that writes percentages of the page width, and render with absolute positions. The aspect-ratio rule and the phone fallback (stack in reading order) carry over unchanged.
3. The public renderer and the text-box behaviour (grow instead of clip) stay as they are.

### Known limits of the layout editor

- Desktop layout only; phones always stack. A separate hand-made phone layout is not supported yet.
- Positions snap to the grid (about 4.5 px steps on an 872 px canvas). Items may overlap and nothing is pushed around when you move one (`noOverlapCompactor`); the selected item is drawn on top.
- A new image is added at the bottom of the layout, not where the admin last clicked.

## 12. Working with Claude on this

The git repository is the single source of truth. A new Claude session should be given the repo (GitHub `myinsaneai/mparch-nz`, private) and start by reading this file and `CLAUDE.md`, which carries the working rules and traps. `CLAUDE.md` is also loaded automatically by Claude Code if it is ever used.

- A cloud session has no `.env` and no Firebase login, by design. It can `npm install` and `npm run build`, and check UI with a throw-away mock-data harness. Real data, `npm run dev` against Firebase and `npm run deploy` happen on the owner's machine after pulling.
- Ask Claude to work on a branch and to update this handover in the same commit as any behaviour change.
- Useful context:
  - Themes: add a `[data-theme='name']` block in `src/styles.css` and an entry in `src/lib/themes.js`.
  - New menu types need a branch in `src/pages/MenuPage.jsx` and an option in `SettingsAdmin.jsx` (`KINDS`).
  - Keep secrets out of chat and out of git: `.env` values, admin password, any service-account JSON.
