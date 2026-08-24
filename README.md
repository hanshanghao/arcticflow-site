# Arctic Flow — Production Website

Marketing site for **Arctic Flow**, the all-in-one app for air-conditioning contractors: daily job booking, crew scheduling, invoicing, online payments, post-job extra charges and complete data security.

Pure static site — no build step, no dependencies. Deploy anywhere.

---

## The Field App (`app.html`) — live scheduling & invoicing

A real multi-device web app lives at `app.html`. Office staff get full schedule control; technicians sign in on their phones and see only their assigned jobs, customer details, map links, and can add extra charges, apply discounts/promos, record payments and generate digital invoices. Data syncs in **real time** through Firebase (free tier).

### One-time Firebase setup (~10 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (disable Analytics if you like).
2. In the project: **Build → Authentication → Get started → Email/Password → Enable → Save**.
3. **Build → Firestore Database → Create database → Start in production mode** (pick any region). A fresh database ships with **deny-all rules** — publish this repo's rules next (see below).
4. Project overview → **</> (Web app)** → register app (no hosting needed) → copy `appId` and `messagingSenderId` from the shown `firebaseConfig` into `js/app.js`. (`apiKey`, `authDomain`, `projectId` and `storageBucket` are already filled in.)

### Getting the security rules live (required)

`firestore.rules` only protects your data once it is published to Firebase. Two ways:

**Option A — one-time manual (2 minutes):** Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.

**Option B — automatic on every push (recommended):** this repo ships with a GitHub Actions workflow (`.github/workflows/deploy-firestore.yml`) that deploys `firestore.rules` whenever it changes. One-time setup:

1. Firebase Console → ⚙️ **Project settings → Service accounts → Generate new private key** (JSON file).
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: paste the **entire JSON file contents**
3. Push any change to `firestore.rules` (or run the workflow via its **Run workflow** button) — rules go live automatically.

Until the rules are live, sign-in works but every data read/write fails with "permission denied" (production-mode default).

7. Authentication → **Settings → Authorized domains** → add your deployed domain (e.g. `<you>.github.io` needs the bare domain, or `localhost` is already allowed).

**Optional but recommended:** enable App Check so only your app can touch your database (**Build → App Check → Apps → reCAPTCHA v3**, get the site key). Then paste it into `RECAPTCHA_SITE_KEY` at the top of `js/app.js`. Until then the app runs without it.

### Built-in connectivity & privacy settings

Already decided for you in `js/app.js` — no action needed:

- **Persistent sign-in** (`browserLocalPersistence`) — staff stay logged in across days; no repeated logins on their phones.
- **Offline-first Firestore cache** with a multi-tab manager — jobs open instantly, work continues offline (elevator, basement), everything syncs automatically when back online; consistent across browser tabs.
- **Auto long-polling detection** — keeps realtime sync alive on restrictive Wi-Fi / VPNs / corporate networks.
- **Zero third-party tracking** — no analytics, no ad SDKs; the only external calls are Firebase itself and Google Fonts.
- **App Check ready** — one paste of a key activates bot/abuse protection.
- **Hardened headers** (`_headers`) — clickjacking, MIME-sniffing and referrer-leak protection on every page.
- **Server-side privacy** — `firestore.rules` guarantee a technician's device can never read another technician's jobs, customer records or invoices; deactivated logins are locked out immediately.

### First run — master login

Open `app.html`. Since no accounts exist, you'll be asked to **create the master account** (this is your office admin). From there:

- **Team & logins tab → “+ New login”**: create every technician and office staff account. Each login is generated from your master profile and works immediately on any device.
- Technicians install the app on their phone: open the site → browser menu → **“Add to Home Screen” / “Install”**. It then runs fullscreen like a native app, even offline (cached shell + live data whenever connected).

### Who sees what

| | Office staff | Technician |
|---|---|---|
| Schedule (day planner) | ✅ view & edit all jobs | ➖ |
| All jobs list | ✅ | ➖ |
| My jobs | ➖ | ✅ only jobs assigned to them |
| Book / edit / delete job | ✅ | ➖ |
| Customer details + Maps link | ✅ | ✅ (their jobs) |
| Add service lines | ✅ | ➖ |
| Add/remove extra charges | ✅ | ✅ |
| Discount / promo offers | ✅ | ✅ |
| Status updates | ✅ any status | ✅ scheduled → in progress → completed |
| Record payment | ✅ | ✅ |
| Digital invoice (generate/print PDF) | ✅ all | ✅ their jobs |
| Team management / logins | ✅ | ➖ |

Every job card and invoice shows **who assigned the job** and the **assigned technician's name**, as required for accountability.

Security is enforced twice: the UI hides what a role can't do, and `firestore.rules` blocks it server-side (technicians can't read others' jobs or reassign work even with direct API calls).

---

## Structure

```
arcticflow-site/
├── index.html            Landing page
├── app.html              Field app (login → office/technician dashboards)
├── privacy.html          Privacy policy
├── terms.html            Terms of service
├── 404.html              Not-found page (GitHub Pages / Netlify pick this up automatically)
├── css/style.css         Landing styles
├── css/app.css           App styles
├── js/main.js            Landing behavior (deferred, dependency-free)
├── js/app.js             App logic — Firebase auth + Firestore realtime data
├── sw.js                 Service worker (offline shell, installable PWA)
├── firestore.rules       Server-side role security for the app
├── firebase.json         Firebase CLI config — deploys firestore.rules
├── .firebaserc           Pins the Firebase project (arcticflow-21jsh)
├── .github/workflows/    Auto-deploys rules on push (see setup above)
├── images/               OG cover, favicons, PWA icons
├── tools/generate-images.py   Regenerates everything in images/
├── robots.txt
├── sitemap.xml
├── site.webmanifest      PWA manifest (opens the app when installed)
├── _headers              Security headers (Netlify/Cloudflare Pages only)
└── .nojekyll             Required so GitHub Pages serves dot/underscore files as-is

Note: GitHub Pages cannot send custom HTTP headers, so `_headers` has no effect there.
The `Referrer-Policy` equivalent is inlined as a <meta> tag on every page instead.
Hosting on Netlify or Cloudflare Pages applies `_headers` automatically.
```

## Run locally

```bash
cd arcticflow-site
python3 -m http.server 8080
# open http://localhost:8080
```

## Launch on GitHub Pages

```bash
cd arcticflow-site
git init
git add .
git commit -m "Arctic Flow production site"
git branch -M main
git remote add origin https://github.com/<you>/arcticflow-site.git
git push -u origin main
```

Then: **repo → Settings → Pages → Source: `main` branch, `/` root → Save.**
Site goes live at `https://<you>.github.io/arcticflow-site/`.

Custom domain: add a `CNAME` file containing your domain, and point DNS at GitHub per their docs.

## Launch on WordPress

**Option A — subdomain (recommended).** Host this folder on Netlify/GitHub Pages/Cloudflare Pages and point `app.yoursite.com` at it. Your main WP site stays untouched; link to it from your menu.

**Option B — inside a WP child theme.**

1. Copy `css/`, `js/`, `images/` into `wp-content/themes/your-child-theme/arcticflow/`.
2. Enqueue assets in the child theme's `functions.php`:

```php
function arcticflow_assets() {
    if ( is_page( 'arctic-flow' ) ) {
        wp_enqueue_style( 'arcticflow', get_stylesheet_directory_uri() . '/arcticflow/css/style.css', [], '1.0.0' );
        wp_enqueue_script( 'arcticflow', get_stylesheet_directory_uri() . '/arcticflow/js/main.js', [], '1.0.0', true );
    }
}
add_action( 'wp_enqueue_scripts', 'arcticflow_assets' );
```

3. Create a page with slug `arctic-flow`, set its template to a blank/full-width template, then paste everything between `<main id="main"> … </main>` from `index.html` into a **Custom HTML** block.
4. Add `<div id="snow"></div>` and the `.bg-orbs` block right after `<body>` via the same Custom HTML block or a hook.

**Option C — quick & dirty.** Upload the whole folder via a file-manager plugin or cPanel into `public_html/` and serve it directly at `yoursite.com/arcticflow/`.

## Pre-launch checklist

Replace every placeholder before going live:

- [ ] **Domain**: find-replace `https://www.arcticflow.app` in `index.html`, `privacy.html`, `terms.html`, `robots.txt`, `sitemap.xml`
- [ ] **App Store URL**: `https://apps.apple.com/app/arctic-flow/id000000000` → real listing
- [ ] **Google Play URL**: `https://play.google.com/store/apps/details?id=app.arcticflow` → real package id
- [ ] **Email capture form**: create a free form at formspree.io, replace `your-form-id` in the CTA form action (or delete the form)
- [ ] **Social URLs**: `x.com/arcticflowapp`, `linkedin.com/company/arcticflowapp`, `instagram.com/arcticflowapp`
- [ ] **Legal pages**: review `privacy.html` / `terms.html` with counsel; update company name, jurisdiction, emails
- [ ] **Metrics**: hero stats (12k+ jobs, $4.2M, 4.9 rating) are illustrative — adjust to real numbers
- [ ] **Analytics**: add your GA4 / Plausible snippet before `</head>` if desired
- [ ] **Sitemap dates**: bump `<lastmod>` when content changes; submit sitemap in Google Search Console

## Regenerating images

Requires Python + Pillow (`pip install pillow`):

```bash
python3 tools/generate-images.py
```

Regenerates `og-cover.png` (1200×630 social card), app icons, apple-touch-icon and favicon.ico.
