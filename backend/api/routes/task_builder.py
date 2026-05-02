from fastapi import APIRouter, HTTPException
from services.retriever_service import retriever_service
from services.task_builder_agent import run_task_builder_agent

router = APIRouter()

@router.post("/task-builder/run")
async def run_task_builder():
    """
    Triggers Task Builder Agent B.
    Reads the previously saved result from Agent A and runs the breakdown domain by domain.
    """
    agent_a_result = await retriever_service.get_analysis_result()
    if not agent_a_result:
        raise HTTPException(
            status_code=400,
            detail="No Agent A results found. Please run the Analyzer Agent first.",
        )

    roster = agent_a_result.get("extracted_team_roster", [])
    shards = agent_a_result.get("domain_shards", [])
    missing_data_report = agent_a_result.get("missing_data_report", [])
    
    if not shards:
        raise HTTPException(
            status_code=400,
            detail="No domain shards found from Agent A results.",
        )

    try:
        result = await run_task_builder_agent(roster, shards, missing_data_report)
        await retriever_service.save_task_builder_result(result)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task Builder agent failed: {str(e)}")

@router.get("/task-builder/result")
async def get_task_builder_result():
    """
    Fetches the last saved Task Builder result.
    """
    result = await retriever_service.get_task_builder_result()
    return {"result": result}
