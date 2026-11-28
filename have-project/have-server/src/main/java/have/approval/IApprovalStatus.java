package have.approval;

import java.util.List;

/**
 * 04 Approval이 05 Certificate · 06 Verification에 제공하는 인터페이스 (컴포넌트 다이어그램 v2). 구현: ApprovalService. 담당 C.
 */
public interface IApprovalStatus {

    /** 승인 결과와 증명서 발급의 근거. 없는 승인이면 404. */
    ApprovalResult getApprovalResult(long approvalId);

    /** 지금의 승인 효력과 같은 작업의 최신 버전 번호. 둘은 따로 알린다(철회와 후속 버전은 함께 성립할 수 있다). */
    ApprovalValidity getCurrentValidity(long approvalId);

    /** 증명서 발급을 기다리는 승인의 ID 목록 (커밋된 발급 요청 OutboxEvent 중 처리되지 않은 것). 서명 작업자가 읽는다. */
    List<Long> getPendingIssues();
}
