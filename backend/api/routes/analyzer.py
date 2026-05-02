from fastapi import APIRouter, HTTPException
from services.retriever_service import retriever_service
from services.analyzer_agent import run_analyzer_agent

router = APIRouter()


@router.post("/analyzer/run")
async def run_analysis():
    """
    Triggers Analyzer Agent A.
    Reads all uploaded & converted markdown documents, then calls the LLM
    to auto-extract the team roster and audit the GDD — no user input required.
    """
    combined_markdown = await retriever_service.get_combined_markdown()
    if not combined_markdown or combined_markdown.strip() == "":
        raise HTTPException(
            status_code=400,
            detail="No documents found. Please upload at least one document before running the analyzer.",
        )

    try:
        result = await run_analyzer_agent(combined_markdown)
        await retriever_service.save_analysis_result(result)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analyzer agent failed: {str(e)}")

@router.get("/analyzer/result")
async def get_analysis():
    """
    Fetches the last saved analysis result.
    """
    result = await retriever_service.get_analysis_result()
    return {"result": result}
