"""디자인 패턴 문서 v2의 그림 2-1 · 3-1 · 5-1 · 7-1 · 8-1 (Graphviz). 1123.
1123 패턴 정리: 어댑터 · 추상 팩토리를 적용하지 않기로 해 그림 4-1 · 4-2 · 6-1을 없애고 그림 2-1(패턴 배치)을 다시 그린다.
오퍼레이션 이름은 naming.py의 규칙(is · get · set)을 따른다. '!'로 시작하는 줄 = 이름이 바뀐 오퍼레이션(빨간색).
실행: python3 gen_dp_figs.py <출력 폴더>"""
import sys, os, subprocess

out = sys.argv[1] if len(sys.argv) > 1 else "."
FN, RED = "Noto Sans CJK KR", "#C8102E"


def cls(i, name, attrs=(), ops=(), st="", sub="", red=False, ext=False):
    c = RED if red else ("#8A96AD" if ext else "#34425E")
    head = "#FDE7EA" if red else ("#F1F3F6" if ext else "#EAF0FB")
    s = f'<FONT POINT-SIZE="9">«{st}»</FONT><BR/>' if st else ""
    sb = f'<BR/><FONT POINT-SIZE="9" COLOR="#526079">{sub}</FONT>' if sub else ""

    def body(L):
        if not L:
            return " "
        return '<BR ALIGN="LEFT"/>'.join(f'<FONT COLOR="{RED}"><B>{l[1:]}</B></FONT>' if l.startswith("!") else l for l in L) + '<BR ALIGN="LEFT"/>'
    return (f'  {i} [label=<<TABLE BORDER="{2 if red else 1}" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5" COLOR="{c}"><TR><TD BGCOLOR="{head}">{s}<B>{name}</B>{sb}</TD></TR>'
            f'<TR><TD ALIGN="LEFT" BALIGN="LEFT">{body(attrs)}</TD></TR><TR><TD ALIGN="LEFT" BALIGN="LEFT">{body(ops)}</TD></TR></TABLE>>];')


def H(extra=""):
    return ['digraph G {', f'  graph [fontname="{FN}", pad=0.2, nodesep=0.45, ranksep=0.6{extra}];', f'  node [shape=plain, fontname="{FN}", fontsize=10];',
            f'  edge [fontname="{FN}", fontsize=9, color="#34425E", arrowsize=0.8];']


NOTE = lambda i, t: f'  {i} [shape=note, style=filled, fillcolor="#FFF8E1", color="#C9B26B", fontsize=9, label=<{t}>];'
use = lambda a, b, lab="": f'  {a} -> {b} [style=dashed, arrowhead=vee, label="{lab}"];'
real = lambda a, b, c="#34425E": f'  {a} -> {b} [style=dashed, arrowhead=empty, color="{c}"];'
realb = lambda a, b: f'  {a} -> {b} [style=dashed, dir=back, arrowtail=empty, color="{RED}"];'   # b가 a를 실현 (b를 아래에 둔다)
gen = lambda a, b: f'  {a} -> {b} [arrowhead=empty];'
agg = lambda a, b, lab="", hl="": f'  {a} -> {b} [arrowtail=odiamond, dir=both, arrowhead=vee, label="{lab}", headlabel="{hl}"];'

F = {}
F["fig3_1_singleton"] = H() + [
    cls("Repo", "Repository 계약 7종", [], ["+ save(entity) …"], st="저장 계약", sub="08 Persistence"),
    cls("Jdbc", "JdbcPersistence", [], ["+ save(entity)", "!+ getById(type, id)", "!+ getByCondition(type, condition)"], sub="08 · DB 구현"),
    cls("Pool", "DatabaseConnectionPool", ["- instance: DatabaseConnectionPool {static}", "- dataSource: DataSource"],
        ["- DatabaseConnectionPool()", "+ getInstance(): DatabaseConnectionPool {static, synchronized}", "+ getConnection(): Connection", "+ release(conn: Connection)"], st="singleton", sub="08 · DB 구현", red=True),
    cls("DB", "관계형 DB", [], [], st="external", ext=True),
    NOTE("N", '생성자를 private으로 막고<BR/>정적 메서드로 유일 객체만 반환<BR/>→ 커넥션 풀이 서버에 하나만 존재'),
    use("Repo", "Jdbc", "저장 요청"), use("Jdbc", "Pool", "getInstance()"), use("Pool", "DB", "JDBC 연결"),
    '  Pool -> Pool [arrowhead=vee, label="instance"];', '  Pool -> N [style=dotted, arrowhead=none];', '  { rank=same; Repo; Jdbc; }', "}"]
F["fig5_1_bridge"] = H() + [
    cls("Cl", "ReviewService ·<BR/>ApprovalService …", [], [], st="Client", sub="01 · 02 · 03 · 04 · 05 · 07"),
    cls("R", "Repository‹T›", ["# impl: IPersistence"], ["+ save(entity: T)", "!+ getById(id): T", "# Repository(impl: IPersistence)"], st="Abstraction", sub="08 Persistence", red=True),
    cls("IP", "IPersistence", [], ["+ save(entity)", "!+ getById(type, id)", "!+ getByCondition(type, condition)"], st="interface · Implementor", sub="08 (원자료 계약)"),
    cls("RR", "ReviewRepository", [], ["!+ getByVersionId(versionId)", "!+ getPendingRequests(reviewerId)"], st="RefinedAbstraction"),
    cls("AR", "ApprovalRepository", [], ["!+ getActiveByVersion(versionId)", "!+ isKeyUsed(key): Boolean"], st="RefinedAbstraction"),
    cls("OR", "Revision · Certificate · History<BR/>User · Work Repository", [], [], st="RefinedAbstraction", sub="외 5종"),
    cls("J", "JdbcPersistence", [], [], st="ConcreteImplementor", sub="관계형 DB 연결", red=True),
    cls("S", "StubPersistence", [], [], st="ConcreteImplementor", sub="메모리 Map · 점증적 통합용", red=True),
    cls("JF", "JsonFilePersistence", [], [], st="ConcreteImplementor", sub="시연·데이터 내보내기용 (선택)", red=True),
    use("Cl", "R", "사용"), agg("R", "IP", "impl (브리지)"), gen("RR", "R"), gen("AR", "R"), gen("OR", "R"),
    realb("IP", "J"), realb("IP", "S"), realb("IP", "JF"), "  { rank=same; Cl; R; IP; }", "  { rank=same; RR; AR; OR; }", "  { rank=same; J; S; JF; }", "}"]
F["fig7_observer"] = H() + [
    cls("Svc", "ReviewService · ApprovalService · RevisionService", [], ["setWorkStatus(workId, status) 호출"], sub="03 Review · 04 Approval · 02 Work"),
    cls("Subject", "Subject", ["- observers: List‹WorkStatusObserver›"], ["+ addObserver(o) / deleteObserver(o)", "# notifyObservers()"], st="abstract", sub="02 Work"),
    cls("WSS", "WorkStatusSubject", ["- lastChange: StatusChange"], ["!+ setWorkStatus(workId, status)", "+ getState(): StatusChange"], st="ConcreteSubject", sub="02 Work · IWorkVersion 구현"),
    cls("WSO", "WorkStatusObserver", [], ["+ update(s: WorkStatusSubject)"], st="interface", sub="02 Work가 제공"),
    cls("A", "AuditLogObserver", [], ["+ update(s)", "   → AuditLogService.record()"], st="ConcreteObserver", sub="07 Audit"),
    cls("N", "NotificationObserver", [], ["+ update(s)", "   → 알림 규칙에 따라 notify()"], st="ConcreteObserver", sub="07 Audit"),
    cls("C", "CertificateIssueObserver", [], ["+ update(s)", "   → APPROVED면 OutboxEvent 저장"], st="ConcreteObserver", sub="05 Certificate"),
    cls("R", "ReReviewObserver", [], ["+ update(s)", "   → 재제출이면 새 버전에", "      검토 요청 연결"], st="ConcreteObserver", sub="03 Review · 1118 추가", red=True),
    use("Svc", "WSS", "«use»"), gen("WSS", "Subject"), agg("Subject", "WSO", "observers", "0..*"),
    real("A", "WSO"), real("N", "WSO"), real("C", "WSO"), real("R", "WSO", RED), "  { rank=same; Subject; WSO; }", "  { rank=same; A; N; C; R; }", "}"]
F["fig8_strategy"] = H() + [
    cls("RS", "RiskService", [], ["+ assessRisk(versionId, scores, rationale)"], sub="03 Review"),
    cls("GP", "GatePolicy", ["- strategy: GateStrategy", "- policyVersion: String", "- mediumMinTotal = 4 / highMinTotal = 7"],
        ["+ selectFor(risk: RiskAssessment)", "+ assignTasks(risk): List‹Challenge›", "+ judge(responses): GateResult"], st="Context", sub="03 Review"),
    cls("GS", "GateStrategy", [], ["+ createTasks(risk): List‹Challenge›", "+ judge(responses): GateResult"], st="interface · Strategy"),
    cls("L", "LowRiskGate", ["과제: TEACH_BACK 1개", "통과: 2점 / 2점"], [], st="ConcreteStrategy", sub="합계 0~3"),
    cls("M", "MediumRiskGate", ["과제: TEACH_BACK + WHAT_IF", "통과: 3점 / 4점"], [], st="ConcreteStrategy", sub="합계 4~6"),
    cls("Hh", "HighRiskGate", ["과제: TEACH_BACK + FAULT_INJECTION + WHAT_IF", "통과: 5점 / 6점"], [], st="ConcreteStrategy", sub="합계 7~10"),
    use("RS", "GP", "등급 산정 후 selectFor()"), agg("GP", "GS", "strategy"), real("L", "GS"), real("M", "GS"), real("Hh", "GS"), "  { rank=same; GP; GS; }", "}"]
def sub(i, no, name, desc, bands=(), fill="#EEF2FB", color="#5B78B8"):
    rows = "".join(f'<TR><TD BGCOLOR="{c}"><FONT COLOR="white"><B>{t}</B></FONT></TD></TR>' for t, c in bands)
    return (f'  {i} [label=<<TABLE BORDER="2" CELLBORDER="0" CELLSPACING="4" CELLPADDING="5" COLOR="{color}" BGCOLOR="{fill}">'
            f'<TR><TD><FONT POINT-SIZE="14"><B>{no} {name}</B></FONT><BR/><FONT POINT-SIZE="10" COLOR="#526079">{desc}</FONT></TD></TR>{rows}</TABLE>>];')


OBS, STR, BRI, SIN = "#B23A48", "#6B46A8", "#3B5BA9", "#6B7890"
EXT = lambda i, t: f'  {i} [shape=box, style="rounded,filled", fillcolor="#EEEEEE", color="#8A8A8A", fontsize=12, margin="0.25,0.18", label="{t}"];'
depd = lambda a, b: f'  {b} -> {a} [style=dashed, dir=back, arrowtail=vee, color="#444444"];'   # a가 b에 의존 (b를 위에 둔다)
obs = lambda a, b, lab="": f'  {a} -> {b} [style=dashed, arrowhead=vee, color="{OBS}", fontcolor="{OBS}", label="{lab}", constraint=false];'
F["fig2_1_placement"] = ['digraph G {', f'  graph [fontname="{FN}", pad=0.25, nodesep=0.6, ranksep=0.55, compound=true, newrank=true];',
    f'  node [shape=plain, fontname="{FN}", fontsize=11];', f'  edge [fontname="{FN}", fontsize=10, arrowsize=0.9];',
    '  subgraph cluster_core { label="핵심 업무 패키지"; style=rounded; color="#9AAAD0"; fontsize=15; fontname="' + FN + '";',
    sub("P02", "02", "Work", "작업 · 결과물 · 버전", [("옵서버 · Subject", OBS)]),
    sub("P03", "03", "Review", "위험 평가 · 검토", [("전략 · GatePolicy", STR), ("옵서버 · 재검토 Observer", OBS)]),
    sub("P04", "04", "Approval", "승인 · 반려 · 철회"),
    sub("P05", "05", "Certificate", "증명서 · 링크 · QR", [("옵서버 · 발급 Observer", OBS)]),
    sub("P06", "06", "Verification", "서명 · 해시 · 효력"), "  }",
    '  subgraph cluster_sup { label="공통 지원 패키지"; style=rounded; color="#8FBF9F"; fontsize=15; fontname="' + FN + '";',
    sub("P07", "07", "Audit", "이력 · 알림", [("옵서버 · 이력/알림 Observer", OBS)], "#EEF6EF", "#5A9E72"),
    sub("P01", "01", "Auth", "권한 · 멤버십", (), "#EEF6EF", "#5A9E72"),
    sub("P08", "08", "Persistence", "저장 계약 · DB/파일 구현", [("브리지 · Repository ↔ IPersistence", BRI), ("싱글톤 · 커넥션 풀", SIN)], "#EEF6EF", "#5A9E72"), "  }",
    f'  BOOT [label=<<TABLE BORDER="2" CELLBORDER="0" CELLSPACING="4" CELLPADDING="5" COLOR="#C9982A" BGCOLOR="#FFF6DC"><TR><TD><FONT POINT-SIZE="14"><B>서버 조립 지점</B></FONT><BR/><FONT POINT-SIZE="10" COLOR="#526079">bootstrap / 설정<BR/>옵서버 등록 · 저장소 구현 선택</FONT></TD></TR></TABLE>>];',
    EXT("CH", "알림 채널\n(이메일 · 브라우저)"), EXT("FSX", "파일 저장소"), EXT("DBX", "관계형 DB"),
    depd("P03", "P02"), depd("P04", "P02"), depd("P04", "P03"), depd("P05", "P04"), depd("P06", "P05"),
    '  P02 -> P03 -> P04 -> P05 -> P06 [style=invis];',
    obs("P02", "P07"), obs("P02", "P05"), obs("P02", "P03", "  상태 변경 통지"),
    '  P07 -> CH [color="#444444"];', '  P08 -> FSX [color="#444444"];', '  P08 -> DBX [color="#444444"];',
    '  BOOT -> P07 [style=dotted, color="#A8742A", fontcolor="#A8742A", label="옵서버 등록"];', '  BOOT -> P08 [style=dotted, color="#A8742A", fontcolor="#A8742A", label="저장소 구현 선택"];',
    '  { rank=same; P02; BOOT; }', '  { rank=same; P03; P07; P01; }', '  { rank=same; P05; P08; }', '  P07 -> P08 [style=invis]; P01 -> P08 [style=invis];', "}"]

for n, g in F.items():
    base = os.path.join(out, n)
    open(base + ".dot", "w", encoding="utf-8").write("\n".join(g))
    subprocess.run(["dot", "-Tpng", "-Gdpi=170", base + ".dot", "-o", base + ".png"], check=True)
    os.remove(base + ".dot")
print("ok", len(F))
