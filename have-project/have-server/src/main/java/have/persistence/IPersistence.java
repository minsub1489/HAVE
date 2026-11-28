package have.persistence;

import java.util.List;
import java.util.Map;

/**
 * 범용 저장 연산 (브리지 패턴의 Implementor, 디자인 패턴 문서 5장). 11/28 고정.
 * 구현: StubPersistence(메모리, stub 프로필, 들어 있음), JdbcPersistence(PostgreSQL, jdbc 프로필, 담당 D · D3).
 * 엔티티와 테이블의 대응은 TableMapping이 알려 준다. 업무 서비스는 이것을 직접 쓰지 않고 Repository 계약만 쓴다.
 * 순서는 보장하지 않는다. 정렬과 같음 비교 밖의 조건은 Repository에서 처리한다.
 */
public interface IPersistence {

    /**
     * 넣거나 고친다. 자동 번호 테이블에서 키가 비어 있으면 새로 넣고 번호를 붙인 엔티티를 돌려준다.
     * 그 밖에는 기본 키가 같은 행이 있으면 고치고 없으면 넣는다.
     */
    <T> T save(T entity);

    /** 기본 키(열 하나)로 하나를 찾는다. 없으면 null. 복합 키 테이블은 getByCondition을 쓴다. */
    <T> T getById(Class<T> type, Object id);

    /** 조건에 맞는 것을 모두 찾는다. condition은 열 이름 → 값이고 모두 같음 비교(AND)다. 빈 조건이면 전부. */
    <T> List<T> getByCondition(Class<T> type, Map<String, Object> condition);

    /**
     * 조건에 맞는 행을 지우고 지운 수를 돌려준다. 빈 조건은 거절한다(전부 지우는 실수를 막기 위해).
     * 감사 이력(audit_event)에는 쓰지 않는다. 설계서에 없어 더한 연산이다(docs/design-changes.md 1.1의 19번).
     */
    <T> int delete(Class<T> type, Map<String, Object> condition);
}
