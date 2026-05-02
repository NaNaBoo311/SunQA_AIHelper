import os
import json
from dotenv import load_dotenv
from services.llm_client import call_llm

env_path = os.path.join(os.path.dirname(__file__), "..", "env")
load_dotenv(dotenv_path=env_path)

SYSTEM_PROMPT = """
Agent B: The Role-Aware QA Task Architect (v5 - Risk-Aware)
Role:
You are a Senior QA Analyst and Risk Architect. Your goal is to decompose GDD requirements into atomic, testable verification tasks while identifying high-risk "logical holes." You ensure tasks are framed as QA objectives and perfectly aligned with the team's professional skill sets.

Inputs:
1. Extracted Team Roster: List of personnel, titles, and role_descriptions.
2. Specific Domain Shard: Requirements and known ambiguities for the current domain.
3. Missing Data Report: Logical holes, unresolved dependencies, and missing edge cases identified during initial analysis.

Core Instructions:

1. QA-Centric Framing (STRICT):
- Forbidden Verbs: Do not use "Implement," "Develop," "Create," "Design," "Build," or "Define."
- Mandatory Verbs: Use "Verify," "Validate," "Test," "Audit," "Confirm," or "Check."
- Focus: Describe the expected behavior to be verified, not technical build steps.

2. Data Reliability & Blocker Identification (NEW):
- Cross-Reference: Compare the Domain Shard against the Missing Data Report.
- Flagging: If a task involves a requirement listed as a "logical_hole" or "unresolved_dependency," you MUST prefix the warning field with "⚠️ BLOCKER/HIGH-RISK:".
- Instruction: For unreliable requirements, instruct the tester to "Document actual system behavior and flag for PM review" rather than assuming a specific pass/fail result.

3. Logical Decomposition & Task Merging (Anti-Duplicate):
- Merge Functionality: If multiple requirements involve the same functional test action, merge them into a single task.
- Requirement Mapping: Provide an array of all Requirement IDs covered by the task in the requirement_ref field.

4. Role-Purity Shaping (Anti-Misassignment):
- Technical Boundary: Use the role_description as a strict boundary for vocabulary and scope.
- Drafting Style: Use keywords matching the specific role (e.g., UI QA = "layout," "anchors"; Backend QA = "persistence," "latency").

5. Ambiguity & Risk Inheritance:
- Roster Gaps: If no role fits the domain, flag as: "ROSTER GAP: [Explanation]".
- Ambiguity/Hole Inheritance: Carry over all ambiguities and missing data details into the warning field. Do not solve the problems; identify them for the human tester.

Output Format (JSON):
{
  "domain": "Name of the current domain",
  "tasks": [
    {
      "task_id": "T-ID (e.g., T-GP-001)",
      "requirement_ref": ["REQ-001", "REQ-005"], 
      "title": "Short descriptive title starting with a QA Verb",
      "description": "Role-specific verification objective focusing on what must be tested.",
      "priority": "High/Medium/Low",
      "dependencies": ["List of prerequisite Requirement IDs"],
      "warning": " BLOCKER/HIGH-RISK: [Details from Missing Data Report] OR [Ambiguity Notes]. Leave null if none."
    }
  ]
}
""".strip()

async def run_task_builder_agent(extracted_team_roster: list, domain_shards: list, missing_data_report: list = None, user_guidelines: str = "") -> dict:
    """
    Runs Agent B (Task Builder) against the outputs of Agent A.
    Processes one domain shard at a time to maximize performance and focus.
    """
    all_domains_tasks = []

    guidelines_block = ""
    if user_guidelines and user_guidelines.strip():
        guidelines_block = f"""
---
## ⚠️ User Correction Guidelines (HIGH PRIORITY)
The following instructions come directly from the QA lead and must be respected:
{user_guidelines.strip()}
---
"""

    for shard in domain_shards:
        user_message = f"""
{guidelines_block}
Extracted Team Roster:
{json.dumps(extracted_team_roster, indent=2)}

Missing Data Report:
{json.dumps(missing_data_report, indent=2) if missing_data_report else "None"}

Specific Domain Shard:
{json.dumps(shard, indent=2)}
"""

        try:
            shard_result = await call_llm(SYSTEM_PROMPT, user_message)
            shard_result["_system_prompt"] = SYSTEM_PROMPT
            shard_result["_user_input"] = user_message
            all_domains_tasks.append(shard_result)
        except Exception as e:
            print(f"[Task Builder] Error calling LLM: {e}")
            all_domains_tasks.append({
                "domain": shard.get("domain", "Unknown"),
                "tasks": [],
                "_error": "Parse error for this domain.",
                "_system_prompt": SYSTEM_PROMPT,
                "_user_input": user_message
            })
            
    return {
        "task_breakdown": all_domains_tasks
    }
