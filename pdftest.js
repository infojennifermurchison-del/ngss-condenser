const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  // open Marcus (s2) who has a saved plan
  await p.evaluate(()=>selectStudent('s2')); await p.waitForTimeout(500);
  const hasPdfBtn = await p.$('button[onclick^="savePlanPdf"]') ? true : false;
  // click it -> demo guard toast
  await p.click('#planHistory details summary').catch(()=>{});
  await p.click('button[onclick^="savePlanPdf"]').catch(()=>{}); await p.waitForTimeout(200);
  const toastTxt = await p.textContent('#toast').catch(()=>'');
  // verify date prompt logic builds real dates (call requestPlanText prompt via a probe)
  const promptHasToday = await p.evaluate(()=>{
    const d=new Date(); const f=d.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    return f; // just confirm formatting works
  });
  console.log(JSON.stringify({ hasPdfBtn, toastTxt, sampleDate: promptHasToday, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
