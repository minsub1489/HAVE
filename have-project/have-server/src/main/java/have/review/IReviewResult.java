package have.review;

/**
 * 03 Review가 04 Approval에 제공하는 인터페이스 (컴포넌트 다이어그램 v2). 구현: ReviewService. 담당 B.
 */
public interface IReviewResult {

    /** 그 버전의 확정된 검토 결과. 끝난 검토가 없으면 null. */
    ConfirmedResult getConfirmedResult(long versionId);

    /** 그 버전이 검토를 통과했는가 (등급별 기준, 치명 오류 없음, 체크리스트 4/4, 보완 항목 없음). */
    boolean isPassed(long versionId);
}
