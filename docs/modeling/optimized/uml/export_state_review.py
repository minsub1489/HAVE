"""Seven-page review of scope, state transitions and multiplicity/UC contracts."""
import json, os
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[3]
model=json.loads((HERE/'model.json').read_text(encoding='utf-8'))
ucs=json.loads((HERE.parent/'use-cases.json').read_text(encoding='utf-8'))
DEST=REPO/'output/pdf/HAVE_상태다이어그램_다중도_검토.pdf'
pdfmetrics.registerFont(TTFont('Korean',os.environ.get('HAVE_FONT','C:/Windows/Fonts/malgun.ttf')))
pdfmetrics.registerFont(TTFont('KoreanBold',os.environ.get('HAVE_BOLD_FONT','C:/Windows/Fonts/malgunbd.ttf')))
c=canvas.Canvas(str(DEST),pagesize=landscape(A3));c.setTitle('HAVE 상태 다이어그램과 다중도 검토');c.setAuthor('HAVE project')
W,H=landscape(A3)
def text(x,y,value,size=12,color='#17243a',bold=False):
 c.setFont('KoreanBold' if bold else 'Korean',size);c.setFillColor(color);c.drawString(x,y,value)
def wrap(value,width,size=11):
 out=[]
 for part in str(value).split('\n'):
  line=''
  for word in part.split(' '):
   candidate=(line+' '+word).strip()
   if pdfmetrics.stringWidth(candidate,'Korean',size)<=width:line=candidate;continue
   if line:out.append(line);line=''
   for ch in word:
    if line and pdfmetrics.stringWidth(line+ch,'Korean',size)>width:out.append(line);line=ch
    else:line+=ch
  out.append(line)
 return out
def para(x,y,value,width,size=12,leading=None):
 for line in wrap(value,width,size):text(x,y,line,size);y-=leading or size*1.5
 return y
def header(title,page,subtitle):
 text(36,H-30,'HAVE / STATE AND MULTIPLICITY REVIEW',11,'#64548e',True)
 text(36,H-64,title,24,bold=True)
 text(36,H-88,subtitle,11,'#526174')
 c.setStrokeColor('#d8dfe9');c.line(36,35,W-36,35)
 text(36,19,'2026-10-28 | 기준: 보조 PDF p11-16 · 현재 9개 유스케이스 · 실제 도메인 검증 대조',9,'#526174')
 text(W-88,19,f'{page:02} / 07',10,'#526174')
def table(headers,rows,widths,top=H-125,size=11):
 x0=36;xs=[x0]
 for width in widths[:-1]:xs.append(xs[-1]+width)
 c.setFillColor('#f0edff');c.rect(x0,top-26,sum(widths),31,fill=1,stroke=0)
 for x,width,value in zip(xs,widths,headers):text(x+7,top-16,value,size,bold=True)
 y=top-43
 for row in rows:
  n=max(len(wrap(v,width-14,size)) for v,width in zip(row,widths));height=n*(size+4)+16
  if y-height<48:raise ValueError(f'Page overflow: {row[0]} at {y}')
  for x,width,value in zip(xs,widths,row):para(x+7,y,value,width-14,size,size+4)
  c.setStrokeColor('#d8dfe9');c.line(x0,y-height+11,x0+sum(widths),y-height+11)
  y-=height
 return y

header('상태 다이어그램을 만드는 다섯 단계',1,'Version의 검토·승인 절차와 Approval의 효력 변경을 분리')
sections=[
 ('1. 범위 확정','주 모델은 단일 Version의 검토·승인 절차다. 미승인 검토를 Review의 하위 상태로 확장하고, 승인 이후 철회는 별도 Approval 모델에서 표현한다.'),
 ('2. 시작과 종료','시작은 새 버전 저장 성공 후 빈 답변 3개를 가진 미승인 검토다. 승인·증명·감사 저장 성공 시 해당 버전 검토·승인 절차가 끝난다. 최종 노드는 객체·데이터 삭제를 뜻하지 않는다.'),
 ('3. 상태 찾기','미승인 하위 상태는 답변 작성 중, 검토 대기, 평가 통과, 수정 요청이다. 승인 완료 후 검토 범위는 고정된다. 낮은 점수·수정 요청·저장 실패는 종료가 아니다.'),
 ('4. 이벤트·조건·액션','submit / evaluate / requestRevision / attachContributions / approve / revoke를 이벤트로 본다. 조건은 입력·역할·과제 통과·사유·기존 승인·저장 성공 등이고, 액션은 답변/평가 기록·과거 회차 보존·원자적 저장이다.'),
 ('5. 하위 상태 확장','미승인이라는 복합 상태 안에 네 검토 상태를 둔다. 후속 버전 등록은 새로운 인스턴스의 시작이며, 이전 버전 승인·철회 상태를 초기화하지 않는다.')]
y=H-145
for title,body in sections:
 text(40,y,title,17,bold=True);y=para(40,y-27,body,W-80,13,20)-25
text(40,y,'전이 기호와 공통 제약',16,bold=True)
y=para(40,y-28,'S: 세 답변 제출 / R: returned / K: 치명 오류 / P: 과제 통과 / A: 최종 승인 전체 조건. 모든 성공 전이는 commit 이후 확정한다. 실패는 이전 상태 유지, 충돌은 최신 기록 재확인이다.',W-80,12,18)
para(40,y-20,'다중도는 양방향으로 검토하고 유스케이스의 사전·사후·예외 조건에 반영했다. 구조적 *와 현재 구현의 개수 상한을 구분한다. 계정·서버·전자서명은 구현 완료로 추가하지 않았다.',W-80,12,18)
c.showPage()
for page,id in [(2,'ST01-lifecycles'),(3,'ST02-approval')]:
 d=next(x for x in model['diagrams'] if x['id']==id);header(d['title'],page,id+' | '+', '.join(d['useCases']))
 y=para(36,H-112,d['summary'],W-72,11,16)-10
 image=HERE/'images'/f'{id}.png'
 with Image.open(image) as im:iw,ih=im.size
 scale=min((W-72)/iw,(y-55)/ih);dw,dh=iw*scale,ih*scale
 c.drawImage(str(image),(W-dw)/2,49+(y-49-dh)/2,width=dw,height=dh)
 c.showPage()
header('연관 클래스의 다중도 감사',4,'양쪽 끝의 수와 해당 관계가 성립하는 조건을 함께 확인')
rows=[]
for r in model['cardinalityAudit']:
 rows.append((r['id'],r['source']+' '+r['sourceMultiplicity']+' -- '+r['targetMultiplicity']+' '+r['target'],r['result'],r['condition'],', '.join(r['useCases'])))
table(['ID','연관 다중도','판정','성립 조건·식별 범위','관련 UC'],rows,[48,260,115,475,W-72-898],size=10.5)
c.showPage()
header('이벤트·조건·액션 전이표',5,'상태 그림의 T 번호 대응 / 모든 행은 성공 commit 후 상태에 대한 의미')
rows=[(t['id'],t['source']+' → '+t['target'],t['event'],t['guard'],t['action']) for t in model['stateSpecification']['transitions']]
table(['ID','출발 → 도착','이벤트','조건','액션'],rows,[40,170,190,275,W-72-675],size=9.8)
c.showPage()
allucs=sorted(ucs['useCases'],key=lambda x:x['id'])
for page,batch in [(6,allucs[:5]),(7,allucs[5:])]:
 header('유스케이스 조건과 다중도의 연결',page,'사전 조건 · 정상 결과 · 예외 경로 / 원본: use-cases.json')
 rows=[]
 for uc in batch:
  pre='\n'.join(uc['preconditions']);post='\n'.join(uc['postconditions']);alt='\n'.join(uc['alternateFlows'])
  rows.append((uc['id']+'\n'+uc['name'],pre,post,alt,', '.join(uc['cardinalityRefs'])))
 table(['UC','사전 조건','정상 결과·사후 조건','대안·예외','제약'],rows,[150,285,305,275,W-72-1015],size=10)
 c.showPage()
c.save();assert len(PdfReader(str(DEST)).pages)==7
print('Created 7 pages:',DEST)
