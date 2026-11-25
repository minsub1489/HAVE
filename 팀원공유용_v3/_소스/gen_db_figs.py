"""HAVE DB 다이어그램(테이블 관계도, 까치발 표기)과 ER 다이어그램(Chen 표기) — 1123.
스키마는 schema_1123.py 하나에서 읽는다. 빨간색 = 검토 반영판(11-18) 대비 1123에서 추가·변경한 것.
실행: python3 gen_db_figs.py <출력 폴더>"""
import sys, os, subprocess
from schema_1123 import T, GROUPS, KO, NEW_TABLES, RENAMED_TABLES, RENAMED_COLS, UNIQUE_EXTRA, RELS, flags, fks, pk_cols, dtype

out = sys.argv[1] if len(sys.argv) > 1 else "."
RED, INK, MUTED, LINE = "#C8102E", "#25313D", "#6B7785", "#4A5868"
TYC = "#1F5F8B"   # 데이터 형식 글자색 (11-23)
FN = "Noto Sans CJK KR"
GCOL = {t: (fill, stroke) for _, fill, stroke, ts in GROUPS for t in ts}
SUB = "기준: 검토 반영판(11-18, 테이블 28개 · 외래 키 36개) + 1118 산출물(HCI 프로토타입 · 통일표 · 컴포넌트) · 데이터 형식 추가 · 11-23 v3: 로그인 열, 3차 정규형 예외 정리"


def run(name, dot):
    base = os.path.join(out, name)
    open(base + ".dot", "w", encoding="utf-8").write(dot)
    subprocess.run(["dot", "-Tsvg", base + ".dot", "-o", base + ".svg"], check=True)
    subprocess.run(["dot", "-Tpng", "-Gdpi=144", base + ".dot", "-o", base + ".png"], check=True)
    os.remove(base + ".dot")


# ── DB 다이어그램 ─────────────────────────────────────────────
def table(t):
    fill, stroke = GCOL[t]
    new_t, ren = t in NEW_TABLES, RENAMED_TABLES.get(t)
    border = RED if (new_t or ren) else stroke
    tag = f'<BR/><FONT COLOR="{RED}" POINT-SIZE="9"><B>1123 신규</B></FONT>' if new_t else (
        f'<BR/><FONT COLOR="{RED}" POINT-SIZE="9"><B>이름 변경 ← {ren}</B></FONT>' if ren else "")
    rows = [f'<TR><TD COLSPAN="4" BGCOLOR="{fill}"><B>{t}</B><BR/><FONT POINT-SIZE="9" COLOR="{MUTED}">{KO[t]}</FONT>{tag}</TD></TR>']
    for c, f in T[t]:
        fl = flags(f)
        name = f"<U>{c}</U>" if "PK" in fl else c
        marks = (" ◇" if "U" in fl else "") + (" ○" if "N" in fl else "") + (" ※" if "X" in fl else "")
        key = " ".join(k for k in ("PK", "FK") if any(x == k or x.startswith(k + ":") for x in fl)) or " "
        if (("NEW" in fl) or ("CHG" in fl)) and not new_t:
            old = RENAMED_COLS.get((t, c))
            note = "추가" if "NEW" in fl else (f"← {old}" if old else "변경")
            rows.append(f'<TR><TD PORT="{c}_w" ALIGN="LEFT" BGCOLOR="#FDECEE"><FONT COLOR="{RED}"><B>{name}</B></FONT></TD>'
                        f'<TD ALIGN="LEFT" BGCOLOR="#FDECEE"><FONT COLOR="{TYC}" POINT-SIZE="9">{dtype(t, c)}</FONT></TD>'
                        f'<TD ALIGN="LEFT" BGCOLOR="#FDECEE"><FONT COLOR="{RED}" POINT-SIZE="9">{marks} {note}</FONT></TD>'
                        f'<TD PORT="{c}_e" ALIGN="RIGHT" BGCOLOR="#FDECEE"><FONT COLOR="{MUTED}" POINT-SIZE="9">{key}</FONT></TD></TR>')
        else:
            colr = RED if new_t else INK
            rows.append(f'<TR><TD PORT="{c}_w" ALIGN="LEFT"><FONT COLOR="{colr}">{name}</FONT></TD><TD ALIGN="LEFT"><FONT POINT-SIZE="9" COLOR="{TYC}">{dtype(t, c)}</FONT></TD>'
                        f'<TD ALIGN="LEFT"><FONT POINT-SIZE="9" COLOR="{MUTED}">{marks or " "}</FONT></TD>'
                        f'<TD PORT="{c}_e" ALIGN="RIGHT"><FONT COLOR="{MUTED}" POINT-SIZE="9">{key}</FONT></TD></TR>')
    if t in UNIQUE_EXTRA:
        rows.append(f'<TR><TD COLSPAN="4" ALIGN="LEFT"><FONT POINT-SIZE="8" COLOR="{MUTED}">{UNIQUE_EXTRA[t]}</FONT></TD></TR>')
    return (f'  {t} [label=<<TABLE BORDER="{2 if (new_t or ren) else 1}" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" COLOR="{border}">'
            f'{"".join(rows)}</TABLE>>];')


N_NEW = sum(1 for t, cols in T.items() if t not in NEW_TABLES for c, f in cols if "NEW" in flags(f))
N_CODE = sum(1 for t, cols in T.items() for c, f in cols if "CHG" in flags(f) and (t, c) not in RENAMED_COLS and "N" not in flags(f))
N_NULL = sum(1 for t, cols in T.items() for c, f in cols if "CHG" in flags(f) and "N" in flags(f))
SUMMARY = f"테이블 신규 {len(NEW_TABLES)}개 · 열 추가 {N_NEW}개 · 이름 변경 {len(RENAMED_TABLES) + len(RENAMED_COLS)}개 · 코드 값 변경 {N_CODE}개 · NULL 허용 {N_NULL}개"
ARROW = {"1": "teetee", "0..1": "teeodot", "0..*": "crowodot", "1..*": "crowtee"}
d = ['digraph DB {', f'  graph [rankdir=LR, fontname="{FN}", fontsize=24, labelloc=t, nodesep=0.28, ranksep=0.9, pad=0.4, splines=true, newrank=true,',
     f'    label=<<B>HAVE 데이터베이스 · DB 다이어그램 (테이블 관계도)</B><BR/><FONT POINT-SIZE="13">테이블 {len(T)}개 · 외래 키 {len(fks())}개 · {SUB}</FONT><BR/> >];',
     f'  node [shape=plain, fontname="{FN}", fontsize=11];', f'  edge [color="{LINE}", arrowsize=0.75, penwidth=1.1];']
for i, (g, fill, stroke, ts) in enumerate(GROUPS):
    d.append(f'  subgraph cluster_{i} {{ label=<<B>{g}</B>>; fontsize=17; style="rounded,dashed"; color="{stroke}";')
    d += [table(t) for t in ts]
    d.append("  }")
for k in fks():
    pc = pk_cols(k["parent"])
    pcol = k["col"] if k["col"] in pc else pc[-1] if len(pc) > 1 else pc[0]
    if k["parent"] == "RISK_ASSESSMENT":
        pcol = "assessment_seq"
    if k["parent"] == "WORK_VERSION" and k["col"] == "version_no":   # 11-23 v3: (work_id, version_no) 복합 FK
        pcol = "version_no"
    col = RED if (k["new"] or k["chg"]) else LINE
    style = "dashed" if k["nullable"] else "solid"
    d.append(f'  {k["parent"]}:{pcol}_e -> {k["child"]}:{k["col"]}_w [dir=both, arrowtail={"teeodot" if k["nullable"] else "teetee"}, '
             f'arrowhead={ARROW[k["mult"]]}, style={style}, color="{col}"];')
d.append(f'  legend [shape=plain, label=<<TABLE BORDER="1" COLOR="#B8C2CC" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3">'
         f'<TR><TD ALIGN="LEFT"><B>범례</B></TD></TR>'
         f'<TR><TD ALIGN="LEFT">열 이름 옆 파란 글자 = 데이터 형식 (11-23) · 밑줄 = 기본 키(PK) · FK = 외래 키 · ◇ = UNIQUE · ○ = NULL 허용 · 모든 테이블 3차 정규형 (11-23 v3)</TD></TR>'
         f'<TR><TD ALIGN="LEFT">선 끝: ||= 정확히 1 · |○ = 0 또는 1 · ○&lt; = 0 이상 · |&lt; = 1 이상 · 선은 부모의 키 열에서 자식의 FK 열로 · 점선 = NULL 허용 외래 키</TD></TR>'
         f'<TR><TD ALIGN="LEFT"><FONT COLOR="{RED}"><B>빨간색 = 1123에서 추가·변경 ({SUMMARY})</B></FONT></TD></TR></TABLE>>];')
d.append("}")
run("HAVE_DB_다이어그램", "\n".join(d))

# ── ER 다이어그램 (Chen) ────────────────────────────────────────
e = ['graph ERD {', f'  graph [fontname="{FN}", fontsize=24, labelloc=t, nodesep=0.35, ranksep=0.45, pad=0.4, splines=true, newrank=true,',
     f'    label=<<B>HAVE 데이터베이스 · ER 다이어그램 (Chen 표기)</B><BR/><FONT POINT-SIZE="13">엔티티 {len(T)}개 · 관계 {len(RELS)}개 · 사각형 = 엔티티, 마름모 = 관계, 1 / N = 관계의 타입 (Ch09 p.22·32) · 2026-11-23</FONT><BR/> >];',
     f'  node [fontname="{FN}", fontsize=12];', f'  edge [color="{LINE}", fontname="{FN}", fontsize=12, fontcolor="{INK}", penwidth=1.1];']
GROUP_OF = {t: gi for gi, (_, _, _, ts) in enumerate(GROUPS) for t in ts}
for gi, (g, fill, stroke, ts) in enumerate(GROUPS):
    e.append(f'  subgraph cluster_{gi} {{ label=<<B>{g}</B>>; fontsize=17; style="rounded,dashed"; color="{stroke}";')
    for t in ts:
        red = t in NEW_TABLES or t in RENAMED_TABLES
        extra = f'<BR/><FONT POINT-SIZE="9" COLOR="{RED}"><B>{"1123 신규" if t in NEW_TABLES else "이름 변경 ← " + RENAMED_TABLES[t]}</B></FONT>' if red else ""
        e.append(f'    {t} [shape=box, style="filled", fillcolor="{fill}", color="{RED if red else stroke}", penwidth={2.2 if red else 1.4}, '
                 f'label=<<B>{t}</B><BR/><FONT POINT-SIZE="9">{KO[t]}</FONT>{extra}>];')
    # 관계 마름모는 부모와 자식이 같은 영역이면 그 영역 안에 둔다
    for i, (name, p, c, cp, cc, dashed, tag) in enumerate(RELS):
        if GROUP_OF[p] == gi and GROUP_OF[c] == gi:
            e.append(f'    R{i};')
    e.append("  }")
for i, (name, p, c, cp, cc, dashed, tag) in enumerate(RELS):
    red = bool(tag)
    e.append(f'  R{i} [shape=diamond, style="filled", fillcolor="white", color="{RED if red else LINE}", fontcolor="{RED if red else INK}", '
             f'fontsize=10, width=0.9, height=0.5, margin=0.02, label="{name}"];')
    st = "dashed" if dashed else "solid"
    col = RED if red else LINE
    w = 3 if GROUP_OF[p] == GROUP_OF[c] else 1
    e.append(f'  {p} -- R{i} [style={st}, color="{col}", weight={w}, taillabel=<<B>{cp}</B>>, labeldistance=1.4];')
    e.append(f'  R{i} -- {c} [style={st}, color="{col}", weight={w}, headlabel=<<B>{cc}</B>>, labeldistance=1.4];')
e.append(f'  legend [shape=plain, label=<<TABLE BORDER="1" COLOR="#B8C2CC" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3">'
         f'<TR><TD ALIGN="LEFT"><B>범례</B></TD></TR><TR><TD ALIGN="LEFT">사각형 = 엔티티 · 마름모 = 관계 (이름은 마름모 안)</TD></TR>'
         f'<TR><TD ALIGN="LEFT">1 / N = 관계의 타입 (1:1, 1:N). M:N은 연결 엔티티 VERSION_EVIDENCE로 풀었다</TD></TR>'
         f'<TR><TD ALIGN="LEFT">점선 = 있을 수도 없을 수도 있는 관계 (NULL 허용 외래 키) · 속성은 DB 다이어그램에 적었다</TD></TR>'
         f'<TR><TD ALIGN="LEFT"><FONT COLOR="{RED}"><B>빨간색 = 1123 추가·변경: 엔티티 3개 신규, GATE_POLICY 이름, 관계 4개 신규, 행위자 관계 선택(익명 검증)</B></FONT></TD></TR></TABLE>>];')
e.append("}")
run("HAVE_ERD", "\n".join(e))
print("ok", len(T), len(fks()), len(RELS))
