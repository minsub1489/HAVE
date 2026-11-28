"""HAVE 통합 클래스 다이어그램 v3 — 1116 `HAVE_클래스다이어그램_패턴적용_v2.png`를 그대로 두고
(1) 수정된 클래스에 빨간 상자와 번호를 표시하고 (2) 수정 내용을 UML 클래스 표기 패널로 덧붙인다. 1118.
1123: 오퍼레이션 명명 규칙(is·get·set)에 따라 이름이 바뀐 오퍼레이션은 그림 안의 글자도 새 이름(빨간색)으로 바꿔 넣는다(PATCH).
1123 패턴 정리: 어댑터·추상 팩토리 패턴을 적용하지 않기로 해 "인프라 구성" 영역을 다시 그려 덮고(REGION), 범례 숫자를 고치고, 패널 ④를 덧붙인다.
실행: python3 gen_class_v3.py <v2.png 경로> <출력 폴더>"""
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
src, out = sys.argv[1], sys.argv[2]
RED = "#C8102E"
FN = "Noto Sans CJK KR"
FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"


def cls(i, name, attrs, ops=(), stereo="", sub="", new=False, ref=False, num=None):
    """UML 클래스 상자(이름 / 속성 / 오퍼레이션 3칸). '§'로 시작하는 줄 = 1118 추가, '¤' = 1118 변경,
    '※새 줄|옛 이름' = 1123 이름 변경 (UML 가시성 기호 + - # 와 구분)."""
    border = RED if new else ("#8A96AD" if ref else "#34425E")
    head = "#FDE7EA" if new else ("#F1F3F6" if ref else "#EAF0FB")
    st = f'<FONT POINT-SIZE="9">«{stereo}»</FONT><BR/>' if stereo else ""
    sb = f'<BR/><FONT POINT-SIZE="9" COLOR="#526079">{sub}</FONT>' if sub else ""
    nm = f'<FONT COLOR="{RED}"><B>{name}</B></FONT>' if new else f"<B>{name}</B>"
    tag = f'  <FONT COLOR="{RED}" POINT-SIZE="10"><B>({num})</B></FONT>' if num else ""

    def body(lines):
        if not lines:
            return " "
        o = []
        for l in lines:
            if l.startswith("§"):
                o.append(f'<FONT COLOR="{RED}"><B>{l[1:]}</B>  [추가]</FONT>')
            elif l.startswith("¤"):
                o.append(f'<FONT COLOR="{RED}"><B>{l[1:]}</B>  [변경]</FONT>')
            elif l.startswith("※"):
                new_, old_ = l[1:].split("|")
                o.append(f'<FONT COLOR="{RED}"><B>{new_}</B>  [이름 변경 ← {old_}]</FONT>')
            elif new:
                o.append(f'<FONT COLOR="{RED}">{l}</FONT>')
            else:
                o.append(l)
        return '<BR ALIGN="LEFT"/>'.join(o) + '<BR ALIGN="LEFT"/>'
    style = ' STYLE="DASHED"' if ref else ""
    return (f'  {i} [label=<<TABLE BORDER="{2 if new else 1}" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5" COLOR="{border}"{style}>'
            f'<TR><TD BGCOLOR="{head}">{st}{nm}{tag}{sb}</TD></TR><TR><TD ALIGN="LEFT" BALIGN="LEFT">{body(attrs)}</TD></TR>'
            f'<TR><TD ALIGN="LEFT" BALIGN="LEFT">{body(ops)}</TD></TR></TABLE>>];')


def render(name, lines, dpi=150):
    base = os.path.join(out, name)
    open(base + ".dot", "w", encoding="utf-8").write("\n".join(lines))
    subprocess.run(["dot", "-Tpng", f"-Gdpi={dpi}", base + ".dot", "-o", base + ".png"], check=True)
    return Image.open(base + ".png").convert("RGB")


HEAD = ['digraph G {', f'  graph [fontname="{FN}", pad=0.2, nodesep=0.35, ranksep=0.55];',
        f'  node [shape=plain, fontname="{FN}", fontsize=10];', f'  edge [fontname="{FN}", fontsize=9, color="#34425E", arrowsize=0.8];']

# ── A. 기존 클래스: 속성 추가·변경 ──
A = HEAD + [
    cls("User", "User", ["- userId: ID", "- name: String", "§- email: String / passwordHash: String"], [], sub="사용자", num=1),
    cls("Work", "Work", ["- workId: ID / title: String", "- /currentVersion: WorkVersion?", "§- aiDisclosureDraft: AiDisclosure?"], ["+ registerVersion(): WorkVersion"], sub="작업", num=2),
    cls("WorkVersion", "WorkVersion", ["- versionId: ID / versionNo: Integer", "- fileHash: SHA256 / fileUri: URI", "- createdAt: Instant / revision: Integer", "§- status: WorkStatus", "§- changeReason: String?"], ["※+ freeze() / isSuperseded(): Boolean|hasSuccessor"], sub="결과물 버전", num=3),
    cls("RiskAssessment", "RiskAssessment", ["- assessmentId: ID / scores[4]", "- total / level / policyVersion", "§- rationale: String"], [], stereo="value object", sub="위험도 평가 사본", num=4),
    cls("ReviewRequest", "ReviewRequest", ["- requestId: ID / state: RequestState", "- requestedAt: Instant", "§- message: String? / dueDate: Date?"], ["※+ requestReview() / cancelRequest()|request() · cancel()"], sub="검토 요청", num=5),
    cls("ChallengeResponse", "ChallengeResponse", ["- responseId: ID / answer: String", "- submittedAt: Instant?", "§- confidence: ConfidenceLevel?"], ["+ submit(answer)"], sub="과제 답변", num=6),
    cls("Revision", "Revision", ["- revisionId: ID / state: RevisionState", "- draftFiles / changeNote / response", "§- dueDate: Date"], ["※+ startRevision() / setDraft()|updateDraft", "+ beginValidation() / isValid(): Boolean", "※+ resubmit() / setSubmitted()|markSubmitted", "+ validationFailed() / submissionFailed()"], sub="수정 초안 회차", num=9),
    cls("ApprovalCase", "ApprovalCase", ["- caseId: ID / state: DecisionState", "- rejectionReason? / decidedAt?", "§- decisionKey: String?  {유일 · 멱등성 키}"], ["+ approve(actor): Approval", "+ reject(actor, reason)"], sub="최종 결정 대상", num=10),
    cls("Revocation", "Revocation", ["- revocationId: ID / actorId: ID", "- reason: String / revokedAt: Instant", "§- requestKey: String  {유일 · 멱등성 키}"], [], sub="철회 기록", num=11),
    cls("AuditEvent", "AuditEvent", ["¤- eventId: ID / actorId: ID? / action", "- versionId? / occurredAt / reason?", "- prevHash / eventHash"], [], sub="업무·승인 감사 이력 · 공개 검증은 행위자 없음", num=12),
    cls("VerificationResult", "VerificationResult", ["- resultId: ID / checkedAt: Instant", "- signature: PASS / FAIL / UNKNOWN", "¤- effect: VALID / REVOKED / UNKNOWN", "§- latestVersionNo: Integer", "- file: MATCH / DIFFERENT / NOT_CHECKED"], [], sub="검증 결과", num=13),
    cls("GatePolicy", "GatePolicy", ["- strategy: GateStrategy", "§- policyVersion: String", "§- mediumMinTotal: Integer = 4", "§- highMinTotal: Integer = 7"], ["+ selectFor(risk: RiskAssessment)", "+ assignTasks(risk) / judge(rs)"], stereo="Context", sub="검토 Gate 정책 · 03 Review", num=14),
    cls("LowRiskGate", "LowRiskGate", ["¤과제: TEACH_BACK 1개", "¤통과: 2점 / 2점"], ["+ createTasks(risk) / judge(rs)"], stereo="ConcreteStrategy", sub="저위험 (합계 0~3)", num=15),
    cls("MediumRiskGate", "MediumRiskGate", ["¤과제: TEACH_BACK + WHAT_IF", "¤통과: 3점 / 4점"], ["+ createTasks(risk) / judge(rs)"], stereo="ConcreteStrategy", sub="중위험 (합계 4~6)", num=15),
    cls("HighRiskGate", "HighRiskGate", ["¤과제: TEACH_BACK + FAULT_INJECTION + WHAT_IF", "¤통과: 5점 / 6점 · 치명 오류 없음"], ["+ createTasks(risk) / judge(rs)"], stereo="ConcreteStrategy", sub="고위험 (합계 7~10)", num=15),
    cls("WorkMember", "WorkMember", ["- roles: Set‹MemberRole›"], ["※+ isAllowed(action): Boolean|can"], sub="작업별 참여 권한", num=18),
    cls("AiDisclosure", "AiDisclosure", ["- usageScope: String / noAiUsed: Boolean"], ["※+ getCanonicalHash(): SHA256|canonicalHash"], stereo="value object", sub="AI 사용 신고 사본", num=19),
    cls("Certificate", "Certificate", ["(속성은 v2와 같음)"], ["※+ getPublicSummary(): PublicSummary|publicSummary"], sub="승인 증명서", num=20),
    cls("WSS", "WorkStatusSubject", ["- lastChange: StatusChange"], ["※+ setWorkStatus(workId, status)|updateWorkStatus", "+ getState(): StatusChange"], stereo="ConcreteSubject", sub="작업 상태 주체 · 02 Work", num=21),
    "  { rank=same; User; Work; WorkVersion; RiskAssessment; ReviewRequest; ChallengeResponse; Revision; }",
    "  { rank=same; WorkMember; AiDisclosure; Certificate; WSS; }",
    "  ApprovalCase -> WorkMember [style=invis]; Revocation -> AiDisclosure [style=invis]; AuditEvent -> Certificate [style=invis]; VerificationResult -> WSS [style=invis];",
    "  WorkMember -> AiDisclosure -> Certificate -> WSS [style=invis];",
    "  { rank=same; ApprovalCase; Revocation; AuditEvent; VerificationResult; GatePolicy; LowRiskGate; MediumRiskGate; HighRiskGate; }",
    "  User -> ApprovalCase [style=invis]; Work -> Revocation [style=invis]; WorkVersion -> AuditEvent [style=invis]; RiskAssessment -> VerificationResult [style=invis];",
    "  ReviewRequest -> GatePolicy [style=invis]; ChallengeResponse -> LowRiskGate [style=invis]; Revision -> HighRiskGate [style=invis];",
    "  User -> Work -> WorkVersion -> RiskAssessment -> ReviewRequest -> ChallengeResponse -> Revision [style=invis];",
    "  ApprovalCase -> Revocation -> AuditEvent -> VerificationResult -> GatePolicy -> LowRiskGate -> MediumRiskGate -> HighRiskGate [style=invis];", "}"]

# ── B. 새 클래스와 관계 ──
asso = lambda a, b, lab, tl, hl, extra="": f'  {a} -> {b} [label="{lab}", taillabel="{tl}", headlabel="{hl}", labeldistance=1.6, arrowhead=none{extra}];'
LR = HEAD + ['  rankdir=LR;']
B1 = LR + [
    cls("Review", "Review", ["- reviewId: ID / state: ReviewState", "¤- checks[4] → ReviewCheck 연관으로 표현", "- memo / reviewDigest"], ["+ startReview() / recordFeedback()", "※+ requestRevision() / submitReview()|requestChanges() · completeReview()", "※+ isPassed(policy): Boolean|passes"], sub="검토 회차 · 기존 타입", ref=True, num=7),
    cls("ReviewCheck", "ReviewCheck", ["- checked: Boolean"], [], sub="검토 회차별 체크 결과", new=True),
    cls("ChecklistItem", "ChecklistItem", ["- itemId: ID", "- criterion: String", "- required: Boolean"], [], sub="검토 체크리스트 항목", new=True),
    asso("Review", "ReviewCheck", "체크 결과", "1", "4", f', arrowtail=diamond, dir=both, color="{RED}"'),
    asso("ReviewCheck", "ChecklistItem", "기준", "0..*", "1", f', color="{RED}"'), "}"]
B2 = LR + [
    cls("Feedback", "Feedback", ["- evaluationSummary / comment: String", "- decision: ReviewDecision"], [], sub="검토 의견·판정 · 기존 타입", ref=True, num=8),
    cls("FeedbackItem", "FeedbackItem", ["- itemId: ID", "- targetSection: String", "- content: String"], [], sub="보완 요청 항목", new=True),
    cls("FeedbackResponse", "FeedbackResponse", ["- applied: Boolean", "- response: String", "- respondedAt: Instant"], [], sub="작성자의 반영 답변", new=True),
    cls("RevisionR", "Revision", ["(속성은 ①의 (9))"], [], sub="수정 초안 회차 · 기존 타입", ref=True),
    asso("Feedback", "FeedbackItem", "보완 요청 항목", "1", "0..*", f', arrowtail=diamond, dir=both, color="{RED}"'),
    asso("FeedbackItem", "FeedbackResponse", "반영 답변", "1", "0..1", f', color="{RED}"'),
    asso("RevisionR", "FeedbackResponse", "재제출 시 제출", "1", "0..*", f', color="{RED}"'), "}"]
B3 = LR + [
    cls("Notification", "Notification", ["- notificationId: ID", "- type: NotificationType", "- createdAt: Instant", "- readAt: Instant?"], ["+ setRead()"], sub="알림함 항목 · 07 Audit", new=True),
    cls("UserR", "User", ["(속성은 ①의 (1))"], [], sub="기존 타입", ref=True),
    cls("WorkVersionR", "WorkVersion", ["(속성은 ①의 (3))"], [], sub="기존 타입", ref=True),
    asso("Notification", "UserR", "수신자", "0..*", "1", f', color="{RED}"'),
    asso("Notification", "WorkVersionR", "대상 버전", "0..*", "1", f', color="{RED}"'), "}"]
B4 = LR + [
    cls("WSO", "WorkStatusObserver", [], ["+ update(s: WorkStatusSubject)"], stereo="interface", sub="상태 옵서버 · 기존(패턴) 타입", ref=True, num=17),
    cls("ReReviewObserver", "ReReviewObserver", [], ["+ update(s): 재제출이면 새 버전에", "   검토 요청·위험 평가·과제 사본 연결", "   (근거 그대로면 답변도 사본,", "    바뀌면 답변은 참고로만)"], stereo="ConcreteObserver", sub="재검토 연결 · 03 Review", new=True),
    cls("ReviewRequestR", "ReviewRequest", ["(속성은 ①의 (5))"], [], sub="기존 타입", ref=True),
    f'  ReReviewObserver -> WSO [style=dashed, arrowhead=empty, color="{RED}"];',
    f'  ReReviewObserver -> ReviewRequestR [style=dashed, arrowhead=vee, label="«create»", color="{RED}"];', "}"]
B5 = LR + [
    cls("Repo", "Repository‹T›", ["# impl: IPersistence"], ["+ save(entity: T)", "※+ getById(id): T|findById"], stereo="브리지 · Abstraction", sub="기존(패턴) 타입 · 하위 계약 목록은 (16)", ref=True, num=22),
    cls("UserRepository", "UserRepository", [], ["+ getByEmail(email): User", "+ getMembers(workId): List‹WorkMember›"], stereo="RefinedAbstraction", sub="01 Auth용 저장 계약", new=True),
    cls("WorkRepository", "WorkRepository", [], ["+ getByMember(userId, filter): List‹Work›", "+ getVersion(versionId): WorkVersion"], stereo="RefinedAbstraction", sub="02 Work용 저장 계약", new=True),
    cls("IPers", "IPersistence", [], ["+ save(entity)", "※+ getById(type, id)|findById", "※+ getByCondition(type, condition)|findBy"], stereo="interface", sub="범용 저장 연산 · 기존 타입", ref=True, num=23),
    cls("Jdbc", "JdbcPersistence", [], ["※+ save / getById / getByCondition|findById · findBy"], stereo="브리지 · ConcreteImplementor", sub="관계형 DB 구현 · 기존(패턴) 타입", ref=True, num=24),
    f'  UserRepository -> Repo [arrowhead=empty, color="{RED}"];', f'  WorkRepository -> Repo [arrowhead=empty, color="{RED}"];',
    '  Repo -> IPers [arrowtail=odiamond, dir=both, arrowhead=vee, label="impl"];', '  Jdbc -> IPers [style=dashed, arrowhead=empty];', "}"]


def enum(i, name, vals, chg=False):
    rows = '<BR ALIGN="LEFT"/>'.join(vals) + '<BR ALIGN="LEFT"/>'
    return (f'  {i} [label=<<TABLE BORDER="2" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5" COLOR="{RED}"><TR><TD BGCOLOR="#FDE7EA"><FONT POINT-SIZE="9">«enumeration»</FONT><BR/>'
            f'<FONT COLOR="{RED}"><B>{name}</B></FONT></TD></TR><TR><TD ALIGN="LEFT" BALIGN="LEFT"><FONT COLOR="{RED}">{rows}</FONT></TD></TR></TABLE>>];')


C = HEAD + [
    enum("e1", "WorkStatus", ["DRAFT", "SUBMITTED", "CHALLENGE_PENDING", "REVIEW_PENDING", "IN_REVIEW", "REVISION_REQUIRED", "APPROVAL_PENDING", "APPROVED"]),
    enum("e2", "RequestState", ["REQUESTED", "IN_REVIEW", "CLOSED", "CANCELED"]),
    enum("e3", "ReviewState", ["IN_PROGRESS", "COMPLETED", "HALTED"]),
    enum("e4", "ReviewDecision", ["PASS", "REVISION_REQUIRED"]),
    enum("e5", "RevisionState", ["OPEN", "IN_PROGRESS", "SUBMITTED", "EXPIRED"]),
    enum("e6", "ConfidenceLevel", ["LOW", "MEDIUM", "HIGH"]),
    enum("e7", "EvidenceType", ["WEB_SOURCE", "REFERENCE", "PROMPT_LOG", "SUPPORT_FILE"]),
    enum("e8", "NotificationType", ["REVIEW_REQUESTED · REQUEST_CANCELED", "ANSWERS_SUBMITTED · REVISION_REQUESTED", "RESUBMITTED · REVIEW_PASSED", "APPROVED · REJECTED", "CERTIFICATE_ISSUED · APPROVAL_REVOKED"]),
    "  { rank=same; e1; e2; e3; e4; e5; e6; e7; e8; }", "  e1 -> e2 -> e3 -> e4 -> e5 -> e6 -> e7 -> e8 [style=invis];", "}"]


# ── D. 1123 패턴 정리: 삭제·이름 변경 ──
def gone(i, name, st, why):
    return (f'  {i} [label=<<TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5" COLOR="#8A96AD" STYLE="DASHED">'
            f'<TR><TD BGCOLOR="#F1F3F6"><FONT POINT-SIZE="9" COLOR="#7A8499">«{st}»</FONT><BR/><FONT COLOR="#7A8499"><S><B>{name}</B></S></FONT><BR/>'
            f'<FONT POINT-SIZE="9" COLOR="{RED}"><B>삭제</B> — {why}</FONT></TD></TR></TABLE>>];')


D = HEAD + [
    cls("Boot", "HaveServerBootstrap", [], ["¤+ start(profile): 옵서버 4종 등록 · 저장소 구현(JDBC / Stub) 선택"], stereo="서버 조립 지점 ← 추상 팩토리 · Client", sub="서버 조립 지점 · 역할 변경", num=25),
    cls("SFS", "StorageFileStore", ["- storage: IStorageAPI / bucket"], ["+ put / get / delete"], stereo="FileStore 구현 ← 어댑터 · Adapter", sub="[이름 변경 ← StorageFileStoreAdapter] · 외부 파일 저장소에 저장", num=26),
    gone("g1", "InfrastructureFactory", "추상 팩토리 · AbstractFactory", "추상 팩토리 미적용"),
    gone("g2", "ProductionInfraFactory", "추상 팩토리 · ConcreteFactory", "추상 팩토리 미적용"),
    gone("g3", "LocalStubInfraFactory", "추상 팩토리 · ConcreteFactory", "추상 팩토리 미적용"),
    gone("g4", "EmailNotifyChannel", "추상 팩토리 · ConcreteProduct", "발송은 07 NotificationGateway가 맡음"),
    gone("g5", "ConsoleNotifyChannel", "추상 팩토리 · ConcreteProduct", "테스트 묶음 전용"),
    gone("g6", "InMemoryFileStore", "어댑터 계약 구현 · 테스트 제품", "테스트 묶음 전용"),
    "  { rank=same; Boot; SFS; g1; g2; g3; }", "  { rank=same; g4; g5; g6; }",
    "  Boot -> SFS -> g1 -> g2 -> g3 [style=invis];", "  g4 -> g5 -> g6 [style=invis];", "  Boot -> g4 [style=invis];", "}"]

# ── 인프라 구성 영역 (다시 그림) ──
def tagged(k, node):
    assert node.endswith(">];"); return node[:-2] + f', URL="n{k}"];'


RL = lambda a, b, lab="", extra="": f'  {a} -> {b} [color="{RED}", fontcolor="{RED}", label="{lab}"{extra}];'
REG = ['digraph G {', f'  graph [fontname="{FN}", pad=0.15, nodesep=0.35, ranksep=0.6, bgcolor="#FFFCFC"];',
       f'  node [shape=plain, fontname="{FN}", fontsize=10];', f'  edge [fontname="{FN}", fontsize=9, color="#34425E", arrowsize=0.8];',
    tagged(25, cls("Boot", "HaveServerBootstrap", [], ["+ start(profile)"], stereo="서버 조립 지점", sub="옵서버 등록 · 저장소 구현 선택", new=True)),
    f'  BN [shape=note, style=filled, fillcolor="#FFF8E1", color="#C9B26B", fontsize=9, label=<start(profile)<BR ALIGN="LEFT"/>① profile에 따라 JdbcPersistence 또는<BR ALIGN="LEFT"/>   StubPersistence를 만들어 Repository에 넣는다<BR ALIGN="LEFT"/>② 옵서버 4종을 WorkStatusSubject에 등록한다<BR ALIGN="LEFT"/>>];',
    tagged(22, cls("Repo", "Repository‹T›", ["# impl: IPersistence"], ["+ save(entity: T)", f'<FONT COLOR="{RED}"><B>+ getById(id): T</B></FONT>'], stereo="브리지 · Abstraction", sub="기존 저장 계약의 공통 상위", new=True)),
    tagged(16, cls("RR", "ReviewRepository 외 4종", [f'<FONT COLOR="{RED}"><B>+ UserRepository · WorkRepository</B> (1118)</FONT>'], [], stereo="기존 08 저장 계약", sub="Revision · Approval · Certificate · History", ref=True)),
    tagged(23, cls("IP", "IPersistence", [], [f'+ save / <FONT COLOR="{RED}"><B>getById / getByCondition</B></FONT>'], stereo="interface · 기존 08", sub="범용 저장 연산", ref=True)),
    cls("Stub", "StubPersistence", [], [], stereo="브리지 · ConcreteImplementor", sub="메모리 Map · 점증적 통합", new=True),
    cls("Json", "JsonFilePersistence", [], [], stereo="브리지 · ConcreteImplementor", sub="시연·내보내기 (선택)", new=True),
    tagged(24, cls("Jdbc", "JdbcPersistence", [], ["<B>+ save / getById / getByCondition</B>"], stereo="브리지 · ConcreteImplementor", sub="관계형 DB 구현", new=True)),
    cls("Pool", "DatabaseConnectionPool", ["- instance: DatabaseConnectionPool {static}", "- dataSource: DataSource"], ["- DatabaseConnectionPool()", "+ getInstance() {static, synchronized}", "+ getConnection(): Connection"], stereo="싱글톤 · Singleton", sub="DB 커넥션 풀 · 08 Persistence", new=True),
    cls("FS", "FileStore", [], ["+ put(key, file) / get(key) / delete(key)"], stereo="interface · 기존 08", sub="파일 저장 계약", ref=True),
    tagged(26, cls("SFS", "StorageFileStore", ["- storage: IStorageAPI / bucket"], ["+ put / get / delete"], stereo="FileStore 구현", sub="외부 파일 저장소에 저장", new=True)),
    cls("INC", "INotifyChannel", [], ["+ send(address, subject, body)"], stereo="interface · 기존", sub="알림 채널 연계 지점<BR/>07 NotificationGateway가 사용", ref=True),
    RL("Boot", "IP", "«create» · 구현 1개 선택", ", style=dashed, arrowhead=vee"),
    '  Boot -> BN [style=dotted, arrowhead=none, constraint=false];', '  { rank=same; Boot; BN; }',
    RL("Repo", "IP", "impl", ", arrowtail=odiamond, dir=both, arrowhead=vee"),
    RL("Repo", "RR", "", ", dir=back, arrowtail=empty"),
    RL("IP", "Stub", "", ", style=dashed, dir=back, arrowtail=empty"), RL("IP", "Json", "", ", style=dashed, dir=back, arrowtail=empty"),
    RL("IP", "Jdbc", "", ", style=dashed, dir=back, arrowtail=empty, minlen=2"),
    RL("Pool", "Jdbc", "getInstance()", ", style=dashed, dir=back, arrowtail=vee, arrowhead=none"),
    RL("FS", "SFS", "", ", style=dashed, dir=back, arrowtail=empty"),
    '  { rank=same; Repo; IP; FS; }', '  { rank=same; RR; Stub; Json; SFS; }', '  { rank=same; Pool; Jdbc; INC; }',
    '  Repo -> IP -> FS [style=invis];', '  RR -> Stub -> Json -> SFS [style=invis];', '  Pool -> Jdbc -> INC [style=invis];', '  SFS -> INC [style=invis];', '  RR -> Pool [style=invis];', "}"]
REG = [g.replace('<BR/><FONT POINT-SIZE="9" COLOR="#526079">', '<BR/><FONT POINT-SIZE="10" COLOR="#526079">') for g in REG]   # 이름과 설명 줄이 겹치지 않게
open(os.path.join(out, "_cls_R.dot"), "w", encoding="utf-8").write("\n".join(REG))
subprocess.run(["dot", "-Tpng", "-Gdpi=140", os.path.join(out, "_cls_R.dot"), "-o", os.path.join(out, "_cls_R.png")], check=True)
import re as _re
_map = subprocess.run(["dot", "-Tcmapx", "-Gdpi=140", os.path.join(out, "_cls_R.dot")], check=True, capture_output=True, text=True).stdout
RBOX = {int(k): tuple(int(float(v)) for v in c.split(",")) for k, c in _re.findall(r'href="n(\d+)"[^>]*coords="([\d.,]+)"', _map)}
preg = Image.open(os.path.join(out, "_cls_R.png")).convert("RGB")

# ── E. 1123 일관성: 순서 다이어그램의 서비스 · 화면 · 인터페이스 (가이드라인 5번) ──
def svc(i, name, ops, st="service", sub=""):
    return cls(i, name, [], ops, stereo=st, sub=sub, new=True)


def tbl(i, title, head, rows, widths=None):
    hd = "".join(f'<TD BGCOLOR="#FDE7EA"><B>{h}</B></TD>' for h in head)
    body = "".join("<TR>" + "".join(f'<TD ALIGN="LEFT" BALIGN="LEFT">{c}</TD>' for c in r) + "</TR>" for r in rows)
    return (f'  {i} [label=<<TABLE BORDER="2" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5" COLOR="{RED}">'
            f'<TR><TD COLSPAN="{len(head)}" BGCOLOR="#FDE7EA"><FONT COLOR="{RED}"><B>{title}</B></FONT></TD></TR><TR>{hd}</TR>{body}</TABLE>>];')


use = lambda a, b: f'  {a} -> {b} [style=dashed, arrowhead=vee, color="{RED}"];'
E = HEAD + [
    svc("WC", "WorkController", ["+ createWork(req): workId"], "controller", "02 Work"),
    svc("CC", "ContributionController", ["+ addContribution(versionId, req): eventId"], "controller", "02 Work"),
    svc("VC", "VersionController", ["+ uploadVersion(workId, file, reason): versionId"], "controller", "02 Work"),
    svc("EC", "EvidenceController", ["+ addWebSource(versionId, req)", "+ addSupportFile(versionId, file)"], "controller", "02 Work"),
    svc("RC", "RiskController", ["+ assessRisk(versionId, scores, rationale)"], "controller", "03 Review"),
    svc("RRC", "ReviewRequestController", ["+ requestReview(versionId, reviewerId, approverId, message, dueDate)", "+ cancelRequest(requestId, reason)"], "controller", "03 Review"),
    svc("WS", "WorkService", ["+ createWork(ownerId, req): Work", "+ getWorks(filter) / getWork(workId)", "- isValidDisclosure(d): Boolean"], sub="02 Work · IWorkAPI"),
    svc("CS", "ContributionService", ["+ addContribution(userId, versionId, req)", "- isOwnerAndEditable(): Boolean"], sub="02 Work · IWorkAPI"),
    svc("VS", "VersionService", ["+ createVersion(ownerId, workId, file)", "+ getReviewTarget(versionId) / getVersionHash(versionId)", "- isValidFile(): Boolean / getSha256(stream)"], sub="02 Work · IWorkAPI · IWorkVersion"),
    svc("ES", "EvidenceService", ["+ addWebSource(versionId, req)", "+ addSupportFile(versionId, file)", "- isValidUrl(url): Boolean"], sub="02 Work · IWorkAPI"),
    svc("RVS", "RevisionService", ["+ resubmit(workId, file, responses, basis)", "- isAllResolved(): Boolean", "- isBasisChanged(base, next): Boolean"], sub="02 Work · IWorkAPI"),
    svc("RS", "RiskService", ["+ assessRisk(versionId, scores, rationale)"], sub="03 Review · IReviewAPI"),
    svc("RRS", "ReviewRequestService", ["+ requestReview(versionId, reviewerId, approverId, message, dueDate)", "+ cancelRequest(requestId, reason)", "+ getChallenges(requestId)", "+ saveAnswers(requestId, answers) / submitAnswers(requestId, answers)"], sub="03 Review · IReviewAPI"),
    svc("RVW", "ReviewService", ["+ getAssignedRequests(reviewerId) / startReview(requestId)", "+ saveReviewDraft(requestId, form) / submitReview(requestId, form)", "+ requestRevision(requestId, feedbacks, dueDate)", "+ getConfirmedResult(versionId) / isPassed(versionId)"], sub="03 Review · IReviewAPI · IReviewResult"),
    svc("APS", "ApprovalService", ["+ getApprovalCase(versionId)", "+ approve(caseId, key) / reject(caseId, reason, key)", "+ revoke(approvalId, reason, key)", "+ getApprovalResult(approvalId) / getCurrentValidity(approvalId)", "+ getPendingIssues()"], sub="04 Approval · IApprovalAPI · IApprovalStatus"),
    svc("CTS", "CertificateService", ["+ getCertificate(certId) / retryIssue(certId)", "+ createShareLink(certId, expiresAt) / createQRCode(certId)", "+ disableShareLink(linkId)", "+ getCertificateData(certId) / getSignature(certId)"], sub="05 Certificate · ICertificateAPI · ICertificateData"),
    svc("VFS", "VerificationService", ["+ verify(certId, fileHash?)", "+ verifyByQR(qrPayload, fileHash?)"], sub="06 Verification · IVerificationAPI"),
    svc("ALS", "AuditLogService", ["+ record(workId, actorId, action, payload)", "- getChainHash(prev, event)"], sub="07 Audit · IAuditLog"),
    svc("HS", "HistoryService", ["+ getHistory(workId, condition)", "+ getLatestStatus(workId)", "+ isChainValid(workId): Boolean"], sub="07 Audit · IHistoryQuery"),
    svc("NG", "NotificationGateway", ["+ notify(userId, type, targetId)", "+ getNotifications(userId) / setRead(notificationId)", "- getAddress(userId) / getMessage(type, targetId)"], sub="07 Audit · INotification · INotificationQuery"),
    svc("AZ", "AuthorizationPolicy", ["+ login(credential) / logout() / getCurrentUser()", "+ isAuthorized(userId, target, action)", "+ getMemberRole(workId, userId) / addMember(workId, userId, role)"], "policy", "01 Auth · IAuthorization"),
    tbl("VW", "화면 클래스 «boundary» — 00 확장 프로그램 클라이언트 · 공개 검증 페이지 (출력 오퍼레이션은 show로 시작)", ["화면 클래스", "유스케이스", "화면 출력 (show…)", "부르는 인터페이스"], [
        ["RegisterWizardView", "UC01 · UC02 · UC03", "showStep(step)", "IWorkAPI, IReviewAPI"], ["GateAnswerView", "UC03 (이해 확인)", "showChallenge(work)", "IReviewAPI"],
        ["ReviewPanelView", "UC04", "showReviewForm(version)", "IReviewAPI"], ["RevisionView", "UC05", "showRevise(work)", "IWorkAPI"],
        ["ApprovalView", "UC06", "showApprovalForm(version)<BR ALIGN=\"LEFT\"/>showConditions(conditions)", "IApprovalAPI"],
        ["WorkDetailView", "UC07 · UC09 · UC10", "showDetail(work) · showCertificate(work)<BR ALIGN=\"LEFT\"/>showHistory(work)", "ICertificateAPI, IHistoryQuery,<BR ALIGN=\"LEFT\"/>IApprovalAPI"],
        ["WorkListView", "UC09", "showWorkList()", "IWorkAPI, IHistoryQuery"], ["NotificationView", "UC09 (알림 목록)", "showNotifications()", "INotificationQuery"],
        ["PopupView", "공통 (바로가기)", "showPopup(state)", "IWorkAPI"], ["VerifyPage · FileHasher", "UC08", "showVerify(token) · getSha256(file)", "IVerificationAPI"]]),
    tbl("IF", "인터페이스 17종과 실현(구현) 클래스 — 오퍼레이션은 컴포넌트 다이어그램 v2의 표와 같다", ["«interface»", "실현 클래스", "«interface»", "실현 클래스"], [
        ["IWorkAPI", "WorkService 외 02의 서비스 5종", "IWorkVersion", "VersionService, WorkStatusSubject(setWorkStatus)"],
        ["WorkStatusObserver", "AuditLogObserver 외 옵서버 4종", "IReviewAPI", "RiskService, ReviewRequestService, ReviewService"],
        ["IReviewResult", "ReviewService", "IApprovalAPI · IApprovalStatus", "ApprovalService"],
        ["ICertificateAPI · ICertificateData", "CertificateService", "IVerificationAPI", "VerificationService"],
        ["IAuthorization", "AuthorizationPolicy", "IAuditLog", "AuditLogService"],
        ["INotification · INotificationQuery", "NotificationGateway", "IHistoryQuery", "HistoryService"],
        ["IPersistence", "JdbcPersistence, StubPersistence,<BR ALIGN=\"LEFT\"/>JsonFilePersistence", "FileStore", "StorageFileStore"]]),
    use("WC", "WS"), use("CC", "CS"), use("VC", "VS"), use("EC", "ES"), use("RC", "RS"), use("RRC", "RRS"),
    "  { rank=same; WC; CC; VC; EC; RC; RRC; }", "  { rank=same; WS; CS; VS; ES; RS; RRS; }", "  { rank=same; RVS; RVW; APS; CTS; }", "  { rank=same; VFS; ALS; HS; NG; AZ; }", "  { rank=same; VW; IF; }",
    "  WC -> CC -> VC -> EC -> RC -> RRC [style=invis];", "  WS -> CS -> VS -> ES -> RS -> RRS [style=invis];", "  RVS -> RVW -> APS -> CTS [style=invis];", "  VFS -> ALS -> HS -> NG -> AZ [style=invis];", "  VW -> IF [style=invis];",
    "  WS -> RVS [style=invis]; VS -> RVW [style=invis]; ES -> APS [style=invis]; RRS -> CTS [style=invis];",
    "  RVS -> VFS [style=invis]; RVW -> ALS [style=invis]; APS -> NG [style=invis]; CTS -> AZ [style=invis];",
    "  VFS -> VW [style=invis]; NG -> IF [style=invis];", "}"]

pa, pc, pd_ = render("_cls_A", A), render("_cls_C", C), render("_cls_D", D)
pe = render("_cls_E", E)
assert pe.width <= 5230, pe.size
pbs = [render(f"_cls_B{k+1}", g) for k, g in enumerate((B1, B2, B3, B4, B5))]

# ── 합성 ──
v2 = Image.open(src).convert("RGB")
W, H0 = v2.size
fb = lambda s: ImageFont.truetype(FONT_B, s, index=1)
fr = lambda s: ImageFont.truetype(FONT_R, s, index=1)
M, GAP, TITLE, sub_h = 70, 90, 296, 78
row1 = pbs[0:3]
row2 = pbs[3:5]
r1h, r2h = max(i.height for i in row1), max(i.height for i in row2)
panel_h = TITLE + sub_h + pa.height + GAP + sub_h + r1h + GAP + r2h + GAP + sub_h + pc.height + GAP + sub_h + pd_.height + GAP + sub_h + pe.height + 80
canvas = Image.new("RGB", (W, H0 + panel_h + 40), "white")
canvas.paste(v2, (0, 0))
d = ImageDraw.Draw(canvas)
REDT = (200, 16, 46)

INK_ = (23, 32, 51)
BOX = {1: (170, 345, 400, 505), 2: (905, 362, 1215, 538), 3: (1665, 738, 2135, 942), 4: (2908, 769, 3272, 931), 5: (3282, 357, 3618, 533),
       6: (4136, 757, 4445, 933), 7: (3455, 1100, 3826, 1330), 8: (4100, 1540, 4480, 1700), 9: (2716, 1371, 3094, 1629), 10: (1955, 1944, 2265, 2160),
       11: (2350, 2879, 2689, 3042), 12: (121, 1086, 449, 1274), 13: (912, 3243, 1310, 3468), 14: (4820, 341, 5140, 540), 15: (4886, 1015, 5177, 1586),
       17: (688, 1981, 992, 2143),
       # 1123: 오퍼레이션 이름이 바뀐 클래스
       18: (156, 690, 414, 840), 19: (1107, 741, 1494, 890), 20: (1690, 2840, 2069, 3070), 21: (1138, 1567, 1482, 1764),
       }

# ── 1123 패턴 정리: "인프라 구성" 영역을 다시 그린 그림으로 덮는다 ──
RX1, RY1, RX2, RY2 = 2860, 1930, 4790, 3540          # v2 그림의 영역 테두리(바깥)
d.rounded_rectangle((RX1, RY1, RX2, RY2), radius=26, fill=(255, 252, 252), outline=(232, 120, 135), width=3)
rt = "인프라 구성 | 브리지 · 싱글톤 패턴 (추가)   ※ 1123 패턴 정리 — 어댑터 · 추상 팩토리 미적용, 영역을 다시 그림"
d.text(((RX1 + RX2) / 2, RY1 + 44), rt, font=fb(27), fill=REDT, anchor="mm")
assert preg.width <= RX2 - RX1 - 60 and preg.height <= RY2 - RY1 - 110, preg.size
ox, oy = RX1 + (RX2 - RX1 - preg.width) // 2, RY1 + 80 + (RY2 - RY1 - 100 - preg.height) // 2
canvas.paste(preg, (ox, oy))
for k, (x1, y1, x2, y2) in RBOX.items():
    BOX[k] = (ox + x1 + 4, oy + y1 + 4, ox + x2 - 4, oy + y2 - 4)
# 범례: 클래스 수
d.rectangle((4940, 2026, 5120, 2058), fill=(255, 251, 251))
d.text((4946, 2042), "클래스 (18개)", font=fb(19), fill=REDT, anchor="lm")
d.rectangle((4858, 2606, 5330, 2880), fill=(255, 251, 251))
d.text((4866, 2625), "패턴별 추가 클래스 (1123 정리)", font=fb(20), fill=INK_, anchor="lm")
ly = 2662
for nm, cnt in [("옵서버", 7), ("전략", 4), ("브리지", 4), ("싱글톤", 1), ("서버 조립 · 파일 저장 구현", 2)]:
    d.text((4874, ly), nm, font=fr(18), fill=INK_, anchor="lm"); d.text((5210, ly), str(cnt), font=fb(18), fill=REDT, anchor="mm"); ly += 30
d.line((4866, ly - 8, 5230, ly - 8), fill=(170, 170, 170), width=1)
d.text((4874, ly + 14), "합계", font=fb(18), fill=INK_, anchor="lm"); d.text((5210, ly + 14), "18", font=fb(18), fill=REDT, anchor="mm")
for i_, t_ in enumerate(["2026-11-23 패턴 정리", "어댑터 · 추상 팩토리 패턴을 적용하지", "않기로 해 6개 클래스를 삭제했다", "(24개 → 18개). 삭제한 클래스와", "이름 변경은 아래 패널 ④ 참조."]):
    d.text((4866, 3080 + i_ * 30), t_, font=fb(19) if i_ == 0 else fr(18), fill=REDT, anchor="lm")

# 위쪽 제목 아래의 원본 문구 "…추가된 클래스 24개와 관계"를 18개로 고친다
d.rectangle((2380, 150, 3020, 194), fill="white")
d.text((2700, 171), "빨간색 = 디자인 패턴 적용으로 추가된 클래스 18개와 관계 (1123 정리)", font=fb(27), fill=REDT, anchor="mm")


# ── 1123: 그림 안의 옛 오퍼레이션 이름을 새 이름으로 바꿔 넣는다 ──
# (지울 영역 x1, y1, x2, y2 = 옛 글자 줄, 글자가 넘으면 안 되는 오른쪽 한계, [(글자, 바뀐 부분인가)])
PATCH = [
    ((175, 814, 359, 832), 406, [("+ ", 0), ("isAllowed(action)", 1), (": Boolean", 0)]),                 # WorkMember.can
    ((1125, 864, 1346, 882), 1486, [("+ ", 0), ("getCanonicalHash()", 1), (": SHA256", 0)]),             # AiDisclosure.canonicalHash
    ((1684, 916, 1977, 934), 2127, [("+ freeze() / ", 0), ("isSuperseded()", 1), (": Boolean", 0)]),     # WorkVersion.hasSuccessor
    ((3473, 1304, 3682, 1323), 3818, [("+ ", 0), ("isPassed(policy)", 1), (": Boolean", 0)]),            # Review.passes
    ((2735, 1522, 2995, 1540), 3086, [("+ startRevision() / ", 0), ("setDraft()", 1)]),                  # Revision.updateDraft
    ((2735, 1576, 2992, 1594), 3086, [("+ resubmit() / ", 0), ("setSubmitted()", 1)]),                   # Revision.markSubmitted
    ((1709, 3044, 2011, 3063), 2061, [("+ ", 0), ("getPublicSummary()", 1), (": PublicSummary", 0)]),    # Certificate.publicSummary
    ((1157, 1711, 1454, 1730), 1474, [("+ ", 0), ("setWorkStatus(workId, status)", 1)]),                 # WorkStatusSubject.updateWorkStatus
    # 1123 일관성: 상태 다이어그램의 전이 이름과 맞춘다
    ((3299, 506, 3472, 526), 3610, [("+ ", 0), ("requestReview()", 1), (" / ", 0), ("cancelRequest()", 1)]),   # ReviewRequest.request · cancel
    ((3473, 1277, 3800, 1296), 3818, [("+ ", 0), ("requestRevision()", 1), (" / ", 0), ("submitReview()", 1)]),  # Review.requestChanges · completeReview
]
INK = (23, 32, 51)
BASE_SIZE = 17
while fr(BASE_SIZE + 1).getlength("+ can(action): Boolean") <= 186:   # 원본 글자 크기에 맞춘다
    BASE_SIZE += 1
for (x1, y1, x2, y2), xmax, segs in PATCH:
    d.rectangle((x1 - 3, y1 - 4, x2 + 4, y2 + 4), fill="white")
    size = BASE_SIZE
    while sum((fb(size) if red else fr(size)).getlength(t) for t, red in segs) > xmax - x1 and size > 11:
        size -= 1
    x = x1
    for t, red in segs:
        f = fb(size) if red else fr(size)
        d.text((x, (y1 + y2) / 2 - 2), t, font=f, fill=REDT if red else INK, anchor="lm")
        x += (fb(size) if red else fr(size)).getlength(t)
    assert x <= xmax + 1, (segs, x, xmax)
for k, (x1, y1, x2, y2) in BOX.items():
    m = 16
    d.rounded_rectangle((x1 - m, y1 - m, x2 + m, y2 + m), radius=14, outline=REDT, width=7)
    cx, cy, r = x1 - m, y1 - m, 30
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=REDT, outline="white", width=3)
    t = str(k)
    tw_ = d.textlength(t, font=fb(34))
    d.text((cx - tw_ / 2, cy - 25), t, font=fb(34), fill="white")
d.text((70, 22), "v3 · 2026-11-18 · 후속 단계(HCI · DB · 컴포넌트) 반영", font=fb(38), fill=REDT)
for i_, t_ in enumerate(["빨간 둥근 상자와 번호 = 수정된 클래스 → 아래 패널의 같은 번호 참조",
                         "2026-11-23 · 오퍼레이션 명명 규칙(is · get · set) 반영 — 그림 안의 빨간 굵은 글자가 바뀐 이름 (18~24번 상자 추가)",
                         "2026-11-23 · 디자인 패턴 정리 — 어댑터 · 추상 팩토리 미적용: 인프라 구성 영역을 다시 그림 (25 · 26번), 삭제한 클래스는 아래 패널 ④",
                         "2026-11-23 · 다이어그램 일관성 — Review · ReviewRequest 오퍼레이션을 상태 전이 이름과 맞춤 (5 · 7번), 서비스 · 화면 · 인터페이스는 아래 패널 ⑤"]):
    assert fr(26).getlength(t_) < 1760, t_
    d.text((70, 76 + i_ * 33), t_, font=fr(26), fill=REDT)

py = H0 + 20
d.rounded_rectangle((M - 30, py, W - M + 30, py + panel_h), radius=28, outline=REDT, width=6, fill=(255, 252, 252))
d.text((M + 10, py + 30), "후속 단계 반영 | HCI 프로토타입 · DB 설계 · 컴포넌트 설계에서 추가·변경된 내용 (1118 수정 · 1123 명명 규칙 반영)", font=fb(52), fill=REDT)
d.text((M + 10, py + 106), "빨간 글자 = 추가·변경된 속성·오퍼레이션, 빨간 테두리 = 새 클래스, 회색 점선 테두리 = 위 다이어그램에 이미 있는 타입(기존 타입). 번호는 위 다이어그램의 빨간 상자 번호와 같다.", font=fr(30), fill=(23, 32, 51))
d.text((M + 10, py + 198), "[이름 변경 ← 옛 이름] = 2026-11-23 오퍼레이션 명명 규칙 반영: 조건 체크는 is, 속성 읽기·탐색은 get, 속성 쓰기는 set으로 시작한다(강의 Ch06 23쪽 · Ch10 11쪽). 위 그림 안의 이름도 새 이름으로 바꿔 넣었다.", font=fr(30), fill=REDT)
d.text((M + 10, py + 152), "근거 — 프로토타입: 확신 정도 · 위험 분석 근거 · 요청 메시지/기한 · 피드백 항목별 답변 · 알림 목록 · 등급별 과제와 통과 기준 / DB 설계: email · status · 체크리스트 · 등급 경계 / 구조유형: 멱등성 키 / 컴포넌트: 익명 검증 이력",
       font=fr(30), fill=(23, 32, 51))
y = py + TITLE
d.text((M + 10, y), "① 기존 클래스 — 속성 추가·변경, 오퍼레이션 이름 변경 (번호 = 위 다이어그램의 빨간 상자)", font=fb(40), fill=REDT)
canvas.paste(pa, (M + 10, y + sub_h))
y += sub_h + pa.height + GAP
d.text((M + 10, y), "② 새 클래스와 관계 — ReviewCheck · ChecklistItem · FeedbackItem · FeedbackResponse · Notification · ReReviewObserver · UserRepository · WorkRepository (8개)", font=fb(40), fill=REDT)
x = M + 10
for im in row1:
    canvas.paste(im, (x, y + sub_h)); x += im.width + GAP
y += sub_h + r1h + GAP
x = M + 10
for im in row2:
    canvas.paste(im, (x, y)); x += im.width + GAP
y += r2h + GAP
d.text((M + 10, y), "③ 열거형 값 확정 (v2는 타입 이름만 있었음)", font=fb(40), fill=REDT)
canvas.paste(pc, (M + 10, y + sub_h))
y += sub_h + pc.height + GAP
d.text((M + 10, y), "④ 디자인 패턴 정리 (1123) — 어댑터 · 추상 팩토리 패턴 미적용: 삭제 6개 · 이름 변경 1개 · 역할 변경 1개 (적용 패턴은 싱글톤 · 브리지 · 옵서버 · 전략)", font=fb(40), fill=REDT)
canvas.paste(pd_, (M + 10, y + sub_h))
y += sub_h + pd_.height + GAP
d.text((M + 10, y), "⑤ 서비스 · 화면 · 인터페이스 (1123) — 순서 다이어그램의 라이프라인과 오퍼레이션. 상태 다이어그램의 전이 이름은 여기의 오퍼레이션이다 (타입은 패키지 레벨 3 · 컴포넌트 다이어그램과 같음)",
       font=fb(40), fill=REDT)
canvas.paste(pe, (M + 10, y + sub_h))
outp = os.path.join(out, "HAVE_클래스다이어그램_패턴적용_v3_수정표시.png")
canvas.save(outp, optimize=True)
for n in ("_cls_A", "_cls_C", "_cls_D", "_cls_E", "_cls_R", "_cls_B1", "_cls_B2", "_cls_B3", "_cls_B4", "_cls_B5"):
    os.remove(os.path.join(out, n + ".png")); os.remove(os.path.join(out, n + ".dot"))
print(canvas.size, pa.size, [i.size for i in pbs], pc.size)
