package have.work.status;

import have.common.code.WorkStatus;

/**
 * 상태 변경 한 건의 내용. 옵서버는 WorkStatusSubject.getState()로 이것을 읽는다 (디자인 패턴 문서 7장 예제의 getter 기준).
 * 11/28 고정. 1단계 동안 바꾸지 않는다. 옵서버가 더 필요한 값은 docs/phase1/<담당>.md에 적고 통합 뒤에 더한다(가이드라인 4.8).
 * 알림 받을 사람(작성자 · 검토자 · 최종 승인자)도 여기 담아 넘긴다. 옵서버는 다른 서브시스템의 테이블을 읽어 찾지 않는다.
 * 작성자는 WORK.owner_id, 검토자 · 최종 승인자는 WorkStatusSubject가 IAuthorization.getMembers로 채운다
 * (작업마다 한 명, 가이드라인 5.4 · docs/design-changes.md 열린 항목 2 · 18의 결정).
 */
public class StatusChange {

    private final long workId;
    private final long versionId;
    private final int versionNo;
    private final WorkStatus from;
    private final WorkStatus to;
    private final long actorId;
    private final boolean newVersion;
    private final Long previousVersionId;
    private final boolean resubmission;
    private final long authorId;
    private final Long reviewerId;
    private final Long approverId;
    private final String reason;

    public StatusChange(long workId, long versionId, int versionNo, WorkStatus from, WorkStatus to, long actorId,
            boolean newVersion, Long previousVersionId, boolean resubmission, long authorId, Long reviewerId,
            Long approverId, String reason) {
        this.workId = workId;
        this.versionId = versionId;
        this.versionNo = versionNo;
        this.from = from;
        this.to = to;
        this.actorId = actorId;
        this.newVersion = newVersion;
        this.previousVersionId = previousVersionId;
        this.resubmission = resubmission;
        this.authorId = authorId;
        this.reviewerId = reviewerId;
        this.approverId = approverId;
        this.reason = reason;
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

    /** 바뀌기 전 상태. 새로 생긴 버전이면 null */
    public WorkStatus getFrom() {
        return from;
    }

    public WorkStatus getTo() {
        return to;
    }

    /** 상태를 바꾼 사용자 */
    public long getActorId() {
        return actorId;
    }

    /** 이 변경으로 새 버전이 생겼는가 (버전 등록, 재제출) */
    public boolean isNewVersion() {
        return newVersion;
    }

    /** 새 버전일 때 직전 버전. 없으면 null */
    public Long getPreviousVersionId() {
        return previousVersionId;
    }

    /** 수정본 재제출(UC05)로 생긴 버전인가. 답변 제출 알림을 "재제출"로 바꿀 때도 쓴다 */
    public boolean isResubmission() {
        return resubmission;
    }

    public long getAuthorId() {
        return authorId;
    }

    /** 이 작업의 지정 검토자(IAuthorization.getMembers(workId, REVIEWER)). 첫 검토 요청 전이면 null */
    public Long getReviewerId() {
        return reviewerId;
    }

    /** 이 작업의 지정 최종 승인자(IAuthorization.getMembers(workId, APPROVER)). 첫 검토 요청 전이면 null */
    public Long getApproverId() {
        return approverId;
    }

    /** 취소 · 수정 요청 · 반려의 사유. 없으면 null */
    public String getReason() {
        return reason;
    }
}
