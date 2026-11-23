const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

setGlobalOptions({ region: "asia-southeast1" });
initializeApp();

exports.setUserPassword = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const caller = await getFirestore().collection("users").doc(request.auth.uid).get();
  if (!caller.exists || caller.get("isAdmin") !== true || caller.get("active") === false) {
    throw new HttpsError("permission-denied", "Only the master admin can change passwords.");
  }

  const uid = request.data && request.data.uid;
  const password = request.data && request.data.password;
  if (typeof uid !== "string" || !uid.trim()) {
    throw new HttpsError("invalid-argument", "Choose a user account.");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  try {
    await getAuth().updateUser(uid.trim(), { password });
  } catch (err) {
    const code = (err && err.code) ? String(err.code) : "";
    const message = (err && err.message) ? String(err.message) : "Could not update password.";
    throw new HttpsError("internal", code ? `${code}: ${message}` : message);
  }

  return { ok: true };
});
