/*
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDn-ASWo1UML5CR6pSysfJal9BOCdvJKao",
  authDomain: "arcticflow-d730d.firebaseapp.com",
  projectId: "arcticflow-d730d",
  storageBucket: "arcticflow-d730d.firebasestorage.app",
  messagingSenderId: "",
  appId: ""
};

const RECAPTCHA_SITE_KEY = "";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + (Number(n) || 0).toFixed(2);
const uid4 = () => (crypto.randomUUID ? crypto.randomUUID() : "x" + Date.now() + Math.random().toString(16).slice(2));
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const fmtDate = (iso) => { if (!iso) return "—"; const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); };
const fmtLongDate = (iso) => iso ? new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—";
const fmtDateTime = (ts) => ts ? new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const STATUS_LABEL = { scheduled: "Scheduled", in_progress: "In progress", completed: "Completed" };
const STATUS_PILL = { scheduled: "blue", in_progress: "amber", completed: "green" };
const METHOD_LABEL = { card: "Card (online)", cash: "Cash", bank: "Bank transfer", wallet: "Digital wallet" };

let app, auth, db, secondaryApp, secondaryAuth;
let me = null;
let users = {};
let jobs = [];
let unsubs = [];
let activeView = "schedule";
let scheduleDate = todayStr();
let allJobsStatusFilter = "";
const configured = FIREBASE_CONFIG.apiKey && !String(FIREBASE_CONFIG.apiKey).startsWith("PASTE_");
const isOffice = () => !!me && (me.role === "office" || me.isAdmin === true);
const initials = (n) => (n || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function toast(msg, isErr) {
  const t = document.createElement("div");
  t.className = "toast" + (isErr ? " err" : "");
  t.textContent = msg;
  $("toastWrap").appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

function openModal(html) {
  $("modalBox").innerHTML = html;
  $("modalBackdrop").hidden = false;
}
function closeModal() {
  $("modalBackdrop").hidden = true;
  $("modalBox").innerHTML = "";
}
$("modalBackdrop").addEventListener("click", (e) => { if (e.target === $("modalBackdrop")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function authError(code) {
  return ({
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-not-found": "No account with that email.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/email-already-in-use": "That email already has an account.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "permission-denied": "Permission denied. Make sure firestore.rules are deployed."
  })[code] || String(code || "Something went wrong.").replace("auth/", "").replace(/-/g, " ");
}

async function init() {
  if (!configured) {
    $("setupBanner").hidden = false;
    $("authLoading").hidden = true;
    $("loginForm").hidden = false;
    return;
  }
  try {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true
    });
    if (RECAPTCHA_SITE_KEY) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
    }
    secondaryApp = initializeApp(FIREBASE_CONFIG, "secondary");
    secondaryAuth = getAuth(secondaryApp);

    const bootSnap = await getDoc(doc(db, "settings", "public")).catch(() => null);
    const bootstrapped = !!bootSnap && bootSnap.exists() && bootSnap.data().initialized === true;
    $("authLoading").hidden = true;
    $(bootstrapped ? "loginForm" : "bootstrapForm").hidden = false;

    onAuthStateChanged(auth, async (user) => {
      unsubs.forEach((u) => u());
      unsubs = [];
      closeModal();
      if (!user) { showAuthScreen(); return; }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) { await signOut(auth); toast("No staff profile linked to this account.", true); return; }
      me = { id: user.uid, ...snap.data() };
      if (me.active === false) { await signOut(auth); toast("This account has been deactivated by your office.", true); return; }
      enterApp();
    });
  } catch (err) {
    $("authLoading").hidden = true;
    toast("Firebase init failed: " + err.message, true);
  }
}

function showAuthScreen() {
  me = null;
  users = {};
  jobs = [];
  $("appShell").hidden = true;
  $("authScreen").hidden = false;
  document.title = "Arctic Flow — Field App";
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('button[type="submit"]');
  $("loginError").hidden = true;
  btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
  } catch (err) {
    $("loginError").textContent = authError(err.code);
    $("loginError").hidden = false;
  }
  btn.disabled = false;
});

$("forgotBtn").addEventListener("click", async () => {
  const email = $("loginForm").email.value.trim();
  if (!email) return toast("Type your email first, then tap forgot password.", true);
  try {
    await sendPasswordResetEmail(auth, email);
    toast("Password reset email sent.");
  } catch (err) {
    toast(authError(err.code), true);
  }
});

$("bootstrapForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('button[type="submit"]');
  $("bootstrapError").hidden = true;
  btn.disabled = true;
  const finishBootstrap = async (uid) => {
    await setDoc(doc(db, "users", uid), {
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      role: "office",
      isAdmin: true,
      active: true,
      createdBy: "system",
      createdAt: Date.now()
    });
    await setDoc(doc(db, "settings", "public"), { initialized: true }).catch(() => {});
  };
  try {
    const cred = await createUserWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
    await finishBootstrap(cred.user.uid);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      try {
        const cred = await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
        const existing = await getDoc(doc(db, "users", cred.user.uid));
        if (!existing.exists()) await finishBootstrap(cred.user.uid);
        else await setDoc(doc(db, "settings", "public"), { initialized: true }).catch(() => {});
      } catch (err2) {
        $("bootstrapError").textContent = authError(err2.code || err.code);
        $("bootstrapError").hidden = false;
      }
    } else {
      $("bootstrapError").textContent = authError(err.code);
      $("bootstrapError").hidden = false;
    }
  }
  btn.disabled = false;
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

function enterApp() {
  $("authScreen").hidden = true;
  $("appShell").hidden = false;
  document.title = "Arctic Flow — " + (isOffice() ? "Office" : "Technician");
  $("meName").textContent = me.name;
  $("meAvatar").textContent = initials(me.name);
  const rb = $("meRole");
  rb.textContent = isOffice() ? "Office staff" : "Technician";
  rb.className = "role-badge" + (isOffice() ? " office" : "");

  const jobsQ = isOffice() ? collection(db, "jobs") : query(collection(db, "jobs"), where("assignedTo", "==", me.id));
  unsubs.push(onSnapshot(jobsQ, (snap) => {
    jobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String((a.date || "") + (a.time || "")).localeCompare(String((b.date || "") + (b.time || ""))));
    renderActiveView();
  }, (err) => toast(err.message, true)));

  if (isOffice()) {
    unsubs.push(onSnapshot(collection(db, "users"), (snap) => {
      users = {};
      snap.docs.forEach((d) => { users[d.id] = { id: d.id, ...d.data() }; });
      renderActiveView();
    }));
  }

  buildTabs();
  switchView(isOffice() ? "schedule" : "myjobs");
}

function buildTabs() {
  const tabs = isOffice()
    ? [["schedule", "Schedule"], ["alljobs", "All jobs"], ["invoices", "Invoices"], ["team", "Team & logins"]]
    : [["myjobs", "My jobs"], ["invoices", "Invoices"]];
  $("tabs").innerHTML = tabs
    .map(([id, label]) => `<button type="button" class="tab${activeView === id ? " active" : ""}" data-view="${id}">${label}</button>`)
    .join("");
}

$("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (btn) switchView(btn.dataset.view);
});

function switchView(id) {
  activeView = id;
  document.querySelectorAll(".view").forEach((v) => { v.hidden = true; });
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === id));
  renderActiveView();
}

function renderActiveView() {
  if (!me) return;
  ({
    schedule: renderSchedule,
    alljobs: renderAllJobs,
    myjobs: renderMyJobs,
    team: renderTeam,
    invoices: renderInvoices
  }[activeView] || (() => {}))();
}

function totalsFor(job) {
  const services = (job.services || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const extras = (job.extras || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const subtotal = services + extras;
  let discount = 0;
  if (job.discount && job.discount.kind === "percent") discount = (subtotal * (Number(job.discount.value) || 0)) / 100;
  if (job.discount && job.discount.kind === "amount") discount = Number(job.discount.value) || 0;
  discount = Math.min(Math.max(discount, 0), subtotal);
  return { services, extras, subtotal, discount, total: subtotal - discount };
}

const techLabel = (job) => (users[job.assignedTo] && users[job.assignedTo].name) || job.technicianName || "Unassigned";
const mapsUrl = (job) =>
  job.locationLink && /^https?:/i.test(job.locationLink)
    ? job.locationLink
    : "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent([job.customer && job.customer.address, job.customer && job.customer.name].filter(Boolean).join(", ") || "unknown location");

function jobCard(job) {
  return `
  <article class="job-card" data-job="${job.id}" tabindex="0" role="button" aria-label="Open ${esc(job.title)}">
    <span class="job-time">${esc(job.time || "--:--")}</span>
    <div class="job-main">
      <p class="job-title">${esc(job.title)}</p>
      <p class="job-meta">${esc((job.customer && job.customer.name) || "")}${job.date ? " · " + esc(fmtDate(job.date)) : ""}</p>
      <p class="job-meta">Tech: ${esc(techLabel(job))} · Assigned by ${esc(job.assignedByName || "—")}</p>
    </div>
    <div class="job-side">
      <span class="pill ${STATUS_PILL[job.status] || "gray"}">${STATUS_LABEL[job.status] || esc(job.status)}</span>
      ${totalsFor(job).total > 0 ? `<span class="job-total">${money(totalsFor(job).total)}</span>` : ""}
    </div>
  </article>`;
}

["scheduleList", "allJobsList", "myJobsList"].forEach((id) => {
  $(id).addEventListener("click", (e) => {
    const card = e.target.closest(".job-card");
    if (card) openJobDetail(card.dataset.job);
  });
  $(id).addEventListener("keydown", (e) => {
    const card = e.target.closest(".job-card");
    if (card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openJobDetail(card.dataset.job);
    }
  });
});

function renderSchedule() {
  $("dayPicker").value = scheduleDate;
  const list = jobs.filter((j) => j.date === scheduleDate);
  $("scheduleCount").textContent = fmtLongDate(scheduleDate) + " · " + list.length + " job" + (list.length === 1 ? "" : "s");
  $("scheduleList").innerHTML = list.length
    ? list.map(jobCard).join("")
    : `<div class="empty">No jobs booked for ${esc(fmtLongDate(scheduleDate))}.<br>Use “+ New job” to book the first one.</div>`;
}

$("dayPicker").addEventListener("change", (e) => { scheduleDate = e.target.value || todayStr(); renderSchedule(); });
$("dayPrev").addEventListener("click", () => shiftDay(-1));
$("dayNext").addEventListener("click", () => shiftDay(1));
function shiftDay(n) {
  const d = new Date(scheduleDate + "T12:00:00");
  d.setDate(d.getDate() + n);
  scheduleDate = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  renderSchedule();
}

function renderAllJobs() {
  const list = allJobsStatusFilter ? jobs.filter((j) => j.status === allJobsStatusFilter) : [...jobs].reverse();
  $("allJobsCount").textContent = jobs.length + " total · showing " + list.length;
  $("allJobsList").innerHTML = list.length ? list.map(jobCard).join("") : `<div class="empty">No jobs yet.</div>`;
}

$("statusFilters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  allJobsStatusFilter = chip.dataset.status;
  document.querySelectorAll("#statusFilters .chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderAllJobs();
});

function renderMyJobs() {
  const today = todayStr();
  const groups = [
    ["Today", jobs.filter((j) => j.date === today)],
    ["Upcoming", jobs.filter((j) => j.date > today)],
    ["Completed & past", jobs.filter((j) => j.status === "completed" || j.date < today)]
  ];
  const open = groups[0][1].length + groups[1][1].length;
  $("myJobsCount").textContent = open + " open job" + (open === 1 ? "" : "s") + " assigned to you";
  const shown = groups.filter((g) => g[1].length);
  $("myJobsList").innerHTML = shown.length
    ? shown.map(([label, list]) =>
        `<h3 style="font-size:.85rem;color:var(--muted);margin:14px 0 8px;text-transform:uppercase;letter-spacing:.07em">${label}</h3><div class="job-list">${list.map(jobCard).join("")}</div>`
      ).join("")
    : `<div class="empty">No jobs assigned to you yet.<br>Your office assigns jobs from their dashboard — they appear here instantly.</div>`;
}

function renderTeam() {
  const list = Object.values(users).sort((a, b) => (Number(b.isAdmin) - Number(a.isAdmin)) || String(a.name).localeCompare(String(b.name)));
  $("teamList").innerHTML = list.length
    ? list.map((u, i) => `
      <div class="team-row">
        <div class="avatar sm ${i % 3 === 1 ? "alt" : i % 3 === 2 ? "alt2" : ""}">${esc(initials(u.name))}</div>
        <div class="team-info">
          <strong>${esc(u.name)}${u.id === me.id ? " (you)" : ""}</strong>
          <p>${esc(u.email)}</p>
          ${u.createdBy && u.createdBy !== "system" ? `<p>Created by ${esc(u.createdBy)}</p>` : ""}
        </div>
        <span class="tag ${u.isAdmin ? "office" : "tech"}">${u.isAdmin ? "Master admin" : u.role === "office" ? "Office staff" : "Technician"}</span>
        <span class="tag ${u.active === false ? "inactive" : ""}">${u.active === false ? "Deactivated" : "Active"}</span>
        ${u.id !== me.id && !u.isAdmin ? `<button type="button" class="btn ${u.active === false ? "btn-primary" : "btn-danger"} btn-sm" data-toggle-user="${u.id}">${u.active === false ? "Activate" : "Deactivate"}</button>` : ""}
      </div>`).join("")
    : `<div class="empty">No team members yet.</div>`;
}

$("teamList").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-toggle-user]");
  if (!btn) return;
  const target = users[btn.dataset.toggleUser];
  if (!target) return;
  const makingInactive = target.active !== false;
  if (!confirm((makingInactive ? "Deactivate " : "Reactivate ") + target.name + "'s login?")) return;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "users", target.id), { active: !makingInactive });
    toast(makingInactive ? "Login deactivated." : "Login reactivated.");
  } catch (err) {
    toast(authError(err.code), true);
  }
  btn.disabled = false;
});

$("newUserBtn").addEventListener("click", openUserForm);

function openUserForm() {
  openModal(`
    <h3>Create a staff login</h3>
    <p class="modal-sub">This account is generated from your master profile. The person can sign in immediately on any device.</p>
    <form id="userForm">
      <div class="d-grid">
        <label class="full">Full name<input name="name" required placeholder="e.g. Marcus Kane"></label>
        <label>Email<input type="email" name="email" required placeholder="tech@company.com"></label>
        <label>Temporary password<input name="password" required minlength="6" placeholder="min 6 characters"></label>
        <label class="full">Role
          <select name="role">
            <option value="tech">Technician — limited view of own jobs</option>
            <option value="office">Office staff — full schedule access</option>
          </select>
        </label>
      </div>
      <p id="userFormError" class="form-error" hidden></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Create login</button>
      </div>
    </form>`);
  $("userForm").addEventListener("submit", onCreateUser);
}

async function onCreateUser(e) {
  e.preventDefault();
  const f = e.target;
  const errEl = $("userFormError");
  errEl.hidden = true;
  f.querySelector('button[type="submit"]').disabled = true;
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, f.email.value.trim(), f.password.value);
    await setDoc(doc(db, "users", cred.user.uid), {
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      role: f.role.value,
      isAdmin: false,
      active: true,
      createdBy: me.name,
      createdAt: Date.now()
    });
    await signOut(secondaryAuth);
    closeModal();
    toast("Login created for " + f.name.value.trim() + ".");
  } catch (err) {
    errEl.textContent = authError(err.code);
    errEl.hidden = false;
  }
  f.querySelector('button[type="submit"]').disabled = false;
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeModal();
});

$("newJobBtn").addEventListener("click", () => openJobForm());
$("newJobBtn2").addEventListener("click", () => openJobForm());

function openJobForm(job) {
  if (!isOffice()) return;
  const techs = Object.values(users).filter((u) => !u.isAdmin && u.active !== false);
  const s = job || {};
  const svc = (s.services && s.services[0]) || { desc: "", amount: "" };
  openModal(`
    <h3>${job ? "Edit job" : "Book a new job"}</h3>
    <p class="modal-sub">Jobs appear instantly on the assigned technician's device.</p>
    <form id="jobForm">
      <div class="d-grid">
        <label class="full">Job title / description<input name="title" required value="${esc(s.title || "")}" placeholder="e.g. AC installation · Tower B"></label>
        <label>Date<input type="date" name="date" required value="${esc(s.date || scheduleDate)}"></label>
        <label>Time<input type="time" name="time" required value="${esc(s.time || "09:00")}"></label>
        <label class="full">Assign to technician
          <select name="assignedTo" required>
            <option value="">— select technician —</option>
            ${techs.map((t) => `<option value="${t.id}" ${s.assignedTo === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
          </select>
        </label>
        <label>Customer name<input name="custName" required value="${esc((s.customer && s.customer.name) || "")}" placeholder="e.g. Central Plaza Tower"></label>
        <label>Customer phone<input type="tel" name="custPhone" value="${esc((s.customer && s.customer.phone) || "")}" placeholder="+1 555 0100"></label>
        <label class="full">Site address<textarea name="custAddress" rows="2" placeholder="Street, unit, city">${esc((s.customer && s.customer.address) || "")}</textarea></label>
        <label class="full">Map link (optional)<input name="locationLink" value="${esc(s.locationLink || "")}" placeholder="https://maps.google.com/…"></label>
        <label class="full">First service line<input name="svcDesc" value="${esc(svc.desc)}" placeholder="e.g. Diagnostic & service call">
          <input style="margin-top:8px" type="number" step="0.01" min="0" name="svcAmount" value="${esc(String(svc.amount ?? ""))}" placeholder="Amount $">
        </label>
        <label class="full">Notes<textarea name="notes" rows="2" placeholder="Access info, gate codes, unit details…">${esc(s.notes || "")}</textarea></label>
      </div>
      <p id="jobFormError" class="form-error" hidden></p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${job ? "Save changes" : "Book job"}</button>
      </div>
    </form>`);
  $("jobForm").addEventListener("submit", (e) => onSubmitJobForm(e, job));
}

async function onSubmitJobForm(e, existing) {
  e.preventDefault();
  const f = e.target;
  const errEl = $("jobFormError");
  errEl.hidden = true;
  if (!f.assignedTo.value) {
    errEl.textContent = "Please choose a technician.";
    errEl.hidden = false;
    return;
  }
  f.querySelector('button[type="submit"]').disabled = true;
  const tech = users[f.assignedTo.value];
  const data = {
    title: f.title.value.trim(),
    date: f.date.value,
    time: f.time.value,
    status: existing ? existing.status : "scheduled",
    assignedTo: f.assignedTo.value,
    technicianName: tech ? tech.name : "Unassigned",
    customer: {
      name: f.custName.value.trim(),
      phone: f.custPhone.value.trim(),
      address: f.custAddress.value.trim()
    },
    locationLink: f.locationLink.value.trim(),
    notes: f.notes.value.trim(),
    updatedAt: Date.now()
  };
  const services = existing && existing.services ? [...existing.services] : [];
  if (f.svcDesc.value.trim() || Number(f.svcAmount.value)) {
    const line = { id: uid4(), desc: f.svcDesc.value.trim() || "Service", amount: Number(f.svcAmount.value) || 0 };
    if (existing && existing.services && existing.services[0]) services[0] = line;
    else services.unshift(line);
  }
  data.services = services;
  try {
    if (existing) {
      await updateDoc(doc(db, "jobs", existing.id), data);
      toast("Job updated.");
    } else {
      data.assignedByName = me.name;
      data.extras = [];
      data.discount = null;
      data.payment = { method: "", paid: false, paidAt: null };
      data.invoice = null;
      data.createdBy = me.id;
      data.createdAt = Date.now();
      await setDoc(doc(collection(db, "jobs")), data);
      toast("Job booked and dispatched to " + data.technicianName + ".");
    }
    closeModal();
  } catch (err) {
    errEl.textContent = authError(err.code);
    errEl.hidden = false;
  }
  f.querySelector('button[type="submit"]').disabled = false;
}

function getJob(id) {
  return jobs.find((j) => j.id === id);
}

function openJobDetail(id) {
  const job = getJob(id);
  if (!job) return;
  const t = totalsFor(job);
  const office = isOffice();
  const canInvoice = t.total > 0;
  const statusFlow = office
    ? ["scheduled", "in_progress", "completed"]
    : job.status === "scheduled" ? ["scheduled", "in_progress"] : job.status === "in_progress" ? ["in_progress", "completed"] : ["completed"];

  openModal(`
    <div class="detail-head">
      <div>
        <h3>${esc(job.title)}</h3>
        <p class="modal-sub">${esc(STATUS_LABEL[job.status] || "")}${job.invoice ? " · Invoice " + esc(job.invoice.number) : ""}</p>
      </div>
      <button type="button" class="detail-close" data-close aria-label="Close">×</button>
    </div>

    <div class="meta-grid">
      <div class="meta-cell"><small>When</small><b>${esc(fmtDate(job.date))} · ${esc(job.time || "--:--")}</b></div>
      <div class="meta-cell"><small>Assigned by</small><b>${esc(job.assignedByName || "—")}</b></div>
      <div class="meta-cell"><small>Technician</small><b>${esc(techLabel(job))}</b></div>
    </div>

    <div class="card-box">
      <div class="box-title">Customer</div>
      <div class="cust-line"><span>👤 <b>${esc((job.customer && job.customer.name) || "—")}</b></span></div>
      ${(job.customer && job.customer.phone) ? `<div class="cust-line">📞 <a href="tel:${esc(job.customer.phone)}">${esc(job.customer.phone)}</a></div>` : ""}
      ${(job.customer && job.customer.address) ? `<div class="cust-line">📍 ${esc(job.customer.address)}</div>` : ""}
      <div class="cust-line"><a href="${esc(mapsUrl(job))}" target="_blank" rel="noopener">Open location in Maps →</a></div>
    </div>

    ${job.notes ? `<div class="card-box"><div class="box-title">Notes</div><p style="font-size:.88rem;color:var(--muted);line-height:1.55">${esc(job.notes)}</p></div>` : ""}

    <div class="card-box">
      <div class="box-title">Services &amp; charges
        ${office ? `<button type="button" class="btn btn-ghost btn-sm" data-act="add-service">+ Service</button>` : ""}
      </div>
      ${(job.services || []).map((x) => lineItemHTML(x, office, "service")).join("") || `<p class="modal-sub" style="margin-bottom:0">No service lines yet.</p>`}
      ${(job.extras && job.extras.length) ? `
        <p style="font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;color:var(--amber);margin:12px 0 2px">Extra charges (added after visit)</p>
        ${job.extras.map((x) => lineItemHTML(x, true, "extra")).join("")}` : ""}
      ${!office ? `<button type="button" class="btn btn-ghost btn-sm" data-act="add-extra" style="margin-top:10px">+ Add extra charge / part</button>` : ""}
    </div>

    <div class="card-box">
      <div class="box-title">Discount / promo offer
        <button type="button" class="btn btn-ghost btn-sm" data-act="discount">${job.discount ? "Edit" : "Apply"}</button>
      </div>
      ${job.discount
        ? `<div class="line-item discount"><span>${esc(job.discount.label || "Discount")} — ${job.discount.kind === "percent" ? esc(job.discount.value) + "%" : money(job.discount.value)} off</span><b>−${money(t.discount)}</b></div>`
        : `<p class="modal-sub" style="margin-bottom:0">No discount applied.</p>`}
      <div class="totals">
        <div class="tot-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        ${t.discount ? `<div class="tot-row"><span>Discount</span><span>−${money(t.discount)}</span></div>` : ""}
        <div class="tot-row grand"><span>Total due</span><span>${money(t.total)}</span></div>
        <div class="tot-row"><span>Payment</span><span>${job.payment && job.payment.paid ? "✅ Paid via " + (METHOD_LABEL[job.payment.method] || job.payment.method) + " · " + esc(fmtDateTime(job.payment.paidAt)) : job.payment && job.payment.method ? METHOD_LABEL[job.payment.method] + " · awaiting payment" : "Not set"}</span></div>
      </div>
    </div>

    <div class="status-flow">
      ${statusFlow.map((s) => `<button type="button" class="seg ${job.status === s ? "active-" + s : ""}" data-status-set="${s}">${STATUS_LABEL[s]}</button>`).join("")}
    </div>

    <div class="action-row">
      <button type="button" class="btn btn-primary btn-sm" data-act="invoice" ${canInvoice ? "" : "disabled"}>${job.invoice ? "View invoice" : "Generate digital invoice"}</button>
      ${job.payment && !job.payment.paid && canInvoice ? `<button type="button" class="btn btn-ghost btn-sm" data-act="payment">Record payment</button>` : ""}
      ${office ? `<button type="button" class="btn btn-ghost btn-sm" data-act="edit-job">Edit job</button>` : ""}
      ${office ? `<button type="button" class="btn btn-danger btn-sm" data-act="delete-job">Delete</button>` : ""}
    </div>
  `);

  $("modalBox").querySelectorAll("[data-status-set]").forEach((btn) => {
    btn.addEventListener("click", () => setStatus(job, btn.dataset.statusSet));
  });
  const on = (sel, fn) => {
    const el = $("modalBox").querySelector(sel);
    if (el) el.addEventListener("click", fn);
  };
  on('[data-act="add-service"]', () => addLineModal(job, "service"));
  on('[data-act="add-extra"]', () => addLineModal(job, "extra"));
  on('[data-act="discount"]', () => discountModal(job));
  on('[data-act="payment"]', () => paymentModal(job));
  on('[data-act="invoice"]', () => (job.invoice ? viewInvoice(job) : generateInvoice(job)));
  on('[data-act="edit-job"]', () => openJobForm(job));
  on('[data-act="delete-job"]', () => deleteJob(job));
  $("modalBox").querySelectorAll("[data-rm-line]").forEach((btn) => {
    btn.addEventListener("click", () => removeLine(job, btn.dataset.rmKind, btn.dataset.rmLine));
  });
}

function lineItemHTML(x, removable, kind) {
  const who = x.addedByName ? `<small>added by ${esc(x.addedByName)} · ${esc(fmtDateTime(x.addedAt))}</small>` : "";
  return `<div class="line-item"><span>${esc(x.desc)}${who}</span><span style="display:flex;align-items:center;gap:6px"><b>${money(x.amount)}</b>${removable ? `<button type="button" class="mini-x" title="Remove" data-rm-kind="${kind}" data-rm-line="${x.id}">×</button>` : ""}</span></div>`;
}

async function setStatus(job, status) {
  if (!status || status === job.status) return;
  try {
    await updateDoc(doc(db, "jobs", job.id), { status, updatedAt: Date.now() });
    toast("Status: " + STATUS_LABEL[status]);
    closeModal();
  } catch (err) {
    toast(authError(err.code), true);
  }
}

function addLineModal(job, kind) {
  openModal(`
    <h3>${kind === "extra" ? "Add extra charge" : "Add service line"}</h3>
    <p class="modal-sub">${kind === "extra" ? "For parts, refrigerant or overtime discovered on site. It is added to the customer's invoice total." : "Additional billed work for this job."}</p>
    <form id="lineForm">
      <label>Description<input name="desc" required placeholder="${kind === "extra" ? "e.g. R-410A top-up" : "e.g. Coil cleaning"}"></label>
      <label>Amount ($)<input type="number" name="amount" step="0.01" min="0" required placeholder="0.00"></label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Add to job</button>
      </div>
    </form>`);
  $("lineForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const item = { id: uid4(), desc: f.desc.value.trim(), amount: Number(f.amount.value) || 0, addedByName: me.name, addedAt: Date.now(), kind };
    const field = kind === "extra" ? "extras" : "services";
    const arr = [...(job[field] || []), item];
    f.querySelector('button[type="submit"]').disabled = true;
    try {
      await updateDoc(doc(db, "jobs", job.id), { [field]: arr, updatedAt: Date.now() });
      toast(kind === "extra" ? "Extra charge added." : "Service line added.");
      openJobDetail(job.id);
    } catch (err) {
      toast(authError(err.code), true);
    }
  });
}

async function removeLine(job, kind, lineId) {
  const field = kind === "extra" ? "extras" : "services";
  const arr = (job[field] || []).filter((x) => x.id !== lineId);
  try {
    await updateDoc(doc(db, "jobs", job.id), { [field]: arr, updatedAt: Date.now() });
    openJobDetail(job.id);
  } catch (err) {
    toast(authError(err.code), true);
  }
}

function discountModal(job) {
  const d = job.discount || { label: "", kind: "percent", value: "" };
  openModal(`
    <h3>Discount / promo offer</h3>
    <p class="modal-sub">Applied to the combined subtotal before invoicing.</p>
    <form id="discForm">
      <label>Label / promo code<input name="label" value="${esc(d.label)}" placeholder="e.g. SUMMER10"></label>
      <div class="d-grid">
        <label>Type
          <select name="kind">
            <option value="percent" ${d.kind === "percent" ? "selected" : ""}>Percent %</option>
            <option value="amount" ${d.kind === "amount" ? "selected" : ""}>Fixed $ amount</option>
          </select>
        </label>
        <label>Value<input type="number" name="value" step="0.01" min="0" value="${esc(String(d.value ?? ""))}" placeholder="e.g. 10"></label>
      </div>
      <div class="modal-actions">
        ${job.discount ? `<button type="button" class="btn btn-danger" id="rmDisc">Remove discount</button>` : ""}
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  const rm = $("rmDisc");
  if (rm) rm.addEventListener("click", async () => {
    try {
      await updateDoc(doc(db, "jobs", job.id), { discount: null, updatedAt: Date.now() });
      toast("Discount removed.");
      openJobDetail(job.id);
    } catch (err) { toast(authError(err.code), true); }
  });
  $("discForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const val = Number(f.value.value);
    if (!val || val <= 0) return toast("Enter a discount value.", true);
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        discount: { label: f.label.value.trim(), kind: f.kind.value, value: val },
        updatedAt: Date.now()
      });
      toast("Discount saved.");
      openJobDetail(job.id);
    } catch (err) { toast(authError(err.code), true); }
  });
}

function paymentModal(job) {
  const t = totalsFor(job);
  openModal(`
    <h3>Record payment</h3>
    <p class="modal-sub">Final total <b style="color:var(--green)">${money(t.total)}</b></p>
    <form id="payForm">
      <label>Payment method
        <select name="method">
          ${Object.entries(METHOD_LABEL).map(([k, v]) => `<option value="${k}" ${job.payment && job.payment.method === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">Mark as paid</button>
      </div>
    </form>`);
  $("payForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "jobs", job.id), {
        payment: { method: e.target.method.value, paid: true, paidAt: Date.now() },
        updatedAt: Date.now()
      });
      toast("Payment recorded.");
      closeModal();
      openJobDetail(job.id);
    } catch (err) { toast(authError(err.code), true); }
  });
}

async function deleteJob(job) {
  if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "jobs", job.id));
    closeModal();
    toast("Job deleted.");
  } catch (err) {
    toast(authError(err.code), true);
  }
}

function renderInvoices() {
  const invoiced = jobs.filter((j) => j.invoice).sort((a, b) => (b.invoice.issuedAt || 0) - (a.invoice.issuedAt || 0));
  const paid = invoiced.filter((j) => j.payment && j.payment.paid);
  const revenue = paid.reduce((s, j) => s + totalsFor(j).total, 0);
  $("invoiceStats").textContent = invoiced.length
    ? `${invoiced.length} invoice${invoiced.length > 1 ? "s" : ""} · ${paid.length} paid · ${money(revenue)} collected`
    : isOffice() ? "" : "Invoices you generate appear here";
  $("invoiceList").innerHTML = invoiced.length
    ? invoiced.map((j) => `
      <div class="invoice-row" data-invoice="${j.id}" role="button" tabindex="0">
        <span class="inv-num">${esc(j.invoice.number)}</span>
        <div class="job-main">
          <strong>${esc(j.title)}</strong>
          <p class="job-meta">${esc((j.customer && j.customer.name) || "")} · Tech: ${esc(techLabel(j))}</p>
        </div>
        <div class="job-side">
          <span class="pill ${j.payment && j.payment.paid ? "green" : "amber"}">${j.payment && j.payment.paid ? "Paid" : "Unpaid"}</span>
          <span class="job-total">${money(j.invoice.total)}</span>
        </div>
      </div>`).join("")
    : `<div class="empty">No invoices yet.<br>Open a job and tap “Generate digital invoice”.</div>`;
}

function bindInvoiceOpen(containerId) {
  $(containerId).addEventListener("click", (e) => {
    const row = e.target.closest("[data-invoice]");
    if (row) { const j = getJob(row.dataset.invoice); if (j) viewInvoice(j); }
  });
  $(containerId).addEventListener("keydown", (e) => {
    const row = e.target.closest("[data-invoice]");
    if (row && e.key === "Enter") { const j = getJob(row.dataset.invoice); if (j) viewInvoice(j); }
  });
}
bindInvoiceOpen("invoiceList");

async function generateInvoice(job) {
  const t = totalsFor(job);
  try {
    const num = await runTransaction(db, async (tx) => {
      const ref = doc(db, "counters", "invoices");
      const snap = await tx.get(ref);
      const n = ((snap.exists() && snap.data().n) || 0) + 1;
      tx.set(ref, { n });
      return "AF-" + String(n).padStart(4, "0");
    });
    await updateDoc(doc(db, "jobs", job.id), {
      invoice: { number: num, issuedAt: Date.now(), issuedBy: me.name, total: t.total },
      updatedAt: Date.now()
    });
    toast("Invoice " + num + " generated.");
    const fresh = getJob(job.id);
    viewInvoice(fresh || { ...job, invoice: { number: num, issuedAt: Date.now(), issuedBy: me.name, total: t.total } });
  } catch (err) {
    toast("Could not generate invoice: " + authError(err.code), true);
  }
}

function invoiceHTML(job) {
  const t = totalsFor(job);
  const inv = job.invoice || {};
  return `
  <div class="invoice-sheet">
    <div class="inv-brand">
      <div>
        <h4>Arctic Flow Inc.</h4>
        <p class="inv-co">Air-conditioning services<br>www.arcticflow.app</p>
      </div>
      <div class="inv-no">
        <b>${esc(inv.number)}</b><br>
        Issued ${new Date(inv.issuedAt || Date.now()).toLocaleDateString()}<br>
        Job date ${esc(fmtDate(job.date))}
      </div>
    </div>
    <div class="inv-parties">
      <div>
        <h5>Billed to</h5>
        <p><b>${esc((job.customer && job.customer.name) || "—")}</b><br>${esc((job.customer && job.customer.address) || "")}<br>${esc((job.customer && job.customer.phone) || "")}</p>
      </div>
      <div>
        <h5>Job crew</h5>
        <p>Assigned by: <b>${esc(job.assignedByName || "—")}</b><br>Technician: <b>${esc(techLabel(job))}</b></p>
      </div>
    </div>
    <table class="inv-table">
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody>
        ${(job.services || []).map((x) => `<tr><td>${esc(x.desc)}</td><td>${money(x.amount)}</td></tr>`).join("")}
        ${(job.extras || []).map((x) => `<tr><td>${esc(x.desc)} <small style="color:#5b708c">(extra)</small></td><td>${money(x.amount)}</td></tr>`).join("")}
        ${t.discount ? `<tr><td style="color:#b45309">${esc((job.discount && job.discount.label) || "Discount")} (${job.discount.kind === "percent" ? esc(job.discount.value) + "%" : money(job.discount.value)} off)</td><td style="color:#b45309">−${money(t.discount)}</td></tr>` : ""}
      </tbody>
    </table>
    <div class="inv-totals">
      <div class="tot-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      ${t.discount ? `<div class="tot-row"><span>Discount</span><span>−${money(t.discount)}</span></div>` : ""}
      <div class="tot-row grand"><span>Total due</span><span>${money(t.total)}</span></div>
    </div>
    ${job.payment && job.payment.paid ? `<div style="text-align:right"><span class="inv-paid-stamp">PAID · ${esc(METHOD_LABEL[job.payment.method] || "")}</span></div>` : ""}
    <p class="inv-foot">Digital invoice generated by Arctic Flow · Invoice ${esc(inv.number)} · Issued by ${esc(inv.issuedBy || "—")}<br>Thank you for choosing Arctic Flow for your cooling needs.</p>
  </div>`;
}

function viewInvoice(job) {
  openModal(`
    <div class="detail-head">
      <div>
        <h3>Invoice ${esc((job.invoice && job.invoice.number) || "draft")}</h3>
        <p class="modal-sub">${esc(job.title)}</p>
      </div>
      <button type="button" class="detail-close" data-close aria-label="Close">×</button>
    </div>
    ${invoiceHTML(job)}
    <div class="action-row">
      <button type="button" class="btn btn-primary btn-sm" id="printInvBtn">Print / save PDF</button>
      ${!job.payment || !job.payment.paid ? `<button type="button" class="btn btn-ghost btn-sm" id="invPayBtn">Record payment</button>` : ""}
    </div>`);
  $("printInvBtn").addEventListener("click", () => printInvoice(job));
  const payBtn = $("invPayBtn");
  if (payBtn) payBtn.addEventListener("click", () => paymentModal(job));
}

function printInvoice(job) {
  let host = document.getElementById("printArea");
  if (host) host.remove();
  host = document.createElement("div");
  host.id = "printArea";
  host.innerHTML = invoiceHTML(job);
  document.body.appendChild(host);
  document.body.classList.add("printing");
  const cleanup = () => {
    document.body.classList.remove("printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  setTimeout(cleanup, 1500);
}

init();

window.addEventListener("offline", () => toast("You're offline — work keeps locally and syncs when reconnected.", true));
window.addEventListener("online", () => toast("Back online — syncing your data."));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
