from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List
from api.models.document import DocumentMetadata, UploadResponse, DocumentListResponse
from utils.file_validator import validate_file
from services.document_processor import DocumentProcessor
from services.retriever_service import retriever_service
import os

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")

@router.post("/documents/upload", response_model=List[UploadResponse])
async def upload_documents(files: List[UploadFile] = File(...)):
    responses = []
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    for file in files:
        # Validate
        is_valid, error_msg = await validate_file(file)
        if not is_valid:
            responses.append(UploadResponse(success=False, message=error_msg))
            continue
            
        # Process
        try:
            doc_data = await DocumentProcessor.process_upload(file, UPLOAD_DIR)
            await retriever_service.add_document(doc_data)
            
            doc_meta = DocumentMetadata(
                id=doc_data["id"],
                filename=doc_data["original_filename"],
                file_type=doc_data["file_type"],
                size=doc_data["size"],
                upload_time=doc_data["upload_time"],
                status=doc_data["status"]
            )
            
            responses.append(UploadResponse(
                success=doc_data["status"] == "completed",
                message=doc_data.get("error") or "Upload and processing successful",
                document=doc_meta
            ))
        except Exception as e:
            responses.append(UploadResponse(success=False, message=f"Processing error: {str(e)}"))
            
    return responses

@router.get("/documents", response_model=DocumentListResponse)
async def get_documents():
    docs = await retriever_service.get_all_documents()
    return DocumentListResponse(documents=[DocumentMetadata(**doc) for doc in docs])

@router.get("/documents/{doc_id}", response_model=DocumentMetadata)
async def get_document(doc_id: str):
    doc = await retriever_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentMetadata(**doc)

@router.delete("/documents/clear")
async def clear_all_documents():
    success = await retriever_service.clear_all_data()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear data")
    return {"success": True, "message": "All session data cleared."}

@router.get("/documents/{doc_id}/markdown")
async def get_document_markdown(doc_id: str):
    doc = await retriever_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"markdown_content": doc.get("markdown_content", "")}

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    success = await retriever_service.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "message": "Document deleted"}

@router.post("/documents/process-all")
async def process_all_documents():
    await retriever_service.refresh_combined_context()
    return {"success": True, "message": "Combined context refreshed"}

@router.get("/retriever/context")
async def get_combined_context():
    context = await retriever_service.get_combined_markdown()
    return {"combined_markdown": context}

@router.get("/retriever/summary")
async def get_summary():
    return await retriever_service.get_summary()
