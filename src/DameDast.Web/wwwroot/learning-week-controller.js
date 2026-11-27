import { t, getLanguage } from "./i18n.js";
import { dateControl } from "./calendar.js";
import { dateText, escapeHtml as esc } from "./finance.js";
import { shiftDay } from "./planner.js";
import { learningWeekDays } from "./learning-week.js";
import { closeIcon, chevronIcon } from "./ui-icons.js";

const tr = (en, fa) => getLanguage() === "fa" ? fa : en;
export function learningWeekForm(date, titles) {
  const days = learningWeekDays(date), names = getLanguage() === "fa"
    ? ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه"]
    : ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  return `<form data-learning-week-form><header class="dialog-heading"><h2 id="learning-week-title">${tr("Add week", "ثبت هفتگی")}</h2><button type="button" class="icon-button" data-week-close aria-label="${t("Close")}">${closeIcon}</button></header><fieldset><legend class="sr-only">${tr("Learning titles", "عنوان‌های یادگیری")}</legend><div class="learning-week-picker"><button type="button" class="icon-button" data-week-shift="-1" aria-label="${tr("Previous week", "هفتهٔ قبل")}">${chevronIcon}</button>${dateControl("Week beginning", "learning-week", days[0], true)}<button type="button" class="icon-button" data-week-shift="1" aria-label="${tr("Next week", "هفتهٔ بعد")}">${chevronIcon}</button></div><div class="learning-week-fields">${days.map((day, i) => `<label class="field"><span class="learning-week-day"><span>${names[i]}</span><time datetime="${day}">${dateText(day)}</time></span><input name="title${i}" data-week-title="${i}" dir="auto" maxlength="120" value="${esc(titles[i] || "")}" aria-label="${names[i]}" placeholder="${tr("Learning title", "عنوان یادگیری")}"></label>`).join("")}</div></fieldset><p class="form-error" role="alert"></p><footer class="dialog-actions"><button type="button" class="secondary" data-week-close>${t("Close")}</button><button type="submit" class="primary">${t("Save")}</button></footer></form>`;
}
export class LearningWeekController {
  constructor({context, save, saved}) { this.context = context; this.save = save; this.saved = saved; this.drafts = new Map(); }
  key() { return `damedast-learning-week:${this.scope}:${this.date}`; }
  draft() {
    const key = this.key();
    if (!this.drafts.has(key)) {
      let saved;
      try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
      const valid = Array.isArray(saved?.titles) && saved.titles.length === 6 && saved.titles.every(t => typeof t === "string" && t.length <= 120)
        && Array.isArray(saved?.ids) && saved.ids.length === 6 && new Set(saved.ids).size === 6 && saved.ids.every(id => /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id));
      this.drafts.set(key, valid ? saved : {titles: Array(6).fill(""), ids: Array.from({length:6}, () => crypto.randomUUID())});
    }
    return this.drafts.get(key);
  }
  capture() {
    if (!this.dialog?.open || this.busy) return;
    const draft = this.draft();
    this.dialog.querySelectorAll('[data-week-title]').forEach(input => draft.titles[Number(input.dataset.weekTitle)] = input.value);
    try { localStorage.setItem(this.key(), JSON.stringify(draft)); } catch {} // The in-memory draft remains available.
  }
  open(date, opener) {
    this.scope = this.context().space; this.date = learningWeekDays(date)[0]; this.opener = opener;
    if (!this.dialog) {
      this.dialog = document.createElement("dialog"); this.dialog.id = "learning-week-dialog";
      this.dialog.setAttribute("aria-labelledby", "learning-week-title"); document.body.append(this.dialog);
      this.dialog.addEventListener("input", () => this.capture());
      this.dialog.addEventListener("change", event => {
        if (event.target.name === "learning-week") this.selectWeek(event.target.value);
      });
      this.dialog.addEventListener("click", event => {
        if (event.target.closest('[data-week-close]') || event.target === this.dialog) this.close();
        const shift = event.target.closest('[data-week-shift]');
        if (shift && !this.busy) this.selectWeek(shiftDay(this.date, Number(shift.dataset.weekShift) * 7));
      });
      this.dialog.addEventListener("cancel", event => { event.preventDefault(); this.close(); });
      this.dialog.addEventListener("submit", event => { event.preventDefault(); void this.submit(); });
    }
    this.render(); this.dialog.showModal(); this.dialog.querySelector('[data-week-title]')?.focus();
  }
  render() { this.dialog.dir = getLanguage() === "fa" ? "rtl" : "ltr"; this.dialog.innerHTML = learningWeekForm(this.date, this.draft().titles); }
  selectWeek(date) {
    if (this.busy) return;
    this.capture();
    try { this.date = learningWeekDays(date)[0]; this.render(); this.dialog.querySelector('[name="learning-week"]')?.closest('.solar-date')?.querySelector('button')?.focus(); }
    catch (error) { this.error(error); }
  }
  close() {
    if (this.busy) return;
    this.capture(); this.dialog.close();
    const target = this.opener?.getClientRects().length ? this.opener : document.querySelector('.page-toolbar-toggle');
    target?.focus({preventScroll:true});
  }
  error(error) { this.dialog.querySelector('.form-error').textContent = t(error.message); }
  async submit() {
    if (this.busy) return;
    this.capture(); this.busy = true;
    const form = this.dialog.querySelector('form'), button = form.querySelector('[type="submit"]');
    form.querySelector('fieldset').disabled = true; button.disabled = true; this.dialog.setAttribute('aria-busy', 'true');
    try {
      await this.save(this.date, this.draft().titles, this.draft().ids, this.scope);
      try { localStorage.removeItem(this.key()); } catch {}
      this.drafts.delete(this.key()); this.busy = false;
      this.dialog.close();
      const target = this.opener?.getClientRects().length ? this.opener : document.querySelector('.page-toolbar-toggle');
      target?.focus({preventScroll:true}); this.saved();
    } catch (error) { this.error(error); }
    finally { this.busy = false; form.querySelector('fieldset').disabled = false; button.disabled = false; this.dialog.removeAttribute('aria-busy'); }
  }
}
