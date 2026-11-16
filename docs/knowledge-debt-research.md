# HAVE의 이해 확인과 인수인계 연구 근거

2026-11-16 확인. 연구의 관찰 결과와 HAVE에서 검증할 설계 가설을 구분한다. 본문에서 사용한 기능 범위와 수용 시나리오는 [지식 부채와 이해 확인 설계](knowledge-debt.md)를 따른다.

## AI로 만든 작업을 이해하고 수정하는 능력

- **Balepur 외 (2026), (Im)Paired Programming: Coding Agents Improve Productivity but Harm Understanding.** 연구 진행 중 프리프린트. 학생 54명의 웹사이트 제작 실험에서 코드 편집 에이전트와 챗봇을 비교했다. 에이전트는 첫 과제의 완수를 도왔고, 에이전트 그룹은 이해 문항과 에이전트 없이 직접 확장하는 후속 과제에서 어려움을 보였다. HAVE의 작성자 설명과 후속 수정 과제의 문제 근거로 사용한다. [arXiv](https://arxiv.org/abs/2607.26375)
- **Shen과 Tamkin (2026), How AI Impacts Skill Formation.** 낯선 Python 라이브러리를 학습하는 무작위 실험에서 AI 지원 그룹의 후속 퀴즈 점수가 낮았다. 디버깅 문항에서 차이가 가장 컸다는 결과는 탐색 분석이다. 오류를 찾고 원인과 영향 범위를 설명하게 하는 과제의 근거로 사용한다. [arXiv](https://arxiv.org/html/2601.20245v1)
- **Vaithilingam, Zhang과 Glassman (2022), Expectation vs. Experience.** Copilot 사용성 실험 참가자 24명은 생성된 코드를 이해·편집·디버깅하는 데 어려움을 겪었다. 작성자가 결과를 채택한 뒤 실제로 점검한 부분을 근거와 연결하도록 하는 설계에 참고한다. [CHI Extended Abstracts 원문](https://glassmanlab.seas.harvard.edu/papers/copilot_lbw_chi22.pdf)

## 이해 확인 과제의 구성

- **Chi 외 (1994), Eliciting Self-Explanations Improves Understanding.** 설명문을 읽으며 스스로 설명한 중학생 그룹의 이해가 더 향상됐다. Teach-back에서 결과를 요약하는 데 더해 이유와 근거를 짚도록 한다. [Cognitive Science 원문](https://education.asu.edu/sites/g/files/litvpz656/files/lcl/chideleeuwchiulavancher_2.pdf)
- **Roediger와 Karpicke (2006), Test-Enhanced Learning.** 인출 연습이 지연된 시험에서 기억 유지에 도움이 됐다. 짧은 퀴즈는 자가진단과 복습에 활용한다. [Psychological Science 원문](https://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2006_PsychSci.pdf)
- **Butler (2010), Repeated Testing Produces Superior Transfer of Learning Relative to Repeated Studying.** 반복해서 답하는 연습은 다시 읽기와 비교해 지연 평가의 기억과 새로운 추론 문항 성과를 높였다. 후속 과제는 기존 설명을 새 조건에 적용하게 설계한다. [논문 초록 및 서지](https://pubmed.ncbi.nlm.nih.gov/20804289/)
- **Sentance, Waite와 Kallia (2019), Teaching Computer Programming with PRIMM.** 13개 학교의 준실험에서 예측·실행·조사·수정·새로 만들기를 적용한 그룹의 사후 과제 성과가 높았다. HAVE에서는 What-if에 예측과 실제 확인을 이어 붙이는 데 참고한다. [저자본](https://qmro.qmul.ac.uk/xmlui/bitstream/handle/123456789/57800/Waite%20Teaching%20computer%20programming%202019%20Accepted.pdf?sequence=2)
- **Bastani 외 (2025), Generative AI Without Guardrails Can Harm Learning.** 고교 수학 현장 실험에서 일반형 AI의 도움을 받은 학생은 이후 독립 시험에서 성적이 떨어졌다. 힌트 중심 튜터 조건에서는 부정적 효과가 완화됐다. 연습에서 먼저 시도한 뒤 단계별 힌트를 받는 구조에 참고한다. [PNAS](https://doi.org/10.1073/pnas.2422633122)
- **Buçinca, Malaya와 Gajos (2021), To Trust or to Think.** AI 추천을 확인하기 전에 스스로 판단하도록 유도하는 등 몇 가지 인터페이스를 시험했다. 잘못된 추천에 대한 과의존이 줄었으며, 이를 가장 많이 줄인 방식은 이용자 평가가 낮았다. 변경의 파급력에 맞춰 이해 확인을 요청하고 사용 비용도 함께 측정한다. [ACM CSCW](https://doi.org/10.1145/3449287)

## 팀 지식 공유와 인수인계

- **Bacchelli와 Bird (2013), Expectations, Outcomes, and Challenges of Modern Code Review.** Microsoft 현장 연구에서 코드 리뷰가 변경 이해와 팀 지식 공유에 쓰이는 것을 관찰했다. 검토에서 나온 결정 이유와 확인 근거를 팀원이 다시 찾을 수 있게 한다. [ICSE 원문](https://www.cabird.com/pubs/bacchelli2013eoc.pdf)
- **Rodeghero 외, A Case Study of Onboarding in Software Teams: Tasks and Strategies (2021).** Microsoft 팀의 온보딩을 분석하고 실제 작업 과제가 학습, 자신감, 팀 적응에 하는 역할을 설명했다. 인수받는 사람에게 구체적인 작업을 주는 설계에 참고한다. [연구 원문](https://arxiv.org/abs/2103.05055)
- **Borg 외 (2026), Echoes of AI.** 2단계 연구의 후속 무작위 실험에서 다른 개발자가 앞서 만든 Java 코드를 이어서 수정했다. 원작성자의 AI 보조 사용에 따른 후속 수정 시간·코드 품질의 유의한 차이는 검출되지 않았다. HAVE는 작성자 이해와 팀원의 후속 수정 성과를 각각 측정한다. [Empirical Software Engineering](https://doi.org/10.1007/s10664-026-10889-1)

교육 과제, 소규모 개발 실험, 기업 리뷰 관찰은 대상과 측정 지표가 다르다. HAVE의 승인 기준이나 효과 크기는 이 연구들에서 직접 가져오지 않는다. 검증할 가설은 **버전별 근거와 직접 적용 결과를 남기면 팀원이 원작성자에게 묻는 횟수를 줄이면서 후속 작업을 해낼 수 있는가**다.
