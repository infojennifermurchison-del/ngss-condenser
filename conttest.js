const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  await p.click('#studentList [data-id]'); await p.waitForTimeout(400);
  await p.fill('#ip_input','Test concerns for plan.');
  const t0=Date.now();
  await p.click('#genPlanBtn'); await p.waitForTimeout(2500);
  const out = await p.textContent('#planOutput').catch(()=>'');
  console.log(JSON.stringify({ elapsedMs: Date.now()-t0, planHasContent: out.includes('SUMMARY') || out.length>100, sawSaveBtn: out.includes('Save to Student Record'), errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
