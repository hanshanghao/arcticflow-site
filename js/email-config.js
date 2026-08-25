/*
 * EmailJS Configuration for Arctic Flow
 * ======================================
 *
 * SETUP (5 minutes, free — no server needed):
 *
 * 1. Go to https://www.emailjs.com/ and create a free account
 * 2. Email → Add Service → select Gmail → connect your Gmail account
 * 3. Copy your SERVICE ID (looks like "service_xxxxxxx")
 * 4. Email → Templates → Create 2 templates (see templates below)
 * 5. Copy each TEMPLATE ID
 * 6. Account → API Keys → copy your PUBLIC KEY
 * 7. Paste all values below
 */

const EMAILJS_CONFIG = {
  publicKey: "wc25t3BakZGv0yfff",
  serviceId: "service_vjynn7j",

  templates: {
    welcome: "template_4hb926m",
    userWelcome: "template_2afhcjc",
  },

  replyTo: "support@arcticflow.app",
};
