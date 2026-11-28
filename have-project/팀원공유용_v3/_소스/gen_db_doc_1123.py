"""DB 설계 문서 1123 — db_doc_1123.md의 <!--FINAL_SCHEMA-->를 schema_1123.py의 최종 스키마 표로 채운다.
실행: python3 gen_db_doc_1123.py <출력 md>"""
import sys, os
from schema_1123 import T, GROUPS, KO, NEW_TABLES, RENAMED_TABLES, RENAMED_COLS, UNIQUE_EXTRA, flags, dtype, TYPE_RULES

here = os.path.dirname(os.path.abspath(__file__))
R = lambda x: f'<b class="r">{x}</b>'


def col_note(t, c, fl):
    notes = []
    if "U" in fl and "PK" not in fl: notes.append("UNIQUE")
    if "N" in fl: notes.append("NULL 허용")
    if "X" in fl: notes.append("※ 정규형 예외")
    c_ = f"{c}: {dtype(t, c)}"
    txt = f"{c_} ({', '.join(notes)})" if notes else c_
    if t in NEW_TABLES:
        return R(txt)
    if "NEW" in fl:
        return R(txt + " (추가)")
    if "CHG" in fl:
        old = RENAMED_COLS.get((t, c))
        return R(txt + (f" (← {old})" if old else " (변경)"))
    return txt


def ref(x, c):
    parts = x.split(":")
    if len(parts) == 3 and parts[2] == "*":
        return None                               # 복합 FK의 앞 열 — 뒤 열에서 한 번 적는다
    if parts[1] == "WORK_VERSION" and c == "version_no":
        return None
    if parts[1] == "RISK_ASSESSMENT" and c in ("version_id", "assessment_seq"):
        return None
    return parts[1]


out = []
for g, _, _, ts in GROUPS:
    out.append(f"### {g} ({len(ts)}개)\n")
    out.append("| 테이블 | 기본 키 | 외래 키 → 참조 | 그 밖의 열 |\n| --- | --- | --- | --- |")
    for t in ts:
        cols = T[t]
        pk = "<br>".join(f"{c}: {dtype(t, c)}" for c, f in cols if "PK" in flags(f))
        fk = []
        for c, f in cols:
            fl = flags(f)
            for x in fl:
                if x.startswith("FK:"):
                    r = ref(x, c)
                    if r is None:
                        if c == "assessment_seq":
                            fk.append("(version_id, assessment_seq) → RISK_ASSESSMENT")
                        if c == "version_no" and x.startswith("FK:WORK_VERSION") and len(x.split(":")) == 2:
                            fk.append(R("(work_id, version_no) → WORK_VERSION (NULL 허용) (11-23 v3)"))
                        continue
                    extra = [n for n, k in (("UNIQUE", "U" in fl and "PK" not in fl), ("NULL 허용", "N" in fl), ("※ 정규형 예외", "X" in fl)) if k]
                    s = f"{c}: {dtype(t, c)} → {r}" + (f" ({', '.join(extra)})" if extra else "")
                    fk.append(R(s + (" (추가)" if t in NEW_TABLES or "NEW" in fl else " (변경)")) if (t in NEW_TABLES or "NEW" in fl or "CHG" in fl) else s)
        other = [col_note(t, c, flags(f)) for c, f in cols if not any(x == "PK" or x.startswith("FK:") for x in flags(f))]
        if t in UNIQUE_EXTRA and t == "WORK_VERSION":
            other.append(UNIQUE_EXTRA[t])
        name = f"**{t}**<br>{KO[t]}"
        if t in NEW_TABLES:
            name = f'{R(t)}<br>{KO[t]} {R("(1123 신규)")}'
        elif t in RENAMED_TABLES:
            name = f'{R(t)}<br>{KO[t]} {R("(← " + RENAMED_TABLES[t] + ")")}'
        out.append(f"| {name} | {pk} | {'<br>'.join(fk) or '—'} | {', '.join(other) or '—'} |")
    out.append("")
rules = ["| 클래스 다이어그램의 타입 | 열 이름 | 데이터 형식 | 비고 |", "| --- | --- | --- | --- |"] + [f"| {a} | {b.replace('*', chr(92) + '*')} | {c} | {d} |" for a, b, c, d in TYPE_RULES]
md = open(os.path.join(here, "db_doc_1123.md"), encoding="utf-8").read().replace("<!--FINAL_SCHEMA-->", "\n".join(out)).replace("<!--TYPE_RULES-->", "\n".join(rules))
open(sys.argv[1], "w", encoding="utf-8").write(md)
print("ok")
