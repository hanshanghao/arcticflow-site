# Arctic Flow — Production Website

Marketing site + field app for **Arctic Flow**, the all-in-one platform for air-conditioning contractors: daily job booking, crew scheduling, invoicing, online payments, post-job extra charges and complete data security.

Pure static site — no build step, no dependencies. Deploy anywhere.

**Live:** https://arcticflow-21jsh.web.app

---

## Subscription System

Arctic Flow uses a subscription-based model with PayPal payments.

| Plan | Price | Duration | Max Users |
|------|-------|----------|-----------|
| **Starter** | $49.99 | 1 month | 5 users |
| **Growth** | $249.99 | 6 months | 10 users |
| **Enterprise** | $449.99 | 1 year | 20 users |

### How It Works

1. Customer picks a plan on the landing page → pays via PayPal
2. Access token generated (`AF-XXXX-XXXX-XXXX`) → welcome email sent via EmailJS
3. Customer enters token at `app.html` → creates master admin account
4. Master admin adds team members from "Team & Logins" tab
5. Each team member gets a welcome email with sign-in instructions
6. In-app renewal reminder warns 30 days before expiry

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

### EmailJS Setup (automated emails)

Arctic Flow uses [EmailJS](https://www.emailjs.com/) for sending welcome and team invite emails (free tier: 200 emails/month).

1. Create a free account at https://www.emailjs.com/
2. **Email → Add Service** → select Gmail → connect your account
3. **Email → Templates** → create 2 templates (see `js/email-config.js` for HTML)
4. **Account → API Keys** → copy your **Public Key**
5. Edit `js/email-config.js` with your credentials
6. Deploy: `firebase deploy --only hosting`

### First run — master login

Open `app.html`. Enter your access token, then create the master account (office admin). From there:

- **Team & logins tab → "+ New login"**: create every technician and office staff account.
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
├── index.html              Landing page with pricing + PayPal checkout
├── app.html                Field app (login → office/technician dashboards)
├── privacy.html            Privacy policy
├── terms.html              Terms of service
├── 404.html                Not-found page
├── css/style.css           Landing styles
├── css/app.css             App styles
├── js/main.js              Landing behavior (deferred, dependency-free)
├── js/app.js               App logic — Firebase auth + Firestore realtime data
├── js/email-config.js      EmailJS configuration (Public Key, Service ID, Template IDs)
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
