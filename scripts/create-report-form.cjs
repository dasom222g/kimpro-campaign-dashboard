const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const context=await browser.newContext({offline:true,acceptDownloads:true}),page=await context.newPage();
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  const wait=page.waitForEvent('download');await page.locator('#templateDownloadBtn').click();const download=await wait;
  const dest=path.join(root,'입력자료',download.suggestedFilename());await download.saveAs(dest);
  if(!fs.readFileSync(dest).subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid PDF');
  console.log('PDF 보고 양식 생성:',path.basename(dest));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
