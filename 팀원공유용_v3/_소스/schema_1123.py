"""HAVE 최종 스키마 (1123) — 팀원의 '검토 반영판'(11-18, 테이블 28개·FK 36개)에 1118 산출물을 반영한 단일 정의.
DB 다이어그램, ER 다이어그램(Chen), DB 설계 문서가 이 파일 하나를 함께 쓴다.

열 표기: (이름, 플래그, 설명)
  플래그 = PK, FK:<참조 테이블>[:<참조 열>], U(UNIQUE), N(NULL 허용), X(3차 정규형 예외 ※),
           NEW(1123 추가), CHG(1123 변경 — 이름·코드 값·NULL 허용 여부)
"""

GROUPS = [
    ("사용자·작업", "#EFE7F7", "#7E57C2", ["USER", "WORK", "WORK_MEMBER"]),
    ("버전·AI 신고", "#E5F0FB", "#2F6DB5", ["WORK_VERSION", "AI_DISCLOSURE", "AI_TOOL_USAGE", "CONTRIBUTION", "EVIDENCE_ITEM", "VERSION_EVIDENCE"]),
    ("검토", "#E6F4E8", "#3C8D40", ["GATE_POLICY", "RISK_ASSESSMENT", "REVIEW_REQUEST", "CHALLENGE", "CHALLENGE_RESPONSE", "EVALUATION", "REVIEW",
                                   "CHECKLIST_ITEM", "REVIEW_CHECK", "FEEDBACK", "FEEDBACK_ITEM", "REVISION", "REVISION_DRAFT_FILE", "FEEDBACK_RESPONSE"]),
    ("승인·증명서", "#FDEFDD", "#D9822B", ["APPROVAL_CASE", "APPROVAL", "REVOCATION", "CERTIFICATE", "OUTBOX_EVENT", "SHARE_LINK"]),
    ("이력·알림", "#EEF0F2", "#5B6B7F", ["AUDIT_EVENT", "NOTIFICATION"]),
]

KO = {"USER": "사용자", "WORK": "작업", "WORK_MEMBER": "작업 멤버", "WORK_VERSION": "결과물 버전", "AI_DISCLOSURE": "AI 신고 사본",
      "AI_TOOL_USAGE": "AI 도구 사용", "CONTRIBUTION": "기여 기록", "EVIDENCE_ITEM": "근거자료", "VERSION_EVIDENCE": "버전-근거 연결",
      "GATE_POLICY": "위험 등급 기준", "RISK_ASSESSMENT": "위험 평가", "REVIEW_REQUEST": "검토 요청", "CHALLENGE": "이해 확인 과제",
      "CHALLENGE_RESPONSE": "과제 답변", "EVALUATION": "과제 평가", "REVIEW": "검토 회차", "CHECKLIST_ITEM": "체크리스트 항목",
      "REVIEW_CHECK": "체크 결과", "FEEDBACK": "검토 의견·판정", "FEEDBACK_ITEM": "보완 요청 항목", "REVISION": "수정 회차",
      "REVISION_DRAFT_FILE": "수정 초안 파일", "FEEDBACK_RESPONSE": "보완 항목 답변", "APPROVAL_CASE": "최종 결정 대상", "APPROVAL": "승인 기록",
      "REVOCATION": "철회 기록", "CERTIFICATE": "증명서", "OUTBOX_EVENT": "서명 요청", "SHARE_LINK": "공유 링크", "AUDIT_EVENT": "감사 이벤트",
      "NOTIFICATION": "알림"}

T = {
    "USER": [("user_id", "PK"), ("name", ""), ("email", "U"), ("password_hash", "NEW")],
    "WORK": [("work_id", "PK"), ("owner_id", "FK:USER"), ("title", ""), ("ai_disclosure_draft", "N NEW")],
    "WORK_MEMBER": [("work_id", "PK FK:WORK"), ("user_id", "PK FK:USER"), ("role", "PK")],
    "WORK_VERSION": [("version_id", "PK"), ("work_id", "FK:WORK"), ("version_no", ""), ("file_hash", ""), ("file_uri", ""), ("status", "CHG"),
                     ("change_reason", "N NEW"), ("created_at", ""), ("revision", "CHG")],
    "AI_DISCLOSURE": [("version_id", "PK FK:WORK_VERSION"), ("usage_scope", ""), ("no_ai_used", "")],
    "AI_TOOL_USAGE": [("version_id", "PK FK:AI_DISCLOSURE"), ("tool_seq", "PK"), ("tool_name", ""), ("model_name", ""), ("usage_method", ""), ("contribution", "")],
    "CONTRIBUTION": [("version_id", "PK FK:WORK_VERSION"), ("record_id", "PK"), ("stage", ""), ("actor_type", ""), ("note", ""), ("created_at", "")],
    "EVIDENCE_ITEM": [("evidence_id", "PK"), ("type", "CHG"), ("title", ""), ("uri", ""), ("file_hash", "N")],
    "VERSION_EVIDENCE": [("version_id", "PK FK:WORK_VERSION"), ("evidence_id", "PK FK:EVIDENCE_ITEM")],
    "GATE_POLICY": [("policy_version", "PK"), ("medium_min_total", ""), ("high_min_total", "")],
    "RISK_ASSESSMENT": [("version_id", "PK FK:WORK_VERSION"), ("assessment_seq", "PK"), ("policy_version", "FK:GATE_POLICY"), ("ai_usage_score", ""),
                        ("importance_score", ""), ("evidence_gap_score", ""), ("past_failure_score", ""), ("rationale", "NEW")],
    "REVIEW_REQUEST": [("request_id", "PK"), ("version_id", "FK:RISK_ASSESSMENT:*"), ("assessment_seq", "FK:RISK_ASSESSMENT"), ("reviewer_id", "FK:USER"),
                       ("state", "CHG"), ("message", "N NEW"), ("due_date", "N NEW"), ("requested_at", "")],
    "CHALLENGE": [("challenge_id", "PK"), ("request_id", "FK:REVIEW_REQUEST"), ("kind", ""), ("prompt", ""), ("rubric", "")],
    "CHALLENGE_RESPONSE": [("response_id", "PK"), ("challenge_id", "FK:CHALLENGE U"), ("answer", ""), ("confidence", "N NEW"), ("submitted_at", "N")],
    "EVALUATION": [("response_id", "PK FK:CHALLENGE_RESPONSE"), ("score", ""), ("reason", ""), ("critical", "")],
    "REVIEW": [("review_id", "PK"), ("request_id", "FK:REVIEW_REQUEST U"), ("state", "CHG"), ("memo", ""), ("review_digest", "")],
    "CHECKLIST_ITEM": [("item_id", "PK"), ("criterion", ""), ("required", "")],
    "REVIEW_CHECK": [("review_id", "PK FK:REVIEW"), ("item_id", "PK FK:CHECKLIST_ITEM"), ("checked", "")],
    "FEEDBACK": [("review_id", "PK FK:REVIEW"), ("evaluation_summary", ""), ("comment", ""), ("decision", "CHG")],
    "FEEDBACK_ITEM": [("feedback_item_id", "PK"), ("review_id", "FK:FEEDBACK"), ("target_section", ""), ("content", "")],
    "REVISION": [("revision_id", "PK"), ("review_id", "FK:REVIEW U N"), ("case_id", "FK:APPROVAL_CASE U N"), ("submitted_version_id", "FK:WORK_VERSION U N"),
                 ("state", "CHG"), ("due_date", "N NEW"), ("change_note", ""), ("response", "")],
    "REVISION_DRAFT_FILE": [("revision_id", "PK FK:REVISION"), ("file_seq", "PK"), ("file_uri", "")],
    "FEEDBACK_RESPONSE": [("feedback_item_id", "PK FK:FEEDBACK_ITEM"), ("applied", ""), ("response", ""), ("responded_at", "")],
    "APPROVAL_CASE": [("case_id", "PK"), ("review_id", "FK:REVIEW U"), ("version_id", "FK:WORK_VERSION U"), ("state", ""), ("rejection_reason", "N"),
                      ("decided_at", "N"), ("decision_key", "U N NEW")],
    "APPROVAL": [("approval_id", "PK"), ("case_id", "FK:APPROVAL_CASE U"), ("approver_id", "FK:USER"), ("approved_at", "")],
    "REVOCATION": [("revocation_id", "PK"), ("approval_id", "FK:APPROVAL U"), ("actor_id", "FK:USER"), ("reason", ""), ("revoked_at", ""), ("request_key", "U NEW")],
    "CERTIFICATE": [("certificate_id", "PK"), ("approval_id", "FK:APPROVAL U"), ("immutable_payload", ""), ("signing_state", ""),
                    ("signature", "N"), ("key_id", "N"), ("issued_at", "N")],
    "OUTBOX_EVENT": [("event_id", "PK"), ("certificate_id", "FK:CERTIFICATE U"), ("delivery_state", ""), ("retry_count", "")],
    "SHARE_LINK": [("link_id", "PK"), ("certificate_id", "FK:CERTIFICATE"), ("token_hash", "U"), ("expires_at", "N"), ("disabled_at", "N")],
    "AUDIT_EVENT": [("event_id", "PK"), ("work_id", "FK:WORK FK:WORK_VERSION:*"), ("version_no", "FK:WORK_VERSION N"), ("actor_id", "FK:USER N CHG"), ("action", ""),
                    ("reason", "N"), ("occurred_at", ""), ("prev_hash", ""), ("event_hash", "")],
    "NOTIFICATION": [("notification_id", "PK"), ("user_id", "FK:USER"), ("version_id", "FK:WORK_VERSION"), ("type", ""), ("created_at", ""), ("read_at", "N")],
}
NEW_TABLES = {"FEEDBACK_ITEM", "FEEDBACK_RESPONSE", "NOTIFICATION"}
RENAMED_TABLES = {"GATE_POLICY": "RISK_POLICY"}          # 1123 이름 → 검토 반영판 이름
RENAMED_COLS = {("WORK_VERSION", "revision"): "lock_version"}
UNIQUE_EXTRA = {"WORK_VERSION": "UNIQUE (work_id, version_no)",
                "REVIEW_REQUEST": "(version_id, assessment_seq) → RISK_ASSESSMENT",
                "AUDIT_EVENT": "(work_id, version_no) → WORK_VERSION"}

# 자식 쪽 다중도를 기본값(UNIQUE면 0..1, 아니면 0..*)과 다르게 그려야 하는 외래 키 (검토 반영판과 같음)
CHILD_MULT = {("WORK_MEMBER", "work_id"): "1..*", ("CHALLENGE", "request_id"): "1..*",
              ("AI_DISCLOSURE", "version_id"): "1", ("CERTIFICATE", "approval_id"): "1", ("OUTBOX_EVENT", "certificate_id"): "1"}

# ER 다이어그램(Chen)의 관계 — (이름, 부모, 자식, 부모 쪽 1/N, 자식 쪽 1/N, 점선 여부, 1123 추가·변경)
RELS = [
    ("소유", "USER", "WORK", "1", "N", False, ""), ("구성", "WORK", "WORK_MEMBER", "1", "N", False, ""), ("참여", "USER", "WORK_MEMBER", "1", "N", False, ""),
    ("버전 보유", "WORK", "WORK_VERSION", "1", "N", False, ""), ("신고", "WORK_VERSION", "AI_DISCLOSURE", "1", "1", False, ""),
    ("도구 포함", "AI_DISCLOSURE", "AI_TOOL_USAGE", "1", "N", False, ""), ("기여 기록", "WORK_VERSION", "CONTRIBUTION", "1", "N", False, ""),
    ("근거 첨부", "WORK_VERSION", "VERSION_EVIDENCE", "1", "N", False, ""), ("참조됨", "EVIDENCE_ITEM", "VERSION_EVIDENCE", "1", "N", False, ""),
    ("위험 평가", "WORK_VERSION", "RISK_ASSESSMENT", "1", "N", False, ""), ("기준 적용", "GATE_POLICY", "RISK_ASSESSMENT", "1", "N", False, "CHG"),
    ("요청 근거", "RISK_ASSESSMENT", "REVIEW_REQUEST", "1", "N", False, ""), ("검토자 지정", "USER", "REVIEW_REQUEST", "1", "N", False, ""),
    ("과제 출제", "REVIEW_REQUEST", "CHALLENGE", "1", "N", False, ""), ("답변", "CHALLENGE", "CHALLENGE_RESPONSE", "1", "1", False, ""),
    ("평가", "CHALLENGE_RESPONSE", "EVALUATION", "1", "1", False, ""), ("검토 개시", "REVIEW_REQUEST", "REVIEW", "1", "1", False, ""),
    ("점검", "REVIEW", "REVIEW_CHECK", "1", "N", False, ""), ("항목 사용", "CHECKLIST_ITEM", "REVIEW_CHECK", "1", "N", False, ""),
    ("판정", "REVIEW", "FEEDBACK", "1", "1", False, ""), ("보완 항목", "FEEDBACK", "FEEDBACK_ITEM", "1", "N", False, "NEW"),
    ("항목 답변", "FEEDBACK_ITEM", "FEEDBACK_RESPONSE", "1", "1", False, "NEW"),
    ("보완 요청", "REVIEW", "REVISION", "1", "1", True, ""), ("반려 보완", "APPROVAL_CASE", "REVISION", "1", "1", True, ""),
    ("재제출", "WORK_VERSION", "REVISION", "1", "1", True, ""), ("초안 파일", "REVISION", "REVISION_DRAFT_FILE", "1", "N", False, ""),
    ("결정 근거", "REVIEW", "APPROVAL_CASE", "1", "1", False, ""), ("최종 결정", "WORK_VERSION", "APPROVAL_CASE", "1", "1", False, ""),
    ("승인", "APPROVAL_CASE", "APPROVAL", "1", "1", False, ""), ("승인함", "USER", "APPROVAL", "1", "N", False, ""),
    ("철회", "APPROVAL", "REVOCATION", "1", "1", False, ""), ("철회함", "USER", "REVOCATION", "1", "N", False, ""),
    ("발급", "APPROVAL", "CERTIFICATE", "1", "1", False, ""), ("서명 요청", "CERTIFICATE", "OUTBOX_EVENT", "1", "1", False, ""),
    ("공유", "CERTIFICATE", "SHARE_LINK", "1", "N", False, ""), ("작업 이력", "WORK", "AUDIT_EVENT", "1", "N", False, ""),
    ("버전 대상", "WORK_VERSION", "AUDIT_EVENT", "1", "N", True, ""), ("행위자", "USER", "AUDIT_EVENT", "1", "N", True, "CHG"),
    ("알림 수신", "USER", "NOTIFICATION", "1", "N", False, "NEW"), ("알림 대상", "WORK_VERSION", "NOTIFICATION", "1", "N", False, "NEW"),
]


def flags(f):
    return f.split()


def fks():
    """외래 키 목록. 복합 외래 키 (version_id, assessment_seq) → RISK_ASSESSMENT는 한 개로 센다."""
    out = []
    for t, cols in T.items():
        npk = sum(1 for _, g in cols if "PK" in flags(g))
        for c, f in cols:
            fl = flags(f)
            for x in fl:
                if x.startswith("FK:"):
                    parts = x.split(":")
                    if len(parts) == 3 and parts[2] == "*":
                        continue                           # 복합 FK의 앞 열 — 뒤 열에서 한 번만 센다
                    parent = parts[1]
                    unique = "U" in fl or ("PK" in fl and npk == 1)
                    mult = CHILD_MULT.get((t, c), "0..1" if unique else "0..*")
                    out.append(dict(child=t, col=c, parent=parent, unique=unique, nullable="N" in fl, mult=mult,
                                    new=t in NEW_TABLES or "NEW" in fl, chg="CHG" in fl))
    return out


def pk_cols(t):
    return [c for c, f in T[t] if "PK" in flags(f)]


if __name__ == "__main__":
    print("tables", len(T), "fks", len(fks()), "rels", len(RELS), "cols", sum(len(v) for v in T.values()))
    assert len(RELS) == len(fks()) and set(T) == {t for g in GROUPS for t in g[3]}


# ── 데이터 형식 (11-23 · Ch09 p.35 주석 "클래스 다이어그램 활용해서 데이터 형식 정하고 FK 정하면 됨") ──
# 클래스 다이어그램의 속성 타입을 SQL 형식으로 옮긴다. 외래 키는 참조하는 기본 키와 같은 형식이다.
# 문자열 길이는 크롬 확장 프로그램의 입력 검사(model.js · review-model.js)와 같은 값이다.
TYPE_RULES = [
    ("ID (객체 식별자)", "*_id", "BIGINT", "기본 키와 그것을 참조하는 외래 키"),
    ("Integer (순번 · 번호)", "*_seq, record_id, version_no, revision, retry_count", "INT", "버전 안의 순번, 잠금 번호, 재시도 횟수"),
    ("Integer (점수)", "*_score, score, *_min_total", "SMALLINT", "위험 지표 0~3, 답변 점수 0~2, 등급 경계 4·7"),
    ("SHA256", "*_hash, review_digest", "CHAR(64)", "SHA-256 16진수 64자"),
    ("URI", "*_uri, uri", "VARCHAR(2000)", "파일 위치, 근거자료 주소"),
    ("Instant", "*_at", "TIMESTAMP", "시각 (UTC 저장, 화면은 KST)"),
    ("Date", "due_date", "DATE", "검토 기한, 보완 기한"),
    ("Boolean", "no_ai_used, critical, required, checked, applied", "BOOLEAN", ""),
    ("열거형 (코드)", "status, state, role, type, kind, stage, actor_type, decision, confidence, *_state, action", "VARCHAR(30)",
     "부록 A의 문자 코드만 허용 (CHECK 제약)"),
    ("String", "그 밖의 문자열", "VARCHAR(n) · TEXT", "n은 확장 프로그램의 입력 검사 길이. 5,000자를 넘을 수 있는 긴 글은 TEXT"),
    ("값 객체 사본", "ai_disclosure_draft, immutable_payload", "JSON", "정규화 JSON(키 정렬) 그대로 보관"),
]
_TEXT = {  # (테이블, 열): 형식 — 길이 근거는 입력 검사
    ("USER", "name"): "VARCHAR(50)", ("USER", "email"): "VARCHAR(254)", ("USER", "password_hash"): "VARCHAR(255)",
    ("WORK", "title"): "VARCHAR(100)", ("WORK_VERSION", "change_reason"): "VARCHAR(2000)",
    ("AI_DISCLOSURE", "usage_scope"): "VARCHAR(5000)",
    ("AI_TOOL_USAGE", "tool_name"): "VARCHAR(100)", ("AI_TOOL_USAGE", "model_name"): "VARCHAR(100)",
    ("AI_TOOL_USAGE", "usage_method"): "VARCHAR(100)", ("AI_TOOL_USAGE", "contribution"): "VARCHAR(2000)",
    ("CONTRIBUTION", "note"): "VARCHAR(2000)", ("EVIDENCE_ITEM", "title"): "VARCHAR(200)",
    ("GATE_POLICY", "policy_version"): "VARCHAR(20)", ("RISK_ASSESSMENT", "policy_version"): "VARCHAR(20)",
    ("RISK_ASSESSMENT", "rationale"): "VARCHAR(2000)", ("REVIEW_REQUEST", "message"): "VARCHAR(1000)",
    ("CHALLENGE", "prompt"): "TEXT", ("CHALLENGE", "rubric"): "TEXT", ("CHALLENGE_RESPONSE", "answer"): "TEXT",
    ("EVALUATION", "reason"): "VARCHAR(2000)", ("REVIEW", "memo"): "VARCHAR(2000)", ("CHECKLIST_ITEM", "criterion"): "VARCHAR(200)",
    ("FEEDBACK", "evaluation_summary"): "VARCHAR(2000)", ("FEEDBACK", "comment"): "VARCHAR(2000)",
    ("FEEDBACK_ITEM", "target_section"): "VARCHAR(100)", ("FEEDBACK_ITEM", "content"): "VARCHAR(1000)",
    ("REVISION", "change_note"): "VARCHAR(2000)", ("REVISION", "response"): "VARCHAR(2000)",
    ("FEEDBACK_RESPONSE", "response"): "VARCHAR(1000)", ("APPROVAL_CASE", "rejection_reason"): "VARCHAR(2000)",
    ("APPROVAL_CASE", "decision_key"): "VARCHAR(64)", ("REVOCATION", "reason"): "VARCHAR(2000)", ("REVOCATION", "request_key"): "VARCHAR(64)",
    ("CERTIFICATE", "signature"): "TEXT", ("CERTIFICATE", "key_id"): "VARCHAR(50)", ("AUDIT_EVENT", "action"): "VARCHAR(40)",
    ("AUDIT_EVENT", "reason"): "VARCHAR(2000)",
}
_CODE = {"status", "state", "role", "type", "kind", "stage", "actor_type", "decision", "confidence", "signing_state", "delivery_state"}
_BOOL = {"no_ai_used", "critical", "required", "checked", "applied"}
_INT = {"tool_seq", "assessment_seq", "file_seq", "record_id", "version_no", "revision", "retry_count"}


def dtype(t, c):
    """(테이블, 열)의 SQL 데이터 형식"""
    if (t, c) in _TEXT:
        return _TEXT[(t, c)]
    if c in ("ai_disclosure_draft", "immutable_payload"):
        return "JSON"
    if c in _INT:
        return "INT"
    if c.endswith("_score") or c == "score" or c.endswith("_min_total"):
        return "SMALLINT"
    if c.endswith("_id"):
        return "BIGINT"
    if c.endswith("_hash") or c == "review_digest":
        return "CHAR(64)"
    if c.endswith("_uri") or c == "uri":
        return "VARCHAR(2000)"
    if c == "due_date":
        return "DATE"
    if c.endswith("_at"):
        return "TIMESTAMP"
    if c in _BOOL:
        return "BOOLEAN"
    if c in _CODE:
        return "VARCHAR(30)"
    raise KeyError((t, c))


def _check_types():
    for t, cols in T.items():
        for c, f in cols:
            ty = dtype(t, c)
            for x in flags(f):
                if x.startswith("FK:"):
                    parent = x.split(":")[1]
                    pc = c if c in pk_cols(parent) else (pk_cols(parent)[-1] if len(pk_cols(parent)) > 1 else pk_cols(parent)[0])
                    if parent == "RISK_ASSESSMENT":
                        pc = "assessment_seq" if c == "assessment_seq" else "version_id"
                    if parent == "WORK_VERSION" and t == "AUDIT_EVENT":   # 11-23 v3: (work_id, version_no) → WORK_VERSION 후보 키
                        pc = c
                    assert dtype(parent, pc) == ty, (t, c, ty, parent, pc, dtype(parent, pc))


_check_types()
