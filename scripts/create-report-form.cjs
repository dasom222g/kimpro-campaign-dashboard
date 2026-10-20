const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const X=require('../vendor/xlsx.full.min.js'),C=require('../src/core.js');
const root=path.resolve(__dirname,'..'),name='02_매체별_집행_보고양식.xlsx';
const rows=C.parse(fs.readFileSync(path.join(root,'입력자료/01_매체별_집행내역.csv')),'입력.csv').rows.filter(r=>r.campaign.startsWith('루미에르 홈'));
const ws={},wb=X.utils.book_new(),merges=[];
function cell(address,v,f,z){ws[address]={t:typeof v==='number'?'n':'s',v,...(f?{f}:{}),...(z?{z}:{})};}
function line(row,values){values.forEach((v,i)=>cell(X.utils.encode_cell({r:row-1,c:i}),v));}
function band(row,text){cell('A'+row,text);merges.push(X.utils.decode_range(`A${row}:F${row}`));}
const dateSerial=s=>Math.round((Date.parse(s+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);
band(1,'매체별 집행 보고서');
band(2,'김 프로 업무 예시 · 가상 보고 양식 / 루미에르 홈 캠페인 작성 예시');
cell('A4','캠페인명');cell('B4',rows[0].campaign);merges.push(X.utils.decode_range('B4:F4'));
cell('A5','집행일 범위');cell('B5','2026-10-05 ~ 2026-10-16');merges.push(X.utils.decode_range('B5:D5'));cell('E5','금액 단위');cell('F5','원');
band(7,'01  예산 요약');
line(8,['총예산(원)','총 집행액(원)','소진율','잔여 예산(원)','미집행(건)','전체 내역(건)']);
cell('A9',50000000,null,'#,##0');cell('B9',16200000,'SUM(D20:D31)','#,##0');
cell('C9',0.324,'IF(A9=0,"—",B9/A9)','0.0%');cell('D9',33800000,'A9-B9','#,##0');
cell('E9',3,'COUNTIF(F20:F31,"미집행")','0');cell('F9',12,'COUNTA(C20:C31)','0');
band(11,'02  매체별 집행액');
line(12,['매체','집행액(원)','집행 비중','내역(건)','미집행(건)','']);
['Meta','Google','Naver'].forEach((m,i)=>{const row=13+i,rs=rows.filter(r=>r.media===m),sum=rs.reduce((s,r)=>s+r.spend,0);
 cell('A'+row,m);cell('B'+row,sum,`SUMIF(C$20:C$31,A${row},D$20:D$31)`,'#,##0');cell('C'+row,sum/16200000,`IF($B$9=0,0,B${row}/$B$9)`,'0.0%');
 cell('D'+row,rs.length,`COUNTIF(C$20:C$31,A${row})`,'0');cell('E'+row,rs.filter(r=>r.status==='미집행').length,`COUNTIFS(C$20:C$31,A${row},F$20:F$31,"미집행")`,'0');
});
band(17,'03  매체별 집행 내역');
band(18,'총예산은 캠페인 기준입니다. 행별 총예산을 더하지 않습니다. 미집행 날짜는 예정일입니다.');
const headers=['캠페인명','총예산(원)','매체','집행액(원)','집행일','집행 상태'];
line(19,headers);
rows.forEach((r,i)=>{const n=20+i;line(n,[r.campaign,r.budget,r.media,r.spend,dateSerial(r.date),r.status]);
 ws['B'+n].f='$A$9';ws['B'+n].z=ws['D'+n].z='#,##0';ws['E'+n].z='yyyy-mm-dd';
 cell('G'+n,r.status==='미집행'?i-8:'',`IF(F${n}="미집행",COUNTIF(F$20:F${n},"미집행"),"")`);
});
band(33,'04  미집행 목록');
line(34,headers);
const pending=rows.filter(r=>r.status==='미집행');
// Twelve slots allow every example record to become pending without losing rows.
for(let i=0;i<12;i++)for(let j=0;j<6;j++){const n=35+i,col=X.utils.encode_col(j),r=pending[i];
 const v=r?[r.campaign,r.budget,r.media,r.spend,dateSerial(r.date),r.status][j]:'';
 cell(col+n,v,`IFERROR(INDEX(${col}$20:${col}$31,MATCH(${i+1},$G$20:$G$31,0)),"")`,j===4?'yyyy-mm-dd':[1,3].includes(j)?'#,##0':undefined);
}
band(48,'작성 기준: 소진율 = 총 집행액 ÷ 총예산. 예산이 0원이면 —로 표시합니다.');
band(49,'참고 파일: 01_매체별_집행내역.csv 중 루미에르 홈 12건 / 실제 회사의 보고서가 아닙니다.');
band(50,'제작 시 이 양식의 항목·순서를 참고합니다. 도구에는 CSV를 업로드하고 결과는 화면·PDF로 확인합니다.');
ws['!ref']='A1:G50';ws['!merges']=merges;
ws['!cols']=[{wch:36},{wch:20},{wch:16},{wch:20},{wch:17},{wch:17},{hidden:true}];
ws['!rows']=Array.from({length:50},(_,i)=>({hpt:i===0?38:i===1?26:(i>=19&&i<=30)?34:[17,47,48,49].includes(i)?28:24}));
X.utils.book_append_sheet(wb,ws,'보고 양식');
wb.Workbook={Names:[{Name:'_xlnm.Print_Area',Sheet:0,Ref:"'보고 양식'!$A$1:$F$50"}]};
const dest=path.join(root,'입력자료',name);fs.writeFileSync(dest,X.write(wb,{bookType:'xlsx',type:'buffer',compression:true}));
execFileSync('python3',[path.join(__dirname,'style-report-form.py'),dest]);
fs.writeFileSync(path.join(root,'src/report-template.js'),'window.REPORT_TEMPLATE = '+JSON.stringify({name,base64:fs.readFileSync(dest).toString('base64')})+';\n');
console.log('보고 양식 생성:',name);
