package have.work;

import have.common.code.WorkStatus;

/**
 * IWorkVersion.getReviewTarget이 돌려주는 버전 요약. 03(검토) · 04(승인) · 05(증명서) · 06(검증)이 02의 데이터를 볼 때 이것만 쓴다. 11/28 고정.
 * 1단계(각자 작업) 동안에는 필드를 바꾸지 않는다. 더 필요한 값은 docs/phase1/<담당>.md에 적어 두고 통합 뒤에 더한다.
 */
public class ReviewTarget {

    private final long workId;
    private final long versionId;
    private final int versionNo;
    private final int latestVersionNo;
    private final long authorId;
    private final String title;
    private final String fileName;
    private final WorkStatus status;
    private final String fileHash;
    private final String currentFileHash;
    private final int revision;
    private final boolean noAiUsed;

    public ReviewTarget(long workId, long versionId, int versionNo, int latestVersionNo, long authorId, String title,
            String fileName, WorkStatus status, String fileHash, String currentFileHash, int revision, boolean noAiUsed) {
        this.workId = workId;
        this.versionId = versionId;
        this.versionNo = versionNo;
        this.latestVersionNo = latestVersionNo;
        this.authorId = authorId;
        this.title = title;
        this.fileName = fileName;
        this.status = status;
        this.fileHash = fileHash;
        this.currentFileHash = currentFileHash;
        this.revision = revision;
        this.noAiUsed = noAiUsed;
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

    /** 같은 작업의 최신 버전 번호. versionNo보다 크면 후속 버전이 있다(승인 효력 · 공개 검증의 "후속 버전 vN 있음") */
    public int getLatestVersionNo() {
        return latestVersionNo;
    }

    /** 작성자(WORK.owner_id). 자기 검토 · 자기 승인 금지를 확인할 때 쓴다 */
    public long getAuthorId() {
        return authorId;
    }

    public String getTitle() {
        return title;
    }

    /** 결과물 PDF의 원래 이름(증명서 · 공개 검증에 표시). 저장 위치는 담지 않는다 */
    public String getFileName() {
        return fileName;
    }

    public WorkStatus getStatus() {
        return status;
    }

    /** 등록 당시의 SHA-256 */
    public String getFileHash() {
        return fileHash;
    }

    /** 저장된 파일을 지금 다시 계산한 SHA-256. fileHash와 다르면 위·변조다(UC04 검토 시작, UC06 승인 조건) */
    public String getCurrentFileHash() {
        return currentFileHash;
    }

    /** 낙관적 잠금 번호(WORK_VERSION.revision) */
    public int getRevision() {
        return revision;
    }

    /** "AI 미사용"으로 신고한 버전인가(AI_DISCLOSURE.no_ai_used). 위험 분석의 AI 사용 비중을 0으로 둘 때 쓴다(B4) */
    public boolean isNoAiUsed() {
        return noAiUsed;
    }
}
