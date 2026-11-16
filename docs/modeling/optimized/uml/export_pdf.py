"""Create a focused UML review document; retain the old gallery/PDF unchanged."""
import json
import os
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A3, landscape, portrait
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
DEST = REPO / 'output/pdf/HAVE_유스케이스기반_UML_설계.pdf'
FONT = os.environ.get('HAVE_FONT', 'C:/Windows/Fonts/malgun.ttf')
pdfmetrics.registerFont(TTFont('Korean', FONT))
pdfmetrics.registerFont(TTFont('KoreanBold', os.environ.get('HAVE_BOLD_FONT', 'C:/Windows/Fonts/malgunbd.ttf')))
model = json.loads((HERE / 'model.json').read_text(encoding='utf-8'))
pages = len(model['diagrams']) + 3
DEST.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(DEST), pagesize=landscape(A3))
c.setTitle('HAVE - 유스케이스 기반 UML 설계')
c.setAuthor('HAVE project')

def text(x, y, value, size=12, color='#17243a', bold=False):
    c.setFont('KoreanBold' if bold else 'Korean', size)
    c.setFillColor(color)
    c.drawString(x, y, value)

def wrap(value, width, size=12):
    result, line = [], ''
    for char in value:
        candidate = line + char
        if pdfmetrics.stringWidth(candidate, 'Korean', size) > width and line:
            result.append(line.rstrip()); line = char.lstrip()
        else:
            line = candidate
    if line:
        result.append(line)
    return result

def paragraph(x, y, value, width, size=12, color='#526174', leading=None):
    for line in wrap(value, width, size):
        text(x, y, line, size, color)
        y -= leading or size * 1.6
    return y

def header(title, category, page, size=landscape(A3)):
    c.setPageSize(size)
    W, H = size
    c.setFillColor('#ffffff'); c.rect(0, 0, W, H, fill=1, stroke=0)
    text(36, H-30, 'HAVE / USE-CASE-DRIVEN UML', 11, '#64548e', True)
    text(36, H-61, title, 23, bold=True)
    text(36, H-84, category, 11, '#526174')
    c.setStrokeColor('#d8dfe9'); c.line(36, 35, W-36, 35)
    text(36, 19, model['date']+' | 현재 9개 유스케이스의 분석 모델 | 설명·원본: docs/modeling/optimized/uml/', 9, '#526174')
    text(W-90, 19, f'{page:02} / {pages:02}', 10, '#526174')
    return W, H

def figure(image, top, W, H):
    with Image.open(image) as im:
        iw, ih = im.size
    scale = min((W-72)/iw, (top-53)/ih)
    dw, dh = iw*scale, ih*scale
    c.drawImage(str(image), (W-dw)/2, 49+(top-49-dh)/2, width=dw, height=dh)

W, H = header('유스케이스에서 구조와 동작으로', 'Class / Sequence / State / Activity', 1)
text(40, H-150, 'HAVE · AI 작업의 인간 승인과 파일 버전 증거', 29, bold=True)
y = paragraph(40, H-191, '검토 근거와 승인 기록을 특정 PDF 버전에 연결한다. 사용자 목표 9개를 같은 클래스·메시지·전이 어휘로 설명하고, 현재 구현과 운영 계획의 경계를 유지했다.', W-80, 16)
items = [
    ('CLASS', '3개 뷰', '핵심 도메인 / 현재 검토와 과거 회차 / 협력 책임'),
    ('SEQUENCE', '5개 시나리오', '등록·기여 / 답변·검토 / 승인 / 버전·철회·조회 / 수신자 확인'),
    ('STATE', '2개 절차 / 하위 상태 확장', '단일 버전 검토·승인 절차와 승인 효력 변경을 분리. 종료는 기록 삭제가 아님'),
    ('ACTIVITY', '책임별 제어 흐름', '작성자·시스템·검토자·수신자, 보완 루프와 저장 실패·파일 선택'),
]
y -= 42
for kind, count, body in items:
    c.setFillColor('#f0edff'); c.rect(40, y-47, 170, 51, fill=1, stroke=0)
    text(53, y-13, kind, 15, '#64548e', True)
    text(230, y-7, count, 17, bold=True)
    paragraph(230, y-31, body, W-280, 13)
    y -= 76
y -= 18
text(40, y, '함께 읽는 기준', 17, bold=True)
y = paragraph(40, y-29, '현재 검토자가 최종 승인을 겸임한다. Chrome 확장은 내부 구성요소다. 역할 전환은 시연이며 실제 계정 인증이 아니다.', W-80, 13)
y = paragraph(40, y-15, '서버 API·서버 DB·전자서명·다른 기기의 최신 상태 조회는 운영 계획이다. 클래스의 책임 이름은 분석 모델이며 실제 JS 클래스 구현을 뜻하지 않는다.', W-80, 13)
y = paragraph(40, y-15, '핵심 규칙: 세 과제·5/6 이상·치명 오류 없음·평가 근거·체크 4개·최종 메모. 새 버전 승인 미상속, 철회 이력 보존, commit 뒤 성공 표시.', W-80, 13)
paragraph(40, 90, '강의 근거: Ch06 요구 모델링 p15-16, p18-40, p43-48, p51-54, p56-58, p60-63. 원문 예시는 복제하지 않고 프로젝트 모델에 적용했다.', W-80, 10)
c.showPage()

W, H = header('기준 유스케이스 · 목표 9개 / 액터 3개', '현재 로컬 MVP 범위 / 전체 서비스의 원본 52개 요구는 별도 대응표로 보존', 2)
figure(HERE.parent / 'use-cases.png', H-106, W, H)
c.showPage()

for index, diagram in enumerate(model['diagrams'], 3):
    image = HERE / 'images' / (diagram['id'] + '.png')
    with Image.open(image) as im:
        iw, ih = im.size
    size = portrait(A3) if ih/iw > 1.12 else landscape(A3)
    W, H = header(diagram['title'], diagram['id']+' | '+diagram['category']+' | '+', '.join(diagram['useCases']), index, size)
    top = paragraph(36, H-105, diagram['summary'], W-72, 11, leading=16) - 5
    figure(image, top, W, H)
    c.showPage()

W, H = header('추적성과 검토 체크', '강의 p60-63의 일관성 기준 적용', pages)
columns = [(40,95),(135,250),(385,300),(685,225),(910,W-950)]
head = ['유스케이스', '주요 책임', '대응 시퀀스', '상태 / 활동', '확인 포인트']
c.setFillColor('#f0edff');c.rect(36,H-151,W-72,35,fill=1,stroke=0)
for (x,width),value in zip(columns,head):text(x,H-139,value,12,bold=True)
rows = [
    ('UC-01','Work · Version · Review','SQ01 등록·기여','시작 / AC01','새 버전·해시'),
    ('UC-02','Review · GateResponse','SQ02 답변·검토','ST01 / AC01','세 답변 제출'),
    ('UC-03','Review · Evaluation · ReviewRound','SQ02 답변·검토','ST01 / AC01','회차 보존·재평가'),
    ('UC-04','Version · Approval · Receipt','SQ03 승인·저장','ST01 / AC01','실패 시 성공 없음'),
    ('UC-05','Work · Version','SQ04 버전·철회·조회','관계 / AC01','승인 미상속'),
    ('UC-06','Approval · AuditEvent','SQ04 버전·철회·조회','ST02 / 별도 요청','철회 기록 유지'),
    ('UC-07','Receipt · EvidenceVerifier','SQ05 수신자 확인','관계 참조 / AC01','파일 선택·확인 범위'),
    ('UC-08','Contribution · ContributionRecorder','SQ01 등록·기여','ST01 / AC01','신고 입력·평가 초기화'),
    ('UC-09','Work · Receipt · AuditEvent','SQ04 버전·철회·조회','읽기 / AC01','공개·비공개 구분'),
]
y=H-179
for row in rows:
    for (x,width),value in zip(columns,row):paragraph(x,y,value,width-12,11,leading=14)
    c.setStrokeColor('#d8dfe9'); c.line(36,y-21,W-36,y-21)
    y-=44
y-=20
text(40,y,'완료 검사',16,bold=True)
checks=[
    '9개 유스케이스마다 대응 시퀀스가 있다. 메시지 수신 타입과 호출 연산은 클래스 정의에 연결된다.',
    '상태의 연산 참조는 클래스에 있고 검토 통과·승인 완료·철회·후속 버전 관계는 구분된다.',
    'alt/opt/loop의 범위와 결정·병합·스윔레인을 구분했다. 비동기라는 이유로 병렬 처리를 가정하지 않는다.',
    '승인·감사 저장 성공 이후에만 성공 표시한다. 충돌 시 최신 기록을 재확인하며 자동 재승인하지 않는다.',
    '현재 QR은 서명 없는 요약이다. 최신 효력 확인 범위와 파일 일치를 각각 표시한다.',
]
for check in checks:y=paragraph(40,y-17,'- '+check,W-80,12,leading=18)
c.showPage()
c.save()
reader=PdfReader(str(DEST))
assert len(reader.pages)==pages,(len(reader.pages),pages)
assert len(reader.pages[0].extract_text())>100
print(f'Created {len(reader.pages)} pages: {DEST}')
