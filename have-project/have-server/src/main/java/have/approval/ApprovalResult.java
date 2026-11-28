package have.approval;

import java.time.Instant;

/** IApprovalStatus.getApprovalResult가 돌려주는 승인 결과. 증명서 내용(immutable_payload)의 재료다. 11/28 고정. 1단계 동안 바꾸지 않는다(더 필요한 값은 docs/phase1/C.md에). */
public class ApprovalResult {

    private final long approvalId;
    private final long caseId;
    private final long workId;
    private final long versionId;
    private final int versionNo;
    private final long approverId;
    private final Instant approvedAt;
    private final String fileHash;
    private final String reviewDigest;

    public ApprovalResult(long approvalId, long caseId, long workId, long versionId, int versionNo, long approverId,
            Instant approvedAt, String fileHash, String reviewDigest) {
        this.approvalId = approvalId;
        this.caseId = caseId;
        this.workId = workId;
        this.versionId = versionId;
        this.versionNo = versionNo;
        this.approverId = approverId;
        this.approvedAt = approvedAt;
        this.fileHash = fileHash;
        this.reviewDigest = reviewDigest;
    }

    public long getApprovalId() {
        return approvalId;
    }

    public long getCaseId() {
        return caseId;
    }

    public long getWorkId() {
        return workId;
    }

    public long getVersionId() {
        return versionId;
    }

    public int getVersionNo() {
        return versionNo;
    }

    public long getApproverId() {
        return approverId;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    /** 승인한 버전의 파일 SHA-256 */
    public String getFileHash() {
        return fileHash;
    }

    /** 승인의 근거가 된 검토 회차의 요약 해시 */
    public String getReviewDigest() {
        return reviewDigest;
    }
}
