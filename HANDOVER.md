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
| Image storage | Full image (max 4K) plus a ~900 px thumbnail for list pages |
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
published: boolean, createdAt, updatedAt
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

- Public site, admin, theme switching, image pipeline and rules are all implemented, and `npm run build` succeeds.
- The code was written and build-checked without access to the real Firebase project. The owner has since run it and reports it works "more or less", so small issues may remain.
- Not yet done: real content/images, final choice of design, contact email delivery.

## 10. Known gaps and ideas for next steps

- **Contact email:** messages only land in Firestore. Add the "Trigger Email from Firestore" extension or a Cloud Function on `messages/{id}` create (needs the Blaze plan), or a third-party form service.
- **Spam protection:** only a honeypot field. Consider Firebase App Check if spam appears.
- **Theme fidelity:** themes share three list layouts and the same page structures. Matching a mockup exactly (e.g. Blueprint sidebar) needs component changes.
- **Bundle size:** main chunk ~690 KB (180 KB gzipped); Vite warns. Could split Firebase/React vendor chunks with `build.rollupOptions.output.manualChunks`.
- **SEO/sharing:** only a per-page `<title>`. Add meta description and Open Graph tags per project if needed (SPA, so consider prerendering).
- **Admin polish:** reorder is disabled in the "All projects" tab by design (order is per list). No bulk image caption/alt-text editing; gallery images have empty alt text.
- **Image processing** happens in the browser (canvas). Very large images on low-memory phones may fail; desktop recommended for uploads.
- **Deleting a project** lists and removes everything under `projects/{id}/` in Storage, then deletes the Firestore doc. If it is interrupted midway, retry the delete.

## 11. Working with Claude on this

To continue in a new Claude session, share this file plus the repo and say what to change. Useful context:
- Themes: add a `[data-theme='name']` block in `src/styles.css` and an entry in `src/lib/themes.js`.
- New menu types need a branch in `src/pages/MenuPage.jsx` and an option in `SettingsAdmin.jsx` (`KINDS`).
- Keep secrets out of chat and out of git: `.env` values, admin password, any service-account JSON.
