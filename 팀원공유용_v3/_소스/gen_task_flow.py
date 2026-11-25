"""HAVE 태스크 분석 — 유스케이스별 화면 흐름도 (Ch08 p.28 "유스케이스 별로 UI 흐름을 파악"). 11-23.
화면(둥근 상자: 화면 이름 + 경로) → 사용자 행동(화살표 글자) → 다음 화면. 점선 = 입력 오류·예외 갈래.
화면과 경로는 크롬 확장 프로그램 최종본(have-chrome-extension)의 실제 화면이다.
실행: python3 gen_task_flow.py <출력 폴더>"""
import sys, os, subprocess
FN = "Noto Sans CJK KR"
INK, SUB, RED, LINE = "#172033", "#5B6B88", "#B23A48", "#4A5874"
ROLE = {"작성자": ("#EEF2FB", "#5B78B8"), "검토자": ("#E8F3EA", "#3C8D40"), "최종 승인자": ("#FDEFDD", "#D9822B"),
        "작업 구성원": ("#EFE7F7", "#7E57C2"), "외부 검증자": ("#EEF0F2", "#5B6B7F")}


def scr(i, name, route, fill, color, extra=""):
    ex = f'<BR/><FONT POINT-SIZE="9" COLOR="{SUB}">{extra}</FONT>' if extra else ""
    return (f'  {i} [shape=box, style="rounded,filled", fillcolor="{fill}", color="{color}", penwidth=1.6, margin="0.14,0.07", '
            f'label=<<B>{name}</B><BR/><FONT POINT-SIZE="9" COLOR="{SUB}" FACE="DejaVu Sans Mono">{route}</FONT>{ex}>];')


def err(i, text):
    return f'  {i} [shape=note, style="filled", fillcolor="#FFF4F4", color="{RED}", fontcolor="{RED}", fontsize=10, margin="0.1,0.05", label="{text}"];'


act = lambda a, b, t: f'  {a} -> {b} [label="{t}", fontsize=10, color="{LINE}"];'
bad = lambda a, b, t="": f'  {a} -> {b} [label="{t}", fontsize=9.5, style=dashed, color="{RED}", fontcolor="{RED}", arrowsize=0.7];'


def flow(cid, title, role, nodes, edges):
    fill, color = ROLE[role]
    out = [f'  subgraph cluster_{cid} {{ label=<<B>{title}</B>  <FONT COLOR="{color}">[{role}]</FONT>>; labeljust=l; fontsize=15; style="rounded,dashed"; color="{color}";']
    for n in nodes:
        out.append(scr(*n[:3], fill, color, *(n[3:])) if n[0][0] != "e" else err(*n))
    out.append("  }")
    return out + edges


def render(name, title, flows, note=""):
    nt = f'<BR/><FONT POINT-SIZE="12" COLOR="{RED}">{note}</FONT>' if note else ""
    g = ['digraph T {', f'  graph [rankdir=LR, fontname="{FN}", fontsize=22, labelloc=t, nodesep=0.22, ranksep=0.38, pad=0.3, newrank=true,',
         f'    label=<<B>{title}</B><BR/><FONT POINT-SIZE="12" COLOR="{SUB}">둥근 상자 = 화면(이름 · 경로) · 화살표 = 사용자 행동 · 빨간 점선 = 입력 오류 · 예외 갈래 · 크롬 확장 프로그램 최종본(브라우저 로컬 시연) 기준 · Ch08 p.28 태스크 분석 · 2026-11-23</FONT>{nt}<BR/> >];',
         f'  node [fontname="{FN}", fontsize=11]; edge [fontname="{FN}", arrowsize=0.8];']
    for f in reversed(flows):            # rankdir=LR에서는 나중에 넣은 영역이 위로 가므로 거꾸로 넣는다
        g += f
    g.append("}")
    base = os.path.join(out, name)
    open(base + ".dot", "w", encoding="utf-8").write("\n".join(g))
    subprocess.run(["dot", "-Tpng", "-Gdpi=130", base + ".dot", "-o", base + ".png"], check=True)
    subprocess.run(["dot", "-Tsvg", base + ".dot", "-o", base + ".svg"], check=True)
    os.remove(base + ".dot")


out = sys.argv[1]
os.makedirs(out, exist_ok=True)
A = [
    flow("u123", "UC01 · UC02 · UC03  작업 등록 → 이해 확인", "작성자", [
        ("a0", "내 작업", "#works", "팝업 · 측면 패널"), ("a1", "1/5 결과물 파일", "#new", "PDF · 20MB · SHA-256"), ("a2", "2/5 AI 사용 신고", "#new", "도구 · 모델 · 범위"),
        ("a3", "3/5 기여 기록 · 근거자료", "#new"), ("a4", "4/5 위험 분석", "#new", "점수 → 등급 · 과제 수"), ("a5", "5/5 검토 요청", "#new", "제출 전 확인 요약"),
        ("a6", "이해 확인", "#work/:id/challenge", "과제 1~3개"), ("a7", "작업 상세", "#work/:id/overview", "진행 표시: 검토 대기"),
        ("e1", "PDF 아님 · 20MB 초과\\n→ 같은 단계에 오류"), ("e2", "필수 항목 누락 · 범위 초과\\n→ 오류 요약 + 해당 칸"), ("e3", "답변 20자 미만 · 확신 미선택\\n→ 문항별 오류"),
        ("e4", "검토 시작 전 요청 취소\\n→ 제출 완료로"), ("e5", "임시 저장 → 목록에\\n‘작성 중’ 띠")], [
        act("a0", "a1", "새 작업 등록"), act("a1", "a2", "파일 확인 후 다음"), act("a2", "a3", "다음"), act("a3", "a4", "다음"), act("a4", "a5", "다음"),
        act("a5", "a6", "검토 요청 (확인 창)"), act("a6", "a7", "답변 제출 (확인 창)"),
        bad("a1", "e1"), bad("a3", "e2"), bad("a6", "e3"), bad("a6", "e4"), bad("a2", "e5")]),
    flow("u5", "UC05  수정본 재제출", "작성자", [
        ("b0", "알림 · 작업 상세", "#notifications", "‘수정 요청’ 알림"), ("b1", "작업 상세", "#work/:id/overview", "진행 표시: 수정 요청"),
        ("b2", "수정본 재제출", "#work/:id/revise", "항목별 반영 · 답변 · 새 PDF · (선택) 근거 수정"),
        ("b4", "이해 확인", "#work/:id/challenge", "v+1 이해 확인 대기 · 이전 답변은 ‘v1 · 참고’"), ("b3", "작업 상세", "#work/:id/overview", "새 버전 v+1 · 검토 대기"),
        ("e6", "답하지 않은 보완 항목\\n→ 재제출 불가 안내"), ("e7", "같은 파일 · 20MB 초과\\n→ 오류")], [
        act("b0", "b1", "알림 열기"), act("b1", "b2", "수정본 재제출"), act("b2", "b3", "재제출 · 근거 그대로 (확인 창)"),
        act("b2", "b4", "재제출 · 근거 변경 (확인 창)"), act("b4", "b3", "답변 다시 제출 (확인 창)"), bad("b2", "e6"), bad("b2", "e7")]),
]
B = [
    flow("u4", "UC04  결과물 검토", "검토자", [
        ("c0", "검토할 작업", "#review-queue"), ("c1", "검토 시작", "#work/:id/review", "파일 해시 대조"), ("c2", "평가", "#work/:id/review", "답변별 점수 · 근거 · 치명 오류"),
        ("c3", "체크리스트 · 피드백", "#work/:id/review", "4항목 · 메모 · 보완 항목"), ("c4", "검토할 작업", "#review-queue", "결과 토스트"),
        ("e8", "해시 불일치 → 검토 중지\\n위 · 변조 경고"), ("e9", "통과 조건 미충족\\n→ ‘검토 통과’ 꺼짐 + 이유 목록")], [
        act("c0", "c1", "작업 선택"), act("c1", "c2", "해시 일치"), act("c2", "c3", "다음 탭"), act("c3", "c4", "검토 통과 / 수정 요청 (확인 창)"), bad("c1", "e8"), bad("c3", "e9")]),
    flow("u6", "UC06 · UC10  최종 승인 · 반려 · 철회", "최종 승인자", [
        ("d0", "승인할 작업", "#approval-queue"), ("d1", "최종 승인", "#work/:id/approval", "승인 조건 5개 표시"), ("d2", "증명서 발급 중", "#work/:id/approval", "자동 발급"),
        ("d3", "발급 완료", "#work/:id/certificate"), ("d4", "작성자에게 수정 요청", "#approval-queue"), ("d5", "승인 효력: 승인 철회", "#work/:id/approval"),
        ("e10", "조건 미충족 → ‘최종 승인’ 꺼짐"), ("e11", "발급 실패 → 토스트\\n증명서 탭에서 재시도"), ("e12", "사유 없음 → 오류")], [
        act("d0", "d1", "작업 선택"), act("d1", "d2", "최종 승인 (확인 창)"), act("d2", "d3", "발급 처리 완료 *"), act("d1", "d4", "반려 사유 → 반려 (확인 창)"),
        act("d3", "d5", "승인 철회 · 사유 (확인 창)"), bad("d1", "e10"), bad("d2", "e11"), bad("d4", "e12")]),
    flow("u7", "UC07 · UC09  증명서 공유 · 이력 조회 · 알림", "작업 구성원", [
        ("f0", "내 작업", "#works", "필터 · 검색 · 정렬"), ("f1", "작업 상세", "#work/:id/overview", "진행 표시 5단계"), ("f2", "증명서", "#work/:id/certificate", "발급 상태 · 승인 효력 · 최신 버전"),
        ("f3", "공유 링크", "#work/:id/certificate", "만료 7일 · 30일(기본) · 없음"), ("f5", "공유 중지됨", "#work/:id/certificate", "검증 불가 · 승인 효력은 그대로"),
        ("f4", "버전 · 이력", "#work/:id/history", "버전 · 유형 필터 · 해시 체인 확인"), ("f6", "알림", "#notifications", "10종 · 읽지 않은 알림 강조"),
        ("e13", "발급 실패 → 발급 재시도"), ("e14", "조건에 맞는 기록 없음\\n→ 빈 상태 안내")], [
        act("f0", "f1", "작업 선택"), act("f1", "f2", "증명서 탭"), act("f2", "f3", "링크 만들기 → 복사 · QR"), act("f3", "f5", "공유 중지 (확인 창)"), act("f1", "f4", "버전 · 이력 탭"),
        act("f0", "f6", "알림 탭"), act("f6", "f1", "알림 열기 → 읽음"), bad("f2", "e13"), bad("f4", "e14")]),
    flow("u8", "UC08  승인 증명서 진위 검증", "외부 검증자", [
        ("g0", "공유 링크 · QR", "(외부)"), ("g1", "공개 검증", "#verify/:token", "승인 효력 · 최신 버전 · 서명 * · 파일 비교"), ("g2", "파일 비교 결과", "#verify/:token", "파일 일치 / 불일치"),
        ("e15", "링크 만료 · 공유 중지 · 없음\\n→ 대상 미식별 안내"), ("e16", "네트워크 오류\\n→ ‘확인 불가’ (철회로 바꾸지 않음)")], [
        act("g0", "g1", "링크 열기 (로그인 없음)"), act("g1", "g2", "전달받은 PDF 선택 → 기기에서 해시"), bad("g1", "e15"), bad("g1", "e16")]),
]
render("HAVE_태스크분석_1_작성자", "HAVE 태스크 분석 ① 작성자의 화면 흐름 (UC01 · UC02 · UC03 · UC05)", A)
render("HAVE_태스크분석_2_검토_승인_검증", "HAVE 태스크 분석 ② 검토자 · 최종 승인자 · 작업 구성원 · 외부 검증자의 화면 흐름 (UC04 · UC06~UC10)", B,
       "* 운영 서비스 설계: 서버가 전자서명해 발급하고 공개 검증이 서명을 확인한다. 브라우저 로컬 시연에는 서버 · 전자서명이 없어 발급은 브라우저에서 흉내 내고 서명은 ‘확인 불가’로 보인다.")
print("ok")
