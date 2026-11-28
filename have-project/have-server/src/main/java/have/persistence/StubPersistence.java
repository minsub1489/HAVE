package have.persistence;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 메모리 저장 구현 (브리지 패턴의 ConcreteImplementor, stub 프로필). 11/28에 미리 만들어 둔 것이다(옛 D2).
 * 스프링에 등록된 TableMapping을 모두 받아, 테이블마다 행을 메모리에 둔다. 서버를 다시 켜면 비워진다.
 * DB 제약(외래 키 · UNIQUE · CHECK)과 트랜잭션 롤백은 흉내 내지 않는다. 그런 확인은 jdbc 프로필에서 한다.
 * 테스트에서는 new StubPersistence(List.of(new WorkMapping(), …))로 바로 만들어 쓸 수 있다.
 */
@Component
@Profile("stub")
public class StubPersistence implements IPersistence {

    private final Map<Class<?>, TableMapping<?>> mappings = new HashMap<>();
    private final Map<String, LinkedHashMap<List<Object>, Map<String, Object>>> tables = new HashMap<>();
    private final Map<String, Long> sequences = new HashMap<>();

    public StubPersistence(List<TableMapping<?>> mappings) {
        for (TableMapping<?> mapping : mappings) {
            TableMapping<?> before = this.mappings.put(mapping.getType(), mapping);
            if (before != null) {
                throw new IllegalStateException("한 엔티티에 TableMapping이 둘입니다: " + mapping.getType().getName());
            }
        }
    }

    @Override
    public synchronized <T> T save(T entity) {
        @SuppressWarnings("unchecked")
        TableMapping<T> mapping = (TableMapping<T>) getMapping(entity.getClass());
        String table = mapping.getTableName();
        Map<String, Object> row = new LinkedHashMap<>(mapping.getColumns(entity));
        T saved = entity;
        if (mapping.isGeneratedKey()) {
            String keyColumn = mapping.getKeyColumns().get(0);
            Object key = row.get(keyColumn);
            if (key == null) {
                long next = sequences.merge(table, 1L, Long::sum);
                row.put(keyColumn, next);
                saved = mapping.setGeneratedKey(entity, next);
            } else {
                sequences.merge(table, ((Number) key).longValue(), Math::max);
            }
        }
        tables.computeIfAbsent(table, t -> new LinkedHashMap<>()).put(getKey(mapping, row), row);
        return saved;
    }

    @Override
    public synchronized <T> T getById(Class<T> type, Object id) {
        TableMapping<T> mapping = getMapping(type);
        if (mapping.getKeyColumns().size() != 1) {
            throw new IllegalArgumentException("복합 키 테이블은 getByCondition을 씁니다: " + mapping.getTableName());
        }
        Map<String, Object> row = getRows(mapping).get(List.of(getNormalized(id)));
        return row == null ? null : mapping.getEntity(new LinkedHashMap<>(row));
    }

    @Override
    public synchronized <T> List<T> getByCondition(Class<T> type, Map<String, Object> condition) {
        TableMapping<T> mapping = getMapping(type);
        List<T> found = new ArrayList<>();
        for (Map<String, Object> row : getRows(mapping).values()) {
            if (isMatched(row, condition)) {
                found.add(mapping.getEntity(new LinkedHashMap<>(row)));
            }
        }
        return found;
    }

    @Override
    public synchronized <T> int delete(Class<T> type, Map<String, Object> condition) {
        if (condition == null || condition.isEmpty()) {
            throw new IllegalArgumentException("빈 조건으로는 지울 수 없습니다");
        }
        TableMapping<T> mapping = getMapping(type);
        int before = getRows(mapping).size();
        getRows(mapping).values().removeIf(row -> isMatched(row, condition));
        return before - getRows(mapping).size();
    }

    @SuppressWarnings("unchecked")
    private <T> TableMapping<T> getMapping(Class<?> type) {
        TableMapping<?> mapping = mappings.get(type);
        if (mapping == null) {
            throw new IllegalStateException("TableMapping이 없습니다: " + type.getName()
                    + ". 테이블 소유자가 @Component를 붙인 TableMapping을 만들어야 합니다(가이드라인 5.5).");
        }
        return (TableMapping<T>) mapping;
    }

    private LinkedHashMap<List<Object>, Map<String, Object>> getRows(TableMapping<?> mapping) {
        return tables.computeIfAbsent(mapping.getTableName(), t -> new LinkedHashMap<>());
    }

    private static List<Object> getKey(TableMapping<?> mapping, Map<String, Object> row) {
        List<Object> key = new ArrayList<>();
        for (String column : mapping.getKeyColumns()) {
            Object value = row.get(column);
            if (value == null) {
                throw new IllegalArgumentException("기본 키 값이 비었습니다: " + mapping.getTableName() + "." + column);
            }
            key.add(getNormalized(value));
        }
        return key;
    }

    private static boolean isMatched(Map<String, Object> row, Map<String, Object> condition) {
        for (Map.Entry<String, Object> e : condition.entrySet()) {
            if (!Objects.equals(getNormalized(row.get(e.getKey())), getNormalized(e.getValue()))) {
                return false;
            }
        }
        return true;
    }

    /** Integer 1과 Long 1처럼 정수 형식만 다른 값을 같은 값으로 비교하기 위해 정수는 Long으로, enum은 이름으로 바꾼다. */
    private static Object getNormalized(Object value) {
        if (value instanceof Integer || value instanceof Short || value instanceof Byte) {
            return ((Number) value).longValue();
        }
        if (value instanceof Enum<?> code) {
            return code.name();
        }
        return value;
    }
}
