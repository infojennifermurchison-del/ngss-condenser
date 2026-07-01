const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  await p.goto('http://localhost:4321/mentor?demo=1&as=mentor', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);

  // ---- TEST A: intake -> auto AI plan ----
  await p.click('.tab[data-tab=intake]'); await p.waitForTimeout(200);
  await p.fill('[data-f="a.first_name"]','Nia'); await p.fill('[data-f="a.last_name"]','Planner');
  await p.click('text=5. Referral'); await p.waitForTimeout(150);
  await p.check('[data-multi="eligibility"][value="Truancy (10+ unexcused absences in 6 months)"]');
  await p.click('#intakeForm button[type=submit]');
  await p.waitForTimeout(1600); // allow the mock claude delay (1.1s) + insert
  // find the pending student Nia and check she has a plan in the mock store
  const planInfo = await p.evaluate(async ()=>{
    const s = STUDENTS.find(x=>x.first_name==='Nia');
    if(!s) return {found:false};
    const { data } = await sb.from('intervention_plans').select('*').eq('student_id', s.id);
    return { found:true, plans:(data||[]).length, title:(data&&data[0]&&data[0].title)||'', hasContent: !!(data&&data[0]&&data[0].plan_content) };
  });

  // ---- TEST B: change password view (voluntary) ----
  // switch to admin session to see header button reliably; reload as admin
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(700);
  await p.click('#changePwBtn'); await p.waitForTimeout(200);
  const cpVisible = await p.evaluate(()=>getComputedStyle(document.getElementById('changePwView')).display!=='none');
  const cancelVisible = await p.evaluate(()=>getComputedStyle(document.getElementById('cpCancel')).display!=='none');
  // demo guard on submit
  await p.fill('#cpNew','newpass123'); await p.fill('#cpConfirm','newpass123');
  await p.click('#cpSubmit'); await p.waitForTimeout(200);
  const toastTxt = await p.textContent('#toast').catch(()=>'');
  // cancel returns to app
  await p.click('#cpCancel'); await p.waitForTimeout(200);
  const appBack = await p.evaluate(()=>getComputedStyle(document.getElementById('appView')).display!=='none');

  console.log(JSON.stringify({ planInfo, cpVisible, cancelVisible, toastTxt, appBack, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
