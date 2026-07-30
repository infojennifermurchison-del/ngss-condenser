const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1&as=mentor', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  await p.click('#studentList [data-id]'); await p.waitForTimeout(400);
  const hasStart = await p.$('#se_start')?true:false, hasEnd = await p.$('#se_end')?true:false, hasDur = await p.$('#se_dur')?true:false;
  // try to save with no times -> should be blocked (HTML required or JS toast)
  await p.evaluate(()=>{ document.getElementById('se_start').value=''; document.getElementById('se_end').value=''; });
  // fill valid times and save
  await p.fill('#se_start','15:00'); await p.fill('#se_end','15:45');
  await p.click('#sessionForm button[type=submit]'); await p.waitForTimeout(400);
  const toastTxt = await p.textContent('#toast').catch(()=>'');
  // check the new session shows the time range and 0.8 hr (45 min)
  const hist = await p.textContent('#sessionHistory').catch(()=>'');
  const showsTime = hist.includes('15:00–15:45');
  // now test end<=start validation
  await p.fill('#se_start','16:00'); await p.fill('#se_end','16:00');
  await p.click('#sessionForm button[type=submit]'); await p.waitForTimeout(300);
  const toast2 = await p.textContent('#toast').catch(()=>'');
  console.log(JSON.stringify({ hasStart, hasEnd, durRemoved: !hasDur, toastTxt, showsTime, toast2, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
