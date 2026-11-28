"""HAVE 패키지 다이어그램 레벨 2 · 레벨 3 (v2) — Graphviz. 1118.
실행: python3 gen_package.py <출력 폴더>
검정 = 1109 원자료 · 빨강 = 디자인 패턴 적용으로 추가(24개) · 빨강 굵게(★) = 1118 후속 단계 반영"""
import sys, os, subprocess

out = sys.argv[1] if len(sys.argv) > 1 else "."
RED = "#C8102E"
FN = "Noto Sans CJK KR"


def run(name, dot, dpi=150):
    base = os.path.join(out, name)
    open(base + ".dot", "w", encoding="utf-8").write(dot)
    subprocess.run(["dot", "-Tpng", f"-Gdpi={dpi}", base + ".dot", "-o", base + ".png"], check=True)
    subprocess.run(["dot", "-Tsvg", base + ".dot", "-o", base + ".svg"], check=True)


# ───────────── 레벨 2 ─────────────
def pk(i, title, sub, fill="#EAF0FB", red=False):
    c = RED if red else "#5B6B88"
    return (f'  {i} [label=<<B>{title}</B><BR/><FONT POINT-SIZE="11">{sub}</FONT>>, fillcolor="{fill}", color="{c}", penwidth={2 if red else 1}];')


def dep(a, b, label, red=False, extra=""):
    c = RED if red else "#4A5874"
    return f'  {a} -> {b} [label=<<FONT POINT-SIZE="10.5" COLOR="{c}">{label}</FONT>>, color="{c}"{extra}];'


L2 = ['digraph L2 {', f'  graph [compound=true, rankdir=TB, fontname="{FN}", fontsize=20, labelloc=t, nodesep=0.55, ranksep=0.75, pad=0.4,',
      '    label="HAVE | UML 패키지 다이어그램 · 레벨 2 (v2)\\n확장 프로그램 클라이언트 + 서버 서브시스템 8개 + 서버 조립 지점 · UC01–UC10\\n "];',
      f'  node [shape=tab, style=filled, fontname="{FN}", fontsize=13, margin="0.22,0.12"];',
      f'  edge [fontname="{FN}", style=dashed, arrowhead=vee, arrowsize=0.8];',
      f'  subgraph cluster_client {{ label=<<FONT COLOR="{RED}"><B>클라이언트 패키지 (1118 추가)</B></FONT>>; style="rounded"; color="{RED}"; fontsize=15;',
      pk("C0", "00 확장 프로그램 클라이언트", "Extension · sidepanel · popup · background · common-ui<BR/>작성자 · 검토자 · 최종 승인자", "#FDECEE", True),
      pk("CV", "공개 검증 페이지", "verify-web · 외부 검증자(비로그인)", "#FDECEE", True), "  }",
      f'  EXT [label=<«external»<BR/><B>Chrome Extension API</B><BR/><FONT POINT-SIZE="11">sidePanel · storage · notifications · tabs</FONT>>, shape=tab, fillcolor="#F1F3F6", color="{RED}", penwidth=2];',
      '  subgraph cluster_core { label="핵심 업무 패키지"; style="rounded"; color="#9AA7BD"; fontsize=15;',
      pk("P06", "06 진위 검증", "Verification · UC08<BR/>서명 · 해시 · 현재 효력 검증"),
      pk("P05", "05 증명서 관리", "Certificate · UC07 / UC06 후속 발급<BR/>발급 레코드 · 조회 · 링크·QR"),
      pk("P04", "04 승인 관리", "Approval · UC06 / UC10<BR/>최종 승인 · 반려 · 철회"),
      pk("P03", "03 검토 관리", "Review · UC03 / UC04<BR/>위험 분석 · 이해 확인 · 검토 판정"),
      pk("P02", "02 작업·결과물 관리", "Work · UC01 / UC02 / UC05<BR/>AI 사용 내역 · 결과물 · 버전 · 수정본 · 상태 통지"), "  }",
      '  subgraph cluster_sup { label="공통 지원 패키지"; style="rounded"; color="#9AA7BD"; fontsize=15;',
      pk("P01", "01 사용자·권한 관리", "Auth · 공통<BR/>인증 · 작업별 역할 · 접근 제어", "#E9F4EA"),
      pk("P07", "07 이력 관리", "Audit · UC09 및 공통<BR/>이벤트 · 이력·상태 조회 · 알림", "#E9F4EA"),
      pk("P08", "08 데이터 저장", "Persistence · 공통<BR/>저장 계약 · DB/파일 구현", "#E9F4EA"), "  }",
      pk("BOOT", "서버 조립 지점", "bootstrap · 8개 서브시스템 밖<BR/>HaveServerBootstrap", "#FDECEE", True),
      dep("C0", "P04", "업무 API 호출 (IWorkAPI 외)", True, ", lhead=cluster_core"),
      dep("CV", "P06", "IVerificationAPI", True),
      dep("C0", "EXT", "측면 패널 · 저장 · 알림 · 현재 탭", True),
      dep("P06", "P05", "증명서·서명 데이터"), dep("P06", "P04", "현재 승인 효력"), dep("P05", "P04", "승인 결과·고정 버전"),
      dep("P04", "P03", "확정 검토 결과"), dep("P04", "P02", "버전·파일 해시"), dep("P03", "P02", "검토 대상 버전"),
      dep("P03", "P02", "WorkStatusObserver 구현<BR/>(재검토 연결)", True),
      dep("P05", "P02", "WorkStatusObserver 구현<BR/>(발급 요청)", True),
      dep("P07", "P02", "WorkStatusObserver 구현<BR/>(이력 · 알림)", True),
      dep("P02", "P01", "권한 확인 · 계정 조회", False, ", ltail=cluster_core"),
      dep("P02", "P07", "이력 기록 · 알림 요청", False, ", ltail=cluster_core"),
      dep("P02", "P08", "저장·조회 계약 사용", False, ", ltail=cluster_core"),
      dep("P07", "P08", "이력·현재 상태 조회"), dep("P01", "P08", "사용자·멤버십 저장"),
      dep("BOOT", "P08", "저장소 구현 선택 · 생성", True), dep("BOOT", "P07", "옵서버 등록", True),
      f'  NOTE [shape=note, fillcolor="#FFF8E1", color="#C9B26B", fontsize=11.5, label=<점선 열린 화살표 · 의존하는 패키지 → 제공 패키지<BR ALIGN="LEFT"/>업무 묶음에서 나가는 화살표는 공통 의존의 요약<BR ALIGN="LEFT"/><FONT COLOR="{RED}"><B>빨간색 = 1118 수정</B> — 클라이언트 패키지 추가(1109는 서버만 표시),<BR ALIGN="LEFT"/>디자인 패턴으로 생긴 의존(옵서버 3건 · 서버 조립 지점) 반영<BR ALIGN="LEFT"/><B>1123 패턴 정리</B> — 어댑터 · 추상 팩토리 미적용. 서버 조립 지점은<BR ALIGN="LEFT"/>옵서버 등록과 저장소 구현(JDBC / Stub) 선택만 한다.</FONT><BR ALIGN="LEFT"/>02는 옵서버 인터페이스만 정의하므로 02 ↔ 03·05·07 순환 의존은 없다.<BR ALIGN="LEFT"/>>];',
      '  { rank=sink; NOTE; BOOT; }', '}']
run("HAVE_패키지다이어그램_레벨2_v2", "\n".join(L2))


# ───────────── 레벨 3 (UML 패키지 기호를 직접 그림) ─────────────
import html
A, M, Pn = "#E3ECFA", "#E5F2E7", "#FDECEE"
SUBS = [
    ("00 확장 프로그램 클라이언트 ★", True, [
        ("sidepanel (측면 패널 화면)", ["★WorkListView", "★RegisterWizardView", "★WorkDetailView", "★GateAnswerView", "★ReviewPanelView", "★RevisionView", "★ApprovalView", "★NotificationView"], Pn),
        ("popup · verify-web", ["★PopupView", "★VerifyPage", "★FileHasher"], Pn),
        ("background · common-ui", ["★ApiClient", "★SessionStore", "★NotificationBridge", "★TabPdfImporter", "★AppShell", "★StatusBadge", "★StatusMapper"], Pn)], [(0, 2), (1, 2)]),
    ("01 사용자·권한 관리", False, [
        ("인증·권한 정책", ["AuthorizationPolicy"], A), ("사용자·멤버십", ["User", "WorkMember"], M)], [(0, 1)]),
    ("02 작업·결과물 관리", False, [
        ("등록·재제출 응용", ["WorkController", "ContributionController", "VersionController", "EvidenceController", "WorkService", "ContributionService", "VersionService", "EvidenceService", "RevisionService"], A),
        ("작업·버전 모델", ["Work", "WorkVersion", "AiDisclosure", "AiToolUsage", "Contribution", "EvidenceItem", "Revision", "★FeedbackResponse"], M),
        ("상태 통지 (옵서버)", ["+Subject", "+WorkStatusSubject", "+WorkStatusObserver", "+StatusChange"], Pn)], [(0, 1), (0, 2)]),
    ("03 검토 관리", False, [
        ("검토 요청·처리 응용", ["RiskController", "ReviewRequestController", "RiskService", "GatePolicy", "ReviewRequestService", "ReviewService", "★ReReviewObserver"], A),
        ("검토·평가 모델", ["RiskAssessment", "ReviewRequest", "Challenge", "ChallengeResponse", "Evaluation", "Review", "Feedback", "★ChecklistItem", "★ReviewCheck", "★FeedbackItem"], M),
        ("Gate 전략", ["+GateStrategy", "+LowRiskGate", "+MediumRiskGate", "+HighRiskGate"], Pn)], [(0, 1), (0, 2)]),
    ("04 승인 관리", False, [
        ("승인·철회 응용", ["ApprovalService"], A), ("결정·효력·발급 요청", ["ApprovalCase", "Approval", "Revocation", "OutboxEvent"], M)], [(0, 1)]),
    ("05 증명서 관리", False, [
        ("발급·공유 응용", ["CertificateService", "+CertificateIssueObserver"], A), ("발급 기록·공유 모델", ["Certificate", "ShareLink", "QRCode"], M)], [(0, 1)]),
    ("06 진위 검증", False, [
        ("서명·해시·효력 검사", ["VerificationService"], A), ("검증 결과 모델", ["VerificationResult"], M)], [(0, 1)]),
    ("07 이력 관리", False, [
        ("기록·조회·알림 연계", ["AuditLogService", "HistoryService", "NotificationGateway", "+AuditLogObserver", "+NotificationObserver"], A),
        ("감사·알림 모델", ["AuditEvent", "★Notification"], M)], [(0, 1)]),
    ("08 데이터 저장", False, [
        ("DB·파일 구현 (구체화)", ["+JdbcPersistence", "+StubPersistence", "+JsonFilePersistence", "+DatabaseConnectionPool", "+StorageFileStore"], Pn),
        ("저장·조회 계약", ["+Repository‹T›", "ReviewRepository", "RevisionRepository", "ApprovalRepository", "CertificateRepository", "HistoryRepository", "★UserRepository", "★WorkRepository", "FileStore"], M)], [(0, 1)]),
    ("bootstrap (서버 조립 지점)", True, [
        ("서버 조립", ["+HaveServerBootstrap"], Pn)], []),
]
LH, TAB, PAD = 19, 22, 16


def tw(t, size=13):
    return sum(size * 1.0 if ord(c) > 0x2E80 else size * 0.56 for c in t)


def measure(sub):
    title, red, boxes, deps = sub
    ws = [max([tw(t) + 62] + [tw(i.lstrip("+★")) + 30 for i in items]) for t, items, _ in boxes]
    iw = max(ws)
    hs = [len(items) * LH + 14 for _, items, _ in boxes]
    w = max(iw + 2 * PAD + (22 if any(b - a > 1 for a, b in deps) else 0), tw(title, 14.5) + 40)
    h = sum(hs) + len(boxes) * (TAB + 26) + PAD
    return w, h, iw, hs


def e(t):
    return html.escape(t, quote=False)


o = []
x0, y0, gapx, gapy = 30, 100, 26, 40
rows = [SUBS[:5], SUBS[5:]]
W = 0
y = y0
for row in rows:
    ms = [measure(s_) for s_ in row]
    rh = max(m[1] for m in ms) + TAB
    x = x0
    for sub, (w, h, iw, hs) in zip(row, ms):
        title, red, boxes, deps = sub
        col = RED if red else "#34425E"
        tabw = tw(title, 14.5) + 26
        o.append(f'<rect x="{x}" y="{y}" width="{tabw:.0f}" height="{TAB+4}" fill="#F7F9FC" stroke="{col}" stroke-width="{2 if red else 1.5}"/>')
        o.append(f'<rect x="{x}" y="{y+TAB+4}" width="{w:.0f}" height="{rh-TAB-4}" fill="#FBFCFE" stroke="{col}" stroke-width="{2 if red else 1.5}"/>')
        o.append(f'<text x="{x+12}" y="{y+19}" font-size="14.5" font-weight="700" fill="{col}">{e(title)}</text>')
        iy = y + TAB + 4 + 18
        pos = []
        for (t, items, fill), bh in zip(boxes, hs):
            ix = x + PAD
            tbw = tw(t) + 22
            o.append(f'<rect x="{ix}" y="{iy}" width="{tbw:.0f}" height="{TAB}" fill="{fill}" stroke="#5B6B88"/>')
            o.append(f'<rect x="{ix}" y="{iy+TAB}" width="{iw:.0f}" height="{bh}" fill="white" stroke="#5B6B88"/>')
            o.append(f'<text x="{ix+9}" y="{iy+16}" font-size="13" font-weight="700" fill="#172033">{e(t)}</text>')
            for k, it in enumerate(items):
                st = 'fill="#172033"'
                if it.startswith("★"):
                    st = f'fill="{RED}" font-weight="700"'
                elif it.startswith("+"):
                    st, it = f'fill="{RED}"', it[1:]
                o.append(f'<text x="{ix+12}" y="{iy+TAB+19+k*LH}" font-size="13" {st}>{e(it)}</text>')
            pos.append((ix, iy, iw, TAB + bh))
            iy += TAB + bh + 26
        for a, b in deps:
            ax, ay, aw, ah = pos[a]
            bx, by, bw, bh2 = pos[b]
            if b - a == 1:
                cx = ax + aw - 18
                o.append(f'<path d="M{cx:.0f},{ay+ah} V{by+TAB-1}" class="dep"/>')
            else:
                rx = ax + aw + 14
                o.append(f'<path d="M{ax+aw},{ay+ah*0.6:.0f} H{rx} V{by+TAB+bh2*0.4:.0f} H{bx+bw+1}" class="dep"/>')
        x += w + gapx
    W = max(W, x)
    y += rh + gapy
H = y + 96
head = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.0f} {H:.0f}" font-family="{FN}">',
        '<defs><marker id="open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#3B4A66" stroke-width="1.4"/></marker>'
        '<style>.dep{fill:none;stroke:#3B4A66;stroke-width:1.3;stroke-dasharray:6 4;marker-end:url(#open)}</style></defs>',
        f'<rect width="{W:.0f}" height="{H:.0f}" fill="white"/>',
        f'<text x="{W/2:.0f}" y="36" text-anchor="middle" font-size="22" font-weight="700" fill="#172033">HAVE | UML 패키지 다이어그램 · 레벨 3 (v2)</text>',
        f'<text x="{W/2:.0f}" y="62" text-anchor="middle" font-size="14" fill="#526079">서브시스템 내부 패키지와 소속 타입 · 서버 타입 79개(1109 원자료 53 + 디자인 패턴·인프라 18 + 1118 추가 8) + 클라이언트 화면·모듈 · 1123 패턴 정리 반영</text>']
ny = H - 84
foot = [f'<rect x="{x0}" y="{ny}" width="{W-2*x0:.0f}" height="66" fill="#FFF8E1" stroke="#C9B26B"/>',
        f'<text x="{x0+14}" y="{ny+22}" font-size="13" fill="#172033">탭 달린 상자 = 패키지(바깥: 서브시스템, 안: 내부 패키지) · 점선 열린 화살표 = 패키지 간 의존(의존하는 쪽 → 제공하는 쪽) · 서브시스템 간 의존은 레벨 2 참조</text>',
        f'<text x="{x0+14}" y="{ny+42}" font-size="13" fill="{RED}">빨강 = 디자인 패턴 적용으로 추가된 타입 18개 (1123 패턴 정리로 24개에서 6개 삭제) · <tspan font-weight="700">★ 빨강 굵게 = 1118 후속 단계(HCI·DB) 반영으로 추가</tspan> (클라이언트 화면·모듈, FeedbackItem, FeedbackResponse,</text>',
        f'<text x="{x0+14}" y="{ny+60}" font-size="13" fill="{RED}">ChecklistItem, ReviewCheck, Notification, UserRepository, WorkRepository, ReReviewObserver) · 검정 = 1109 원자료 타입 53개</text>']
base = os.path.join(out, "HAVE_패키지다이어그램_레벨3_v2")
open(base + ".svg", "w", encoding="utf-8").write("\n".join(head + o + foot + ["</svg>"]))
subprocess.run(["rsvg-convert", "-z", "2", "-o", base + ".png", base + ".svg"], check=True)
print("ok")
