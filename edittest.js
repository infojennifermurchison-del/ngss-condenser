const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1100}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1&as=mentor', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  // select Aaliyah (s1) who has sessions owned by u-maya (mentor view is u-maya)
  await p.evaluate(()=>selectStudent('s1')); await p.waitForTimeout(500);
  // no-show type: log without times
  await p.selectOption('#se_type','No show (attempted)'); await p.waitForTimeout(100);
  await p.fill('#se_notes','Youth did not show for scheduled session.');
  await p.click('#se_submit'); await p.waitForTimeout(500);
  const toast1 = await p.textContent('#toast').catch(()=>'');
  const histHasNoShow = (await p.textContent('#sessionHistory')).includes('No show');
  // Edit an existing session
  const hasEditBtn = await p.$('button[onclick^="editSession"]')?true:false;
  await p.click('button[onclick^="editSession"]'); await p.waitForTimeout(300);
  const submitLabel = await p.textContent('#se_submit');
  const cancelShown = await p.evaluate(()=>!document.getElementById('se_cancel').classList.contains('hidden'));
  // change notes and update
  await p.fill('#se_notes','EDITED NOTE CONTENT');
  await p.click('#se_submit'); await p.waitForTimeout(500);
  const toast2 = await p.textContent('#toast').catch(()=>'');
  const histHasEdit = (await p.textContent('#sessionHistory')).includes('EDITED NOTE CONTENT');
  console.log(JSON.stringify({ toast1, histHasNoShow, hasEditBtn, submitLabel, cancelShown, toast2, histHasEdit, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
