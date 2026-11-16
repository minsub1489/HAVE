"""Export reviewed diagram PNGs to a landscape A3 reading document."""
import json
import os
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape, portrait
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parents[1] / 'output' / 'pdf' / 'HAVE_요구모델링_다이어그램.pdf'
FONT = os.environ.get('HAVE_FONT', 'C:/Windows/Fonts/malgun.ttf')
pdfmetrics.registerFont(TTFont('Korean', FONT))
catalog = json.loads((ROOT / 'catalog.json').read_text(encoding='utf-8'))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
W, H = landscape(A3)
c = canvas.Canvas(str(OUTPUT), pagesize=(W, H))
c.setTitle('HAVE 요구 모델링 - 개념, 현재 구현, 운영 MVP')
c.setAuthor('HAVE project')

def text(x, y, value, size=13, color='#17243a'):
    c.setFillColor(color); c.setFont('Korean', size); c.drawString(x, y, value)

def header(title, scope, page):
    c.setFillColor('#ffffff'); c.rect(0,0,W,H,fill=1,stroke=0)
    text(38,H-38,'HAVE / REQUIREMENTS MODELING',11,'#6553c6')
    text(38,H-76,title,24)
    text(38,H-103,scope,12,'#526174')
    c.setStrokeColor('#dfe5ee');c.line(38,38,W-38,38)
    text(38,20,'2026-10-14 · 모델 해설과 코드 연결: docs/modeling/README.md',10,'#526174')
    text(W-85,20,f'{page:02d} / {len(catalog)+1:02d}',10,'#526174')

header('모델을 읽는 기준', '강의 기반 모델링 / 원본 발표자료와 제품 코드 보존', 1)
y=H-165
for title, body in [
    ('01. 무엇을 증명하는가', '파일 해시는 바이트 동일성, 이해 과제는 인간 검토의 판단 근거를 확인한다. 실제 이해·사실 정확성·AI 신고의 진실성은 보증하지 않는다.'),
    ('02. MVP의 일관된 규칙', '버전당 세 과제, 총점 5/6 이상, 치명 오류 없음, 평가 근거·체크 네 항목·메모 필수. 버전당 승인 최대 한 건.'),
    ('03. 서로 다른 세 차원', '검토 진행 상태, 승인 효력, 후속 버전 관계를 분리한다. v2는 v1 승인을 물려받지 않으며 후속 버전 생성은 철회가 아니다.'),
    ('04. 현재 구현과 운영 계획', '그림 04~08·10은 현재 코드, 11~12는 계획이다. 현재 QR은 서명 없는 요약이고 다른 기기의 최신 효력을 확인하지 못한다.'),
    ('05. 실패도 정상적인 모델의 일부', '저장 실패는 롤백, revision 충돌은 최신 기록 확인, 파일 불일치는 별도 결과다. 성공 표시는 commit 뒤에만 한다.'),
    ('06. 강의의 검증 기준', '유스케이스·클래스·메시지·상태·guard·다중성을 서로 맞춘다. 정책과 삭제/보존 의미를 정하기 전 상속·합성을 억지로 넣지 않는다.'),
]:
    text(38,y,title,17);text(38,y-31,body,12);y-=82
text(38,110,'강의 근거: Ch06 p4~16, p18~40, p43~54, p56~58, p60~63. 소스·명세·추적성은 README에서 확인한다.',11,'#526174')
c.showPage()
for index,item in enumerate(catalog,2):
    image=ROOT/'images'/f"{item['id']}.png"
    with Image.open(image) as im: iw,ih=im.size
    W,H = portrait(A3) if ih/iw > 1.12 else landscape(A3)
    c.setPageSize((W,H))
    header(item['title'],item['scope'],index)
    # Wrap summaries to the page width without relying on character counts.
    line=''; lines=[]
    for word in item['summary'].split(' '):
        candidate=(line+' '+word).strip()
        if pdfmetrics.stringWidth(candidate,'Korean',11)>W-76 and line:
            lines.append(line);line=word
        else:line=candidate
    lines.append(line)
    for row,line in enumerate(lines):text(38,H-130-row*17,line,11,'#526174')
    maxw,maxh=W-76,H-192
    scale=min(maxw/iw,maxh/ih)
    dw,dh=iw*scale,ih*scale
    c.drawImage(str(image),(W-dw)/2,50+(maxh-dh)/2,width=dw,height=dh)
    c.showPage()
c.save()
print(OUTPUT)
