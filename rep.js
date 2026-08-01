const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1100}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(900);
  await p.click('.tab[data-tab=reports]'); await p.waitForTimeout(300);
  const hasGenMetrics = await p.$('#genMetricsBtn')?true:false;
  const hasNarrative = await p.$('#genNarrativeBtn')?true:false;
  // generate month-end (should also load narrative -> demo message)
  await p.fill('#meMonth','2026-06'); await p.click('#meRunBtn'); await p.waitForTimeout(400);
  const narrBox = await p.textContent('#narrativeBox').catch(()=>'');
  // click generate metrics -> demo guard
  await p.click('#genMetricsBtn'); await p.waitForTimeout(200);
  const t1 = await p.textContent('#toast').catch(()=>'');
  // click generate narrative -> demo guard
  await p.click('#genNarrativeBtn'); await p.waitForTimeout(200);
  const t2 = await p.textContent('#toast').catch(()=>'');
  console.log(JSON.stringify({ hasGenMetrics, hasNarrative, narrBox: narrBox.slice(0,60), t1, t2, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
