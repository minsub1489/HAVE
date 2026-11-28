package have.certificate;

import java.time.Instant;

import have.common.code.SigningState;

/** ICertificateData.getCertificateData가 돌려주는 증명서 데이터 (테이블 CERTIFICATE). 11/28 고정. 1단계 동안 바꾸지 않는다(더 필요한 값은 docs/phase1/C.md에). */
public class CertificateData {

    private final long certificateId;
    private final long approvalId;
    private final String immutablePayload;
    private final SigningState signingState;
    private final String keyId;
    private final Instant issuedAt;

    public CertificateData(long certificateId, long approvalId, String immutablePayload, SigningState signingState, String keyId, Instant issuedAt) {
        this.certificateId = certificateId;
        this.approvalId = approvalId;
        this.immutablePayload = immutablePayload;
        this.signingState = signingState;
        this.keyId = keyId;
        this.issuedAt = issuedAt;
    }

    public long getCertificateId() {
        return certificateId;
    }

    public long getApprovalId() {
        return approvalId;
    }

    /** 서명 대상인 키 정렬 JSON 문자열(CanonicalJson). 저장한 문자열 그대로여야 서명이 맞는다 */
    public String getImmutablePayload() {
        return immutablePayload;
    }

    public SigningState getSigningState() {
        return signingState;
    }

    /** 어느 키로 서명했는가. 발급 전이면 null */
    public String getKeyId() {
        return keyId;
    }

    /** 발급 시각. 발급 전이면 null */
    public Instant getIssuedAt() {
        return issuedAt;
    }
}
