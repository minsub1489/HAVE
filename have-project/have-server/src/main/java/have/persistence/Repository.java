package have.persistence;

import java.util.List;
import java.util.Map;

/**
 * 저장 계약의 공통 상위 (브리지 패턴의 Abstraction, 디자인 패턴 문서 5장). 11/28 고정.
 * 하위 계약 7종이 업무 질의를 impl 호출로 표현한다:
 * WorkRepository · RevisionRepository(A), ReviewRepository · UserRepository(B), ApprovalRepository · CertificateRepository(C), HistoryRepository(D).
 * 하위 계약과 TableMapping은 have.persistence.<서브시스템>(work · auth · review · approval · audit) 아래에 둔다. 담당마다 폴더가 달라 파일이 겹치지 않는다.
 */
public abstract class Repository<T> {

    protected final IPersistence impl;
    private final Class<T> type;

    protected Repository(IPersistence impl, Class<T> type) {
        this.impl = impl;
        this.type = type;
    }

    public T save(T entity) {
        return impl.save(entity);
    }

    public T getById(Object id) {
        return impl.getById(type, id);
    }

    /** 같음 비교 조건으로 찾는다. 하위 계약이 업무 질의(getByWork 등)를 만들 때 쓴다. */
    protected List<T> getByCondition(Map<String, Object> condition) {
        return impl.getByCondition(type, condition);
    }

    /** 같음 비교 조건으로 지운다. 빈 조건은 거절된다. */
    protected int delete(Map<String, Object> condition) {
        return impl.delete(type, condition);
    }
}
