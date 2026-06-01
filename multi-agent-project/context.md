# 프로젝트 컨텍스트

## 프로젝트 이름

콩쌤 수박게임 멀티에이전트 협업 프로젝트

## 한 줄 설명

Matter.js와 Vite로 만들어진 웹 수박게임을 유지하면서, 여러 AI 코딩 에이전트가 협업하는 방식으로 개발 문서와 제출 구조를 구성하는 학교 과제 프로젝트이다.

## 현재 게임 구조

- `index.html`: 브라우저 진입점
- `src/main.js`: 게임 로직, 물리 엔진, 점수, 오디오, 캔버스 렌더링
- `src/style.css`: 전체 화면 레이아웃과 게임 UI 스타일
- `public/faces`: 게임 공에 들어가는 얼굴 이미지
- `public/media`: 효과음, 배경음, 축하 영상
- `package.json`: Vite 개발 서버와 빌드 스크립트

## 기술 스택

- JavaScript
- Vite
- Matter.js
- HTML Canvas
- CSS
- GitHub 제출 워크플로우

## 멀티에이전트 적용 목적

이 프로젝트에서 멀티에이전트는 실제 게임을 바꾸기 위한 기능이 아니라, 개발 협업을 체계화하기 위한 방식이다. 각 에이전트는 서로 다른 책임을 가진다.

- 요구사항 정리
- 코드 구조 파악
- 품질 검토
- 테스트 시나리오 작성
- 제출 문서 정리

## 추가된 Week 11 실행 에이전트

`week11-suika-agent` 폴더는 Week 11 과제용 규칙 기반 에이전트 모듈이다. 상위 멀티에이전트 문서와 파일명이 겹치는 `AGENTS.md`, `GEMINI.md`, `context.md`, `todo.md`를 하위 폴더 안에 독립적으로 보관해 충돌을 피한다.

이 모듈의 핵심 파일은 다음과 같다.

- `week11-suika-agent/my_agent.py`: 외부 패키지 없이 실행되는 규칙 기반 에이전트
- `week11-suika-agent/vibe_prompt.md`: 첫 버전을 만들 때 사용한 프롬프트
- `week11-suika-agent/agent_output.md`: 실행 결과 보고서
- `week11-suika-agent/README.md`: 모듈 실행 방법과 파일 구성 설명

## 가장 중요한 제약 조건

학교 과제 제출 목적이므로 게임 동작은 변경하지 않는다. 이번 작업의 범위는 문서와 폴더 구조 작성으로 제한한다.

수정 금지 대상:

- `src/main.js`
- `src/style.css`
- `index.html`
- `public` 안의 이미지와 영상
- `package.json`
- `package-lock.json`

수정 가능 대상:

- `multi-agent-project` 폴더 안의 문서 파일
- `multi-agent-project/week11-suika-agent` 폴더 안의 Week 11 에이전트 파일

## 작업 원칙

1. 게임에 영향을 주는 파일은 건드리지 않는다.
2. 문서는 한국어로 작성해 과제 제출자가 바로 설명할 수 있게 한다.
3. AI 에이전트별 역할과 책임을 분명하게 나눈다.
4. 변경 내용은 GitHub에서 보기 쉬운 Markdown 형식으로 정리한다.
5. 테스트가 필요할 때는 먼저 빌드와 브라우저 동작 확인을 수행한다.

## 예상 제출 설명

이 과제는 기존 웹 게임 프로젝트에 멀티에이전트 협업 방식을 적용한 예시이다. 프로젝트 매니저, 개발, QA, 문서화, 리뷰 에이전트가 각각 역할을 맡고, 실제 게임 코드는 유지한 상태에서 협업 규칙과 작업 계획을 문서화했다.
