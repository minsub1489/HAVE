package have.audit;

/** IAuditLog.record의 payload. AUDIT_EVENT의 version_no와 reason에 들어간다. */
public class AuditPayload {

    private final Integer versionNo;
    private final String reason;

    private AuditPayload(Integer versionNo, String reason) {
        this.versionNo = versionNo;
        this.reason = reason;
    }

    /** 버전도 사유도 없는 이벤트 (예: 작업 생성) */
    public static AuditPayload none() {
        return new AuditPayload(null, null);
    }

    public static AuditPayload of(int versionNo) {
        return new AuditPayload(versionNo, null);
    }

    public static AuditPayload of(int versionNo, String reason) {
        return new AuditPayload(versionNo, reason);
    }

    /** 대상 버전 번호. 버전과 무관한 이벤트면 null */
    public Integer getVersionNo() {
        return versionNo;
    }

    /** 사유나 덧붙일 내용(취소 · 반려 · 철회 사유, 재제출의 근거 변경 판정 등). 없으면 null */
    public String getReason() {
        return reason;
    }
}
