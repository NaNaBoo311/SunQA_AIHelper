from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.retriever_service import retriever_service
from services.auto_fixer import run_auto_fixer
from services.analyzer_agent import run_analyzer_agent
from services.task_builder_agent import run_task_builder_agent
from services.generator_agent import run_generator_agent
from services.validator_agent import run_validator_agent

router = APIRouter()


class FinalTableUpdate(BaseModel):
    notion_sync_package: list
    need_review: Optional[list] = None


class GuidelinesUpdate(BaseModel):
    guidelines: str


# ─── Apply auto-fixes ────────────────────────────────────────────────────────

@router.post("/final-table/apply-fixes")
async def apply_fixes():
    """
    Runs the auto-fixer: applies validator attack_log guidelines to the generator output.
    Saves the corrected result as the canonical final_table.
    Call this when confidence_rate > 90 to auto-correct before displaying the table.
    """
    generator_result = await retriever_service.get_generator_result()
    if not generator_result:
        raise HTTPException(status_code=400, detail="No generator result found. Run Agent C first.")

    validator_result = await retriever_service.get_validator_result()
    if not validator_result:
        raise HTTPException(status_code=400, detail="No validator result found. Run Agent D first.")

    attack_log = validator_result.get("attack_log", [])

    try:
        fixed = await run_auto_fixer(generator_result, attack_log)
        await retriever_service.save_final_table(fixed)
        return {"success": True, "result": fixed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-fix failed: {str(e)}")


# ─── Final table CRUD ─────────────────────────────────────────────────────────

@router.get("/final-table")
async def get_final_table():
    """Returns the final table (auto-fixed or manually edited). Falls back to generator result."""
    result = await retriever_service.get_final_table()
    if not result:
        result = await retriever_service.get_generator_result()
    return {"result": result}


@router.put("/final-table")
async def update_final_table(body: FinalTableUpdate):
    """Saves a manually-edited version of the final table."""
    current = await retriever_service.get_final_table() or {}
    current["notion_sync_package"] = body.notion_sync_package
    if body.need_review is not None:
        current["need_review"] = body.need_review
    await retriever_service.save_final_table(current)
    return {"success": True}


# ─── User guidelines CRUD ─────────────────────────────────────────────────────

@router.get("/guidelines")
async def get_guidelines():
    guidelines = await retriever_service.get_user_guidelines()
    return {"guidelines": guidelines}


@router.put("/guidelines")
async def update_guidelines(body: GuidelinesUpdate):
    await retriever_service.save_user_guidelines(body.guidelines)
    return {"success": True}


# ─── Full pipeline re-run with user guidelines ────────────────────────────────

@router.post("/pipeline/rerun")
async def rerun_pipeline():
    """
    Re-runs the full A → B → C → D pipeline with saved user guidelines injected
    into Agents A and B as high-priority correction context.
    """
    context = await retriever_service.get_combined_markdown()
    if not context:
        raise HTTPException(
            status_code=400,
            detail="No project context (GDD) found. Please upload documents first.",
        )

    user_guidelines = await retriever_service.get_user_guidelines()

    try:
        # ── Agent A ──────────────────────────────────────────────────────────
        agent_a = await run_analyzer_agent(context, user_guidelines)
        await retriever_service.save_analysis_result(agent_a)

        roster = agent_a.get("extracted_team_roster", [])
        domain_shards = agent_a.get("domain_analysis", [])
        missing_report = agent_a.get("missing_data_report", [])

        if not roster or not domain_shards:
            raise HTTPException(
                status_code=500,
                detail="Agent A produced no roster or domain shards. Check document content.",
            )

        # ── Agent B ──────────────────────────────────────────────────────────
        agent_b = await run_task_builder_agent(roster, domain_shards, missing_report, user_guidelines)
        await retriever_service.save_task_builder_result(agent_b)

        task_breakdown = agent_b.get("task_breakdown", [])

        # ── Agent C ──────────────────────────────────────────────────────────
        agent_c = await run_generator_agent(roster, task_breakdown)
        await retriever_service.save_generator_result(agent_c)

        # ── Agent D ──────────────────────────────────────────────────────────
        agent_d = await run_validator_agent(context, roster, agent_c)
        await retriever_service.save_validator_result(agent_d)

        # Clear any previous final table so the UI re-evaluates
        await retriever_service.save_final_table(None)

        return {
            "success": True,
            "validator_result": agent_d,
            "generator_result": agent_c,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline re-run failed: {str(e)}")
