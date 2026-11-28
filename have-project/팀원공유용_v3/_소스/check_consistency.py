"""1118 산출물 일관성 검사 — 순서 다이어그램의 호출이 컴포넌트 인터페이스 정의에 있는지,
상태 코드·클래스 이름이 통일표·패키지 다이어그램과 맞는지, 오퍼레이션 이름이 명명 규칙(naming.py)을 따르는지 확인한다.
1118/_다이어그램_소스 안에서 실행: python3 check_consistency.py"""
import re, glob, os, sys
here = os.path.dirname(os.path.abspath(__file__))
comp = open(os.path.join(here, "gen_component.py"), encoding="utf-8").read()
rows = comp[comp.index("ROWS = ["):comp.index("RENAMED_1123 = ")]
ops = set(re.findall(r"([a-zA-Z]+)\(", rows))
pkg = open(os.path.join(here, "gen_package.py"), encoding="utf-8").read()
types = set(t.lstrip("+★") for t in re.findall(r'"([+★]?[A-Z][A-Za-z‹›]+)"', pkg[pkg.index("SUBS = ["):]))
STATUS = {"DRAFT", "SUBMITTED", "CHALLENGE_PENDING", "REVIEW_PENDING", "IN_REVIEW", "REVISION_REQUIRED", "APPROVAL_PENDING", "APPROVED"}
OTHER = {"REQUESTED", "CLOSED", "CANCELED", "IN_PROGRESS", "COMPLETED", "HALTED", "PASS", "OPEN", "EXPIRED", "PENDING", "REJECTED", "READY", "FAILED",
         "VALID", "REVOKED", "UNKNOWN", "MATCH", "DIFFERENT", "NOT_CHECKED", "FAIL", "LOW", "MEDIUM", "HIGH", "REVIEWER", "APPROVER", "AUTHOR",
         "TEACH_BACK", "FAULT_INJECTION", "WHAT_IF", "ACTIVE", "DISABLED", "DELIVERED", "NONE"}
ACTIONS = {"CREATE_WORK", "ADD_CONTRIBUTION", "REQUEST_REVIEW", "ANSWER", "APPROVE", "REJECT", "REVOKE", "VIEW", "VIEW_HISTORY", "VERIFY", "SHARE_LINK_CREATED", "SHARE_LINK_DISABLED", "APPROVAL_REVOKED", "SUBMITTED"}
INTERNAL = {"selectFor", "assignTasks", "judge", "save", "getByVersion", "getPendingRequests", "getForUpdate", "commit", "put",
            "createVersion", "isAllResolved", "notifyObservers", "createTasks", "approve", "reject", "revoke",
            # 1123: UC01 · UC02 순서 다이어그램 — UC01 · UC02 클래스 다이어그램의 내부 오퍼레이션 (addWebSource · addSupportFile은 IWorkAPI.addEvidence의 유형별 처리)
            "isValidDisclosure", "isOwnerAndEditable", "isValidFile", "isValidUrl", "addWebSource", "addSupportFile",
            # 11-23 팀원 피드백: UC05 근거 변경 판정 (RevisionService 내부 오퍼레이션)
            "isBasisChanged",
            # 11-23 최종 점검: UC07 공유 중지 — CertificateService.disableShareLink가 부르는 ShareLink의 도메인 오퍼레이션
            "invalidate"}
bad = 0
for f in sorted(glob.glob(os.path.join(here, "UC*_순서*.mmd"))):
    s = open(f, encoding="utf-8").read()
    parts = dict(re.findall(r"participant (\w+) as :([A-Za-z]+)", s))
    for pid, cls in parts.items():
        if cls not in types and not cls.startswith("I") :
            print("  [클래스 없음]", os.path.basename(f), cls); bad += 1
    for a, b, msg in re.findall(r"^\s*(\w+)-[->)]+(\w+): (.+)$", s, re.M):
        for op in re.findall(r"\b([a-z][A-Za-z]+)\(", msg):
            if op not in ops and op not in INTERNAL:
                print("  [인터페이스에 없는 호출]", os.path.basename(f), op); bad += 1
    for code in set(re.findall(r"\b([A-Z][A-Z_]{3,})\b", s)):
        if code not in STATUS | OTHER | ACTIONS and not code.startswith(("UC", "SHA", "PDF", "KST", "URL", "HAVE", "JPEG")):
            print("  [미정의 코드]", os.path.basename(f), code); bad += 1
for f in sorted(glob.glob(os.path.join(here, "HAVE_상태_*.mmd"))):
    s = open(f, encoding="utf-8").read()
    for code in set(re.findall(r"<br/>([A-Z_]{4,})\"", s)):
        if code not in STATUS | OTHER:
            print("  [미정의 상태]", os.path.basename(f), code); bad += 1
allsrc = "".join(open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(here, "*.mmd")) + [g for g in glob.glob(os.path.join(here, "gen_*.py")) if not g.endswith("gen_db_doc.py")])
for w in ("UC11", "RESUBMITTED\"", "UNDER_REVIEW", "DRAFTING", "업무 웹 UI\","):
    if w in allsrc:
        print("  [남은 옛 표기]", w); bad += 1
# 오퍼레이션 명명 규칙 (naming.py): 옛 이름이 남아 있는지, 기본 유형인데 접두어가 틀린 이름이 있는지
sys.path.insert(0, here)
from naming import RENAMES, BAD_PREFIX, OK_EXACT
texts = {os.path.basename(f): open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(here, "*.mmd"))}
for g in ("gen_component.py", "gen_class_v3.py", "gen_uc_class.py", "gen_dp_figs.py"):
    if os.path.exists(os.path.join(here, g)):
        t = open(os.path.join(here, g), encoding="utf-8").read()
        texts[g] = " ".join(re.findall(r'"([^"]*)"', t))
for d in glob.glob(os.path.join(here, "..", "*", "*.md")) + glob.glob(os.path.join(here, "..", "*.md")) + glob.glob(os.path.join(here, "..", "10_HCI", "*.html")):
    if "_이전판" in d:
        continue
    t = open(d, encoding="utf-8").read()
    if d.endswith(".html"):
        t = t[t.index("const MEMO = {"):t.index("function memoKey")]
    texts[os.path.relpath(d, os.path.join(here, ".."))] = t
for name, t in sorted(texts.items()):
    keep, in_map = [], False
    for ln in t.split("\n"):
        if ln.startswith("|") and ("이전 이름" in ln or "원문의 이름" in ln):
            in_map = True                      # '이전 이름 | 새 이름' 대응표
        elif not ln.startswith("|"):
            in_map = False
        if not in_map and "→" not in ln and "←" not in ln:
            keep.append(ln)
    t = "\n".join(keep)
    t = re.sub(r"※([^|\"]*)\|[^\"]*", r"\1", t)   # gen_class_v3.py의 '새 이름|옛 이름' 표기에서 옛 이름 제외
    for old in sorted(RENAMES):
        pat = rf"(?<![A-Za-z0-9_]){old}(?=\()" if old in ("can", "passes", "authorize") else rf"(?<![A-Za-z0-9_]){old}(?![A-Za-z0-9_])"
        if re.search(pat, t):
            print("  [옛 이름]", name, old); bad += 1
    for op in sorted(set(re.findall(r"(?<![A-Za-z0-9_])([a-z][A-Za-z0-9]*)\(", t))):
        if op in RENAMES:
            continue
        elif op not in OK_EXACT and re.match(r"(" + "|".join(BAD_PREFIX) + r")(?![a-z])", op) and name.endswith((".mmd", ".py")):
            print("  [접두어 확인]", name, op); bad += 1
print("인터페이스 오퍼레이션", len(ops), "개 · 패키지 타입", len(types), "개 · 문제", bad, "건")
sys.exit(1 if bad else 0)
