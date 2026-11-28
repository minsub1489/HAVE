"""UC01 · UC02 클래스 다이어그램 (1123 다시 그림) — 1104 원본의 내용을 그대로 옮기고
오퍼레이션 명명 규칙(is · get · set)에 맞춰 이름 6개를, 통합 클래스 다이어그램에 맞춰 클래스 이름 2개를 바꿨다.
실행: python3 gen_uc_class.py <출력 폴더>      ('!'로 시작하는 줄 = 1104 원본에서 바뀐 곳, 빨간색으로 그린다)"""
import sys, os, subprocess, html

out = sys.argv[1] if len(sys.argv) > 1 else "."
FN, RED, INK = "Noto Sans CJK KR", "#C8102E", "#172033"
LH = 21


def tw(t, size=14.0):
    return sum(size if ord(c) > 0x2E80 else (size * 0.33 if c in " .,:()|!'/" else size * 0.6) for c in t)


def e(t):
    return html.escape(t, quote=False)


class D:
    def __init__(self, title, sub, W, H):
        self.W, self.H, self.b = W, H, {}
        self.o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FN}">',
                  '<defs><marker id="open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#34425E" stroke-width="1.5"/></marker></defs>',
                  f'<rect width="{W}" height="{H}" fill="white"/>',
                  f'<text x="{W/2}" y="38" text-anchor="middle" font-size="23" font-weight="700" fill="{INK}">{e(title)}</text>',
                  f'<text x="{W/2}" y="63" text-anchor="middle" font-size="13.5" fill="#526079">{e(sub)}</text>']

    def pkg(self, x, y, w, h, name):
        tabw = tw(name, 15) + 30
        self.o.append(f'<rect x="{x}" y="{y}" width="{tabw:.0f}" height="28" fill="#F3F5F9" stroke="#5B6B88" stroke-width="1.4"/>')
        self.o.append(f'<rect x="{x}" y="{y+28}" width="{w}" height="{h-28}" fill="#FAFBFD" stroke="#5B6B88" stroke-width="1.4"/>')
        self.o.append(f'<text x="{x+13}" y="{y+20}" font-size="15" font-weight="700" fill="#34425E">{e(name)}</text>')

    def cls(self, bid, x, y, name, attrs=(), ops=(), stereo="", fill="#EAF0FB", was="", w=None, italic=False):
        lines = [l.lstrip("!") for l in list(attrs) + list(ops)]
        w = w or max([tw(name, 16) + 40, tw(f"«{stereo}»", 12) + 30] + [tw(l) + 28 for l in lines] + ([tw(was, 11.5) + 30] if was else []))
        hh = 34 + (16 if stereo else 0) + (17 if was else 0)
        ha, ho = max(len(attrs), 1) * LH + 10 if attrs else 14, max(len(ops), 1) * LH + 10 if ops else 14
        h = hh + ha + ho
        o = self.o
        o.append(f'<rect x="{x}" y="{y}" width="{w:.0f}" height="{h}" fill="white" stroke="#34425E" stroke-width="1.5"/>')
        o.append(f'<rect x="{x}" y="{y}" width="{w:.0f}" height="{hh}" fill="{fill}" stroke="#34425E" stroke-width="1.5"/>')
        o.append(f'<line x1="{x}" y1="{y+hh+ha}" x2="{x+w:.0f}" y2="{y+hh+ha}" stroke="#34425E" stroke-width="1.5"/>')
        ty = y + 22
        if stereo:
            o.append(f'<text x="{x+w/2:.0f}" y="{y+17}" text-anchor="middle" font-size="12" fill="#34425E">«{e(stereo)}»</text>')
            ty += 15
        col = RED if was else INK
        o.append(f'<text x="{x+w/2:.0f}" y="{ty}" text-anchor="middle" font-size="16" font-weight="700" fill="{col}"{" font-style=\"italic\"" if italic else ""}>{e(name)}</text>')
        if was:
            o.append(f'<text x="{x+w/2:.0f}" y="{ty+16}" text-anchor="middle" font-size="11.5" fill="{RED}">{e(was)}</text>')
        for k, l in enumerate(attrs):
            red = l.startswith("!")
            o.append(f'<text x="{x+12}" y="{y+hh+20+k*LH}" font-size="14" fill="{RED if red else INK}"{" font-weight=\"700\"" if red else ""}>{e(l.lstrip("!"))}</text>')
        for k, l in enumerate(ops):
            red = l.startswith("!")
            o.append(f'<text x="{x+12}" y="{y+hh+ha+20+k*LH}" font-size="14" fill="{RED if red else INK}"{" font-weight=\"700\"" if red else ""}>{e(l.lstrip("!"))}</text>')
        self.b[bid] = (x, y, w, h)

    def a(self, bid, side, t=0.5):
        x, y, w, h = self.b[bid]
        return {"t": (x + w * t, y), "b": (x + w * t, y + h), "l": (x, y + h * t), "r": (x + w, y + h * t)}[side]

    def line(self, pts, kind="assoc"):
        d_ = "M" + " L".join(f"{x:.0f},{y:.0f}" for x, y in pts)
        if kind == "comp":  # 합성: 시작점에 채운 마름모
            (x0, y0), (x1, y1) = pts[0], pts[1]
            dx, dy = (1 if x1 > x0 else -1 if x1 < x0 else 0), (1 if y1 > y0 else -1 if y1 < y0 else 0)
            px, py = -dy, dx
            dia = f"M{x0},{y0} L{x0+dx*9+px*6},{y0+dy*9+py*6} L{x0+dx*18},{y0+dy*18} L{x0+dx*9-px*6},{y0+dy*9-py*6} z"
            self.o.append(f'<path d="{d_}" fill="none" stroke="#34425E" stroke-width="1.4"/><path d="{dia}" fill="#34425E"/>')
        else:
            dash = ' stroke-dasharray="7 5"' if kind == "dep" else ""
            self.o.append(f'<path d="{d_}" fill="none" stroke="#34425E" stroke-width="1.4"{dash} marker-end="url(#open)"/>')

    def t(self, x, y, s, size=12.5, anc="start", col="#34425E", bold=False):
        self.o.append(f'<text x="{x}" y="{y}" text-anchor="{anc}" font-size="{size}" fill="{col}"{" font-weight=\"700\"" if bold else ""}>{e(s)}</text>')

    def legend(self, x, y, w, rows):
        h = 58 + len(rows) * 21
        self.o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFF8E1" stroke="#C9B26B"/>')
        self.t(x + 14, y + 22, "표기 — 탭 달린 상자 = 패키지 · 클래스 3칸 = 이름 / 속성 / 오퍼레이션 · + 공개, - 비공개 · 실선 열린 화살표 = 방향 있는 연관(사용) · 채운 마름모 = 합성", 12.5, col=INK)
        self.t(x + 14, y + 44, "빨간 굵은 글자 = 1104 원본에서 바꾼 이름 (2026-11-23 · 오퍼레이션 명명 규칙: 조건 체크 is · 속성 읽기·탐색 get · 속성 쓰기 set / 클래스 이름은 통합 클래스 다이어그램 기준)", 12.5, col=RED, bold=True)
        for k, r in enumerate(rows):
            self.t(x + 14, y + 66 + k * 21, r, 12.5, col=INK)
        return h

    def save(self, name):
        self.o.append("</svg>")
        base = os.path.join(out, name)
        open(base + ".svg", "w", encoding="utf-8").write("\n".join(self.o))
        subprocess.run(["rsvg-convert", "-z", "2", "-o", base + ".png", base + ".svg"], check=True)


CTL, SVC, DOM, ENU = "#E3EEFB", "#E5F2E7", "#FDEBD9", "#EEE6F8"


def uc01():
    d = D("UC01 · AI 작업 및 사용 내역 등록 — 클래스 다이어그램", "1104 HAVE_v2_UC01/UC01_Class를 다시 그림 · 2026-11-23 오퍼레이션 명명 규칙 반영", 1460, 1250)
    d.pkg(40, 90, 1380, 150, "controller (REST API)")
    d.cls("WC", 95, 140, "WorkController", [], ["+ createWork(req): workId"], fill=CTL)
    d.cls("CC", 900, 140, "ContributionController", [], ["+ addContribution(versionId, req): eventId"], fill=CTL)
    d.pkg(40, 280, 1380, 190, "service")
    d.cls("WS", 70, 334, "WorkService", [], ["+ createWork(ownerId, req): Work", "!- isValidDisclosure(d): Boolean"], fill=SVC)
    d.cls("AS", 520, 334, "AuditLogService", [], ["!+ record(workId, actorId, action, payload)", "!- getChainHash(prev, event)"], fill=SVC)
    d.cls("CS", 930, 334, "ContributionService", [], ["+ addContribution(userId, versionId, req)", "!- isOwnerAndEditable(): Boolean"], fill=SVC)
    d.pkg(40, 510, 1380, 560, "domain")
    d.cls("W", 100, 566, "Work", ["- id", "- ownerId", "- title", "- status: WorkStatus", "- aiDisclosureDraft"], [], fill=DOM, w=230)
    d.cls("AD", 520, 580, "AiDisclosure", ["- tools: 도구·모델·사용 방식", "- usageScope", "- noAiUsed"], [], fill=DOM)
    d.cls("V", 100, 830, "WorkVersion", ["- id", "- number", "- sha256"], [], fill=DOM, was="1104 원본: Version", w=230)
    d.cls("C", 520, 818, "Contribution", ["- stage: ContributionStage", "- actorType: ActorType", "- note", "- evidenceLinks"], [], fill=DOM)
    d.cls("E1", 930, 760, "ContributionStage", ["IDEA", "DRAFT", "SOURCE_VERIFICATION", "REVISION"], [], stereo="enumeration", fill=ENU)
    d.cls("E2", 1210, 778, "ActorType", ["AI", "HUMAN", "MIXED"], [], stereo="enumeration", fill=ENU)
    # 연관
    d.line([d.a("WC", "b"), (d.a("WC", "b")[0], d.b["WS"][1])]); d.line([d.a("CC", "b"), (d.a("CC", "b")[0], d.b["CS"][1])])
    d.line([d.a("WS", "r"), d.a("AS", "l")]); d.line([d.a("CS", "l"), d.a("AS", "r")])
    d.line([d.a("WS", "b", 0.45), (d.a("WS", "b", 0.45)[0], d.b["W"][1])])
    x = d.a("CS", "b", 0.2)[0]
    d.line([d.a("CS", "b", 0.2), (x, 720), (d.a("C", "t", 0.8)[0], 720), d.a("C", "t", 0.8)])
    d.line([d.a("W", "r", 0.4), (d.b["AD"][0], d.a("W", "r", 0.4)[1])], "comp"); d.t(400, d.a("W", "r", 0.4)[1] - 9, "신고", anc="middle")
    d.line([d.a("W", "b"), d.a("V", "t")], "comp"); d.t(d.a("W", "b")[0] + 10, d.a("W", "b")[1] + 34, "1"); d.t(d.a("V", "t")[0] + 10, d.a("V", "t")[1] - 10, "1..*")
    d.t(d.a("W", "b")[0] - 12, (d.a("W", "b")[1] + d.a("V", "t")[1]) / 2 + 12, "버전", anc="end")
    yv = d.a("V", "r")[1]
    d.line([d.a("V", "r"), (d.b["C"][0], yv)], "comp"); d.t(425, yv - 9, "기여", anc="middle"); d.t(352, yv + 18, "1"); d.t(d.b["C"][0] - 34, yv + 18, "0..*")
    d.line([d.a("C", "r", 0.35), (d.b["E1"][0], d.a("C", "r", 0.35)[1])])
    y2 = d.a("C", "r", 0.8)[1] + 60
    d.line([d.a("C", "b", 0.85), (d.a("C", "b", 0.85)[0], y2 + 22), (d.a("E2", "b")[0], y2 + 22), d.a("E2", "b")])
    d.legend(40, 1096, 1380, ["WorkService.validateDisclosure(d) → isValidDisclosure(d): Boolean   ·   AuditLogService.chainHash(prev, event) → getChainHash(prev, event)   ·   ContributionService.checkOwnerAndEditable() → isOwnerAndEditable(): Boolean",
                               "클래스 Version → WorkVersion (통합 클래스 다이어그램의 이름).  AuditLogService.append(action, payload) → record(workId, actorId, action, payload): 컴포넌트의 IAuditLog와 같은 이름 (11-23 일관성).",
                               "AiDisclosure는 작업 생성 때 Work.aiDisclosureDraft로 보관되고, 버전이 만들어질 때(UC02) 사본이 고정된다."])
    d.save("UC01_클래스")


def uc02():
    d = D("UC02 · 결과물 및 근거자료 등록 — 클래스 다이어그램", "1104 HAVE_v2_UC02/UC02_Class를 다시 그림 · 2026-11-23 오퍼레이션 명명 규칙 반영", 1460, 1120)
    d.pkg(40, 90, 1380, 170, "controller (REST API)")
    d.cls("VC", 110, 140, "VersionController", [], ["+ uploadVersion(workId, file, reason): versionId"], fill=CTL)
    d.cls("EC", 880, 140, "EvidenceController", [], ["+ addWebSource(versionId, req): evidenceId", "+ addSupportFile(versionId, file): evidenceId"], fill=CTL)
    d.pkg(40, 300, 1380, 220, "service · port")
    d.cls("VS", 90, 356, "VersionService", [], ["+ createVersion(ownerId, workId, file)", "!- isValidFile(): Boolean  {PDF · 20MB}", "!- getSha256(stream)"], fill=SVC)
    d.cls("FS", 610, 350, "FileStore", [], ["+ put(key, file)", "+ delete(key)"], stereo="interface", fill=ENU, was="1104 원본: FileStoragePort", italic=True)
    d.cls("ES", 990, 356, "EvidenceService", [], ["+ addWebSource(...)", "+ addSupportFile(...)", "!- isValidUrl(url): Boolean"], fill=SVC)
    d.pkg(40, 560, 1380, 400, "domain")
    d.cls("W", 90, 640, "Work", ["- id", "- status: DRAFT → SUBMITTED", "- aiDisclosureDraft"], [], fill=DOM)
    d.cls("V", 530, 616, "WorkVersion", ["- number", "- sha256", "- storageKey", "- changeReason", "- aiDisclosure  {스냅샷}"], [], fill=DOM, was="1104 원본: Version")
    d.cls("EI", 980, 624, "EvidenceItem", ["- type: EvidenceType", "- title", "- url", "- sha256"], [], fill=DOM)
    d.cls("ET", 990, 836, "EvidenceType", ["WEB_SOURCE", "SUPPORT_FILE"], [], stereo="enumeration", fill=ENU)
    d.line([d.a("VC", "b", 0.4), (d.a("VC", "b", 0.4)[0], d.b["VS"][1])]); d.line([d.a("EC", "b", 0.6), (d.a("EC", "b", 0.6)[0], d.b["ES"][1])])
    d.line([d.a("VS", "r", 0.45), (d.b["FS"][0], d.a("VS", "r", 0.45)[1])]); d.line([d.a("ES", "l", 0.45), (d.b["FS"][0] + d.b["FS"][2], d.a("ES", "l", 0.45)[1])])
    xv = d.a("VS", "b", 0.8)[0]
    d.line([(xv, d.a("VS", "b")[1]), (xv, 560), (d.a("V", "t", 0.3)[0], 560), d.a("V", "t", 0.3)])
    d.line([d.a("ES", "b", 0.5), (d.a("ES", "b", 0.5)[0], d.b["EI"][1])])
    yw = d.a("W", "r")[1]
    d.line([d.a("W", "r"), (d.b["V"][0], yw)], "comp"); d.t((d.a("W", "r")[0] + d.b["V"][0]) / 2, yw - 9, "버전", anc="middle"); d.t(d.a("W", "r")[0] + 24, yw + 18, "1"); d.t(d.b["V"][0] - 34, yw + 18, "1..*")
    ye = d.a("V", "r", 0.5)[1]
    d.line([d.a("V", "r", 0.5), (d.b["EI"][0], ye)], "comp"); d.t((d.a("V", "r")[0] + d.b["EI"][0]) / 2, ye - 9, "근거자료", anc="middle"); d.t(d.a("V", "r")[0] + 24, ye + 18, "1"); d.t(d.b["EI"][0] - 34, ye + 18, "0..*")
    d.line([d.a("EI", "b", 0.4), (d.a("EI", "b", 0.4)[0], d.b["ET"][1])])
    d.legend(40, 986, 1380, ["VersionService.checkFile() → isValidFile(): Boolean   ·   VersionService.hashSha256(stream) → getSha256(stream)   ·   EvidenceService.validateUrl(url) → isValidUrl(url): Boolean",
                              "클래스 Version → WorkVersion, FileStoragePort → FileStore (통합 클래스 다이어그램의 이름).  uploadVersion · createVersion · addWebSource · addSupportFile · delete는 조작 오퍼레이션, put은 속성 쓰기 접두어다."])
    d.save("UC02_클래스")


uc01(); uc02()
print("ok")
