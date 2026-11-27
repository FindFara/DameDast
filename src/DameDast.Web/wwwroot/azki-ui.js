import { getLanguage, t } from "./i18n.js";
import { navigationGroups } from "./navigation.js";
import { chevronIcon } from "./ui-icons.js";
const tr = (en, fa) => getLanguage() === "fa" ? fa : en;
const mark = '<svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><rect x="1" y="1" width="28" height="28" rx="10" fill="currentColor" opacity=".1"/><g transform="translate(3 3)" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V3.5a1.5 1.5 0 0 1 3 0V12M14 11V5a1.5 1.5 0 0 1 3 0v8M17 11V8a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.8-2.4L3.5 13.5a1.75 1.75 0 0 1 2.7-2.2L8 13M12 16h4"/></g></svg>';
export function azkiHeader(page, icon, sections = {}) {
  const groupLabels = {money:"Money",planning:"Plan & remember",learning:"Learning hub",language:"Language",exercise:"Exercise"};
  const titles = {overview:"Overview",workbench:"Workbench",settings:"Settings",monthlyPlan:"Monthly plan",transactions:"Transactions",accounts:"Accounts",budgets:"Budgets",notes:"Notes",projects:"Projects",habits:"Routines",bookmarks:"Saved links",calendar:"Calendar",tasks:"Tasks",reminders:"Reminders",goals:"Savings goals",learning:"Learning activities",languageEssays:"Daily essays",languageLessons:"Lesson notes",languageVocabulary:"Daily vocabulary",developmentExercise:"Exercise log",workoutPrograms:"Workout programs",workoutTimer:"Stopwatch & timer",weightPlan:"Weight plan",assets:"Asset performance",market:"Market",suggestions:"Suggestions",connected:"Connected",locked:"Locked assets",installments:"Installments",monthlyExpenses:"Monthly expenses",receivables:"Money lent"};
  const link = key => `<a href="#${key}" ${page === key ? 'aria-current="page"' : ''}>${icon(key)}<span>${t(sections[key]?.[0] || titles[key] || key)}</span></a>`;
  const menus = Object.entries(groupLabels).map(([id,label]) => {
    const items = navigationGroups.filter(g => g.id === id || id === 'money' && ['investing','obligations'].includes(g.id)).flatMap(g=>g.items);
    if (id === 'learning') return link('learning');
    return `<details class="azki-nav-menu"><summary class="${items.includes(page) ? 'is-current' : ''}">${t(label)}${chevronIcon}</summary><div class="azki-nav-popover">${items.map(link).join('')}</div></details>`;
  }).join('');
  return `<div class="azki-header-inner"><a class="azki-brand" href="#overview" aria-label="${t('DameDast')}">${mark}<span>${t('DameDast')}<small>DameDast</small></span></a><nav class="azki-navigation" aria-label="${t('Menu')}">${link('overview')}${link('workbench')}${menus}</nav><a class="azki-account" href="#settings">${icon('settings')}<span>${t('Settings')}</span></a></div>`;
}
export function azkiDashboard(c, icon) {
  const services = [
    ['accounts','Accounts',tr('Balances and bank cards','موجودی و کارت‌های بانکی'),'wallet'],
    ['tasks','Tasks',tr('Your plans, in one place','برنامه‌ها و کارهای روزانه'),'calendar'],
    ['notes','Notes',tr('Keep your ideas close','یادداشت و ایده‌ها'),'notes'],
    ['learning','Learning hub',tr('Study and personal growth','مطالعه و توسعهٔ فردی'),'book'],
    ['languageEssays','Language',tr('Essays, words and lessons','انشا، کلمات و جزوه‌ها'),'languageLessons'],
    ['developmentExercise','Exercise',tr('Training and body weight','تمرین و برنامهٔ وزنی'),'developmentExercise'],
    ['goals','Savings goals',tr('One step closer','یک قدم نزدیک‌تر'),'goals'],
    ['calendar','Calendar',tr('See what is coming','برنامه‌های پیش‌رو'),'calendar'],
  ];
  return `<section class="azki-home"><nav class="azki-home-tabs" aria-label="${tr('Your workspace','فضای من')}"><a href="#overview" aria-current="page">${icon('overview')}${t('Overview')}</a><a href="#workbench">${icon('workbench')}${t('Workbench')}</a><a href="#calendar">${icon('calendar')}${t('Calendar')}</a></nav><div class="azki-home-heading"><div><h2>${tr('Everything, within reach','همه‌چیز، دمِ دست')}</h2><p>${tr('Money, plans and your everyday progress','حساب‌ها، کارها و برنامه‌های روزانه')}</p></div><button type="button" class="azki-search" data-action="workspace-search">${icon('search')}<span>${t('Search everywhere')}</span><kbd>/</kbd></button></div><div class="azki-services">${services.map(([route,title,subtitle,glyph],i)=>`<a class="azki-service ${i<2?'is-wide':''}" href="#${route}"><span class="azki-service-art" aria-hidden="true">${icon(glyph)}</span><div><h3>${t(title)}</h3><p>${subtitle}</p></div>${i<2?`<span class="azki-service-foot">${t(i===0?'Transactions':'Weekly plan')}</span>`:''}</a>`).join('')}</div></section>`;
}
