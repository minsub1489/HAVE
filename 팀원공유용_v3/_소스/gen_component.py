"""HAVE UML 컴포넌트 다이어그램 v2 — SVG(그림) + HTML(인터페이스 표) → PDF·PNG. 1118.
실행: python3 gen_component.py <출력 폴더>
표기: «component» 상자와 아이콘 · 제공 인터페이스 = 볼(○) · 요구 인터페이스 = 소켓(⊂) · 조립 연결"""
import sys, os, subprocess, html

out = sys.argv[1] if len(sys.argv) > 1 else "."
RED, FN = "#C8102E", "Noto Sans CJK KR"


W_, H_ = 1970, 1244
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W_}" height="{H_}" viewBox="0 0 {W_} {H_}" font-family="{FN}">',
     '<defs><marker id="open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto"><path d="M1,1 L11,6 L1,11" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs>',
     f'<rect width="{W_}" height="{H_}" fill="white"/>']
INK = "#34425E"


def e(t):
    return html.escape(t, quote=False)


def frame(x, y, w, h, label, red=False, dash=False, small=False):
    c = RED if red else "#7C89A3"
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="none" stroke="{c}" stroke-width="{2 if red else 1.4}"{" stroke-dasharray=\"7 5\"" if dash else ""}/>')
    o.append(f'<text x="{x+14}" y="{y+(18 if small else 21)}" font-size="{12.5 if small else 14}" font-weight="700" fill="{c}">{e(label)}</text>')


def comp(x, y, w, h, name, lines, fill="#EAF0FB", red=False, stereo="component"):
    c = RED if red else INK
    o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{c}" stroke-width="{2 if red else 1.5}"/>')
    ix, iy = x + w - 30, y + 9  # UML 컴포넌트 아이콘
    o.append(f'<g fill="white" stroke="{c}" stroke-width="1.2"><rect x="{ix}" y="{iy}" width="18" height="14"/><rect x="{ix-5}" y="{iy+2.5}" width="10" height="3.5"/><rect x="{ix-5}" y="{iy+8}" width="10" height="3.5"/></g>')
    o.append(f'<text x="{x+w/2}" y="{y+19}" text-anchor="middle" font-size="11" fill="{c}">«{stereo}»</text>')
    o.append(f'<text x="{x+w/2}" y="{y+38}" text-anchor="middle" font-size="14.5" font-weight="700" fill="{c}">{e(name)}</text>')
    for k, l in enumerate(lines):
        col = RED if l.startswith("+") else "#172033"
        o.append(f'<text x="{x+w/2}" y="{y+58+k*17}" text-anchor="middle" font-size="11.5" fill="{col}">{e(l.lstrip("+"))}</text>')


def line(pts, red=False, dash=False, arrow=False):
    c = RED if red else INK
    d_ = "M" + " L".join(f"{a},{b}" for a, b in pts)
    o.append(f'<path d="{d_}" fill="none" stroke="{c}" stroke-width="1.4"{" stroke-dasharray=\"6 4\"" if dash else ""}{" marker-end=\"url(#open)\"" if arrow else ""}/>')


def ball(x, y, label, lpos="t", red=False):
    c = RED if red else INK
    o.append(f'<circle cx="{x}" cy="{y}" r="7.5" fill="white" stroke="{c}" stroke-width="1.6"/>')
    tx, ty, anc = {"t": (x, y - 14, "middle"), "b": (x, y + 24, "middle"), "l": (x - 14, y + 4, "end"), "r": (x + 14, y + 4, "start"),
                   "tr": (x + 12, y - 10, "start"), "tl": (x - 12, y - 10, "end"), "br": (x + 12, y + 20, "start")}[lpos]
    o.append(f'<text x="{tx}" y="{ty}" text-anchor="{anc}" font-size="12" font-weight="700" fill="{c}">{e(label)}</text>')


def socket(x, y, side, red=False):
    """(x, y) = 볼 중심. side = 요구 컴포넌트가 있는 방향(t/b/l/r). 반원 소켓을 그리고 연결점 좌표를 돌려준다."""
    c = RED if red else INK
    r = 13
    d_ = {"t": f"M{x-r},{y} A{r},{r} 0 0 1 {x+r},{y}", "b": f"M{x-r},{y} A{r},{r} 0 0 0 {x+r},{y}",
          "l": f"M{x},{y-r} A{r},{r} 0 0 0 {x},{y+r}", "r": f"M{x},{y-r} A{r},{r} 0 0 1 {x},{y+r}"}[side]
    o.append(f'<path d="{d_}" fill="none" stroke="{c}" stroke-width="1.6"/>')
    return {"t": (x, y - r), "b": (x, y + r), "l": (x - r, y), "r": (x + r, y)}[side]


def note(x, y, t, red=False, anc="start", size=11.5):
    o.append(f'<text x="{x}" y="{y}" text-anchor="{anc}" font-size="{size}" fill="{RED if red else "#526079"}">{e(t)}</text>')


# ── 클라이언트 ──
frame(40, 96, 1210, 276, "«subsystem» HAVE 크롬 확장 프로그램  — 1109의 “HAVE 클라이언트(웹) · 업무 웹 UI”를 수정", red=True)
comp(70, 130, 520, 92, "측면 패널 UI (Side Panel)", ["작성자 · 검토자 · 최종 승인자", "목록 · 등록 · 이해 확인 · 검토 · 수정 · 승인 · 증명서 · 이력 · 알림"], "#FDECEE", True)
comp(640, 130, 580, 92, "팝업 UI (Popup)", ["지금 할 일 · 측면 패널 열기", "현재 탭 PDF 등록 · 증명서 검증 진입"], "#FDECEE", True)
comp(70, 270, 1150, 78, "서비스 워커 (Background)", ["ApiClient · SessionStore · NotificationBridge · TabPdfImporter"], "#FDECEE", True)
line([(330, 222), (330, 269)], True, True, True); note(338, 250, "«use»", True)
line([(930, 222), (930, 269)], True, True, True); note(938, 250, "«use»", True)
comp(1290, 270, 250, 78, "Chrome Extension API", ["sidePanel · storage · notifications · tabs"], "#F1F3F6", True, "external")
line([(1220, 318), (1289, 318)], True, True, True); note(1256, 336, "«use»", True, "start", 10.5)
comp(1600, 130, 330, 92, "공개 검증 페이지 (웹)", ["외부 검증자 · 수신자 (비로그인)", "+VerifyPage · FileHasher"], "#EAF0FB")

# ── 서버 ──
frame(40, 392, 1890, 830, "«subsystem» HAVE 서버")
frame(160, 462, 1750, 250, "핵심 업무 컴포넌트", dash=True, small=True)
Y, Hc = 500, 176
YB = Y + Hc
comp(175, Y, 320, Hc, "02 작업·결과물 관리", ["Controller 4 · Service 5 (RevisionService 포함)", "Work · WorkVersion · AiDisclosure · AiToolUsage", "Contribution · EvidenceItem · Revision", "+FeedbackResponse · WorkStatusSubject"])
comp(595, Y, 350, Hc, "03 검토 관리", ["Controller 2 · RiskService · GatePolicy", "ReviewRequestService · ReviewService", "RiskAssessment · ReviewRequest · Challenge", "ChallengeResponse · Evaluation · Review · Feedback", "+ChecklistItem · ReviewCheck · FeedbackItem", "+GateStrategy 3종 · ReReviewObserver"])
comp(1045, Y, 200, Hc, "04 승인 관리", ["ApprovalService", "ApprovalCase · Approval", "Revocation · OutboxEvent"])
comp(1345, Y, 220, Hc, "05 증명서 관리", ["CertificateService", "Certificate · ShareLink · QRCode", "+CertificateIssueObserver"])
comp(1665, Y, 220, Hc, "06 진위 검증", ["VerificationService", "VerificationResult"])

# 업무 API (제공: 볼 ↔ 컴포넌트 실선, 요구: 소켓 ↔ 클라이언트)
for x, name, src in [(335, "IWorkAPI", (335, 348)), (770, "IReviewAPI", (770, 348)), (1145, "IApprovalAPI", (1145, 348))]:
    ball(x, 432, name, "r"); line([(x, 439.5), (x, Y)]); p = socket(x, 432, "t", True); line([src, p], True)
ball(1455, 432, "ICertificateAPI", "r"); line([(1455, 439.5), (1455, Y)]); p = socket(1455, 432, "t", True); line([(1190, 348), (1190, 382), (1455, 382), p], True)
ball(1775, 432, "IVerificationAPI", "r"); line([(1775, 439.5), (1775, Y)]); p = socket(1775, 432, "t"); line([(1775, 222), p])

# 컴포넌트 사이 인터페이스 (조립 연결)
def between(x, name, lx, rx):
    ball(x, 580, name, "t"); line([(lx, 580), (x - 7.5, 580)]); p = socket(x, 580, "r"); line([p, (rx, 580)])
between(545, "IWorkVersion", 495, 595); between(995, "IReviewResult", 945, 1045); between(1295, "IApprovalStatus", 1245, 1345); between(1615, "ICertificateData", 1565, 1665)
p = socket(545, 580, "b"); line([(1100, YB), (1100, 692), (545, 692), p]); note(720, 707, "버전 · 파일 해시 (04 → IWorkVersion)")
p = socket(1295, 580, "b"); line([(1760, YB), (1760, 692), (1295, 692), p]); note(1420, 707, "현재 승인 효력 · 최신 버전 (06 → IApprovalStatus)")

# 옵서버 인터페이스 (1118: 디자인 패턴 반영)
p = socket(440, 484, "b", True); line([p, (440, Y)], True); note(424, 488, "WorkStatusObserver", True, "end", 11)
ball(900, 484, "WorkStatusObserver", "l", True); line([(900, 491.5), (900, Y)], True)
ball(1530, 484, "WorkStatusObserver", "l", True); line([(1530, 491.5), (1530, Y)], True)

# 공통 지원
comp(180, 800, 320, 130, "01 사용자·권한 관리", ["AuthorizationPolicy", "User · WorkMember"], "#E9F4EA")
comp(620, 800, 480, 130, "07 이력 관리", ["AuditLogService · HistoryService · NotificationGateway", "AuditEvent", "+Notification · AuditLogObserver · NotificationObserver"], "#E9F4EA")
comp(1180, 800, 480, 130, "08 데이터 저장", ["Repository 계약 7종 (+UserRepository · WorkRepository 추가) · FileStore", "+JdbcPersistence · DatabaseConnectionPool · StorageFileStore", "+StubPersistence (점증적 통합 · 시험용)"], "#E9F4EA")
comp(1720, 800, 190, 130, "서버 조립 지점", ["+bootstrap", "+HaveServerBootstrap", "+옵서버 등록 · 저장소 선택"], "#FDECEE", True)
line([(1720, 865), (1661, 865)], True, True, True); note(1668, 856, "«create»", True, "start", 10.5)
for x, name, lab in [(300, "IAuthorization", "권한 확인 · 계정 조회 (02–05)"), (700, "IAuditLog", "이력 기록 (02–06)"), (820, "INotification", "알림 요청 (02·03·04)"), (1400, "IPersistence · FileStore", "저장·조회 계약 사용 (02–05)")]:
    ball(x, 760, name, "r"); line([(x, 767.5), (x, 800)]); p = socket(x, 760, "t"); line([(x, 712), p]); note(x + 8, 733, lab)
ball(1070, 772, "WorkStatusObserver", "tl", True); line([(1070, 779.5), (1070, 800)], True)
p = socket(1400, 760, "l"); line([(1100, 850), (1140, 850), (1140, 760), p]); note(1150, 842, "이력·상태 조회")
# 클라이언트 → 지원 인터페이스
p = socket(300, 760, "l", True); line([(75, 348), (75, 760), p], True)
ball(680, 952, "IHistoryQuery", "r"); line([(680, 930), (680, 944.5)]); p = socket(680, 952, "b", True); line([(125, 348), (125, 985), (680, 985), p], True)
ball(860, 952, "INotificationQuery", "r", True); line([(860, 930), (860, 944.5)], True); p = socket(860, 952, "b", True); line([(100, 348), (100, 1002), (860, 1002), p], True)
note(134, 426, "확장 프로그램 → IAuthorization ·", True); note(134, 442, "IHistoryQuery · INotificationQuery", True)

# 외부 시스템
for x, w, name, sub, ix, iname in [(910, 260, "알림 채널", "이메일 · 브라우저 알림", 1040, "INotifyChannel"), (1200, 220, "관계형 DB", "업무 데이터 (테이블 31개)", 1310, "JDBC"), (1460, 220, "파일 저장소", "결과물 · 근거 파일", 1570, "IStorageAPI")]:
    comp(x, 1110, w, 76, name, [sub], "#F1F3F6", False, "external")
    ball(ix, 1050, iname, "r"); line([(ix, 1057.5), (ix, 1110)]); p = socket(ix, 1050, "t"); line([(ix, 930), p])
o.append("</svg>")
svg = "\n".join(o)
base = os.path.join(out, "HAVE_컴포넌트_다이어그램_v2")
open(base + "_그림.svg", "w", encoding="utf-8").write(svg)

R = lambda t: f'<span class="r">{t}</span>'
ROWS = [
    ("IWorkAPI", "02", "확장 프로그램", f"createWork(title, aiDisclosure), addContribution(versionId, event), uploadVersion(workId, file, reason), addEvidence(versionId, evidence), {R('resubmit(workId, file, responses, basis)')}, {R('getWorks(filter), getWork(workId)')}"),
    ("IWorkVersion", "02", "03 · 04", "getReviewTarget(versionId), getVersionHash(versionId), setWorkStatus(workId, status)"),
    (R("WorkStatusObserver"), R("03 · 05 · 07"), R("02"), R("update(subject) — 작업 상태 변경 통지 수신 (옵서버 패턴 · 재검토 연결 / 발급 요청 / 이력·알림)")),
    ("IReviewAPI", "03", "확장 프로그램", f"assessRisk(versionId, scores, {R('rationale')}), requestReview(versionId, reviewerId, {R('approverId, message, dueDate')}), cancelRequest(requestId, reason), {R('getChallenges(requestId), saveAnswers(requestId, answers), submitAnswers(requestId, answers), getAssignedRequests(reviewerId), startReview(requestId), saveReviewDraft(requestId, form)')}, submitReview(requestId, form), requestRevision(requestId, feedbacks, {R('dueDate')})"),
    ("IReviewResult", "03", "04", "getConfirmedResult(versionId), isPassed(versionId)"),
    ("IApprovalAPI", "04", "확장 프로그램", f"{R('getApprovalCase(versionId)')}, approve(caseId, key), reject(caseId, reason, key), revoke(approvalId, reason, key)"),
    ("IApprovalStatus", "04", "05 · 06", f"getApprovalResult(approvalId), {R('getCurrentValidity(approvalId) → 효력 · 최신 버전 번호')}, getPendingIssues()"),
    ("ICertificateAPI", "05", "확장 프로그램", f"getCertificate(certId), createShareLink(certId, expiresAt), createQRCode(certId), {R('retryIssue(certId)')}, {R('disableShareLink(linkId)')}"),
    ("ICertificateData", "05", "06", "getCertificateData(certId), getSignature(certId)"),
    ("IVerificationAPI", "06", "공개 검증 페이지", f"verify(certId, {R('fileHash?')}), verifyByQR(qrPayload, {R('fileHash?')})"),
    ("IAuthorization", "01", f"02 · 03 · 04 · 05 · {R('확장 프로그램')}", f"login(credential), {R('logout()')}, getCurrentUser(), isAuthorized(userId, target, action), getMemberRole(workId, userId), addMember(workId, userId, role)"),
    ("IAuditLog", "07", "02 · 03 · 04 · 05 · 06", f"record(workId, actorId, action, payload) {R('— 공개 검증(06) 이벤트는 actorId 없이 기록')}"),
    ("INotification", "07", f"02 · 03 · {R('04')}", f"notify(userId, type, targetId) {R('— 상태 변경 알림은 옵서버가 처리, 직접 호출은 철회(04) 등 상태 변경이 아닌 경우')}"),
    (R("INotificationQuery"), R("07"), R("확장 프로그램"), R("getNotifications(userId), setRead(notificationId) — 측면 패널 알림 목록")),
    ("IHistoryQuery", "07", "확장 프로그램", f"getHistory(workId, condition), getLatestStatus(workId), {R('isChainValid(workId)')}"),
    ("IPersistence", "08", "01 · 02 · 03 · 04 · 05 · 07", "save(entity), getById(type, id), getByCondition(type, condition) — 브리지 적용 후 Repository 안쪽에서만 사용"),
    (R("FileStore"), "08", "02", "put(key, file), get(key), delete(key)"),
]
RENAMED_1123 = ["setWorkStatus", "getWorks", "getAssignedRequests", "getCurrentUser", "isAuthorized", "getNotifications", "setRead", "getById", "getByCondition"]
import re as _re
ROWS = [(a, b, c, _re.sub(r"\b(" + "|".join(RENAMED_1123) + r")(\([^()]*\))", r'<span class="n">\1\2</span>', o_)) for a, b, c, o_ in ROWS]
page = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page {{ size: 1780px 2400px; margin: 0; }}
body {{ margin: 0; padding: 28px 36px; width: 1708px; font-family: '{FN}', sans-serif; color: #172033; background: white; }}
h1 {{ font-size: 28px; margin: 0; text-align: center; }} .sub {{ text-align: center; color: #526079; font-size: 15px; margin: 6px 0 14px; }}
.fig svg {{ width: 100%; height: auto; }} h2 {{ font-size: 17px; margin: 18px 0 6px; }}
table {{ border-collapse: collapse; width: 100%; font-size: 12.5px; }} th {{ background: #EEF3FB; text-align: left; }}
th, td {{ border: 1px solid #C9D2E0; padding: 4px 8px; vertical-align: top; }} td:first-child {{ font-weight: 700; white-space: nowrap; }}
.r {{ color: {RED}; font-weight: 700; }} .n {{ color: {RED}; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }} .note {{ margin-top: 12px; padding: 10px 14px; background: #FFF8E1; border: 1px solid #C9B26B; font-size: 12.5px; line-height: 1.6; }}
</style></head><body>
<h1>HAVE | UML 컴포넌트 다이어그램 (v2)</h1>
<div class="sub">크롬 확장 프로그램 + 공개 검증 페이지 + 서버 서브시스템 8개 · 제공(○)/요구(⊂) 인터페이스 · UC01–UC10 · 1118 수정본 · 1123 오퍼레이션 명명 규칙 · 패턴 정리 반영</div>
<div class="fig">{svg}</div>
<h2>인터페이스 오퍼레이션 정의</h2>
<table><tr><th>인터페이스</th><th>제공</th><th>요구(사용)</th><th>오퍼레이션</th></tr>
{''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{o_}</td></tr>' for a, b, c, o_ in ROWS)}</table>
<div class="note">표기 — «component» 상자(오른쪽 위 컴포넌트 아이콘) = 컴포넌트, ○ = 제공 인터페이스(볼), ⊂ = 요구 인터페이스(소켓), 볼과 소켓이 맞물린 곳 = 조립 연결, 점선 열린 화살표 = «use»·«create» 의존, 둥근 테두리 = «subsystem». 같은 이름의 WorkStatusObserver 볼(03·05·07)과 소켓(02)은 서버 조립 지점에서 연결된다.
핵심 업무 묶음에서 나가는 점선은 02–06 공통 요구의 요약이며 정확한 사용 컴포넌트는 표의 “요구(사용)” 열을 따른다.<br>
<span class="r">빨간색 = 1118 수정</span> — ① 클라이언트를 “웹 UI”에서 크롬 확장 프로그램(측면 패널·팝업·서비스 워커)으로 정정, ② HCI 프로토타입이 필요로 하는 오퍼레이션 추가(목록·상세 조회, 이해 확인 답변, 검토 시작·초안, 발급 재시도, 알림 목록),
③ 디자인 패턴 적용으로 생긴 인터페이스·컴포넌트(WorkStatusObserver, 서버 조립 지점)와 구체화된 타입 반영, ④ 공개 검증의 파일 해시 전달과 익명 이력 기록 반영.<br>
<span class="n">빨간색 밑줄 = 1123 이름 변경</span> — 강의의 오퍼레이션 명명 규칙(조건 체크 is · 읽기·탐색 get · 쓰기 set)에 맞춰 9개를 바꿨다: updateWorkStatus → setWorkStatus, listWorks → getWorks, listRequests → getAssignedRequests, currentUser → getCurrentUser, authorize → isAuthorized, listNotifications → getNotifications, markRead → setRead, findById → getById, findBy → getByCondition. 나머지는 조작(업무 동작) 오퍼레이션이라 동사로 시작한다.<br>
<span class="r">1123 패턴 정리</span> — 어댑터 · 추상 팩토리 패턴을 적용하지 않기로 해 InfrastructureFactory 등 6개 타입을 빼고 StorageFileStoreAdapter를 StorageFileStore로 바꿨다. 서버 조립 지점은 옵서버 등록과 저장소 구현 선택만 한다. 인터페이스와 오퍼레이션은 그대로다.<br>
<span class="r">11-23 최종 점검</span> — 확장 프로그램에 있던 기능을 앞 단계에 맞춰 넣었다: ICertificateAPI.disableShareLink(linkId)(UC07 공유 중지), IHistoryQuery.isChainValid(workId)(UC09 기록 해시 체인 확인).<br>
<span class="r">11-23 v3</span> — requestReview에 최종 승인자(approverId)를 넣었다(UC03 3단계). 옵서버 인터페이스와 파일 저장 계약은 클래스 다이어그램 · 패키지 다이어그램과 같은 이름(WorkStatusObserver, FileStore)으로 바꿨다(이전 IWorkStatusObserver, IFileStore).</div>
</body></html>"""
open(base + ".html", "w", encoding="utf-8").write(page)
print("ok")
