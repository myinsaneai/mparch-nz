# Portfolio site (React + Vite + Firebase)

Public portfolio with a built-in admin at `/admin`. Hosting, database, file storage and login all run on Firebase.

## What it does

- **Menus** (Interior Design, Work, Contact by default) come from Firestore, so new menus added in the admin get their own link automatically. A menu can be a project list, a text page, or the contact form.
- **Project lists** show each project's cover image, title and year. **Project pages** (`/project/<url-name>`) show the main image, your custom fields, a gallery with a lightbox, and "You may also like".
- **Admin** (`/admin`, one email/password account):
  - add, edit and delete projects (deleting also removes every image file from Storage)
  - drag to change the order projects appear in on each list
  - a project can be on one or both lists
  - define your own fields per project (Project Type, Software, ...)
  - drop-zone image upload, drag to reorder images, first image is the cover, delete single images
  - images over 4K (3840 px on the long side) are resized in the browser before upload; a small thumbnail is stored too
  - edit site name/subtitle and menus
  - **switch the whole site design on the fly** (Original, Editorial Index, Dark Gallery, Swiss Grid, Soft Studio, Blueprint)
  - read and delete contact form messages (stored in Firestore)

## One-time Firebase setup

1. Create a project at https://console.firebase.google.com and add a **Web app**. Copy the config values.
2. **Authentication** > Sign-in method > enable **Email/Password**. Add your admin user (Users tab).
   Then Authentication > Settings > User actions > turn **off** "Enable create (sign-up)" so nobody else can register.
3. Create a **Firestore** database (production mode) and enable **Storage**.
4. Copy `.env.example` to `.env` and fill in the values, including `VITE_ADMIN_EMAIL`.
5. Open `firestore.rules` and `storage.rules` and replace `REPLACE_WITH_ADMIN_EMAIL` with the same admin email.
6. Install the CLI and deploy:

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project
npm install
npm run deploy            # builds, then deploys hosting + rules
```

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173, then http://localhost:5173/admin to sign in.

## First run

The site works before any content exists. Sign in at `/admin`, open **Site, menus & design** and press **Save changes** once (this creates the settings document), then add projects under **Projects**.
New projects start as drafts; switch them to **Published** to show them on the site.

## Adding a new design

Designs are CSS variable sets in `src/styles.css` (`[data-theme='name']`) plus an entry in `src/lib/themes.js`. Each picks one of three list layouts: `rows`, `grid` or `index`. Anything beyond that (a different page structure) needs a small component change.

## Contact form email later

Messages are saved in the `messages` collection. To get them by email, add the Firebase "Trigger Email from Firestore" extension or a Cloud Function on `messages/{id}` onCreate; no change to the site is needed.

## Project layout

```
src/
  firebase.js          Firebase init (reads .env)
  lib/                 image resize/upload, themes, defaults
  context/             live site settings + published projects
  pages/               public pages
  admin/               admin UI (loaded only when visiting /admin)
firestore.rules  storage.rules  firebase.json
```
