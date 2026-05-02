import os
import json
from dotenv import load_dotenv
from services.llm_client import call_llm

env_path = os.path.join(os.path.dirname(__file__), "..", "env")
load_dotenv(dotenv_path=env_path)

AUTO_FIX_PROMPT = """
You are a precise JSON task editor. You will receive a single QA task object and a correction guideline from an audit report.

Your ONLY job: apply the guideline's correction to the task and return the fixed task object.

Rules:
- Change ONLY what the guideline explicitly instructs (e.g., change assignee, remove hallucinated text).
- Do NOT add, remove, or rename any JSON keys.
- Do NOT change any field that the guideline does not mention.
- Return the complete corrected task as a flat JSON object (not wrapped in any key).
""".strip()


async def _apply_single_fix(task: dict, guideline: str) -> dict:
    """Runs one focused LLM call to apply a single guideline to a single task."""
    user_msg = f"""Task to fix:
{json.dumps(task, indent=2)}

Correction guideline:
{guideline}
"""
    try:
        fixed = await call_llm(AUTO_FIX_PROMPT, user_msg)
        
        # Sanity check: must still be a dict with at least the Task title key
        if isinstance(fixed, dict) and "Task title" in fixed:
            return fixed
        return task  # fall back to original if output is malformed
    except Exception as e:
        print(f"[AutoFixer] Fix failed for '{task.get('Task title')}': {e}")
        return task  # Always fall back; never drop a task


async def run_auto_fixer(generator_result: dict, attack_log: list) -> dict:
    """
    Applies validator attack_log guidelines to the notion_sync_package.

    Only processes MISASSIGNMENT and HALLUCINATION types.
    COVERAGE_GAP items are skipped (they require new tasks, not edits).
    Returns a patched copy of the generator result.
    """
    # Build a map: task_title (lowercased) → [guidelines to apply]
    fix_map: dict[str, list[str]] = {}
    for attack in attack_log:
        attack_type = attack.get("type", "")
        guideline = attack.get("guideline", "").strip()
        target = attack.get("target", "").strip().lower()

        if attack_type in ("MISASSIGNMENT", "HALLUCINATION") and guideline and target:
            if target not in fix_map:
                fix_map[target] = []
            fix_map[target].append(guideline)

    # Apply fixes to each task in notion_sync_package
    fixed_tasks = []
    for task in generator_result.get("notion_sync_package", []):
        title_key = task.get("Task title", "").strip().lower()
        guidelines = fix_map.get(title_key, [])
        current = task
        for guideline in guidelines:
            current = await _apply_single_fix(current, guideline)
        fixed_tasks.append(current)

    return {
        "notion_sync_package": fixed_tasks,
        "need_review": generator_result.get("need_review", []),
    }
