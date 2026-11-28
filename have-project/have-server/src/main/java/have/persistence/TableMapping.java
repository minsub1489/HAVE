package have.persistence;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 엔티티 한 종류와 테이블 하나의 대응 (저장 계약, 가이드라인 5.5). 11/28 고정.
 * 테이블 소유자가 엔티티마다 하나씩 만들어 @Component를 붙인다(have.persistence.<서브시스템> 아래에 둔다).
 * StubPersistence(메모리)와 JdbcPersistence(PostgreSQL)가 같은 대응을 쓰므로, 이것만 맞게 쓰면 두 저장 구현에서 똑같이 동작한다.
 *
 * <p>행(row)의 값은 다음 Java 형식만 쓴다. 두 저장 구현이 이 형식으로 주고받는다.
 * <ul>
 *   <li>BIGINT → Long, INT · SMALLINT → Integer</li>
 *   <li>VARCHAR · CHAR · TEXT · JSON → String (JSON 열은 JSON 문자열 그대로)</li>
 *   <li>BOOLEAN → Boolean, TIMESTAMP → Instant(UTC), DATE → LocalDate</li>
 *   <li>코드 값(enum) → 이름 문자열(예: "APPROVAL_PENDING"), 값 없음 → null</li>
 * </ul>
 */
public interface TableMapping<T> {

    /** 대응하는 엔티티 클래스. 한 엔티티 클래스에 대응은 하나뿐이다. */
    Class<T> getType();

    /** 테이블 이름. 스키마 그대로 소문자(예: work_version, user). 따옴표는 저장 구현이 붙인다. */
    String getTableName();

    /** 기본 키 열. 자동 번호 테이블은 한 개(예: version_id), 복합 키 테이블은 여러 개(예: work_id, user_id, role). */
    List<String> getKeyColumns();

    /** 기본 키가 자동 번호(GENERATED … AS IDENTITY)인가. */
    boolean isGeneratedKey();

    /** 엔티티 → 열 이름과 값. 모든 열을 담는다. 자동 번호가 아직 없으면 그 키 값은 null로 둔다. */
    Map<String, Object> getColumns(T entity);

    /** 열 이름과 값 → 엔티티. 값의 형식은 위 목록과 같다. */
    T getEntity(Map<String, Object> row);

    /** 새로 넣을 때 붙은 자동 번호를 담은 엔티티를 돌려준다(불변 객체면 새로 만들어 돌려준다). 자동 번호 테이블만 부른다. */
    T setGeneratedKey(T entity, long key);

    /** JSON 형식 열의 이름(예: work의 ai_disclosure_draft, certificate의 immutable_payload). JdbcPersistence가 형식을 맞출 때 쓴다. */
    default Set<String> getJsonColumns() {
        return Set.of();
    }
}
