"""Apply OOXML presentation to the SheetJS-authored workbook using stdlib only."""
import sys, zipfile, xml.etree.ElementTree as E
from pathlib import Path
p=Path(sys.argv[1]); ns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
E.register_namespace('',ns)
q=lambda t:f"{{{ns}}}{t}"
with zipfile.ZipFile(p) as z: files={n:z.read(n) for n in z.namelist()}
styles=E.fromstring(files['xl/styles.xml'])
fonts=styles.find(q('fonts')); fills=styles.find(q('fills')); xfs=styles.find(q('cellXfs'))
font_ids=[]
for size,color,bold in [(11,'172D48',False),(22,'FFFFFF',True),(12,'FFFFFF',True),(11,'315BE8',False),(10,'64748A',False),(16,'172D48',True),(11,'172D48',True)]:
    font_ids.append(len(fonts)); f=E.SubElement(fonts,q('font'))
    E.SubElement(f,q('sz'),val=str(size));E.SubElement(f,q('color'),rgb='FF'+color);E.SubElement(f,q('name'),val='맑은 고딕')
    if bold:E.SubElement(f,q('b'))
fill_ids={}
for color in ['172D48','EAF0FB','F4F6FA','FFF4D6','FFFFFF']:
    fill_ids[color]=len(fills); f=E.SubElement(fills,q('fill'));pat=E.SubElement(f,q('patternFill'),patternType='solid')
    E.SubElement(pat,q('fgColor'),rgb='FF'+color);E.SubElement(pat,q('bgColor'),indexed='64')
sheet=E.fromstring(files['xl/worksheets/sheet1.xml'])
cache={}
for row in sheet.find(q('sheetData')):
    rn=int(row.get('r'))
    for c in row:
        addr=c.get('r'); col=''.join(x for x in addr if x.isalpha())
        old=xfs[int(c.get('s','0'))];fmt=old.get('numFmtId','0')
        font=0;fill='FFFFFF';align='left'
        if rn==1: font=1;fill='172D48'
        elif rn in [7,11,17,33]:font=2;fill='172D48'
        elif rn in [8,12,19,34]:font=6;fill='EAF0FB'
        elif rn==9:font=5;fill='EAF0FB';align='right'
        elif rn in [2,18,48,49,50]:font=4
        elif rn in [4,5]:font=3 if col!='A' else 6;fill='F4F6FA'
        elif 20<=rn<=31:font=0 if c.find(q('f')) is not None else 3;fill='F4F6FA' if rn%2==0 else 'FFFFFF'
        elif 35<=rn<=46:fill='FFF4D6' if rn<=37 else 'FFFFFF'
        if c.get('t')!='str' and c.find(q('v')) is not None and c.get('t') not in ['s','inlineStr']:align='right'
        key=(font,fill,fmt,align)
        if key not in cache:
            cache[key]=len(xfs);xf=E.SubElement(xfs,q('xf'),numFmtId=fmt,fontId=str(font_ids[font]),fillId=str(fill_ids[fill]),borderId='0',xfId='0',applyFont='1',applyFill='1',applyNumberFormat='1',applyAlignment='1')
            E.SubElement(xf,q('alignment'),horizontal=align,vertical='center',wrapText='1')
        c.set('s',str(cache[key]))
for node in [fonts,fills,xfs]:node.set('count',str(len(node)))
views=sheet.find(q('sheetViews'))
if views is None:
    views=E.Element(q('sheetViews')); sheet.insert(1,views)
view=views.find(q('sheetView'))
if view is None:view=E.SubElement(views,q('sheetView'),workbookViewId='0')
view.set('showGridLines','0')
E.SubElement(sheet,q('pageMargins'),left='0.3',right='0.3',top='0.4',bottom='0.4',header='0.2',footer='0.2')
E.SubElement(sheet,q('pageSetup'),paperSize='9',orientation='portrait',fitToWidth='1',fitToHeight='2')
files['xl/styles.xml']=E.tostring(styles,encoding='utf-8',xml_declaration=True)
files['xl/worksheets/sheet1.xml']=E.tostring(sheet,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED) as z:
    for name,data in files.items():z.writestr(name,data)
