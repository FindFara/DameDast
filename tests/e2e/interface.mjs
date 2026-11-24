import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
const base = process.env.DAMEDAST_TEST_URL || 'http://127.0.0.1:5000';
const errors = [];
async function prepare(context) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/market**', route => route.fulfill({status:200,contentType:'application/json',body:'{"quotes":[]}'}));
  await page.goto(base+'/?lang=fa#overview');
  await page.locator('.attention-card').waitFor();
  return page;
}
async function fixtures(page) {
  return page.evaluate(async()=>{
    const {today} = await import('/finance.js');
    const {shiftDay,weekday} = await import('/planner.js');
    const date=today(), nextWeek=shiftDay(date,7-((weekday(date)+1)%7));
    const row=(kind,data)=>({id:crypto.randomUUID(),kind,version:1,deleted:false,data});
    const account=row('account',{name:'حساب روزمره',openingBalance:10000,color:'teal'});
    const notes=[row('note',{title:'قرارداد اجاره',body:'یادداشت برای بررسی قرارداد',updatedOn:date,pinned:false}),row('note',{title:'فهرست خرید',body:'متن دوم',updatedOn:date,pinned:false})];
    const task=row('calendarEvent',{title:'پیگیری قرارداد اجاره',description:'',startDate:shiftDay(date,-1),endDate:shiftDay(date,-1),allDay:true,kind:'task',done:false,color:'#72ab95',repeat:'none',repeatCalendar:'persian',completedDates:[]});
    const loan=row('installment',{title:'اجاره خانه',amount:1200,dueDate:nextWeek,paid:false,reminderDays:3});
    const expense=row('transaction',{accountId:account.id,type:'expense',amount:600,category:'Home',date,note:'پرداخت اجاره'});
    return {date,account,notes,task,loan,expense,rows:[account,...notes,task,loan,expense]};
  });
}
async function install(page, records) {
  await page.evaluate(async records => {const {saveSpace}=await import('/store.js');await saveSpace('guest',{snapshot:{revision:0,records},pending:[]});},records);
  await page.reload(); await page.locator('.attention-card').waitFor();
}
async function go(page, hash) {await page.evaluate(hash=>{location.hash=hash;},hash);await page.waitForTimeout(120);}
async function screenshot(page,name) {if(process.env.DAMEDAST_SCREENSHOTS) await page.screenshot({path:process.env.DAMEDAST_SCREENSHOTS+'/'+name+'.png',fullPage:true});}
async function setTheme(page,theme) {await page.evaluate(async theme=>{const {setTheme}=await import('/i18n.js');setTheme(theme);},theme);}
async function colorOfToken(page, token) {
  return page.evaluate(token=>{const probe=document.createElement('span');probe.style.background=`var(${token})`;document.body.append(probe);const color=getComputedStyle(probe).backgroundColor;probe.remove();return color;},token);
}
async function swipe(page, context) {
  const cdp=await context.newCDPSession(page);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:185,y:640}]});
  for(let i=1;i<=18;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:185,y:640-i*24}]});await page.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(350);
  await cdp.detach();
  return page.evaluate(()=>scrollY);
}
try {
  const desktop=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  const page=await prepare(desktop), data=await fixtures(page);
  await install(page,data.rows);
  const attention=page.locator('.attention-card');
  assert.equal(await attention.getAttribute('data-attention-count'),'3');
  assert.equal(await attention.evaluate(el=>el.open),false);
  assert.equal(await attention.evaluate(el=>el.classList.contains('has-multiple')),true);
  const badge=page.locator('.dashboard-date');
  assert.equal(await badge.getAttribute('datetime'),data.date);
  assert.ok(!/[0-9۰-۹]{4}/.test(await badge.innerText()),'Date omits the year');
  assert.equal(await page.locator('.attention-summary time').count(),0);
  const badgeBox=await badge.boundingBox(), eyeBox=await page.locator('.amounts-toggle').boundingBox();
  assert.ok(badgeBox.x<eyeBox.x,'The date sits to the left of the eye in Persian');
  await page.locator('.attention-summary').click();
  await page.locator('[data-action=dashboard-privacy]').click();
  assert.equal(await attention.evaluate(el=>el.open),true,'Expanded attention survives rerenders');
  await screenshot(page,'dashboard-light');
  await page.locator('#app-menu-button').click();
  assert.equal(await page.locator('#app-sidebar input[type=search]').count(),1);
  await page.fill('#workspace-search-input','اجاره');
  await page.locator('.workspace-search-result').first().waitFor();
  assert.ok(await page.locator('.workspace-search-result').count()>=4);
  assert.equal(await page.locator('#navigation').isVisible(),false);
  await page.locator(`.workspace-search-result[data-id="${data.notes[0].id}"]`).click();
  assert.equal(await page.locator('body.nav-open').count(),0);
  await page.locator('[data-note-form]').waitFor();
  assert.equal(await page.locator('[data-note-form]').count(),1);
  assert.equal(await page.locator('[data-note-side]').count(),0);
  await page.keyboard.press('Control+k');
  assert.equal(await page.locator('#workspace-search-input').evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('#navigation').isVisible(),true);
  await page.evaluate(()=>document.querySelectorAll('.nav-group').forEach(group=>group.open=true));
  const colors=await page.locator('.nav-group-items .nav-item > svg').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).color));
  assert.equal(new Set(colors).size,colors.length,'Every submenu has its own color');
  await screenshot(page,'menu-colors');
  await page.locator('#app-menu-close').click();
  await go(page,'overview');
  for(const theme of ['light','dark']) {
    await setTheme(page,theme);
    assert.equal(await page.locator('.stat-card.featured').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
    assert.equal(await page.locator('.stat-card.featured').evaluate(el=>getComputedStyle(el).backgroundColor),await colorOfToken(page,'--surface-raised'));
    await screenshot(page,'dashboard-'+theme);
  }
  for(const [total, records] of [[0,[data.account,...data.notes]],[1,[data.account,data.task]],[2,[data.account,data.task,data.loan]]]) {
    await install(page,records);
    assert.equal(await attention.getAttribute('data-attention-count'),String(total));
    assert.equal(await attention.evaluate(el=>el.classList.contains('has-multiple')),total>1);
  }
  await install(page,data.rows);
  await desktop.close();
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const phone=await prepare(mobile), mobileData=await fixtures(phone);
  await install(phone,mobileData.rows);
  await phone.locator('.attention-summary').click();
  await screenshot(phone,'dashboard-mobile');
  for(const theme of ['light','dark']) {
    await setTheme(phone,theme);await go(phone,'workbench');await phone.locator('#desk-board').waitFor();
    assert.equal(await phone.locator('.desk-widget-summary').evaluate(el=>getComputedStyle(el).backgroundColor),await colorOfToken(phone,'--surface'));
    const petColor=await colorOfToken(phone,'--surface-soft');
    await phone.waitForFunction(color=>getComputedStyle(document.querySelector('.desk-pet-scene')).backgroundColor===color,petColor);
    assert.ok(await swipe(phone,mobile)>100,'Swiping a card scrolls the workbench in '+theme);
  }
  await screenshot(phone,'workbench-dark-mobile');
  await phone.locator('[data-desk-action=toggle-edit]').click();
  await phone.locator('.workbench-editing').waitFor();
  assert.ok(await swipe(phone,mobile)>100,'Vertical touch scrolling also works while editing');
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Editing does not overflow the page horizontally');
  await phone.locator('[data-desk-action=toggle-edit]').click();
  await mobile.close();
  assert.deepEqual(errors,[]);
  console.log('Interface passed: menu search, colored submenus, folded attention and red threshold, short header date, themes, single notes, mobile touch scrolling in both modes.');
} finally {await browser.close();}
