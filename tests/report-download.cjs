const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'검증결과');
const extract=file=>execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const context=await browser.newContext({offline:!process.env.REPORT_TEST_URL,acceptDownloads:true,viewport:{width:1440,height:1100}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.REPORT_TEST_URL||pathToFileURL(path.join(root,'index.html')).href);
  async function download(id,name){
   const wait=page.waitForEvent('download');await page.locator('#'+id).click();const d=await wait;
   assert.match(d.suggestedFilename(),/\.pdf$/);const file=path.join(out,name);await d.saveAs(file);
   assert.equal(fs.readFileSync(file).subarray(0,5).toString(),'%PDF-');return file;
  }
  assert.equal(await page.locator('#printBtn').innerText(),'조회 내역 PDF ↓');
  assert.equal(await page.locator('#reportBtn').isDisabled(),true);
  const template=await download('templateDownloadBtn','PDF-다운로드-빈양식.pdf');
  assert.match(extract(template),/\[캠페인명\]/);assert.equal(await page.locator('#rowCount').innerText(),'0건');
  await page.locator('#sampleBtn').click();await page.locator('#confirmImport').click();
  const all=await download('reportBtn','PDF-다운로드-전체.pdf'),allText=extract(all);
  assert.match(allText,/104,700,000/);assert.match(allText,/52\.4%/);assert.match(allText,/조회 내역 36건/);
  for(const label of ['루미에르','노바','오브','그레인','하버','미집행 목록'])assert.ok(allText.includes(label));
  await page.locator('#campaignFilter').selectOption('루미에르 홈 · 가을 리뉴얼 캠페인');
  await page.locator('#mediaFilter').selectOption('Meta');
  const before=await page.evaluate(()=>localStorage.getItem('kimpro-campaign-desk-v1'));
  const filtered=await download('reportBtn','PDF-다운로드-조회조건.pdf'),filteredText=extract(filtered);
  assert.match(filteredText,/조회 내역 4건/);assert.match(filteredText,/16,200,000/);assert.match(filteredText,/5,400,000/);
  assert.equal(filteredText.includes('Google'),false);assert.equal(filteredText.includes('노바'),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kimpro-campaign-desk-v1')),before);
  await page.locator('[data-tab="pending"]').click();
  const pending=await download('reportBtn','PDF-다운로드-미집행.pdf');
  assert.match(extract(pending),/조회 내역 1건/);
  await page.locator('[data-tab="data"]').click();
  await page.locator('#searchInput').fill('없는캠페인');assert.equal(await page.locator('#reportBtn').isDisabled(),true);
  await page.locator('#searchInput').fill('');
  await page.screenshot({path:path.join(out,'PDF-보고서-버튼.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#reportBtn').isVisible(),true);
  // Long Korean fields, zero budget and pagination, using the same report generator.
  const stress=await page.evaluate(async()=>{
   const rows=Array.from({length:120},(_,i)=>({id:'LONG-'+i,campaign:'가'.repeat(100)+'끝',budget:0,media:'매체'.repeat(30),spend:0,date:'2026-03-01',status:i%2?'집행완료':'미집행'}));
   rows.at(-1).media='마지막내역확인';
   const doc=await CampaignReport.create({rows,allRows:rows});
   return {pages:doc.getNumberOfPages(),base64:btoa(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer'))))};
  });
  assert.ok(stress.pages>2);const stressFile=path.join(out,'PDF-다운로드-긴한글.pdf');
  fs.writeFileSync(stressFile,Buffer.from(stress.base64,'base64'));
  const stressText=extract(stressFile);assert.ok(stressText.includes('마지막내역확인'));assert.equal(/NaN|Infinity|\uFFFD/.test(stressText),false);
  assert.deepEqual(errors,[]);
  console.log('PASS PDF 빈 양식·전체36건·필터4건·미집행1건·한글 추출·저장 데이터 불변·모바일·긴 한글120행·예산0·마지막행 보존');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
