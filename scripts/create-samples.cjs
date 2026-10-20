const fs=require('node:fs'),path=require('node:path'),X=require('../vendor/xlsx.full.min.js'),C=require('../src/core.js');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'입력자료');fs.mkdirSync(folder,{recursive:true});
const fixtures=path.join(root,'검증자료');fs.mkdirSync(fixtures,{recursive:true});
const campaign='루미에르 홈 · 가을 리뉴얼 캠페인';
const rows=Array.from({length:12},(_,i)=>({id:`KIM-2026-${String(i+1).padStart(3,'0')}`,campaign,budget:50000000,media:['Meta','Google','Naver'][i%3],spend:i<9?[1800000,2400000,1200000][i%3]:0,date:`2026-10-${String(5+i).padStart(2,'0')}`,status:i<6?'집행완료':i<9?'집행중':'미집행'}));
const campaigns=[
 {code:'MOB',name:'노바 모바일 · 신제품 사전예약',budget:80000000,media:['YouTube','Meta','Naver','Google','카카오','YouTube'],amounts:[15000000,12000000,9000000,8000000,0,0]},
 {code:'BEA',name:'오브 뷰티 · 홀리데이 기프트',budget:30000000,media:['Meta','카카오','Naver','YouTube','Google','Meta'],amounts:[6000000,4000000,3500000,2500000,2000000,0]},
 {code:'FOO',name:'그레인 키친 · 신메뉴 론칭',budget:25000000,media:['옥외광고','카카오','Meta','Naver','YouTube','Google'],amounts:[8000000,5000000,4500000,4000000,3000000,2000000]},
 {code:'TRA',name:'하버 트래블 · 겨울 여행 얼리버드',budget:15000000,media:['Naver','Google','Meta','카카오','YouTube','옥외광고'],amounts:[0,0,0,0,0,0]}
];
for(const spec of campaigns)spec.amounts.forEach((spend,i)=>rows.push({id:`KIM-${spec.code}-${String(i+1).padStart(3,'0')}`,campaign:spec.name,budget:spec.budget,media:spec.media[i],spend,date:`2026-10-${String((spec.code==='TRA'?24:6)+i).padStart(2,'0')}`,status:spend===0?'미집행':spec.code==='FOO'||i<2?'집행완료':'집행중'}));
const initial='01_매체별_집행내역.csv';fs.writeFileSync(path.join(folder,initial),C.csv(rows));
fs.writeFileSync(path.join(fixtures,'01_매체별_집행내역.xlsx'),X.write(C.workbook(rows),{bookType:'xlsx',type:'buffer',compression:true}));
const updated=rows.map(r=>r.id==='KIM-2026-010'?{...r,spend:1500000,status:'집행완료'}:r);updated.push({id:'KIM-2026-013',campaign,budget:50000000,media:'Naver',spend:900000,date:'2026-10-23',status:'집행중'});
fs.writeFileSync(path.join(fixtures,'02_금요일_갱신내역.csv'),C.csv(updated));
fs.writeFileSync(path.join(root,'src/sample-data.js'),'window.DEMO_FILES = '+JSON.stringify([{name:initial,base64:Buffer.from(C.csv(rows)).toString('base64')}])+';\n');
fs.writeFileSync(path.join(root,'tests/expected.json'),JSON.stringify({initialCount:36,initialBudget:200000000,initialSpend:104700000,initialPending:12,updatedCount:37,updatedSpend:107100000,updatedPending:11},null,2));
require('./create-report-form.cjs');
console.log('입력자료: 기본 CSV·보고 양식 XLSX / 검증자료: 동일 내용 XLSX·금요일 갱신 CSV');
