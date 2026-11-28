package have.review;

import have.common.code.ReviewDecision;

/** IReviewResult.getConfirmedResult가 돌려주는 확정된 검토 결과. 11/28 고정. 1단계 동안 바꾸지 않는다(가이드라인 4.8). */
public class ConfirmedResult {

    private final long reviewId;
    private final long requestId;
    private final long versionId;
    private final long reviewerId;
    private final ReviewDecision decision;
    private final String reviewDigest;

    public ConfirmedResult(long reviewId, long requestId, long versionId, long reviewerId, ReviewDecision decision, String reviewDigest) {
        this.reviewId = reviewId;
        this.requestId = requestId;
        this.versionId = versionId;
        this.reviewerId = reviewerId;
        this.decision = decision;
        this.reviewDigest = reviewDigest;
    }

    public long getReviewId() {
        return reviewId;
    }

    public long getRequestId() {
        return requestId;
    }

    public long getVersionId() {
        return versionId;
    }

    public long getReviewerId() {
        return reviewerId;
    }

    public ReviewDecision getDecision() {
        return decision;
    }

    /** 검토 내용 전체의 SHA-256 (REVIEW.review_digest). 승인 증명서에 들어간다 */
    public String getReviewDigest() {
        return reviewDigest;
    }
}
