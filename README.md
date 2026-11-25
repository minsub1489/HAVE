# HAVE · 소프트웨어공학 팀 프로젝트

HAVE는 팀원·문서·대화·AI 작업 기록에 흩어진 판단 근거를 연결합니다. 작성자가 작업의 이유를 설명하고, 팀원이 그 근거로 작업을 수정하고 이어받을 수 있게 하는 것이 목표입니다. HumanProof는 PDF 버전별 이해 과제, 검토·승인, 파일 검증을 시연하는 프로토타입입니다.

## 실행과 시연

| 작업물 | 시작하는 방법 |
| --- | --- |
| 웹 프로토타입 | 저장소를 내려받아 [단독 HTML](prototype/HumanProof_프로토타입.html)을 Chrome 또는 Edge로 엽니다. 샘플 작업과 [5분 시연 가이드](prototype/시연가이드.md)를 이용할 수 있습니다. |
| Chrome 기여 기록 확장 | Chrome 개발자 모드에서 `extension/`을 로드합니다. 사용자 확인 후 근거를 로컬에 저장하고 JSON을 내보냅니다. 웹의 **버전·이력 → 기여 기록 가져오기**에서 연결합니다. [설치 안내](extension/README.md) |
| Chrome 모양 클릭 시연 | [시연용 HTML](prototype/HumanProof_크롬확장_프로토타입.html)을 열고 샘플 팝업을 조작합니다. [시연 가이드](prototype/크롬확장_시연가이드.md) |

![HAVE 웹 작업 상세 화면](prototype/preview.jpg)

웹 원본을 로컬 서버로 실행하려면 저장소 루트에서 다음 명령을 사용한 뒤 [127.0.0.1:4173](http://127.0.0.1:4173/)을 엽니다.

```sh
node scripts/serve.cjs
```

웹 시연은 브라우저에 기록을 저장합니다. 다른 기기에서 QR을 열면 발급 당시의 요약을 볼 수 있습니다. 역할 전환과 공개 검증의 범위는 [프로젝트 맥락](docs/project-context.md#3-서로-다른-세-작업물)에 정리되어 있습니다.

## 프로젝트 문서

- [프로젝트 맥락과 작업 인수인계](docs/project-context.md) · 목적, 현재 동작, 요구사항, 확인 방법
- [지식 부채와 이해 확인 설계](docs/knowledge-debt.md) · 팀원 인수인계, 과제 후보, 검증 시나리오
- [아키텍처와 설계 원칙](docs/architecture.md) · 요구사항에서 시작하는 설계와 운영 MVP
- [서버 패키지 8개와 책임](docs/subsystem-decision.md) · 운영 설계의 모듈 경계
- [요구 모델과 다이어그램](docs/modeling/README.md) · 모델별 범위, 생성 방법, 추적성
- [UI 가이드](docs/ui/DESIGN.md) · 웹 프로토타입과 HCI 설계 기준

## 발표 자료

- [기존 발표 PPT](<docs/presentation/HAVE_프로젝트 계획서(시스템 개발 제안 요청서).pptx>) · 본 발표 1~11쪽, 질의응답 부록 12쪽부터
- [발표 수정본에서 다룬 지식 부채 해결 설계](docs/knowledge-debt.md#지식-부채-항목의-해결-기준) · 질문 등록, 근거 보완, 팀원 재현, 해결과 재확인
- [발표 대본과 학습 해설](docs/presentation/support/)

## 수정과 검증

웹 원본은 `prototype/dist/`에 있습니다. `app.js`는 화면과 업무 흐름, `domain.js`는 승인·검증 규칙, `repository.js`는 IndexedDB 저장을 담당합니다. 웹 원본을 수정한 뒤 단독 HTML을 재생성합니다.

```sh
node scripts/build-standalone.cjs
node --test tests/*.test.cjs
```

브라우저 검증에는 Playwright와 Chrome이 필요합니다. [변경 유형별 검증과 명령](docs/project-context.md#8-실행과-변경-유형별-검증)과 [저장소 작업 안내](AGENTS.md)를 참고하세요.
