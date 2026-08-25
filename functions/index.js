const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

const TIER_LABEL = { starter: "Starter", growth: "Growth", enterprise: "Enterprise" };
const TIER_MAX_USERS = { starter: 5, growth: 10, enterprise: 20 };

const gmailEmail = functions.config().gmail?.email || "";
const gmailPass = functions.config().gmail?.password || "";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: gmailEmail, pass: gmailPass },
});

function sendEmail(to, subject, html) {
  if (!gmailEmail || !gmailPass) {
    console.warn("Email not configured — skipping send to", to);
    return Promise.resolve();
  }
  return transporter.sendMail({
    from: `"Arctic Flow" <${gmailEmail}>`,
    to,
    subject,
    html,
  });
}

exports.onTokenCreated = functions.firestore
  .document("tokens/{tokenId}")
  .onCreate(async (snap, context) => {
    const token = snap.data();
    if (!token || token.redeemed || !token.buyerEmail) return;

    const tierLabel = TIER_LABEL[token.tier] || token.tier;
    const maxUsers = token.maxUsers || TIER_MAX_USERS[token.tier] || 5;

    const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f7fb;margin:0;padding:0;color:#1a1a2e}
      .wrap{max-width:560px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)}
      .header{background:linear-gradient(135deg,#22d3ee,#3b82f6);padding:32px 28px;text-align:center}
      .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
      .header p{color:rgba(255,255,255,.85);margin:6px 0 0;font-size:14px}
      .body{padding:28px}
      .token-box{background:#f0f9ff;border:2px dashed #38bdf8;border-radius:12px;padding:20px;text-align:center;margin:20px 0}
      .token-box code{font-size:20px;font-weight:700;color:#0369a1;letter-spacing:3px;font-family:monospace}
      .token-box p{margin:8px 0 0;font-size:13px;color:#64748b}
      .steps{margin:20px 0}
      .steps li{padding:8px 0;font-size:14px;color:#475569;line-height:1.5}
      .steps li strong{color:#0f172a}
      .btn{display:inline-block;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
      .plan-badge{display:inline-block;background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;margin-top:4px}
    </style></head><body>
    <div class="wrap">
      <div class="header">
        <h1>Welcome to Arctic Flow!</h1>
        <p>Your subscription is active</p>
        <div class="plan-badge">${tierLabel} Plan — ${maxUsers} users</div>
      </div>
      <div class="body">
        <p style="font-size:15px;color:#334155">Hi ${token.buyerEmail},</p>
        <p style="font-size:15px;color:#475569;line-height:1.6">Your <strong>${tierLabel}</strong> subscription is now active. Here's your access token and setup instructions:</p>

        <div class="token-box">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600">Your Access Token</p>
          <code>${token.token}</code>
          <p>Save this — you'll need it to create your master account</p>
        </div>

        <h3 style="font-size:16px;color:#0f172a;margin:24px 0 12px">How to Get Started</h3>
        <ol class="steps">
          <li><strong>Go to the app:</strong> Visit <a href="https://www.arcticflow.app/app.html" style="color:#0369a1">arcticflow.app/app.html</a></li>
          <li><strong>Enter your token:</strong> Paste the access token above when prompted</li>
          <li><strong>Create your master account:</strong> Set your name, email and password — this becomes your office admin login</li>
          <li><strong>Add team members:</strong> Once logged in, go to the <strong>"Team &amp; Logins"</strong> tab and click <strong>"+ New login"</strong></li>
          <li><strong>Share credentials:</strong> Give each team member their email and temporary password</li>
          <li><strong>Team signs in:</strong> Each person logs in at <a href="https://www.arcticflow.app/app.html" style="color:#0369a1">app.html</a> with their credentials</li>
        </ol>

        <div style="text-align:center;margin:24px 0">
          <a href="https://www.arcticflow.app/app.html" class="btn">Open Arctic Flow</a>
        </div>

        <h3 style="font-size:16px;color:#0f172a;margin:24px 0 12px">Important Notes</h3>
        <ul style="padding-left:20px;font-size:14px;color:#475569;line-height:1.7">
          <li>Your subscription allows up to <strong>${maxUsers} user accounts</strong></li>
          <li>Only the master admin can create new team accounts</li>
          <li>Technicians see only their assigned jobs — office staff see everything</li>
          <li>Renew before expiry to keep your team's access active</li>
          <li>Need help? Reply to this email</li>
        </ul>
      </div>
      <div class="footer">
        <p>Arctic Flow — Smart scheduling, invoicing &amp; payments for AC contractors</p>
        <p><a href="https://www.arcticflow.app" style="color:#0369a1">arcticflow.app</a> · <a href="https://www.arcticflow.app/privacy.html" style="color:#0369a1">Privacy Policy</a></p>
      </div>
    </div>
    </body></html>`;

    await sendEmail(token.buyerEmail, `Arctic Flow — Your ${tierLabel} Subscription is Active!`, html);
    console.log(`Welcome email sent to ${token.buyerEmail} for token ${token.token}`);
  });

exports.onTokenRedeemed = functions.firestore
  .document("tokens/{tokenId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.redeemed || !after.redeemed) return;

    const redeemEmail = after.redeemedByEmail || after.buyerEmail;
    if (!redeemEmail) return;

    const tierLabel = TIER_LABEL[after.tier] || after.tier;
    const maxUsers = after.maxUsers || TIER_MAX_USERS[after.tier] || 5;

    const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f7fb;margin:0;padding:0;color:#1a1a2e}
      .wrap{max-width:560px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)}
      .header{background:linear-gradient(135deg,#34d399,#22d3ee);padding:32px 28px;text-align:center}
      .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
      .body{padding:28px}
      .steps{margin:20px 0}
      .steps li{padding:8px 0;font-size:14px;color:#475569;line-height:1.5}
      .steps li strong{color:#0f172a}
      .btn{display:inline-block;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
    </style></head><body>
    <div class="wrap">
      <div class="header">
        <h1>Your Account is Ready!</h1>
      </div>
      <div class="body">
        <p style="font-size:15px;color:#334155">Hi,</p>
        <p style="font-size:15px;color:#475569;line-height:1.6">Your master admin account has been created on Arctic Flow. Here's how to get your team set up:</p>

        <h3 style="font-size:16px;color:#0f172a;margin:24px 0 12px">Adding Team Members</h3>
        <ol class="steps">
          <li><strong>Sign in</strong> at <a href="https://www.arcticflow.app/app.html" style="color:#0369a1">arcticflow.app/app.html</a></li>
          <li>Go to the <strong>"Team &amp; Logins"</strong> tab</li>
          <li>Click <strong>"+ New login"</strong></li>
          <li>Enter the team member's name, email and a temporary password</li>
          <li>Choose their role: <strong>Technician</strong> (sees only their jobs) or <strong>Office staff</strong> (full access)</li>
          <li>Click <strong>"Create login"</strong></li>
          <li>Share the email and temporary password with the team member</li>
        </ol>

        <p style="font-size:14px;color:#475569;line-height:1.6"><strong>Your ${tierLabel} plan allows up to ${maxUsers} user accounts.</strong> You can see your usage in the "Subscription" tab.</p>

        <div style="text-align:center;margin:24px 0">
          <a href="https://www.arcticflow.app/app.html" class="btn">Open Arctic Flow</a>
        </div>
      </div>
      <div class="footer">
        <p>Arctic Flow — Smart scheduling, invoicing &amp; payments for AC contractors</p>
        <p><a href="https://www.arcticflow.app" style="color:#0369a1">arcticflow.app</a> · <a href="https://www.arcticflow.app/privacy.html" style="color:#0369a1">Privacy Policy</a></p>
      </div>
    </div>
    </body></html>`;

    await sendEmail(redeemEmail, "Arctic Flow — Your Account is Set Up!", html);
    console.log(`Redemption email sent to ${redeemEmail}`);
  });

exports.checkExpiringSubscriptions = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    const subsSnap = await db.collection("subscriptions").where("active", "==", true).get();

    for (const subDoc of subsSnap.docs) {
      const sub = subDoc.data();
      if (!sub.expiresAt) continue;

      const daysLeft = Math.ceil((sub.expiresAt - now) / (1000 * 60 * 60 * 24));
      const tierLabel = TIER_LABEL[sub.tier] || sub.tier;

      if (daysLeft <= 0) {
        await db.collection("subscriptions").doc(subDoc.id).update({ active: false });

        const usersSnap = await db.collection("users").where("subscriptionId", "==", subDoc.id).get();
        const batch = db.batch();
        usersSnap.docs.forEach((u) => {
          if (!u.data().isAdmin) {
            batch.update(u.ref, { active: false });
          }
        });
        await batch.commit();

        const expiryHtml = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f7fb;margin:0;padding:0;color:#1a1a2e}
          .wrap{max-width:560px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)}
          .header{background:linear-gradient(135deg,#fb7185,#fbbf24);padding:32px 28px;text-align:center}
          .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
          .body{padding:28px}
          .btn{display:inline-block;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
          .footer{padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
        </style></head><body>
        <div class="wrap">
          <div class="header"><h1>Subscription Expired</h1></div>
          <div class="body">
            <p style="font-size:15px;color:#475569;line-height:1.6">Your <strong>${tierLabel}</strong> subscription has expired. Team members can no longer access the app.</p>
            <p style="font-size:15px;color:#475569;line-height:1.6">To restore access, please renew your subscription:</p>
            <div style="text-align:center;margin:24px 0">
              <a href="https://www.arcticflow.app/index.html#pricing" class="btn">Renew Now</a>
            </div>
            <p style="font-size:14px;color:#64748b">Your data is safe. Once you renew, your team can sign in again immediately.</p>
          </div>
          <div class="footer">
            <p>Arctic Flow — <a href="https://www.arcticflow.app" style="color:#0369a1">arcticflow.app</a></p>
          </div>
        </div>
        </body></html>`;

        await sendEmail(sub.buyerEmail, "Arctic Flow — Your Subscription Has Expired", expiryHtml);
        console.log(`Expiry email sent to ${sub.buyerEmail}`);

      } else if (daysLeft <= 30 && daysLeft > 7) {
        const reminderHtml = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><style>
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f7fb;margin:0;padding:0;color:#1a1a2e}
          .wrap{max-width:560px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)}
          .header{background:linear-gradient(135deg,#fbbf24,#f59e0b);padding:32px 28px;text-align:center}
          .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
          .body{padding:28px}
          .btn{display:inline-block;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
          .footer{padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
        </style></head><body>
        <div class="wrap">
          <div class="header"><h1>Subscription Renewal Reminder</h1></div>
          <div class="body">
            <p style="font-size:15px;color:#475569;line-height:1.6">Your <strong>${tierLabel}</strong> subscription expires in <strong>${daysLeft} days</strong>.</p>
            <p style="font-size:15px;color:#475569;line-height:1.6">To avoid interruption for your team, please renew before the expiry date.</p>
            <div style="text-align:center;margin:24px 0">
              <a href="https://www.arcticflow.app/index.html#pricing" class="btn">Renew Now</a>
            </div>
          </div>
          <div class="footer">
            <p>Arctic Flow — <a href="https://www.arcticflow.app" style="color:#0369a1">arcticflow.app</a></p>
          </div>
        </div>
        </body></html>`;

        await sendEmail(sub.buyerEmail, `Arctic Flow — Your ${tierLabel} Subscription Renews in ${daysLeft} Days`, reminderHtml);
        console.log(`Reminder sent to ${sub.buyerEmail} (${daysLeft} days left)`);
      }
    }
  });

exports.sendUserWelcome = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const user = snap.data();
    if (!user || user.isAdmin || user.createdBy === "system") return;

    const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f7fb;margin:0;padding:0;color:#1a1a2e}
      .wrap{max-width:560px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)}
      .header{background:linear-gradient(135deg,#22d3ee,#3b82f6);padding:32px 28px;text-align:center}
      .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
      .body{padding:28px}
      .cred-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin:16px 0}
      .cred-box p{margin:4px 0;font-size:14px;color:#475569}
      .cred-box strong{color:#0f172a}
      .btn{display:inline-block;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
    </style></head><body>
    <div class="wrap">
      <div class="header"><h1>You've Been Added to Arctic Flow!</h1></div>
      <div class="body">
        <p style="font-size:15px;color:#334155">Hi ${user.name || "there"},</p>
        <p style="font-size:15px;color:#475569;line-height:1.6">You've been added to the team by <strong>${user.createdBy || "your admin"}</strong>. Here are your login details:</p>

        <div class="cred-box">
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Password:</strong> (set by your admin — ask them if you don't have it)</p>
          <p><strong>Role:</strong> ${user.role === "office" ? "Office Staff (full access)" : "Technician (see your assigned jobs)"}</p>
        </div>

        <h3 style="font-size:16px;color:#0f172a;margin:24px 0 12px">How to Sign In</h3>
        <ol style="padding-left:20px;font-size:14px;color:#475569;line-height:1.8">
          <li>Go to <a href="https://www.arcticflow.app/app.html" style="color:#0369a1">arcticflow.app/app.html</a></li>
          <li>Enter your email and password</li>
          <li>You'll see your assigned jobs (technicians) or the full schedule (office staff)</li>
        </ol>

        <p style="font-size:14px;color:#64748b;margin-top:16px"><strong>Tip:</strong> On your phone, open the site and tap "Add to Home Screen" to install it like a native app.</p>

        <div style="text-align:center;margin:24px 0">
          <a href="https://www.arcticflow.app/app.html" class="btn">Open Arctic Flow</a>
        </div>
      </div>
      <div class="footer">
        <p>Arctic Flow — <a href="https://www.arcticflow.app" style="color:#0369a1">arcticflow.app</a></p>
      </div>
    </div>
    </body></html>`;

    await sendEmail(user.email, "You've Been Added to Arctic Flow!", html);
    console.log(`Welcome email sent to ${user.email}`);
  });
