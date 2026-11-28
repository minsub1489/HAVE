package have.work;

import java.time.LocalDate;

import have.common.code.WorkStatus;

/**
 * 02 Work가 03 Review · 04 Approval에 제공하는 인터페이스 (컴포넌트 다이어그램 v2).
 * 구현은 A가 정한다(스프링 빈은 하나여야 한다. 예: VersionService가 구현하고 setWorkStatus는 WorkStatusSubject에 넘김). 담당 A. 11/28 고정.
 */
public interface IWorkVersion {

    /** 검토·승인 대상 버전의 정보. 없는 버전이면 404. */
    ReviewTarget getReviewTarget(long versionId);

    /** 등록 당시의 파일 SHA-256 (WORK_VERSION.file_hash). */
    String getVersionHash(long versionId);

    /**
     * 작업의 현재 버전 상태를 바꾼다. 작업 상태를 바꾸는 유일한 지점이다.
     * 상태 다이어그램 ①에 없는 전이면 409. 바꾼 뒤 옵서버(이력 · 알림 · 발급 요청 · 재검토 연결)를 같은 트랜잭션 안에서 부른다.
     */
    void setWorkStatus(long workId, WorkStatus status);

    /**
     * 사유를 함께 남기는 상태 변경 (검토 요청 취소 · 수정 요청 · 반려, 재제출의 근거 변경 판정).
     * 사유는 StatusChange.getReason()으로 옵서버에 전달되어 감사 이력의 reason에 남는다.
     * 설계서의 setWorkStatus(workId, status)에는 사유 자리가 없어 더한 것이다(docs/design-changes.md 1.1의 12번).
     */
    void setWorkStatus(long workId, WorkStatus status, String reason);

    /**
     * 수정 회차(REVISION, 상태 OPEN)를 만든다. 검토자의 수정 요청(03, B13)은 reviewId를, 최종 승인자의 반려(04, C14)는 caseId를 넘긴다(둘 중 하나만).
     * 부르는 쪽은 이어서 setWorkStatus(workId, REVISION_REQUIRED, 사유)를 부른다. REVISION은 02의 테이블이라 03 · 04가 직접 쓰지 않는다.
     * 설계서에 없어 더한 오퍼레이션이다(docs/design-changes.md 1.1의 16번).
     *
     * @param versionId 수정을 요청받은 버전. REVIEW_PENDING · IN_REVIEW · APPROVAL_PENDING이 아니면 409
     * @param dueDate   보완 기한. 반려는 null
     * @return 새 revision_id
     */
    long createRevision(long versionId, Long reviewId, Long caseId, LocalDate dueDate);
}
