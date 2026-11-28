/**
 * 05 증명서 관리 (Certificate). 담당 C. UC07, 발급은 UC06 승인 성공 뒤.
 * 만들 것(클래스 다이어그램 v3): CertificateService, Certificate · ShareLink · QRCode, CertificateIssueObserver.
 * 설계서에 없어 더할 것: 진입점 CertificateController, 서명 작업자(Outbox 처리기).
 * CertificateIssueObserver는 발급 요청(OutboxEvent)만 저장하고, 서명은 커밋 뒤 서명 작업자가 한다.
 */
package have.certificate;
