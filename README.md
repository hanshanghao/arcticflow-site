# Arctic Flow — Production Website

Marketing site + field app for **Arctic Flow**, the all-in-one platform for air-conditioning contractors: daily job booking, crew scheduling, invoicing, online payments, post-job extra charges and complete data security.

Pure static site — no build step, no dependencies. Deploy anywhere.

**Live:** https://arcticflow-21jsh.web.app

---

## How It Works

1. Master admin creates team accounts with email, password, role, and validity period
2. Team members sign in at `app.html` with their credentials
3. Users with expired access are automatically locked out
4. Master admin controls all accounts from the "Team & Logins" tab

---

## The Field App (`app.html`)

A real multi-device web app. Office staff get full schedule control; technicians sign in on their phones and see only their assigned jobs, customer details, map links, and can add extra charges, apply discounts/promos, record payments and generate digital invoices. Data syncs in **real time** through Firebase.

### One-time Firebase setup (~10 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (disable Analytics if you like).
2. **Build → Authentication → Get started → Email/Password → Enable → Save**.
3. **Build → Firestore Database → Create database → Start in production mode** (pick any region).
4. Project overview → **</> (Web app)** → register app → copy config into `js/app.js` (already filled in for `arcticflow-21jsh`).

### Getting the security rules live

`firestore.rules` only protects your data once published. Two ways:

**Option A — manual:** Firestore → **Rules** tab → paste contents of `firestore.rules` → **Publish**.

**Option B — GitHub Actions (recommended):** This repo ships with `.github/workflows/deploy-firestore.yml` that deploys rules on push. One-time setup:

1. Firebase Console → **Project settings → Service accounts → Generate new private key**.
2. GitHub repo → **Settings → Secrets → Actions → New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: paste the entire JSON file contents
3. Push any change to `firestore.rules` — rules deploy automatically.

### First run — master login

Open `app.html`. If no accounts exist, create the master admin account. From there:

- **Team & logins tab → "+ New login"**: create every technician and office staff account with a validity period.
- Technicians install the app: open the site → browser menu → **"Add to Home Screen"**. Runs fullscreen like a native app, even offline.

### Who sees what

| | Office staff | Technician |
|---|---|---|
| Schedule (day planner) | ✅ view & edit all jobs | ➖ |
| All jobs list | ✅ | ➖ |
| My jobs | ➖ | ✅ only assigned jobs |
| Book / edit / delete job | ✅ | ➖ |
| Customer details + Maps link | ✅ | ✅ (their jobs) |
| Add/remove extra charges | ✅ | ✅ |
| Discount / promo offers | ✅ | ✅ |
| Status updates | ✅ any status | ✅ scheduled → in progress → completed |
| Record payment | ✅ | ✅ |
| Digital invoice (generate/print PDF) | ✅ all | ✅ their jobs |
| Team management / logins | ✅ | ➖ |

Security is enforced twice: the UI hides what a role can't do, and `firestore.rules` blocks it server-side.

---

## Structure

```
arcticflow-site/
├── index.html              Landing page with product info
├── app.html                Field app (login → office/technician dashboards)
├── privacy.html            Privacy policy
├── terms.html              Terms of service
├── 404.html                Not-found page
├── css/style.css           Landing styles
├── css/app.css             App styles
├── js/main.js              Landing behavior (deferred, dependency-free)
├── js/app.js               App logic — Firebase auth + Firestore realtime data
├── sw.js                   Service worker (offline shell, installable PWA)
├── firestore.rules         Server-side role security
├── firebase.json           Firebase CLI config
├── .firebaserc             Pins the Firebase project (arcticflow-21jsh)
├── .github/workflows/      Auto-deploys rules on push
├── images/                 OG cover, favicons, PWA icons
├── tools/                  Image generation scripts
├── SETUP.md                Registration & team management guide
├── robots.txt
├── sitemap.xml
├── site.webmanifest        PWA manifest
├── _headers                Security headers (Netlify/Cloudflare)
└── .nojekyll               Required for GitHub Pages
```

## Run locally

```bash
cd arcticflow-site
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to Firebase

```bash
firebase deploy --only hosting,firestore:rules
```

## Regenerating images

Requires Python + Pillow (`pip install pillow`):

```bash
python3 tools/generate-images.py
```

Regenerates `og-cover.png` (1200×630 social card), app icons, apple-touch-icon and favicon.ico.
