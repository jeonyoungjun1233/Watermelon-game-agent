# 멀티에이전트 프로젝트 TODO

## 프로젝트 목표

기존 `콩쌤 수박게임`의 실제 게임 동작은 변경하지 않고, GitHub 제출용으로 멀티에이전트 협업 문서 구조를 만든다. 여러 AI 에이전트가 기획, 코드 점검, 테스트, 문서화를 역할별로 나누어 진행하는 과제 형태로 정리한다.

## 완료한 작업

- [x] 게임 코드와 분리된 `multi-agent-project` 폴더 생성
- [x] 멀티에이전트 협업 규칙을 `AGENTS.md`에 작성
- [x] Gemini 전용 작업 지침을 `GEMINI.md`에 작성
- [x] 프로젝트 배경과 제약 조건을 `context.md`에 작성
- [x] 강의/제출 파일명 오타 대응용 `contetxt.md` 작성
- [x] Week 11 규칙 기반 에이전트 모듈을 `week11-suika-agent` 하위 폴더로 추가
- [x] 상위 문서와 하위 모듈의 같은 이름 파일이 서로 덮어쓰이지 않게 구조 분리
- [x] `python -m py_compile .\week11-suika-agent\my_agent.py` 문법 검사 통과
- [x] `python .\week11-suika-agent\my_agent.py` 실행 후 `agent_output.md` 갱신
- [x] 게임 실행 파일인 `src`, `public`, `index.html`, `package.json`은 수정하지 않음

## 에이전트별 역할

- 프로젝트 매니저 에이전트: 요구사항 정리, 작업 순서 결정, 제출 범위 관리
- 개발 에이전트: 게임 코드 구조 파악, 필요한 경우에만 안전한 코드 수정 제안
- QA 에이전트: 빌드, 실행, 브라우저 확인, 게임 동작 회귀 여부 점검
- 문서화 에이전트: README/과제 문서/작업 기록 정리
- 리뷰 에이전트: 변경된 파일이 게임에 영향을 주지 않는지 최종 검토

## 다음에 할 수 있는 작업

- [ ] GitHub 저장소에 변경사항 커밋하기
- [ ] Pull Request 설명에 멀티에이전트 역할 분담 내용 적기
- [ ] `npm run build`로 게임 빌드가 그대로 통과하는지 확인하기
- [ ] 실제 브라우저에서 게임 시작, 낙하, 병합, 재시작 버튼 확인하기
- [ ] 과제 제출 전에 변경 파일 목록을 캡처하거나 정리하기

## 제출 전 체크리스트

- [ ] 게임 화면, 조작, 점수, 소리, 병합 규칙이 기존과 동일한가?
- [ ] 제출용 문서가 게임 코드와 분리되어 있는가?
- [ ] `AGENTS.md`, `GEMINI.md`, `context.md`, `contetxt.md`, `todo.md`가 모두 있는가?
- [ ] `week11-suika-agent` 안에 `my_agent.py`, `README.md`, `vibe_prompt.md`, `agent_output.md`가 있는가?
- [ ] 문서에 멀티에이전트 역할과 협업 흐름이 명확한가?
- [ ] GitHub에 올릴 때 불필요한 `node_modules`가 포함되지 않는가?
