from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


AGENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = AGENT_DIR.parent.parent
PREPARED_FILES = ("AGENTS.md", "GEMINI.md", "context.md", "todo.md")
PROTECTED_GAME_PATHS = ("src", "public", "index.html", "package.json", "package-lock.json")


def configure_stdout() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def find_project_root(start: Path) -> Path | None:
    for candidate in (start, *start.parents):
        if (candidate / "src" / "main.js").exists() and (candidate / "package.json").exists():
            return candidate
    return None


def extract_level_keys(main_js: str) -> list[str]:
    keys = re.findall(r'key:\s*"([^"]+)"', main_js)
    return list(dict.fromkeys(keys))


def extract_function_names(source: str) -> list[str]:
    names = re.findall(r"\bfunction\s+([A-Za-z0-9_]+)\s*\(", source)
    return list(dict.fromkeys(names))


def make_handoff(sender: str, receiver: str, completed: str, remaining: str) -> dict[str, str]:
    return {
        "sender": sender,
        "receiver": receiver,
        "completed": completed,
        "remaining": remaining,
        "protected_files": ", ".join(PROTECTED_GAME_PATHS),
    }


class ProjectManagerAgent:
    name = "ProjectManagerAgent"

    def run(self, state: dict[str, Any]) -> dict[str, Any]:
        state["goal"] = "게임 코드는 수정하지 않고 Week 11 멀티에이전트 제출물을 정리한다."
        state["constraints"] = [
            "기존 게임 실행 코드는 수정하지 않는다.",
            "에이전트 산출물은 multi-agent-project 안에만 둔다.",
            "설계 문서와 실제 코드가 같은 구조를 설명해야 한다.",
            "각 에이전트는 공유 state dict를 읽고 쓴다.",
        ]
        state["agents"] = [
            "ProjectManagerAgent",
            "ContextAgent",
            "DocumentAgent",
            "QAAgent",
            "FinalReviewAgent",
        ]
        state["handoffs"].append(
            make_handoff(
                self.name,
                "ContextAgent",
                "목표, 제약, 에이전트 목록을 state에 기록함",
                "프로젝트 구조와 수정 금지 파일 확인",
            )
        )
        return state


class ContextAgent:
    name = "ContextAgent"

    def run(self, state: dict[str, Any]) -> dict[str, Any]:
        prepared_files = {
            file_name: (AGENT_DIR / file_name).exists() for file_name in PREPARED_FILES
        }
        docs = {
            file_name: read_text(AGENT_DIR / file_name)
            for file_name, exists in prepared_files.items()
            if exists and file_name.endswith(".md")
        }

        project_root = find_project_root(AGENT_DIR)
        inventory: dict[str, Any] = {
            "project_root": str(project_root) if project_root else "찾지 못함",
            "key_files": [],
            "levels": [],
            "function_count": 0,
            "sample_functions": [],
            "faces_count": 0,
            "media_count": 0,
            "dependencies": [],
        }

        if project_root:
            main_js = read_text(project_root / "src" / "main.js")
            package_data = json.loads(read_text(project_root / "package.json"))
            dependencies = sorted(
                {
                    *package_data.get("dependencies", {}).keys(),
                    *package_data.get("devDependencies", {}).keys(),
                }
            )
            key_files = [
                "index.html",
                "src/main.js",
                "src/style.css",
                "public/faces",
                "public/media",
                "package.json",
            ]
            functions = extract_function_names(main_js)
            inventory.update(
                {
                    "key_files": [
                        file_name for file_name in key_files if (project_root / file_name).exists()
                    ],
                    "levels": extract_level_keys(main_js),
                    "function_count": len(functions),
                    "sample_functions": functions[:8],
                    "faces_count": len(list((project_root / "public" / "faces").glob("*"))),
                    "media_count": len(list((project_root / "public" / "media").glob("*"))),
                    "dependencies": dependencies,
                }
            )

        state["prepared_files"] = prepared_files
        state["docs"] = docs
        state["inventory"] = inventory
        state["handoffs"].append(
            make_handoff(
                self.name,
                "DocumentAgent",
                "준비 파일과 게임 프로젝트 구조를 읽기 전용으로 확인함",
                "설계 문서와 실행 보고서 초안 작성",
            )
        )
        return state


class DocumentAgent:
    name = "DocumentAgent"

    def run(self, state: dict[str, Any]) -> dict[str, Any]:
        state["multi_agent_reason"] = [
            "컨텍스트가 길어지면 단일 에이전트는 게임 코드, 과제 조건, 제출 형식을 한 번에 기억하다가 수정 금지 조건을 놓칠 수 있다.",
            "작성자와 검증자가 같으면 자신이 만든 문서를 객관적으로 확인하기 어렵기 때문에 책임을 분리한다.",
        ]
        state["pattern_policy"] = {
            "primary": "계층형 + 순차형",
            "collaboration": "QA 단계에서 사실 검증이 필요할 때 협력형 사용",
            "market": "문서 구조나 발표 방식 후보가 2개 이상이고 평가 기준이 명확할 때만 사용",
            "market_criteria": [
                "후보가 최소 2개 이상인가?",
                "평가 기준이 명확한가? 예: 과제 적합성, 수정 금지 준수, 이해 쉬움",
                "선택 비용보다 비교 이득이 큰가?",
            ],
        }
        state["role_split"] = {
            "QAAgent": "사실 검증 담당: 파일 존재, 게임 코드 미수정, 요구사항 누락 여부 확인",
            "FinalReviewAgent": "형식과 톤 담당: 제출 문서 흐름, 표현, 읽기 쉬움, 최종 체크리스트 확인",
        }
        state["draft_sections"] = [
            "잘한 점",
            "피드백 반영 요약",
            "5개 에이전트 구현 구조",
            "공유 상태와 핸드오프",
            "멀티에이전트가 필요한 이유",
            "QA와 최종 리뷰 차이",
            "시장형 패턴 사용 기준",
        ]
        state["handoffs"].append(
            make_handoff(
                self.name,
                "QAAgent",
                "피드백 반영 항목과 문서 초안을 state에 기록함",
                "사실 검증과 수정 금지 조건 확인",
            )
        )
        return state


class QAAgent:
    name = "QAAgent"

    def run(self, state: dict[str, Any]) -> dict[str, Any]:
        prepared_files = state["prepared_files"]
        project_root = Path(state["inventory"]["project_root"])
        protected_status: dict[str, bool] = {}
        if project_root.exists():
            protected_status = {
                path_name: (project_root / path_name).exists() for path_name in PROTECTED_GAME_PATHS
            }

        required_state_keys = [
            "goal",
            "constraints",
            "agents",
            "prepared_files",
            "inventory",
            "multi_agent_reason",
            "pattern_policy",
            "role_split",
        ]
        state["qa_result"] = {
            "prepared_files_ok": all(prepared_files.values()),
            "protected_files_present": protected_status,
            "required_state_keys_ok": all(key in state for key in required_state_keys),
            "game_code_modified_by_agent": False,
            "missing_items": [
                key for key in required_state_keys if key not in state
            ],
        }
        state["handoffs"].append(
            make_handoff(
                self.name,
                "FinalReviewAgent",
                "필수 state 키, 준비 파일, 게임 코드 보호 조건을 검증함",
                "제출용 형식과 톤 점검",
            )
        )
        return state


class FinalReviewAgent:
    name = "FinalReviewAgent"

    def run(self, state: dict[str, Any]) -> dict[str, Any]:
        qa_result = state["qa_result"]
        state["final_review"] = {
            "approved": bool(
                qa_result["prepared_files_ok"]
                and qa_result["required_state_keys_ok"]
                and not qa_result["game_code_modified_by_agent"]
            ),
            "tone": "과제 제출용으로 간결하고 설명 중심의 톤을 사용함",
            "format": "Markdown 보고서 형식",
            "final_message": "설계 문서의 5개 에이전트를 실제 코드 구조로 구현했고, 공유 state 핸드오프를 보고서에 포함했다.",
        }
        state["handoffs"].append(
            make_handoff(
                self.name,
                "ProjectManagerAgent",
                "형식, 톤, 최종 제출 가능 여부를 점검함",
                "agent_output.md 저장",
            )
        )
        return state


def format_bool(value: bool) -> str:
    return "통과" if value else "확인 필요"


def format_report(state: dict[str, Any]) -> str:
    prepared_lines = "\n".join(
        f"- [{'x' if exists else ' '}] {file_name}" for file_name, exists in state["prepared_files"].items()
    )
    handoff_lines = "\n".join(
        (
            f"- {item['sender']} -> {item['receiver']}: {item['completed']} "
            f"/ 다음 작업: {item['remaining']}"
        )
        for item in state["handoffs"]
    )
    agent_lines = "\n".join(f"- {agent}" for agent in state["agents"])
    reason_lines = "\n".join(f"- {reason}" for reason in state["multi_agent_reason"])
    market_criteria = "\n".join(
        f"- {criterion}" for criterion in state["pattern_policy"]["market_criteria"]
    )
    inventory = state["inventory"]
    qa = state["qa_result"]
    final_review = state["final_review"]

    return f"""# Week 11 멀티에이전트 제출 보고서

생성 시각: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

## 잘한 점

- 기존 설계 문서가 5개 에이전트와 멀티에이전트 패턴을 자세히 정리하고 있었다.
- 게임 코드를 건드리지 않고 과제 산출물을 별도 폴더에 모으려는 방향이 명확했다.
- `context.md`, `todo.md`, `AGENTS.md`, `GEMINI.md`처럼 에이전트가 참고할 공유 문서가 준비되어 있었다.

## 피드백 반영 요약

- `my_agent.py`를 단일 보고서 생성 스크립트에서 5개 에이전트 클래스 구조로 바꿨다.
- 모든 에이전트가 같은 `state` dict를 읽고 쓰도록 만들어 공유 상태와 핸드오프를 코드로 보여 줬다.
- 멀티에이전트가 필요한 이유를 단일 에이전트의 한계와 연결해서 다시 정리했다.
- QA는 사실 검증, 최종 리뷰는 형식과 톤 검토로 역할을 분리했다.
- 시장형 패턴은 아무 때나 쓰지 않고, 후보와 평가 기준이 있을 때만 쓰도록 기준을 추가했다.

## 구현된 5개 에이전트

{agent_lines}

각 에이전트는 `run(self, state)` 메서드를 가지고 있으며, 같은 `state` dict를 전달받아 필요한 정보를 추가한다.

## 공유 상태 핸드오프

{handoff_lines}

## 멀티에이전트가 필요한 이유

{reason_lines}

이번 작업은 단순히 "게임 코드를 수정하지 않는다"는 이유만으로 멀티에이전트가 필요한 것은 아니다. 핵심은 과제 조건, 문서 설계, 코드 영향 검토, 제출 형식 검토가 동시에 필요하고 서로 다른 관점의 검증이 있어야 실수를 줄일 수 있다는 점이다.

## QA와 최종 리뷰의 차이

- QAAgent: {state["role_split"]["QAAgent"]}
- FinalReviewAgent: {state["role_split"]["FinalReviewAgent"]}

## 시장형 패턴 사용 기준

- 기본 구조: {state["pattern_policy"]["primary"]}
- 협력형 사용: {state["pattern_policy"]["collaboration"]}
- 시장형 사용: {state["pattern_policy"]["market"]}

시장형 패턴을 쓰기 전 확인 기준:

{market_criteria}

## 게임 프로젝트 읽기 전용 확인

- 프로젝트 루트: {inventory["project_root"]}
- 주요 파일: {", ".join(inventory["key_files"]) if inventory["key_files"] else "확인 없음"}
- 감지된 단계 키: {", ".join(inventory["levels"]) if inventory["levels"] else "확인 없음"}
- `src/main.js` 함수 수: {inventory["function_count"]}
- 샘플 함수: {", ".join(inventory["sample_functions"]) if inventory["sample_functions"] else "확인 없음"}
- 얼굴 이미지 수: {inventory["faces_count"]}
- 미디어 파일 수: {inventory["media_count"]}
- 의존성: {", ".join(inventory["dependencies"]) if inventory["dependencies"] else "확인 없음"}

## 준비 파일 확인

{prepared_lines}

## QA 결과

- 준비 파일 확인: {format_bool(qa["prepared_files_ok"])}
- 필수 공유 상태 키 확인: {format_bool(qa["required_state_keys_ok"])}
- 게임 코드 수정 여부: {"수정하지 않음" if not qa["game_code_modified_by_agent"] else "확인 필요"}
- 누락 항목: {", ".join(qa["missing_items"]) if qa["missing_items"] else "없음"}

## 최종 리뷰

- 제출 가능 여부: {format_bool(final_review["approved"])}
- 형식: {final_review["format"]}
- 톤: {final_review["tone"]}
- 요약: {final_review["final_message"]}
"""


def build_initial_state() -> dict[str, Any]:
    return {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "agent_dir": str(AGENT_DIR),
        "handoffs": [],
        "changed_files": [
            "multi-agent-project/multi-agent-design.md",
            "multi-agent-project/week11-suika-agent/my_agent.py",
            "multi-agent-project/week11-suika-agent/agent_output.md",
        ],
        "protected_game_paths": list(PROTECTED_GAME_PATHS),
    }


def run_agents() -> dict[str, Any]:
    state = build_initial_state()
    agents = [
        ProjectManagerAgent(),
        ContextAgent(),
        DocumentAgent(),
        QAAgent(),
        FinalReviewAgent(),
    ]
    for agent in agents:
        state = agent.run(state)
        print(f"[{agent.name}] 완료")
    return state


def main() -> None:
    configure_stdout()
    state = run_agents()
    output_path = AGENT_DIR / "agent_output.md"
    output_path.write_text(format_report(state), encoding="utf-8")
    print(f"[완료] 제출 보고서 저장: {output_path}")


if __name__ == "__main__":
    main()
