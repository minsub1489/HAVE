package have.certificate;

/**
 * 05 Certificate가 06 Verification에 제공하는 인터페이스 (컴포넌트 다이어그램 v2). 구현: CertificateService. 담당 C.
 * 공개 검증은 공유 링크 토큰으로 들어오는데, 토큰으로 증명서를 찾는 오퍼레이션은 설계서에 없다.
 * 05와 06을 모두 C가 맡으므로 C가 정하고, 추가하면 docs/design-changes.md에 적는다.
 */
public interface ICertificateData {

    /** 증명서의 내용과 발급 상태. 없으면 404. */
    CertificateData getCertificateData(long certId);

    /** 전자서명. 아직 발급되지 않았으면 null. */
    String getSignature(long certId);
}
