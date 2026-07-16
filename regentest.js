const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  await p.evaluate(()=>selectStudent('s2')); await p.waitForTimeout(500); // Marcus has intake
  const hasRegen = await p.$('#regenPlanBtn') ? true : false;
  await p.click('#regenPlanBtn'); await p.waitForTimeout(2000);
  const ipVal = await p.inputValue('#ip_input');
  const out = await p.textContent('#planOutput').catch(()=>'');
  console.log(JSON.stringify({ hasRegen, ipPrefilledFromIntake: ipVal.includes('Eligibility') || ipVal.length>10, planGenerated: out.includes('SUMMARY')||out.length>150, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
