const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({viewport:{width:1200,height:1000}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('C:'+m.text());});
  p.on('dialog', d=>d.accept()); // auto-confirm the remove() confirm
  await p.goto('http://localhost:4321/mentor?demo=1', {waitUntil:'domcontentloaded'});
  await p.addStyleTag({content:'.hidden{display:none !important}'});
  await p.waitForTimeout(800);
  await p.click('.tab[data-tab=team]'); await p.waitForTimeout(300);
  const initialCount = await p.$$eval('#teamList > div', els=>els.length);
  // add a mentor
  await p.fill('#uf_name','New Mentor'); await p.fill('#uf_email','new@demo.org'); await p.fill('#uf_pass','password123');
  await p.click('#userForm button[type=submit]'); await p.waitForTimeout(300);
  const afterAdd = await p.$$eval('#teamList > div', els=>els.length);
  const showsNew = (await p.textContent('#teamList')).includes('New Mentor');
  // assigned-mentor dropdown should include the new mentor (refreshMentors in demo? demo add pushes to MENTORS; dropdown not auto-updated in demo path). check it lists existing at least
  // remove the new mentor
  const removeBtns = await p.$$('#teamList button');
  // click the last remove button (the new mentor)
  await removeBtns[removeBtns.length-1].click(); await p.waitForTimeout(300);
  const afterRemove = await p.$$eval('#teamList > div', els=>els.length);
  // self row shows "you" not a remove button
  const hasYou = (await p.textContent('#teamList')).includes('you');
  console.log(JSON.stringify({ initialCount, afterAdd, showsNew, afterRemove, hasYou, errs }, null, 2));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
