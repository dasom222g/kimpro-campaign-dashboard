const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');let html=fs.readFileSync(path.join(root,'src/page.html'),'utf8');
html=html.replace('/*__FONT__*/',()=>`window.REPORT_FONT=${JSON.stringify(fs.readFileSync(path.join(root,'vendor/NanumGothic-Regular.ttf')).toString('base64'))};`);
for(const [key,file] of Object.entries({STYLE:'src/style.css',XLSX:'vendor/xlsx.full.min.js',JSPDF:'vendor/jspdf.umd.min.js',CORE:'src/core.js',SAMPLES:'src/sample-data.js',REPORT:'src/report.js',APP:'src/app.js'})){
 let content=fs.readFileSync(path.join(root,file),'utf8');
 if(key!=='STYLE')content=content.replace(/<\/script/gi,'<\\/script');
 html=html.replace(`/*__${key}__*/`,()=>content);
}
fs.writeFileSync(path.join(root,'index.html'),html);console.log('Built standalone index.html:',Buffer.byteLength(html),'bytes');
