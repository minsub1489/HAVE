# 시드 데이터

아직 비어 있습니다. 각 담당자가 자기 테이블의 시드를 넣습니다.

| 파일(예) | 내용 | 담당 · 단계 |
| --- | --- | --- |
| `01_users.sql` | 시연 계정 5명(`docs/api.md` 3절, userId 1~5 고정). 비밀번호 `have-demo-1128`을 BCrypt 해시로 | B3 · 1단계 |
| `02_review_codes.sql` | 체크리스트 4항목(`model.js`의 `CHECKLIST`), 위험 등급 기준 `GP-2026-1`(경계 4 · 7) | B9 · 1단계 |
| 시연 시나리오 | SQL이 아니라 서비스를 순서대로 불러 만든다(가이드라인 9절 S1의 흐름) | D16 · 2단계 |

- 여러 번 실행해도 되게 `INSERT … ON CONFLICT DO NOTHING`으로 씁니다.
- `jdbc` 프로필에서 자동으로 넣는 연결(`application-jdbc.yml`의 `spring.sql.init.data-locations`)은 D4가 합니다. 1단계에 B는 파일만 만들고 설정 파일은 고치지 않습니다(메모에 파일 이름을 적음).
- `stub` 프로필의 시드는 SQL이 아니라 코드로 넣습니다. 서버가 시작할 때(`stub` 프로필에서만) 자기 Repository로 저장하는 컴포넌트를 담당자가 자기 패키지에 둡니다.
