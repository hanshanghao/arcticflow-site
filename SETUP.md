# Arctic Flow — Subscription Setup Guide

## Overview

Arctic Flow uses a subscription-based model with PayPal payments. Each subscription gives you a set number of user accounts and a duration.

| Plan | Price | Duration | Max Users |
|------|-------|----------|-----------|
| **Starter** | $49.99 | 1 month | 5 users |
| **Growth** | $249.99 | 6 months | 10 users |
| **Enterprise** | $449.99 | 1 year | 20 users |

---

## Initial Setup (Admin Only)

### 1. EmailJS Setup (Automated Emails)
Arctic Flow uses [EmailJS](https://www.emailjs.com/) for sending automated emails (welcome, team invites, renewal reminders). This works on the free tier (200 emails/month).

1. Create a free account at https://www.emailjs.com/
2. **Email → Add Service** → select Gmail → connect your Gmail
3. **Email → Templates** → create 2 templates (Welcome + Team Welcome) using HTML from `js/email-config.js`
4. **Account → API Keys** → copy your **Public Key**
5. Edit `js/email-config.js` and paste your Public Key, Service ID, and Template IDs
6. Deploy: `firebase deploy --only hosting`

### 2. PayPal Setup
1. Go to https://developer.paypal.com → create a Sandbox or Live app
2. Copy your **Client ID**
3. Open `index.html` → replace `PAYPAL_CLIENT_ID` with your actual Client ID
4. Deploy: `firebase deploy --only hosting`

---

## How to Subscribe & Get Access

### Step 1: Choose a Plan
1. Go to [arcticflow.app](https://www.arcticflow.app)
2. Scroll to the **Pricing** section
3. Click the **PayPal** button on your chosen plan

### Step 2: Pay via PayPal
1. Complete the PayPal checkout
2. You'll see a confirmation screen with your **access token**
3. Save this token — you'll need it in Step 4

### Step 3: Check Your Email
1. Open the confirmation email from Arctic Flow
2. It contains your **access token** and step-by-step instructions
3. The token looks like: `AF-XXXX-XXXX-XXXX`

### Step 4: Create Your Master Admin Account
1. Go to [arcticflow.app/app.html](https://www.arcticflow.app/app.html)
2. Enter your **access token** when prompted
3. Fill in your details:
   - **Your name** — this is your display name
   - **Master email** — your admin login email
   - **Password** — min 6 characters
4. Click **"Create master login"**
5. You're now the **master admin** with full control

---

## How to Add Team Members

Only the **master admin** can create team accounts.

1. Sign in at [app.html](https://www.arcticflow.app/app.html)
2. Go to the **"Team & Logins"** tab
3. Click **"+ New login"**
4. Fill in:
   - **Full name** — team member's name
   - **Email** — their login email
   - **Temporary password** — they'll use this to sign in
   - **Role:**
     - **Technician** — sees only their assigned jobs
     - **Office staff** — sees the full schedule and all jobs
5. Click **"Create login"**
6. Share the email and password with the team member

---

## How Team Members Sign In

1. Go to [arcticflow.app/app.html](https://www.arcticflow.app/app.html)
2. Enter the **email** and **password** given by your admin
3. You'll see your assigned jobs (technicians) or the full schedule (office staff)

**On your phone:** Open the site → tap browser menu → "Add to Home Screen" to install as an app.

---

## User Limits

Each subscription has a maximum number of user accounts:

- **Starter:** 5 users
- **Growth:** 10 users
- **Enterprise:** 20 users

When you reach your limit, the master admin can see this in the **Subscription** tab and must upgrade the plan to add more users.

---

## Subscription Management

The master admin can manage everything from the **Subscription** tab:

- **View plan details:** See your tier, expiry date, and days remaining
- **Track user count:** See how many accounts you've created vs your limit
- **Generate tokens:** Create new access tokens for additional registrations
- **View token status:** See which tokens have been used and by whom

---

## Renewal & Expiry

- **30 days before expiry:** You'll receive a reminder email to renew
- **On expiry:** Team members lose access (your data is safe)
- **After renewal:** Sign in again, team access is restored

To renew, go to [arcticflow.app/index.html#pricing](https://www.arcticflow.app/index.html#pricing) and purchase a new subscription.

---

## Master Admin Capabilities

The master admin account (first account created with the access token) has full control:

- **Create/delete team accounts**
- **Change roles** (office ↔ technician)
- **Deactivate accounts** (for violators or non-renewals)
- **View all jobs and invoices**
- **Manage subscription and tokens**
- **Book/edit/delete any job**

---

## Revoking Access

To revoke a team member's access:

1. Go to **"Team & Logins"** tab
2. Find the user
3. Click **"Deactivate"** — their login is immediately blocked
4. They can no longer sign in, but their job history is preserved

To reactivate, click **"Activate"** on the same user.

---

## Important Notes

- **Keep your access token safe** — it creates your master account
- **Only the master admin can create team accounts** — this is by design for security
- **Data is encrypted** — all data is stored securely in Firebase
- **Offline mode works** — the app works without internet and syncs when reconnected
- **No credit card stored** — payments go through PayPal only

---

## Troubleshooting

**"Invalid access token"**
- Check the token in your email — it's case-insensitive
- Tokens look like: `AF-XXXX-XXXX-XXXX`

**"Token already used"**
- Each token can only create one master account
- If you need another, generate one from the Subscription tab

**"Subscription expired"**
- Your subscription has ended — renew at the pricing page
- Your data is safe — just renew and sign in again

**"User limit reached"**
- You've used all available accounts on your plan
- Upgrade to add more users

---

## Support

- Email: support@arcticflow.app
- Privacy: [arcticflow.app/privacy.html](https://www.arcticflow.app/privacy.html)
- Terms: [arcticflow.app/terms.html](https://www.arcticflow.app/terms.html)
