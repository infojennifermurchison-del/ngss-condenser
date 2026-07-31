const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(900);
  await p.evaluate(()=>selectStudent('s2')); await p.waitForTimeout(400);
  const types = await p.$$eval('#se_type option', o=>o.map(x=>x.textContent));
  const hasNoShow = types.includes('No show (attempted)');
  const role = await p.textContent('#roleBadge');
  console.log(JSON.stringify({ role, hasNoShow, typeCount: types.length, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
