(function(root){
'use strict';
const clean=value=>String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ');
const number=value=>value==null?'—':new Intl.NumberFormat('ko-KR').format(value);
const percent=value=>value==null?'—':new Intl.NumberFormat('ko-KR',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(value);

async function create({rows=[],allRows=rows,filters={},template=false,createdAt=new Date()}={}){
  const {jsPDF}=root.jspdf,C=root.MediaCore;
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
  doc.addFileToVFS('NanumGothic.ttf',root.REPORT_FONT);
  doc.addFont('NanumGothic.ttf','Report','normal');
  doc.setFont('Report','normal');
  doc.setProperties({title:template?'매체별 집행 보고 양식':'매체별 집행 보고서',author:'김 프로 캠페인 집행 대시보드',subject:'캠페인 예산·집행 현황'});
  const margin=14,width=182,bottom=276,ink='#172D48',muted='#64748A',blue='#315BE8';
  let y=18;
  function text(value,x,top,size=9,color=ink,options={}){
    doc.setFontSize(size);doc.setTextColor(color);doc.text(clean(value),x,top,options);
  }
  function newPage(){
    doc.addPage();y=19;text('매체별 집행 보고서',margin,y,10,ink);
    text(template?'보고 양식':'김 프로 캠페인 집행 관리',196,y,8,muted,{align:'right'});
    doc.setDrawColor('#DEE5EF');doc.line(margin,23,196,23);y=31;
  }
  function room(height){if(y+height>bottom)newPage();}
  function paragraph(value,size=8,color=muted){
    doc.setFontSize(size);const lines=doc.splitTextToSize(clean(value),width);
    for(const line of lines){room(4.5);text(line,margin,y,size,color);y+=4.5;}
    y+=2;
  }
  function section(title,note){
    room(29);doc.setFillColor(ink);doc.rect(margin,y,width,9,'F');text(title,margin+3,y+6,10,'#FFFFFF');y+=15;
    if(note)paragraph(note);
  }
  async function table(headers,values,widths,{right=[],title=''}={}){
    function header(){
      doc.setFillColor('#EAF0FB');doc.rect(margin,y,width,9,'F');let x=margin;
      headers.forEach((label,i)=>{text(label,x+2,y+5.8,8);x+=widths[i];});y+=9;
    }
    room(19);header();
    for(let index=0;index<values.length;index++){
      const cells=values[index].map((v,i)=>{doc.setFontSize(8);return doc.splitTextToSize(clean(v),widths[i]-4);});
      const height=Math.max(8,Math.max(...cells.map(v=>v.length))*4+4);
      if(y+height>bottom){newPage();if(title){text(title+' (계속)',margin,y,10);y+=7;}header();}
      if(index%2===0){doc.setFillColor('#F5F7FB');doc.rect(margin,y,width,height,'F');}
      let x=margin;
      cells.forEach((lines,i)=>{
        for(let k=0;k<lines.length;k++)text(lines[k],right.includes(i)?x+widths[i]-2:x+2,y+5+k*4,8,ink,{align:right.includes(i)?'right':'left'});
        x+=widths[i];
      });
      y+=height;doc.setDrawColor('#E6EBF2');doc.line(margin,y,196,y);
      if(index&&index%200===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    y+=8;
  }
  text('CAMPAIGN REPORT',margin,y,9,blue);y+=11;
  text('매체별 집행 보고서',margin,y,22);y+=9;
  paragraph(template?'보고 양식 · 데이터 입력 전 / 김 프로 업무 예시용 가상 서식':'김 프로 캠페인 집행 관리 · 조회 데이터를 보고 양식에 맞춰 정리');
  const scope=filters.campaign||'전체 캠페인',fDate=[filters.start||'시작 제한 없음',filters.end||'종료 제한 없음'].join(' ~ ');
  paragraph(template?'캠페인: [캠페인명]  |  작성일: [YYYY-MM-DD]':`캠페인: ${scope}  |  작성일: ${createdAt.toLocaleDateString('sv-SE')}`);
  paragraph(template?'조회 조건: [기간 / 매체 / 집행 상태 / 검색어]':`조회 조건: ${fDate} / ${filters.media||'전체 매체'} / ${filters.status||'전체 상태'}${filters.query?' / 검색: '+filters.query:''}`);
  paragraph('금액 단위: 원 · 소진율 = 총 집행액 ÷ 총예산 × 100');

  section('01  예산 요약','캠페인 선택만 반영한 전체 기간 누적값입니다. 아래 조회 내역의 합계와 다를 수 있습니다.');
  const scoped=filters.campaign?allRows.filter(r=>r.campaign===filters.campaign):allRows;
  const total=C.totals(scoped);
  await table(['총예산(원)','총 집행액(원)','소진율','잔여 예산(원)','미집행(건)'],
    [template?['[총예산]','[총 집행액]','[소진율]','[잔여 예산]','[건수]']:[number(total.budget),number(total.spend),percent(total.rate),number(total.remaining),number(total.pending)]],
    [40,40,27,45,30],{right:[0,1,2,3,4]});
  paragraph('총예산은 캠페인당 한 번만 합산합니다. 잔여 예산이 음수이면 초과 집행이며, 총예산이 0원이면 소진율은 —입니다.');

  section('02  매체별 집행액','현재 조회 조건에 해당하는 내역만 집계합니다.');
  const byMedia=new Map();
  for(const row of rows){if(!byMedia.has(row.media))byMedia.set(row.media,[]);byMedia.get(row.media).push(row);}
  const queryTotal=C.totals(rows);
  const mediaValues=template?[['[매체명]','[집행액]','[비중]','[건수]','[건수]']]:[...byMedia].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,rs])=>{
    const t=C.totals(rs);return [name,number(t.spend),percent(queryTotal.spend?t.spend/queryTotal.spend:null),number(rs.length),number(t.pending)];
  });
  await table(['매체','집행액(원)','집행 비중','내역(건)','미집행(건)'],mediaValues,[48,45,30,29,30],{right:[1,2,3,4],title:'매체별 집행액'});
  if(!template)paragraph(`조회 내역 ${number(rows.length)}건 · 조회 집행액 ${number(queryTotal.spend)}원`);

  const headers=['캠페인명','총예산(원)','매체','집행액(원)','집행일','상태'],widths=[54,29,25,29,26,19];
  const rowValues=r=>[r.campaign,number(r.budget),r.media,number(r.spend),r.date,r.status];
  const blank=['[캠페인명]','[총예산]','[매체]','[집행액]','[날짜]','[상태]'];
  section('03  매체별 집행 내역','현재 조회 조건의 전체 내역입니다. 화면의 페이지 번호와 관계없이 모두 포함합니다.');
  await table(headers,template?[blank,Array(6).fill('')]:rows.map(rowValues),widths,{right:[1,3],title:'매체별 집행 내역'});
  section('04  미집행 목록','현재 조회 내역 중 미집행 상태만 표시합니다. 집행일에는 예정일을 적습니다.');
  const pending=rows.filter(r=>r.status==='미집행');
  if(template)await table(headers,[[...blank.slice(0,5),'미집행']],widths,{right:[1,3]});
  else if(pending.length)await table(headers,pending.map(rowValues),widths,{right:[1,3],title:'미집행 목록'});
  else paragraph('해당 조회 조건의 미집행 내역이 없습니다.');

  if(template)paragraph('이 PDF는 제작 시 참고할 양식입니다. 도구에는 CSV를 올리고, 보고서 다운로드로 이 양식에 조회 데이터를 채웁니다.');
  const count=doc.getNumberOfPages();
  for(let i=1;i<=count;i++){
    doc.setPage(i);doc.setDrawColor('#DEE5EF');doc.line(margin,283,196,283);
    text(template?'김 프로 업무 예시 · 가상 보고 양식':'김 프로 캠페인 집행 관리',margin,289,8,muted);
    text(`${i} / ${count}`,196,289,8,muted,{align:'right'});
  }
  return doc;
}
root.CampaignReport={create};
})(globalThis);
