# HAVE 패키지 다이어그램

2026-11-02. 현재 MVP의 [9개 유스케이스](../use-case-specs.md)와 [기존 분석 클래스 14개](../uml/model.json)를 책임별로 묶은 논리 패키지 모델이다. 강의 `Ch07_아키텍처-part1.pdf` 4·7~9쪽의 추상화, 계층적 분할, 클래스 그룹화와 패키지 의존 관계를 적용했다. 다른 UML 그림과 기존 PDF는 재생성하지 않는다.

그림: PNG · SVG · PlantUML 보조 표현.

| 패키지 | 묶은 책임 | 유스케이스 대응 |
| --- | --- | --- |
| Presentation | 작성자·검토자·수신자 화면. 기존 분석 모델에 화면 클래스가 없어 새 클래스를 만들지 않고 책임만 표시 | UC-01~09 웹 접점 |
| Application | HAVEWorkflow, EvidenceVerifier. 업무 순서, 저장 조정, 공개 요약·파일 비교 | UC-01~09 웹 처리 |
| Domain | Work, Version, Contribution, AuditEvent, Review, GateResponse, Evaluation, ReviewRound, Approval, Receipt | UC-01~09 모델·판정 |
| Persistence | WorkspaceRepository. IndexedDB 조회·원자적 조건부 저장 | 로컬 작업 조회·변경 |
| Contribution Capture | ContributionRecorder. 사용자 호출 수집·확인·JSON 내보내기 | UC-08 확장 측 |

의존 화살표는 **사용하는 패키지에서 사용되는 패키지로** 향한다. Presentation → Application, Application → Domain, Application → Persistence만 표시했다. 데이터 이동 순서를 그리는 활동 다이어그램과 구분한다. 일반적인 사용 의존이며 네임스페이스를 들여오는 `«import»`나 `«access»`로 주장하지 않는다.

확장은 독립 로컬 도구다. JSON은 사용자 선택·검증·미리보기·확인 후 웹에 들어오므로 확장과 웹 사이 직접 코드 의존 화살표를 만들지 않았다. 공유 코드 모듈이 실제 존재한다고 가정하지 않는다. 저장소도 현재 도메인 함수를 호출하지 않으므로 Persistence → Domain 의존을 추가하지 않았다. 도메인 패키지는 화면·저장소·확장 패키지에 의존하지 않는다.

이 모델은 **현재 기능을 바탕으로 한 분석 책임 구조**다. 실제 코드에서는 Presentation과 Application이 `app.js`에 함께 있으며 도메인 처리 일부도 남아 있다. 독립된 14개 JS 클래스나 5개 실제 디렉터리로 리팩터링한 결과가 아니다. 기존 [아키텍처](../../../architecture.md)의 운영 서버·인증·서명 설계와 전체 서비스 요구는 별도로 유지한다. QR은 서명 없는 요약이며 서버의 최신 승인 효력을 조회하지 않는다.

수정 원본은 [model.json](model.json)이다. `node docs/modeling/optimized/package/render.cjs`로 이 그림만 생성한다. Playwright가 기본 경로에 없으면 `DIAGRAM_NODE_MODULES`를 지정한다. 렌더러는 기존 14개 클래스의 중복·누락, 의존 순환과 화면 밖 글자를 검사하고 검사 결과를 남긴다. PlantUML은 같은 JSON에서 생성한 보조 표현이며 배치 기준은 SVG다. PlantUML 엔진 자체의 렌더링 검사는 수행하지 않았다.
