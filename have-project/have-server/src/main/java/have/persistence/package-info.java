/**
 * 08 데이터 저장 (Persistence). 공통 계약은 11/28 고정, 하위 계약은 그 테이블을 쓰는 사람.
 * 들어 있는 것: IPersistence · Repository · TableMapping(계약), StubPersistence(메모리 구현), FileStore(계약).
 * 만들 것(클래스 다이어그램 v3) — 담당마다 하위 패키지를 따로 쓴다(파일이 겹치지 않게):
 *  D — JdbcPersistence · DatabaseConnectionPool(싱글톤)은 이 패키지, AuditEvent · Notification 대응과 HistoryRepository는 have.persistence.audit
 *  A — StorageFileStore · WorkRepository · RevisionRepository와 대응 → have.persistence.work
 *  B — UserRepository와 대응 → have.persistence.auth / ReviewRepository와 대응 → have.persistence.review
 *  C — ApprovalRepository · CertificateRepository와 대응 → have.persistence.approval
 * 테이블 정의는 src/main/resources/db/schema에 있다. 규칙은 가이드라인 5.5.
 */
package have.persistence;
