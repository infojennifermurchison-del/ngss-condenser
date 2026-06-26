const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  await p.click('.tab[data-tab=reports]'); await p.waitForTimeout(300);
  const hasBtn = await p.$('#sendRemindersBtn') ? true : false;
  await p.click('#sendRemindersBtn'); await p.waitForTimeout(300);
  const toastText = await p.textContent('#toast').catch(()=>'');
  console.log(JSON.stringify({ hasBtn, toastText, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
