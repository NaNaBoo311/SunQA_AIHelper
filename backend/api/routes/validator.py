from fastapi import APIRouter, HTTPException
from services.retriever_service import retriever_service
from services.validator_agent import run_validator_agent

router = APIRouter()

@router.post("/validator/run")
async def run_validator():
    """
    Triggers Validator Agent D.
    Requires Agent A (roster + context), and Agent C (generator output) to have run first.
    """
    agent_a_result = await retriever_service.get_analysis_result()
    if not agent_a_result:
        raise HTTPException(
            status_code=400,
            detail="No Agent A results found. Please run the Analyzer Agent first.",
        )

    roster = agent_a_result.get("extracted_team_roster", [])
    project_context = await retriever_service.get_combined_markdown()

    if not project_context:
        raise HTTPException(
            status_code=400,
            detail="No project context (GDD) found. Please upload documents first.",
        )

    generator_result = await retriever_service.get_generator_result()
    if not generator_result:
        raise HTTPException(
            status_code=400,
            detail="No Agent C results found. Please run the Generator Agent first.",
        )

    try:
        result = await run_validator_agent(project_context, roster, generator_result)
        await retriever_service.save_validator_result(result)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validator agent failed: {str(e)}")


@router.get("/validator/result")
async def get_validator_result():
    """
    Fetches the last saved Validator audit result.
    """
    result = await retriever_service.get_validator_result()
    return {"result": result}
