const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const number = value => new Intl.NumberFormat("fa-IR").format(value);
const date = value => value ? new Date(value).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" }) : "—";
const pageLabels = {
  workoutPrograms: "برنامه‌های ورزشی", workoutTimer: "زمان‌سنج ورزش", weightPlan: "برنامهٔ وزن",
  learning: "یادگیری", developmentExercise: "فعالیت ورزشی", languageEssays: "نوشته‌های زبان",
  languageLessons: "درس‌های زبان", languageVocabulary: "واژگان زبان", calendar: "تقویم",
  workbench: "میز کار", assets: "دارایی‌ها", projects: "پروژه‌ها", habits: "عادت‌ها",
  bookmarks: "لینک‌های ذخیره‌شده", organizer: "برنامه‌ریز", tasks: "کارها", reminders: "یادآورها",
  suggestions: "پیشنهاد سرمایه‌گذاری", monthlyPlan: "برنامهٔ ماهانه", monthlyExpenses: "هزینه‌های ماهانه",
  notes: "یادداشت‌ها", connected: "سبد متصل", overview: "نمای کلی", transactions: "تراکنش‌ها",
  accounts: "حساب‌ها", budgets: "بودجه‌ها", goals: "هدف‌ها", installments: "اقساط",
  receivables: "طلب‌ها", locked: "دارایی‌های مسدود", market: "بازار", reports: "گزارش‌ها", settings: "تنظیمات",
};
const pageLabel = page => pageLabels[page] || page;
let csrf, session, roles = [], users, userPage = 1, creating = false, originalRole = null, tab = "analytics";
const message = text => { $("#message").textContent = text; $("#message").hidden = !text; };
async function api(path, method = "GET", body) {
  const response = await fetch(path, { method, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf || "" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) {
    if (response.status === 401) throw new Error("برای ادامه دوباره وارد حساب شوید.");
    if (response.status === 403) throw new Error("دسترسی مدیریت ندارید یا حساب غیرفعال شده است.");
    let error; try { error = (await response.json()).error; } catch {}
    throw new Error(error || "دریافت اطلاعات انجام نشد؛ دوباره تلاش کنید.");
  }
  return response.status === 204 ? null : response.json();
}
async function run(action) { message(""); try { await action(); } catch (error) { message(error.message); } }
async function loadRoles() { roles = await api("/admin/api/roles"); }
async function loadUsers() {
  const search = new FormData($("#search")).get("search");
  users = await api(`/admin/api/users?page=${userPage}&search=${encodeURIComponent(search)}`);
  $("#user-rows").innerHTML = users.items.map((user, i) => `<tr><td><b>${esc(user.name)}</b><small dir="ltr">${esc(user.email)}</small><small dir="ltr">${esc(user.id)}</small></td><td>${user.roles.map(role => `<span class="badge">${esc(role)}</span>`).join("") || "—"}</td><td class="${user.isActive ? "" : "disabled"}">${user.isActive ? "فعال" : "غیرفعال"}</td><td>${esc(date(user.lastSeenAt))}</td><td><button type="button" data-edit-user="${i}">ویرایش</button></td></tr>`).join("") || '<tr><td colspan="5">کاربری پیدا نشد.</td></tr>';
  $("#pagination").textContent = `صفحهٔ ${number(users.page)} · ${number(users.total)} کاربر`;
  $("#prev").disabled = userPage <= 1; $("#next").disabled = userPage * users.pageSize >= users.total;
}
function renderRoles() {
  $("#role-rows").innerHTML = roles.map((role, i) => `<tr><td><b dir="auto">${esc(role.name)}</b>${role.isSystem ? '<small>نقش پایه</small>' : ""}</td><td>${number(role.userCount)}</td><td>${role.isSystem ? "محافظت‌شده" : `<div class="actions"><button type="button" data-edit-role="${i}">تغییر نام</button><button type="button" data-delete-role="${i}">حذف</button></div>`}</td></tr>`).join("");
}
let latestReport;
function drawDailyChart(report) {
  const width = Math.max(300, $("#daily-chart").clientWidth), right = width - 40;
  const points = report.daily, max = Math.max(1, ...points.map(p => p.views));
  const xy = (p, i) => `${40 + i * (width - 80) / Math.max(1, points.length - 1)},${175 - 145 * p.views / max}`;
  $("#daily-chart").innerHTML = `<svg viewBox="0 0 ${width} 215" role="img" aria-label="نمودار روزانه؛ جدول مقادیر در ادامه"><line x1="40" x2="${right}" y1="175" y2="175"/><line x1="40" x2="${right}" y1="30" y2="30"/><text x="5" y="35">${number(max)}</text><text x="15" y="179">۰</text><polyline points="${points.map(xy).join(" ")}"/>${points.length === 1 ? `<circle cx="40" cy="${175 - 145 * points[0].views / max}" r="4"/>` : ""}<text x="40" y="207">${esc(report.from)}</text><text x="${right}" y="207" text-anchor="end">${esc(report.to)}</text></svg><details><summary>جدول آمار روزانه</summary><div class="table-scroll"><table><thead><tr><th>روز (UTC)</th><th>بازدید</th></tr></thead><tbody>${points.map(p => `<tr><td dir="ltr">${esc(p.date)}</td><td>${number(p.views)}</td></tr>`).join("")}</tbody></table></div></details>`;
}
let chartWidth = 0;
new ResizeObserver(([entry]) => {
  if (entry.contentRect.width > 0 && entry.contentRect.width !== chartWidth) {
    chartWidth = entry.contentRect.width; if (latestReport) drawDailyChart(latestReport);
  }
}).observe($("#daily-chart"));
async function loadViews() {
  const form = new FormData($("#dates"));
  const report = await api(`/admin/api/views?${new URLSearchParams(form)}`);
  $("#total").textContent = number(report.totalViews); $("#page-count").textContent = number(report.pages.length); $("#average").textContent = number(Math.round(report.totalViews / Math.max(1, report.daily.length)));
  latestReport = report; drawDailyChart(report);
  const pageMax = Math.max(1, ...report.pages.map(p => p.views));
  $("#page-chart").innerHTML = report.pages.length ? `<div class="bars">${report.pages.map(p => `<div class="bar-row"><span dir="auto">${esc(pageLabel(p.page))}</span><div class="bar-track"><i style="width:${p.views * 100 / pageMax}%"></i></div><b>${number(p.views)}</b></div>`).join("")}</div>` : '<p class="muted">در این بازه هنوز بازدیدی ثبت نشده است.</p>';
  if (!form.get("page")) {
    $("#dates select").innerHTML = '<option value="">همهٔ صفحه‌ها</option>' + report.pages.map(p => `<option value="${esc(p.page)}">${esc(pageLabel(p.page))}</option>`).join("");
  }
}
async function selectTab(next) {
  tab = next;
  for (const name of ["analytics", "users", "roles"]) {
    $(`#${name}`).hidden = name !== tab;
    const button = $(`[data-tab="${name}"]`); if (name === tab) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  }
  $("#title").textContent = {analytics:"آمار بازدید",users:"مدیریت کاربران",roles:"مدیریت نقش‌ها"}[tab];
  if (tab === "analytics") await loadViews(); else { await loadRoles(); if (tab === "users") await loadUsers(); else renderRoles(); }
}
async function editUser(user) {
  await loadRoles();
  creating = !user;
  const form = $("#user-form"); form.reset(); form.querySelector(".form-error").textContent = "";
  $("#user-title").textContent = creating ? "افزودن کاربر" : "ویرایش کاربر";
  form.elements.id.value = user?.id || ""; form.elements.id.readOnly = !creating;
  form.elements.name.value = user?.name || ""; form.elements.email.value = user?.email || ""; form.elements.isActive.checked = user?.isActive ?? true;
  const selected = user?.roles || ["User"];
  $("#user-role-options").innerHTML = roles.map(r => `<label class="check"><input type="checkbox" name="roles" value="${esc(r.name)}" ${selected.includes(r.name) ? "checked" : ""}><span dir="auto">${esc(r.name)}</span></label>`).join("");
  $("#user-dialog").showModal();
}
function editRole(role) {
  originalRole = role?.name ?? null;
  $("#role-form").reset(); $("#role-form .form-error").textContent = ""; $("#role-form").elements.name.value = originalRole || "";
  $("#role-dialog").showModal();
}
document.addEventListener("click", event => {
  const button = event.target.closest("button"); if (!button) return;
  if (button.dataset.tab) void run(() => selectTab(button.dataset.tab));
  if (button.hasAttribute("data-close")) button.closest("dialog").close();
  if (button.hasAttribute("data-edit-user")) void run(() => editUser(users.items[Number(button.dataset.editUser)]));
  if (button.hasAttribute("data-edit-role")) editRole(roles[Number(button.dataset.editRole)]);
  if (button.hasAttribute("data-delete-role")) void run(async () => {
    const role = roles[Number(button.dataset.deleteRole)];
    if (!confirm(`نقش «${role.name}» حذف شود؟`)) return;
    await api(`/admin/api/roles/${encodeURIComponent(role.name)}`, "DELETE"); await loadRoles(); renderRoles();
  });
});
$("#new-user").onclick = () => void run(() => editUser(null));
$("#new-role").onclick = () => editRole(null);
$("#prev").onclick = () => void run(async () => { userPage--; await loadUsers(); });
$("#next").onclick = () => void run(async () => { userPage++; await loadUsers(); });
$("#search").onsubmit = event => { event.preventDefault(); userPage = 1; void run(loadUsers); };
$("#dates").onsubmit = event => { event.preventDefault(); void run(loadViews); };
async function submit(form, action) {
  const button = form.querySelector('[type="submit"]'); button.disabled = true; form.querySelector(".form-error").textContent = "";
  try { await action(); form.closest("dialog").close(); } catch (error) { form.querySelector(".form-error").textContent = error.message; } finally { button.disabled = false; }
}
$("#user-form").onsubmit = event => {
  event.preventDefault(); const form = event.target, data = new FormData(form);
  void submit(form, async () => { await api("/admin/api/users", creating ? "POST" : "PUT", { id:data.get("id"), name:data.get("name"), email:data.get("email") || null, isActive:data.has("isActive"), roles:data.getAll("roles") }); await loadUsers(); });
};
$("#role-form").onsubmit = event => {
  event.preventDefault(); const form = event.target;
  void submit(form, async () => { await api("/admin/api/roles", "POST", { originalName: originalRole, name: form.elements.name.value }); await loadRoles(); renderRoles(); });
};
await run(async () => {
  session = await api("/api/session"); csrf = session.csrf;
  if (!session.isAdmin) throw new Error("دسترسی مدیریت لازم است.");
  $("#identity").textContent = session.name;
  const today = new Date(), from = new Date(today); from.setUTCDate(from.getUTCDate() - 29);
  $("#dates").elements.from.value = from.toISOString().slice(0,10); $("#dates").elements.to.value = today.toISOString().slice(0,10);
  await selectTab("analytics");
});
