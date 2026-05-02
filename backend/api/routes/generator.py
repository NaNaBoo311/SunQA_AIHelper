from fastapi import APIRouter, HTTPException
from services.retriever_service import retriever_service
from services.generator_agent import run_generator_agent

router = APIRouter()

@router.post("/generator/run")
async def run_generator():
    """
    Triggers Generator Agent C.
    Reads the previously saved result from Agent B and Agent A's roster.
    """
    agent_a_result = await retriever_service.get_analysis_result()
    if not agent_a_result:
        raise HTTPException(
            status_code=400,
            detail="No Agent A results found. Please run the Analyzer Agent first.",
        )

    roster = agent_a_result.get("extracted_team_roster", [])

    agent_b_result = await retriever_service.get_task_builder_result()
    if not agent_b_result:
        raise HTTPException(
            status_code=400,
            detail="No Agent B results found. Please run the Task Builder Agent first.",
        )

    task_breakdown = agent_b_result.get("task_breakdown", [])
    
    if not task_breakdown:
        raise HTTPException(
            status_code=400,
            detail="No task breakdown found from Agent B results.",
        )

    try:
        result = await run_generator_agent(roster, task_breakdown)
        await retriever_service.save_generator_result(result)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generator agent failed: {str(e)}")

@router.get("/generator/result")
async def get_generator_result():
    """
    Fetches the last saved Generator result.
    """
    result = await retriever_service.get_generator_result()
    return {"result": result}
