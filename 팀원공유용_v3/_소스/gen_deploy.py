"""HAVE UML 배치 다이어그램 (Deployment Diagram). 1123.
노드(입체 상자) · 실행 환경 · 결과물(«artifact») · 커뮤니케이션 경로(«프로토콜») · «manifest».
실행: python3 gen_deploy.py <출력 폴더>   → HAVE_배치_다이어그램.svg / .png (Chrome 필요)"""
import sys, os, asyncio

W, H = 2300, 1530
INK, SUB, LINE = "#172033", "#526079", "#34425A"
DEV, EE, ART, EXT = "#EEF2FB", "#FFFFFF", "#FFF8E1", "#F1F1F1"
o = []
esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def txt(x, y, t, size=20, bold=False, fill=INK, anchor="start", italic=False):
    o.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{fill}" text-anchor="{anchor}"'
             f'{" font-style=\"italic\"" if italic else ""}>{esc(t)}</text>')


def node(x, y, w, h, stereo, name, sub=None, fill=DEV, d=20):
    """UML 노드: 앞면 사각형 + 윗면·옆면"""
    o.append(f'<polygon points="{x},{y} {x+d},{y-d} {x+w+d},{y-d} {x+w},{y}" fill="{fill}" stroke="{LINE}" stroke-width="2.5"/>')
    o.append(f'<polygon points="{x+w},{y} {x+w+d},{y-d} {x+w+d},{y+h-d} {x+w},{y+h}" fill="#D9E0EE" stroke="{LINE}" stroke-width="2.5"/>')
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{LINE}" stroke-width="2.5"/>')
    txt(x + w / 2, y + 28, f"«{stereo}»", 17, fill=SUB, anchor="middle")
    txt(x + w / 2, y + 54, name, 22, True, anchor="middle")
    if sub:
        txt(x + w / 2, y + 78, sub, 16, fill=SUB, anchor="middle")


def artifact(x, y, w, h, name, lines=(), stereo="artifact"):
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{ART}" stroke="{LINE}" stroke-width="2"/>')
    ix, iy = x + w - 34, y + 10      # 문서 아이콘
    o.append(f'<path d="M{ix},{iy} h14 l8,8 v20 h-22 z M{ix+14},{iy} v8 h8" fill="white" stroke="{LINE}" stroke-width="1.6"/>')
    txt(x + 16, y + 26, f"«{stereo}»", 16, fill=SUB)
    txt(x + 16, y + 52, name, 21, True)
    for i, t in enumerate(lines):
        txt(x + 16, y + 80 + i * 25, t, 17, fill=INK)


def path(x1, y1, x2, y2, stereo, sub=None, dy=-12):
    o.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{LINE}" stroke-width="2.5"/>')
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    wbox = max(len(stereo) * 13, len(sub or "") * 11) + 24
    hb = 56 if sub else 32
    o.append(f'<rect x="{mx - wbox/2}" y="{my - hb/2 + dy + 12}" width="{wbox}" height="{hb}" fill="white" opacity="0.92"/>')
    txt(mx, my + dy + (8 if sub else 18), f"«{stereo}»", 18, True, anchor="middle")
    if sub:
        txt(mx, my + dy + 32, sub, 15, fill=SUB, anchor="middle")


def component(x, y, w, h, name, sub=None):
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{DEV}" stroke="{LINE}" stroke-width="2"/>')
    ix, iy = x + w - 40, y + 12      # 컴포넌트 아이콘
    o.append(f'<rect x="{ix}" y="{iy}" width="24" height="28" fill="white" stroke="{LINE}" stroke-width="1.6"/>'
             f'<rect x="{ix-7}" y="{iy+5}" width="14" height="6" fill="white" stroke="{LINE}" stroke-width="1.6"/>'
             f'<rect x="{ix-7}" y="{iy+16}" width="14" height="6" fill="white" stroke="{LINE}" stroke-width="1.6"/>')
    txt(x + 16, y + 26, "«component»", 16, fill=SUB)
    txt(x + 16, y + 52, name, 21, True)
    if sub:
        txt(x + 16, y + 78, sub, 16, fill=SUB)


def manifest(x, y1, y2):
    o.append(f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}" stroke="{LINE}" stroke-width="2" stroke-dasharray="9 6"/>')
    o.append(f'<path d="M{x-9},{y2+16} L{x},{y2} L{x+9},{y2+16}" fill="none" stroke="{LINE}" stroke-width="2"/>')
    txt(x + 14, (y1 + y2) / 2 + 6, "«manifest»", 17, fill=INK)


# ── 제목 ──
txt(W / 2, 52, "HAVE | UML 배치 다이어그램 (Deployment Diagram)", 32, True, anchor="middle")
txt(W / 2, 86, "런타임 노드와 그 위에 놓이는 결과물(artifact), 노드 사이의 커뮤니케이션 경로 · UC01–UC10 · 2026-11-23", 18, fill=SUB, anchor="middle")

# ── 클라이언트 노드 ──
node(70, 160, 640, 480, "device", "사용자 PC", "작성자 · 검토자 · 최종 승인자")
node(100, 262, 580, 356, "executionEnvironment", "Chrome 브라우저", fill=EE, d=12)
artifact(128, 336, 524, 162, "have-chrome-extension", ["manifest.json · app.html (측면 패널)", "popup.html (팝업) · background.js (서비스 워커)", "파일의 SHA-256 계산 · 브라우저 알림 표시"])
artifact(128, 514, 524, 88, "chrome.storage.local", ["세션 · 화면 임시 저장 (승인 기록은 두지 않음)"])

node(70, 760, 640, 330, "device", "외부 검증자 기기", "PC · 모바일 · 설치와 로그인 없음")
node(100, 862, 580, 206, "executionEnvironment", "웹 브라우저", fill=EE, d=12)
artifact(128, 936, 524, 114, "verify-web (공개 검증 페이지)", ["승인 효력 · 서명 검증 · 파일 비교 표시", ])

# ── 서버 노드 ──
node(930, 250, 640, 700, "device", "HAVE 서버", "서버 운영자가 관리 · 승인 기록의 단일 출처")
node(960, 352, 580, 574, "executionEnvironment", "애플리케이션 서버 런타임", fill=EE, d=12)
artifact(988, 426, 524, 268, "have-server", ["01 Auth · 02 Work · 03 Review · 04 Approval", "05 Certificate · 06 Verification · 07 Audit", "08 Persistence (Repository · JdbcPersistence ·", "    DatabaseConnectionPool · StorageFileStore)", "bootstrap (HaveServerBootstrap)", "REST API 제공 · 전자서명 · 감사 이력 해시 체인", ])
artifact(988, 710, 524, 88, "verify-web 정적 파일", ["공개 검증 페이지를 브라우저에 내려준다"])
artifact(988, 814, 524, 88, "서명 키", ["증명서 전자서명용 · 서버만 보관"])

# ── 데이터 · 외부 노드 ──
node(1800, 160, 430, 290, "device", "DB 서버")
node(1826, 240, 378, 186, "executionEnvironment", "관계형 DBMS", fill=EE, d=12)
artifact(1848, 312, 334, 96, "HAVE 데이터베이스", ["테이블 31개 · 외래 키 40개"])

node(1800, 550, 430, 210, "device", "파일 저장소")
artifact(1826, 634, 378, 104, "결과물 PDF · 근거 파일", ["버전별 저장 · 승인 후 변경 없음"])

node(1800, 860, 430, 180, "device", "알림 채널 (외부)", fill=EXT)
artifact(1826, 944, 378, 76, "이메일 서버", [])

# ── 커뮤니케이션 경로 ──
path(730, 400, 930, 470, "HTTPS", "REST · JSON")
path(730, 925, 930, 800, "HTTPS", "공개 검증 요청")
path(1590, 400, 1800, 305, "JDBC")
path(1590, 630, 1800, 655, "HTTPS", "IStorageAPI")
path(1590, 850, 1800, 950, "SMTP", "INotifyChannel")

# ── manifest: 결과물이 구현하는 컴포넌트 ──
o.append(f'<rect x="40" y="1140" width="{W-80}" height="350" rx="14" fill="#FBFCFE" stroke="#C9D2E0" stroke-width="1.5"/>')
txt(70, 1180, "결과물과 컴포넌트의 대응 — 결과물(artifact)이 컴포넌트를 구현한다 «manifest»", 21, True)
for x, cname, csub, aname in [(110, "크롬 확장 프로그램", "측면 패널 · 팝업 · 서비스 워커", "have-chrome-extension"),
                              (860, "공개 검증 페이지", "승인 효력 · 서명 · 파일 비교", "verify-web"),
                              (1610, "서버 서브시스템 01~08", "컴포넌트 다이어그램 v2의 서버 컴포넌트", "have-server")]:
    component(x, 1210, 560, 96, cname, csub)
    artifact(x, 1392, 560, 70, aname)
    manifest(x + 280, 1392, 1306)

# ── 표기 설명 ──
o.append(f'<rect x="930" y="990" width="640" height="118" fill="#FFF8E1" stroke="#C9B26B" stroke-width="1.5"/>')
for i, t in enumerate(["입체 상자 = 노드 («device» 장치, «executionEnvironment» 실행 환경)", "문서 아이콘 상자 = 결과물 «artifact»",
                       "실선 = 커뮤니케이션 경로, « » 안은 통신 방식", "승인 · 서명 · 감사 이력은 HAVE 서버에서만 쓴다"]):
    txt(948, 1018 + i * 25, t, 16, fill=INK)

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Noto Sans CJK KR, Malgun Gothic, sans-serif">'
       f'<rect width="{W}" height="{H}" fill="white"/>' + "".join(o) + "</svg>")
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
p = os.path.join(out, "HAVE_배치_다이어그램")
open(p + ".svg", "w", encoding="utf-8").write(svg)


async def shot():
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": W, "height": H}, device_scale_factor=1.5)
        await pg.goto("file://" + os.path.abspath(p + ".svg"))
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=p + ".png")
        await b.close()
asyncio.run(shot())
print("ok", p)
