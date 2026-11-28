package have.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.junit.jupiter.api.Test;

/**
 * StubPersistence와 TableMapping 계약의 확인. 아래 두 대응은 테이블 소유자가 쓸 대응의 예이기도 하다:
 * 자동 번호 테이블(SampleNote ↔ note)과 복합 키 테이블(SampleMember ↔ member).
 */
class StubPersistenceTest {

    /** 자동 번호 테이블의 엔티티 예. 불변 객체로 두고 번호가 붙으면 새로 만든다. */
    static final class SampleNote {
        private final Long noteId;
        private final long workId;
        private final String text;
        private final Instant createdAt;

        SampleNote(Long noteId, long workId, String text, Instant createdAt) {
            this.noteId = noteId;
            this.workId = workId;
            this.text = text;
            this.createdAt = createdAt;
        }

        Long getNoteId() {
            return noteId;
        }

        long getWorkId() {
            return workId;
        }

        String getText() {
            return text;
        }

        Instant getCreatedAt() {
            return createdAt;
        }
    }

    static final class SampleNoteMapping implements TableMapping<SampleNote> {
        public Class<SampleNote> getType() {
            return SampleNote.class;
        }

        public String getTableName() {
            return "note";
        }

        public List<String> getKeyColumns() {
            return List.of("note_id");
        }

        public boolean isGeneratedKey() {
            return true;
        }

        public Map<String, Object> getColumns(SampleNote n) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("note_id", n.getNoteId());
            row.put("work_id", n.getWorkId());
            row.put("text", n.getText());
            row.put("created_at", n.getCreatedAt());
            return row;
        }

        public SampleNote getEntity(Map<String, Object> row) {
            return new SampleNote((Long) row.get("note_id"), (Long) row.get("work_id"), (String) row.get("text"), (Instant) row.get("created_at"));
        }

        public SampleNote setGeneratedKey(SampleNote n, long key) {
            return new SampleNote(key, n.getWorkId(), n.getText(), n.getCreatedAt());
        }
    }

    /** 복합 키 테이블의 엔티티 예(work_member와 같은 모양). 코드 값은 이름 문자열로 담는다. record는 쓰지 않는다(가이드라인 5.3). */
    static final class SampleMember {
        private final long workId;
        private final long userId;
        private final String role;

        SampleMember(long workId, long userId, String role) {
            this.workId = workId;
            this.userId = userId;
            this.role = role;
        }

        long getWorkId() {
            return workId;
        }

        long getUserId() {
            return userId;
        }

        String getRole() {
            return role;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof SampleMember m && m.workId == workId && m.userId == userId && m.role.equals(role);
        }

        @Override
        public int hashCode() {
            return Objects.hash(workId, userId, role);
        }
    }

    static final class SampleMemberMapping implements TableMapping<SampleMember> {
        public Class<SampleMember> getType() {
            return SampleMember.class;
        }

        public String getTableName() {
            return "member";
        }

        public List<String> getKeyColumns() {
            return List.of("work_id", "user_id", "role");
        }

        public boolean isGeneratedKey() {
            return false;
        }

        public Map<String, Object> getColumns(SampleMember m) {
            return Map.of("work_id", m.getWorkId(), "user_id", m.getUserId(), "role", m.getRole());
        }

        public SampleMember getEntity(Map<String, Object> row) {
            return new SampleMember((Long) row.get("work_id"), (Long) row.get("user_id"), (String) row.get("role"));
        }

        public SampleMember setGeneratedKey(SampleMember m, long key) {
            throw new UnsupportedOperationException();
        }
    }

    private final StubPersistence store = new StubPersistence(List.of(new SampleNoteMapping(), new SampleMemberMapping()));

    @Test
    void 자동_번호는_1부터_붙고_고치면_같은_행이_바뀐다() {
        Instant at = Instant.parse("2026-11-30T05:12:44Z");
        SampleNote first = store.save(new SampleNote(null, 12, "첫 메모", at));
        SampleNote second = store.save(new SampleNote(null, 12, "둘째 메모", at));
        assertEquals(1L, first.getNoteId());
        assertEquals(2L, second.getNoteId());

        store.save(new SampleNote(1L, 12, "고친 메모", at));
        assertEquals("고친 메모", store.getById(SampleNote.class, 1L).getText());
        assertEquals("고친 메모", store.getById(SampleNote.class, 1).getText(), "Integer로 찾아도 같은 행");
        assertEquals(at, store.getById(SampleNote.class, 1L).getCreatedAt());
        assertNull(store.getById(SampleNote.class, 99L));
    }

    @Test
    void 조건은_모두_같음_비교이고_정수_형식이_달라도_맞는다() {
        Instant at = Instant.now();
        store.save(new SampleNote(null, 12, "a", at));
        store.save(new SampleNote(null, 13, "b", at));
        store.save(new SampleNote(null, 12, "c", at));
        assertEquals(2, store.getByCondition(SampleNote.class, Map.of("work_id", 12)).size());
        assertEquals(1, store.getByCondition(SampleNote.class, Map.of("work_id", 12L, "text", "c")).size());
        assertEquals(3, store.getByCondition(SampleNote.class, Map.of()).size());
    }

    @Test
    void 복합_키는_키가_같으면_고치고_조건으로_지운다() {
        store.save(new SampleMember(1, 2, "REVIEWER"));
        store.save(new SampleMember(1, 2, "REVIEWER"));
        store.save(new SampleMember(1, 4, "APPROVER"));
        assertEquals(2, store.getByCondition(SampleMember.class, Map.of("work_id", 1L)).size());

        assertEquals(1, store.delete(SampleMember.class, Map.of("work_id", 1L, "role", "REVIEWER")));
        store.save(new SampleMember(1, 3, "REVIEWER"));
        assertEquals(List.of(new SampleMember(1, 3, "REVIEWER")), store.getByCondition(SampleMember.class, Map.of("role", "REVIEWER")));
        assertThrows(IllegalArgumentException.class, () -> store.getById(SampleMember.class, 1L), "복합 키는 getById를 쓰지 않는다");
    }

    @Test
    void 빈_조건으로는_지울_수_없고_대응이_없으면_알려_준다() {
        assertThrows(IllegalArgumentException.class, () -> store.delete(SampleMember.class, Map.of()));
        IllegalStateException e = assertThrows(IllegalStateException.class, () -> store.save("대응 없는 엔티티"));
        assertEquals(true, e.getMessage().contains("TableMapping이 없습니다"));
    }

    @Test
    void 돌려준_엔티티를_바꿔도_저장된_행은_그대로다() {
        SampleMember saved = store.save(new SampleMember(5, 1, "AUTHOR"));
        assertEquals(saved, store.getByCondition(SampleMember.class, Map.of("work_id", 5L)).get(0));
    }
}
