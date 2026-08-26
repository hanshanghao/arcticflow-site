# Arctic Flow — Setup Guide

## Overview

Arctic Flow is a free web app for air-conditioning contractors. The master admin creates team accounts with a validity period. No payment required.

---

## First Run — Create Master Admin

1. Go to [app.html](https://www.arcticflow.app/app.html)
2. If no accounts exist, you'll see the **"Create admin account"** form
3. Enter your name, email, and password
4. Click **"Create admin account"**
5. You are now the **master admin** with full control

If the setup form doesn't appear, create the first user directly in the [Firebase Console](https://console.firebase.google.com) → Firestore → `users` collection.

---

## How to Add Team Members

Only the **master admin** can create team accounts.

1. Sign in at [app.html](https://www.arcticflow.app/app.html)
2. Go to the **"Team & Logins"** tab
3. Click **"+ New login"**
4. Fill in:
   - **Full name** — team member's name
   - **Email** — their login email
   - **Password** — they'll use this to sign in
   - **Role:**
     - **Technician** — sees only their assigned jobs
     - **Office staff** — sees the full schedule and all jobs
   - **Valid until** — expiry date for their access (defaults to 30 days)
5. Click **"Create login"**
6. Share the email and password with the team member

---

## How Team Members Sign In

1. Go to [app.html](https://www.arcticflow.app/app.html)
2. Enter the **email** and **password** given by your admin
3. You'll see your assigned jobs (technicians) or the full schedule (office staff)

**On your phone:** Open the site → tap browser menu → "Add to Home Screen" to install as an app.

---

## User Validity & Access Control

Each user has a **valid until** date set by the master admin:

- **Before expiry:** User can sign in and use the app normally
- **After expiry:** User is signed out automatically and cannot sign in
- **Master admin** can extend a user's validity at any time from the Team & Logins tab
- **Master admin** can deactivate/reactivate users immediately

To extend a user's access:
1. Go to **Team & Logins** tab
2. Click on the user → **Edit**
3. Change the **Valid until** date
4. Save

---

## Master Admin Capabilities

The master admin account (first account created) has full control:

- **Create/delete team accounts**
- **Change roles** (office ↔ technician)
- **Set/extend validity periods** for each user
- **Deactivate accounts** (immediate lockout)
- **View all jobs and invoices**
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

- **Only the master admin can create team accounts** — this is by design for security
- **Data is encrypted** — all data is stored securely in Firebase
- **Offline mode works** — the app works without internet and syncs when reconnected
- **No credit card required** — the app is free to use

---

## Troubleshooting

**"Your access has expired"**
- Contact your admin to extend your validity period

**"Wrong email or password"**
- Check with your admin for the correct credentials

**"No account with that email"**
- Ask your admin to create an account for you

---

## Support

- Privacy: [arcticflow.app/privacy.html](https://www.arcticflow.app/privacy.html)
- Terms: [arcticflow.app/terms.html](https://www.arcticflow.app/terms.html)
