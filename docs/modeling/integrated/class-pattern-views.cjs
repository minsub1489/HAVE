// Pattern detail transcribed from HAVE__.png (2026-11-11).
// Tuples contain [class, role, attributes/operations]. ref marks a shared type.
module.exports = [
  {
    id: 'observer', title: '옵서버 · 작업 상태 변경 통지',
    nodes: [
      ['Subject', 'abstract', ['- observers: List<WorkStatusObserver>', '+ addObserver() / deleteObserver()', '# notifyObservers()']],
      ['WorkStatusSubject', 'ConcreteSubject', ['- lastChange: StatusChange', '+ updateWorkStatus(workId, status)', '+ getState(): StatusChange']],
      ['StatusChange', 'value object', ['- workId / versionId: ID', '- from / to: WorkStatus', '- actorId: ID / reason?']],
      ['WorkStatusObserver', 'interface', ['+ update(s: WorkStatusSubject)']],
      ['AuditLogObserver', 'ConcreteObserver', ['+ update(s) → AuditLogService.record()']],
      ['CertificateIssueObserver', 'ConcreteObserver', ['+ update(s) → 승인 시 발급 요청 기록']],
      ['NotificationObserver', 'ConcreteObserver', ['+ update(s) → NotificationGateway.notify()']],
    ],
    edges: [
      ['WorkStatusSubject', 'Subject', 'extends'],
      ['Subject', 'WorkStatusObserver', 'aggregates', 'observers 0..*'],
      ['WorkStatusSubject', 'StatusChange', 'association', 'lastChange 0..1'],
      ...['AuditLogObserver', 'CertificateIssueObserver', 'NotificationObserver'].map(id => [id, 'WorkStatusObserver', 'implements']),
    ],
    note: '도메인 연결 · WorkVersion 상태 변경 → StatusChange. 감사 이벤트와 발급 요청은 해당 변경과 함께 커밋하고 알림 전송은 커밋 이후 처리한다.',
  },
  {
    id: 'strategy', title: '전략 · 위험 등급별 검토 정책',
    nodes: [
      ['GatePolicy', 'ref', ['- strategy: GateStrategy', '+ selectFor(risk)', '+ assignTasks(risk) / judge(responses)']],
      ['GateStrategy', 'interface', ['+ createTasks(risk): List<Challenge>', '+ judge(responses): GateResult']],
      ['LowRiskGate', 'ConcreteStrategy', ['저위험 · 확인 문항', '+ createTasks() / judge()']],
      ['MediumRiskGate', 'ConcreteStrategy', ['중위험 · Teach-back', '+ createTasks() / judge()']],
      ['HighRiskGate', 'ConcreteStrategy', ['고위험 · What-if · 5/6', '+ createTasks() / judge()']],
    ],
    edges: [
      ['GatePolicy', 'GateStrategy', 'aggregates', 'strategy'],
      ...['LowRiskGate', 'MediumRiskGate', 'HighRiskGate'].map(id => [id, 'GateStrategy', 'implements']),
    ],
    note: '도메인 연결 · RiskAssessment로 전략 선택, Challenge 생성, ChallengeResponse 평가. 세 전략은 첨부 그림의 설계 제안이다.',
  },
  {
    id: 'bridge', title: '브리지 · 저장 계약과 구현 분리',
    nodes: [
      ['RepositoryContracts', 'ref', ['Review / Revision / Approval / Certificate / History 저장 계약'], '기존 Repository 계약'],
      ['Repository', 'abstract', ['# impl: IPersistence', '+ save(entity: T)', '+ findById(id): T'], 'Repository<T>'],
      ['IPersistence', 'ref', ['+ save() / findById() / findBy()']],
      ['JdbcPersistence', 'ConcreteImplementor', ['관계형 DB 구현']],
      ['StubPersistence', 'ConcreteImplementor', ['메모리 Map · 통합 개발']],
      ['JsonFilePersistence', 'ConcreteImplementor', ['시연 · 내보내기 (선택)']],
    ],
    edges: [
      ['RepositoryContracts', 'Repository', 'uses', '계약별 저장소'],
      ['Repository', 'IPersistence', 'aggregates', 'impl'],
      ...['JdbcPersistence', 'StubPersistence', 'JsonFilePersistence'].map(id => [id, 'IPersistence', 'implements']),
    ],
    note: '인프라 연결 · JdbcPersistence의 연결 획득은 싱글턴 상세에 표시한다.',
  },
  {
    id: 'singleton', title: '싱글턴 · DB 연결 풀',
    nodes: [
      ['JdbcPersistence', 'ref', []],
      ['DatabaseConnectionPool', 'singleton', ['- static instance: DatabaseConnectionPool', '- dataSource: DataSource', '- DatabaseConnectionPool()', '+ static getInstance(): DatabaseConnectionPool', '+ getConnection(): Connection']],
    ],
    edges: [['JdbcPersistence', 'DatabaseConnectionPool', 'uses', 'getInstance()']],
    note: '연결 풀의 인스턴스 범위 · 서버 프로세스 내부.',
  },
  {
    id: 'adapter', title: '어댑터 · 외부 파일 저장소',
    nodes: [
      ['FileStore', 'ref', ['+ put() / storeRevision() / discard()']],
      ['StorageFileStoreAdapter', 'Adapter', ['- storage: IStorageAPI', '- bucket: String', '저장·정리 요청을 SDK 호출로 변환']],
      ['InMemoryFileStore', 'ConcreteProduct', ['개발·테스트용 파일 저장']],
      ['IStorageAPI', 'ref', ['외부 저장소 SDK']],
    ],
    edges: [
      ['StorageFileStoreAdapter', 'FileStore', 'implements'],
      ['InMemoryFileStore', 'FileStore', 'implements'],
      ['StorageFileStoreAdapter', 'IStorageAPI', 'uses', '저장·정리 위임'],
    ],
    note: '도메인 연결 · WorkVersion.fileUri와 EvidenceItem.uri는 저장된 파일의 참조다. FileStore 연산은 통합 클래스 모델의 표기를 사용했다.',
  },
  {
    id: 'factory', title: '추상 팩토리 · 환경별 인프라 조립',
    nodes: [
      ['HaveServerBootstrap', 'Client', ['+ start(profile)']],
      ['InfrastructureFactory', 'interface', ['+ createPersistence(): IPersistence', '+ createFileStore(): FileStore', '+ createNotifyChannel(): INotifyChannel']],
      ['ProductionInfraFactory', 'ConcreteFactory', ['JdbcPersistence · StorageFileStoreAdapter', 'EmailNotifyChannel']],
      ['LocalStubInfraFactory', 'ConcreteFactory', ['StubPersistence · InMemoryFileStore', 'ConsoleNotifyChannel']],
      ['INotifyChannel', 'ref', ['+ send(address, subject, body)']],
      ['EmailNotifyChannel', 'ConcreteProduct', ['이메일 발송']],
      ['ConsoleNotifyChannel', 'ConcreteProduct', ['개발 환경 로그 출력']],
    ],
    edges: [
      ['HaveServerBootstrap', 'InfrastructureFactory', 'uses', 'profile'],
      ['ProductionInfraFactory', 'InfrastructureFactory', 'implements'],
      ['LocalStubInfraFactory', 'InfrastructureFactory', 'implements'],
      ['InfrastructureFactory', 'INotifyChannel', 'uses', '«create»'],
      ['EmailNotifyChannel', 'INotifyChannel', 'implements'],
      ['ConsoleNotifyChannel', 'INotifyChannel', 'implements'],
    ],
    note: '제품군 연결 · IPersistence는 브리지, FileStore는 어댑터 상세에 표시한다.',
  },
];
