import os
import json
from dotenv import load_dotenv
from services.llm_client import call_llm

# Load env variables from the 'env' file in the backend root
env_path = os.path.join(os.path.dirname(__file__), "..", "env")
load_dotenv(dotenv_path=env_path)

SYSTEM_PROMPT = """
You are a Senior Game QA Auditor and Semantic Dispatcher.

You will receive the combined content of all uploaded documents as a single block of Markdown text.
These documents may include a Game Design Document (GDD), a team member & role list, reference sheets, or any other project material.

## Step 1 — Extract the Team Roster
Scan the entire document set and identify all team members and their roles. Look for sections with headings like "Team", "Members", "Roles", "Staff", "Personnel", or tables listing names and positions. Extract every person, their domain/role, and their role_description (the role scope). The role_description must be extracted directly from the text without hallucinating or filling in blanks.
CRITICAL: If the document does not contain any team member list or roles, you MUST NOT hallucinate or invent member names or roles. In that case, you must return an empty array `[]` for extracted_team_roster.

## Step 2 — Define Primary Domains
From the extracted team roster, define your "Primary Domains" — one per unique role/expertise area. 
If the team roster is empty, deduce standard "Primary Domains" based on the core logical systems found in the GDD (e.g., "Core Gameplay", "UI/UX", "Economy", "Audio"). These become the categories for your Ready Shards.

## Step 3 — Audit the GDD
With the domains defined, audit the GDD content:

1. **Ready Shards**: For each active domain, extract comprehensive and highly detailed requirements from the GDD. Do not write short 1-line summaries; instead, capture the full mechanical, structural, and contextual details of the requirement exactly as described in the GDD so that no context is lost. Identify vague language (e.g., "fast", "smooth", "high amount") and log it in the ambiguities array.

2. **Missing Data Report**: Identify and log structural and logical blockers:
   - **hollow_header**: A heading exists but is followed by no text, "TBD", or empty space.
   - **missing_external_reference**: The text references an external file/spreadsheet/link not provided.
   - **missing_team_roster**: The uploaded documents do not contain any personnel, staff list, or team roles.
   - **roster_gap**: A team role exists but there is zero relevant GDD content for that domain.
   - **inconsistent_terminology**: The same concept is referred to by different names across sections.
   - **unresolved_dependency**: A requirement depends on a mechanic/system not defined anywhere in the GDD.
   - **logical_hole**: A system is described but is missing critical logic (e.g., a "Store" is mentioned but no currency or pricing is defined, or a combat system is described but max health/death states are missing).
   - **missing_edge_cases**: The happy path is defined, but edge cases (e.g., negative values, connection drops, inventory full) are completely ignored.

3. **Zero Hallucination & Vague Metric Policy**: Do not invent values or assume intent. If a requirement uses subjective terms ("fast", "smooth", "high amount", "balanced") instead of hard numbers, flag it as an ambiguity. If a specific edge case isn't covered, log it.

## Output Format
Return ONLY a single valid JSON object — no markdown fences, no explanation outside the JSON:

{
  "extracted_team_roster": [
    { "name": "Person Name", "role": "Their Role/Domain", "role_description": "Extracted scope of the role" }
  ],
  "domain_shards": [
    {
      "domain": "DOMAIN_NAME",
      "requirements": [
        {
          "id": "REQ-001",
          "summary": "Highly detailed, comprehensive description of the requirement including all mechanics and conditions",
          "type": "functional OR non-functional",
          "depends_on": ["ID of prerequisite mechanics"],
          "external_context": "Relevant cross-domain notes"
        }
      ],
      "uncertainties": {
        "ambiguity": [
          {
            "detail": "Description of the vague requirement",
            "questions": "Specific clarification question for the PM",
            "severity": "medium OR low"
          }
        ]
      }
    }
  ],
  "missing_data_report": {
    "report_type": "PM_NOTIFICATION_REQUIRED",
    "missing_data": [
      {
        "category": "Domain/Section Name",
        "issue_type": "hollow_header OR missing_external_reference OR missing_team_roster OR roster_gap OR inconsistent_terminology OR unresolved_dependency OR logical_hole OR missing_edge_cases",
        "detail": "Detailed explanation of what is missing",
        "request_to_pm": "The exact question/request to be sent to the PM to resolve this blocker",
        "severity": "high OR medium OR low"
      }
    ]
  }
}
""".strip()


async def run_analyzer_agent(combined_markdown: str, user_guidelines: str = "") -> dict:
    """
    Runs Analyzer Agent A against the combined markdown from all uploaded documents.
    The agent auto-extracts the team roster and GDD content from the documents itself.

    Args:
        combined_markdown: All uploaded document markdowns concatenated.
        user_guidelines: Optional user-provided correction guidelines to inject.

    Returns:
        Parsed JSON dict with extracted_team_roster, domain_shards, and missing_data_report.
    """
    guidelines_block = ""
    if user_guidelines and user_guidelines.strip():
        guidelines_block = f"""
---
## ⚠️ User Correction Guidelines (HIGH PRIORITY)
The following instructions come directly from the QA lead and must be respected:
{user_guidelines.strip()}
---
"""

    user_message = f"""Here are all the uploaded project documents combined into a single Markdown block.
Please extract the team roster and audit the GDD as instructed.
{guidelines_block}
---

{combined_markdown}
"""

    try:
        result = await call_llm(SYSTEM_PROMPT, user_message)
        result["_system_prompt"] = SYSTEM_PROMPT
        result["_user_input"] = user_message
    except Exception as e:
        print(f"[Analyzer Agent] Error calling LLM: {e}")
        result = {
            "extracted_team_roster": [],
            "domain_shards": [],
            "missing_data_report": {
                "report_type": "PARSE_ERROR",
                "missing_data": [],
            },
            "_system_prompt": SYSTEM_PROMPT,
            "_user_input": user_message,
        }

    return result
