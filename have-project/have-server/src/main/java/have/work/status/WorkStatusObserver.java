package have.work.status;

/**
 * 작업 상태 변경을 통지받는 옵서버 (02가 정의, 03 · 05 · 07이 구현).
 * 구현: AuditLogObserver · NotificationObserver(07, D), CertificateIssueObserver(05, C), ReReviewObserver(03, B).
 * 지킬 것: 상태를 바꾼 서비스의 트랜잭션 안에서 동기로 실행된다. 같은 DB에 행만 저장하고, 트랜잭션을 새로 열거나 예외를 삼키지 않는다.
 * 서명 · 알림 전송처럼 실패할 수 있는 바깥 일은 여기서 하지 않는다. 다른 옵서버의 실행 순서에 기대지 않는다.
 * 구현 클래스를 스프링 빈으로 만들면 HaveServerBootstrap이 찾아서 등록한다.
 */
public interface WorkStatusObserver {

    void update(WorkStatusSubject subject);
}
