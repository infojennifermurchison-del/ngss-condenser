const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  // detail shows two mentors for s2 (Marcus)
  await p.evaluate(()=>selectStudent('s2')); await p.waitForTimeout(400);
  const detailTxt = await p.textContent('#studentDetail');
  const showsTwo = detailTxt.includes('Assigned mentors:') && detailTxt.includes('&');
  // Manage students has two mentor selects
  await p.click('.tab[data-tab=manage]'); await p.waitForTimeout(200);
  const hasM1 = await p.$('#sf_mentor')?true:false, hasM2 = await p.$('#sf_mentor2')?true:false;
  const m2opts = await p.$$eval('#sf_mentor2 option', o=>o.length);
  // health accommodations is now a textarea
  await p.click('.tab[data-tab=intake]'); await p.waitForTimeout(200);
  const accType = await p.evaluate(()=>document.querySelector('[data-f="health.accommodations"]').tagName);
  // approvals has two mentor selects
  await p.click('.tab[data-tab=approvals]'); await p.waitForTimeout(300);
  const apprHasM2 = await p.$('select[id^="appr-mentor2-"]')?true:false;
  console.log(JSON.stringify({ showsTwo, hasM1, hasM2, m2opts, accType, apprHasM2, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
