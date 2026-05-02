import os
import json
from dotenv import load_dotenv
from services.llm_client import call_llm

env_path = os.path.join(os.path.dirname(__file__), "..", "env")
load_dotenv(dotenv_path=env_path)

# ─────────────────────────────────────────────────────────────────────────────
# Prompt for SAFE tasks (warning is null).
# The LLM's only job: generate Notion fields and pick the best assignee.
# ─────────────────────────────────────────────────────────────────────────────
SAFE_TASK_PROMPT = """
Agent C — Safe Task Spec Writer

You are a Senior QA Technical Writer. Your ONLY job is to convert a list of
pre-approved QA tasks into Notion-ready test specifications.

All tasks you receive have NO warnings — they are safe to assign.

Instructions:

1. For each task, generate:
   - "Task title": Use the title from the input exactly.
   - "Description": Write professional Gherkin test scenarios (Given / When / Then).
     Use role-appropriate language matching the assignee's domain.
   - "Feature name": A short, specific system name (e.g., "Snake Exit Logic").
   - "Epic / Story": The high-level domain name from the input.
   - "Module / screen": Infer the logical game location (e.g., "Main Board", "HUD", "Store").
   - "Priority": Copy directly from the input task.
   - "Estimate": Realistic time (e.g., "30m", "45m", "1h") based on scenario count.
   - "Suggested assignee": Pick the BEST match from the Team Roster based on the task's
     technical nature vs. the role_description. Only use names from the roster.
   - "Status": Always "To Do".
   - "Due date": Always null.

2. Anti-Hallucination: Do not invent values. If a specific metric is missing,
   write: "Record observed behavior and verify against PM expectations."

Output Format — return a JSON object with a single key "tasks" containing the array:
{
  "tasks": [
    {
      "Task title": "...",
      "Description": "### Test Scenarios \\n\\n **Scenario 1:** Given... When... Then...",
      "Feature name": "...",
      "Epic / Story": "...",
      "Module / screen": "...",
      "Priority": "...",
      "Estimate": "...",
      "Suggested assignee": "Name from Roster" (or null if empty),
      "Status": "To Do",
      "Due date": null
    }
  ]
}
""".strip()

# ─────────────────────────────────────────────────────────────────────────────
# Prompt for REVIEW tasks (warning is NOT null).
# The LLM generates content only. Python handles assignee = null.
# ─────────────────────────────────────────────────────────────────────────────
REVIEW_TASK_PROMPT = """
Agent C — Blocked Task Spec Writer

You are a Senior QA Technical Writer. Your ONLY job is to convert a list of
HIGH-RISK / BLOCKED QA tasks into Notion-ready test specifications.

All tasks you receive have a "warning" field that is NOT null.
These tasks are flagged as blockers and will NOT be assigned to anyone.
You do NOT need to think about assignees — that is handled elsewhere.

Instructions:

1. For each task, generate:
   - "Task title": Use the title from the input exactly.
   - "Description": Start with a prominent warning block, then write Gherkin scenarios.
     Format:
       ⚠️ WARNING / BLOCKER: [Paste the warning text from the input here]
       
       ### Test Scenarios
       
       **Scenario 1:** Given... When... Then...
       (Include a note: "Document actual behavior. Flag result for PM review.")
   - "Feature name": A short, specific system name.
   - "Epic / Story": The high-level domain name from the input.
   - "Module / screen": Infer the logical game location.
   - "Priority": Copy directly from the input task.
   - "Estimate": Realistic time (e.g., "30m", "45m", "1h") based on scenario count.
   - "Status": Always "To Do".
   - "Due date": Always null.

2. Do NOT include a "Suggested assignee" field at all — it will be added by the system.

Output Format — return a JSON object with a single key "tasks" containing the array:
{
  "tasks": [
    {
      "Task title": "...",
      "Description": "⚠️ WARNING / BLOCKER: ...\\n\\n### Test Scenarios\\n\\n**Scenario 1:** ...",
      "Feature name": "...",
      "Epic / Story": "...",
      "Module / screen": "...",
      "Priority": "...",
      "Estimate": "...",
      "Status": "To Do",
      "Due date": null
    }
  ]
}
""".strip()

async def _call_llm(system_prompt: str, user_message: str) -> list:
    """Calls the LLM and returns a parsed list of task objects."""
    try:
        result = await call_llm(system_prompt, user_message)
        
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            if "tasks" in result and isinstance(result["tasks"], list):
                return result["tasks"]
            for v in result.values():
                if isinstance(v, list):
                    return v
        return []
    except Exception as e:
        print(f"[Generator Agent] LLM Error: {e}")
        raise


async def run_generator_agent(extracted_team_roster: list, task_breakdown: list) -> dict:
    """
    Agent C — Pre-processing Split Architecture:

    1. Python pre-splits Agent B's tasks into safe_tasks (warning=null)
       and review_tasks (warning≠null) BEFORE any LLM call.
    2. LLM Call 1 — processes safe_tasks only: generates Notion fields + picks assignee.
    3. LLM Call 2 — processes review_tasks only: generates Notion fields + warning block.
    4. Python assembles the result, hard-setting assignee=null for all review tasks.

    The LLM never makes a routing decision. Routing is 100% deterministic.
    """
    # ── Step 1: Strip internal metadata and flatten all tasks ────────────────
    safe_input: list[dict] = []
    review_input: list[dict] = []

    for domain_block in task_breakdown:
        domain = domain_block.get("domain", "Unknown Domain")
        tasks = domain_block.get("tasks", [])
        for task in tasks:
            # Attach domain to the task so the LLM has context
            enriched = {
                "domain": domain,
                "task_id": task.get("task_id"),
                "title": task.get("title"),
                "description": task.get("description"),
                "priority": task.get("priority"),
                "warning": task.get("warning"),
            }
            if task.get("warning"):
                review_input.append(enriched)
            else:
                safe_input.append(enriched)

    # ── Step 2: LLM call for safe tasks ──────────────────────────────────────
    safe_user_msg = f"""
Team Roster:
{json.dumps(extracted_team_roster, indent=2)}

Safe Tasks to process (no warnings):
{json.dumps(safe_input, indent=2)}
"""

    notion_sync_package: list[dict] = []
    if safe_input:
        try:
            notion_sync_package = await _call_llm(SAFE_TASK_PROMPT, safe_user_msg)
        except Exception as e:
            print(f"[Generator Agent] Error on safe task LLM call: {e}")

    # ── Step 3: LLM call for review (blocked) tasks ──────────────────────────
    review_user_msg = f"""
Blocked Tasks to process (all have warnings):
{json.dumps(review_input, indent=2)}
"""

    need_review: list[dict] = []
    if review_input:
        try:
            llm_review_tasks = await _call_llm(REVIEW_TASK_PROMPT, review_user_msg)
            # HARD ENFORCEMENT: Python always sets assignee = null for review tasks.
            for task in llm_review_tasks:
                task["Suggested assignee"] = None
            need_review = llm_review_tasks
        except Exception as e:
            print(f"[Generator Agent] Error on review task LLM call: {e}")

    # ── Step 4: Assemble final result ─────────────────────────────────────────
    combined_prompt = f"SAFE TASK PROMPT:\n{SAFE_TASK_PROMPT}\n\nREVIEW TASK PROMPT:\n{REVIEW_TASK_PROMPT}"
    combined_input = f"SAFE TASKS:\n{safe_user_msg}\n\nREVIEW TASKS:\n{review_user_msg}"

    return {
        "notion_sync_package": notion_sync_package,
        "need_review": need_review,
        "_system_prompt": combined_prompt,
        "_user_input": combined_input,
    }
