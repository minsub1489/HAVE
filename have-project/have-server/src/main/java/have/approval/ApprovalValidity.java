package have.approval;

import have.common.code.ApprovalEffect;

/** IApprovalStatus.getCurrentValidity가 돌려주는 값: 승인 효력과 최신 버전 번호. */
public class ApprovalValidity {

    private final ApprovalEffect effect;
    private final int versionNo;
    private final int latestVersionNo;

    public ApprovalValidity(ApprovalEffect effect, int versionNo, int latestVersionNo) {
        this.effect = effect;
        this.versionNo = versionNo;
        this.latestVersionNo = latestVersionNo;
    }

    /** VALID 또는 REVOKED (승인이 없으면 NONE) */
    public ApprovalEffect getEffect() {
        return effect;
    }

    /** 이 승인이 가리키는 버전 번호 */
    public int getVersionNo() {
        return versionNo;
    }

    /** 같은 작업의 최신 버전 번호. versionNo보다 크면 후속 버전이 있다 */
    public int getLatestVersionNo() {
        return latestVersionNo;
    }

    public boolean isLatest() {
        return versionNo == latestVersionNo;
    }
}
