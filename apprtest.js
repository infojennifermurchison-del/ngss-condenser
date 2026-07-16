const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(900);
  // Approvals: mentor dropdown present + approve requires it
  await p.click('.tab[data-tab=approvals]'); await p.waitForTimeout(400);
  const mentorSelect = await p.$('select[id^="appr-mentor-"]');
  const hasMentorSelect = !!mentorSelect;
  // try approve WITHOUT mentor -> should toast error and stay pending
  await p.click('[data-approve]'); await p.waitForTimeout(300);
  const toast1 = await p.textContent('#toast').catch(()=>'');
  const stillPending = (await p.textContent('#approvalList')).includes('Jayden');
  // now select a mentor and approve
  const optVal = await p.evaluate(()=>{ const s=document.querySelector('select[id^="appr-mentor-"]'); return s.options[1]?.value; });
  await p.selectOption('select[id^="appr-mentor-"]', optVal);
  await p.click('[data-approve]'); await p.waitForTimeout(500);
  const queueEmpty = (await p.textContent('#approvalList')).includes('No intakes waiting');
  // Documents section shows demo note on a student
  await p.click('.tab[data-tab=students]'); await p.waitForTimeout(300);
  await p.click('#studentList [data-id]'); await p.waitForTimeout(400);
  const docsText = await p.textContent('#docsList').catch(()=>'');
  // PDF generation works (jsPDF loaded? in sandbox CDN blocked -> jspdf undefined). check availability
  const jspdf = await p.evaluate(()=>typeof window.jspdf);
  console.log(JSON.stringify({ hasMentorSelect, toast1, stillPending_shouldBeTrue: stillPending, queueEmpty, docsText, jspdf, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
