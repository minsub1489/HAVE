"""HAVE 유스케이스 다이어그램 (UC01~UC10) SVG 생성 — 1118.
실행: python3 gen_usecase.py <출력 폴더>"""
import sys, os, subprocess, html

out = sys.argv[1] if len(sys.argv) > 1 else "."
F = "Noto Sans CJK KR"
W, H = 1500, 1190
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{F}">',
     '<defs><marker id="open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#3B4A66" stroke-width="1.4"/></marker>'
     '<marker id="gen" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="13" markerHeight="13" orient="auto"><path d="M1,1 L13,7 L1,13 z" fill="white" stroke="#3B4A66" stroke-width="1.3"/></marker></defs>',
     f'<rect width="{W}" height="{H}" fill="white"/>',
     f'<text x="{W/2}" y="38" text-anchor="middle" font-size="24" font-weight="700" fill="#172033">HAVE 유스케이스 다이어그램 (UC01~UC10)</text>',
     f'<text x="{W/2}" y="62" text-anchor="middle" font-size="13.5" fill="#526079">AI 작업 인간 승인 증명 시스템 · 크롬 확장 프로그램 · 1118 작성 (1104·1109의 UC01~UC10 번호 체계 그대로)</text>',
     '<rect x="300" y="86" width="900" height="1010" fill="#FAFBFD" stroke="#172033" stroke-width="1.6"/>',
     '<text x="750" y="114" text-anchor="middle" font-size="17" font-weight="700" fill="#172033">HAVE 시스템 (크롬 확장 프로그램 + 서버)</text>']


def esc(s):
    return html.escape(s, quote=False)


def actor(x, y, name, sub=""):
    o.append(f'<g stroke="#172033" stroke-width="1.8" fill="none"><circle cx="{x}" cy="{y-46}" r="15" fill="white"/><path d="M{x},{y-31} V{y+8} M{x-26},{y-16} H{x+26} M{x},{y+8} L{x-22},{y+38} M{x},{y+8} L{x+22},{y+38}"/></g>')
    o.append(f'<text x="{x}" y="{y+60}" text-anchor="middle" font-size="15.5" font-weight="700" fill="#172033">{esc(name)}</text>')
    if sub:
        o.append(f'<text x="{x}" y="{y+79}" text-anchor="middle" font-size="12" fill="#526079">{esc(sub)}</text>')


UC = {}


def uc(key, cx, cy, l1, l2="", new=False, inc=False):
    UC[key] = (cx, cy)
    stroke, fill, sw = ("#C8102E", "#FFF5F5", 2.4) if new else (("#5B6B88", "#EEF3FB", 1.4) if inc else ("#34425E", "#FFFFFF", 1.5))
    o.append(f'<ellipse cx="{cx}" cy="{cy}" rx="150" ry="33" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
    if l2:
        c1 = "#C8102E" if new else "#172033"
        o.append(f'<text x="{cx}" y="{cy-3}" text-anchor="middle" font-size="14.5" font-weight="700" fill="{c1}">{esc(l1)}</text>')
        o.append(f'<text x="{cx}" y="{cy+16}" text-anchor="middle" font-size="13.5" fill="#172033">{esc(l2)}</text>')
    else:
        o.append(f'<text x="{cx}" y="{cy+5}" text-anchor="middle" font-size="14.5" font-weight="700" fill="#172033">{esc(l1)}</text>')


def assoc(ax, ay, key, side):
    cx, cy = UC[key]
    x = cx - 150 if side == "l" else cx + 150
    o.append(f'<line x1="{ax}" y1="{ay}" x2="{x}" y2="{cy}" stroke="#34425E" stroke-width="1.3"/>')


def dep(p, q, label, lx, ly):
    o.append(f'<line x1="{p[0]}" y1="{p[1]}" x2="{q[0]}" y2="{q[1]}" stroke="#3B4A66" stroke-width="1.3" stroke-dasharray="7 5" marker-end="url(#open)"/>')
    o.append(f'<text x="{lx}" y="{ly}" text-anchor="middle" font-size="12.5" fill="#1F3B73">{esc(label)}</text>')


# 유스케이스
uc("UC01", 520, 190, "UC01", "AI 작업 및 사용 내역 등록")
uc("UC02", 520, 295, "UC02", "결과물 및 근거자료 등록")
uc("UC03", 520, 400, "UC03", "위험 분석 및 검토 요청")
uc("UC05", 520, 560, "UC05", "결과물 수정 및 재제출")
uc("UC08", 520, 900, "UC08", "승인 증명서 진위 검증")
uc("UC04", 980, 190, "UC04", "결과물 검토 및 피드백")
uc("UC06", 980, 400, "UC06", "최종 승인 및 반려")
uc("UC10", 980, 560, "UC10", "승인 철회")
uc("UC07", 980, 770, "UC07", "승인 증명서 조회 및 공유")
uc("UC09", 980, 870, "UC09", "승인 이력 및 상태 조회")

# 액터
actor(150, 350, "작성자", "등록·신고·답변·수정")
actor(150, 900, "외부 검증자", "수신자 · 비로그인")
actor(1350, 190, "검토자", "평가·피드백")
actor(1350, 470, "최종 승인자", "승인·반려·철회")
actor(1350, 800, "작업 구성원", "작성자·검토자·최종 승인자 공통")

for k in ("UC01", "UC02", "UC03", "UC05"):
    assoc(182, 345, k, "l")
assoc(182, 895, "UC08", "l")
assoc(1318, 185, "UC04", "r")
assoc(1318, 462, "UC06", "r"); assoc(1318, 470, "UC10", "r")
assoc(1318, 795, "UC07", "r"); assoc(1318, 800, "UC09", "r")

# 액터 일반화 (작업 구성원)
gen = 'fill="none" stroke="#3B4A66" stroke-width="1.3" marker-end="url(#gen)"'
o.append(f'<path d="M1350,560 V736" {gen}/>')
o.append(f'<path d="M1392,180 H1452 V790 H1396" {gen}/>')
o.append(f'<path d="M108,340 H52 V1140 H1350 V888" {gen}/>')

# 포함 · 확장
dep((640, 540), (868, 212), "«extend» [검토자가 수정 요청]", 905, 300)
dep((668, 560), (836, 418), "«extend» [최종 승인자가 반려]", 856, 494)

# 주석
o.append('<rect x="330" y="946" width="840" height="136" rx="6" fill="#FFF8E1" stroke="#C9B26B"/>')
notes = ["진행 순서(선행 조건) : UC01 → UC02 → UC03 → UC04 → UC06 → UC07 · UC08   |   수정 요청·반려 시 UC05 → UC04 재검토",
         "UC10(승인 철회)은 승인 이후 언제든 가능하다. UC09는 모든 단계에서 조회할 수 있다. 승인 증명서 발급은 UC06 안에서 일어나는 시스템 동작이다.",
         "UC08을 제외한 모든 유스케이스는 로그인과 작업별 역할 확인(01 사용자·권한 관리)을 공통 선행 조건으로 한다.",
         "UC03은 위험 분석 → 검토자 지정·검토 요청 → 이해 확인 답변 제출까지를 한 유스케이스로 본다. (UC03 «include» UC04 등 잘못된 표기는 삭제)",
         "재제출(UC05)에서 근거자료·AI 사용 신고를 바꾸면 UC03의 이해 확인 답변을 다시 거친 뒤 UC04 재검토로 간다. (11-23)"]
for i, t in enumerate(notes):
    o.append(f'<text x="346" y="{970+i*24}" font-size="13" fill="#172033">{esc(t)}</text>')
o.append('<text x="52" y="1172" font-size="12" fill="#526079">실선 = 액터와 유스케이스의 연관 · 빈 삼각형 = 액터 일반화 · 점선 화살표 = «extend»(조건이 맞을 때만 기본 유스케이스를 확장)</text>')
o.append("</svg>")
base = os.path.join(out, "HAVE_유스케이스_다이어그램")
open(base + ".svg", "w", encoding="utf-8").write("\n".join(o))
subprocess.run(["rsvg-convert", "-z", "2", "-o", base + ".png", base + ".svg"], check=True)
print("ok")
