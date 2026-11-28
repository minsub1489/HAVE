package have.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

/**
 * 코드 값 enum(have.common.code)과 스키마의 CHECK 제약이 같은 값을 가지는지 확인한다.
 * 한쪽만 고치면 이 테스트가 실패한다. 어느 enum이 어느 제약과 짝인지는 src/test/resources/code-columns.txt에 있다.
 */
class CodeValueTest {

    private static final String[] SCHEMA_FILES = {
        "01_user_work.sql", "02_version.sql", "03_review.sql", "04_approval.sql", "05_revision.sql", "06_audit.sql"
    };

    @Test
    void enum과_CHECK_제약의_값이_같다() throws IOException {
        Map<String, Set<String>> checks = getCheckValues();
        int compared = 0;
        for (String line : getText("/code-columns.txt").split("\n")) {
            if (line.isBlank() || line.startsWith("#")) {
                continue;
            }
            String[] parts = line.trim().split("\t");
            String enumName = parts[0];
            String constraint = parts[1];
            Set<String> inSchema = checks.get(constraint);
            assertNotNull(inSchema, "스키마에 CHECK 제약이 없습니다: " + constraint);
            assertEquals(inSchema, getEnumValues(enumName), enumName + " ↔ " + constraint);
            compared++;
        }
        assertFalse(compared == 0, "code-columns.txt를 읽지 못했습니다");
    }

    private static Set<String> getEnumValues(String enumName) {
        try {
            Object[] constants = Class.forName("have.common.code." + enumName).getEnumConstants();
            Set<String> names = new TreeSet<>();
            Arrays.stream(constants).forEach(c -> names.add(((Enum<?>) c).name()));
            return names;
        } catch (ClassNotFoundException e) {
            throw new AssertionError("enum이 없습니다: " + enumName, e);
        }
    }

    /** 스키마 파일에서 CONSTRAINT ck_… CHECK (열 IN ('A', 'B', …)) 를 모두 읽는다. */
    private static Map<String, Set<String>> getCheckValues() throws IOException {
        Pattern check = Pattern.compile("CONSTRAINT\\s+(ck_\\w+)\\s+CHECK\\s*\\(\\s*\\w+\\s+IN\\s*\\(([^)]*)\\)", Pattern.CASE_INSENSITIVE);
        Map<String, Set<String>> result = new LinkedHashMap<>();
        for (String file : SCHEMA_FILES) {
            Matcher m = check.matcher(getText("/db/schema/" + file));
            while (m.find()) {
                Set<String> values = new TreeSet<>();
                for (String value : m.group(2).split(",")) {
                    values.add(value.trim().replace("'", ""));
                }
                result.put(m.group(1), values);
            }
        }
        return result;
    }

    private static String getText(String path) throws IOException {
        try (InputStream in = CodeValueTest.class.getResourceAsStream(path)) {
            assertNotNull(in, "파일이 없습니다: " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
