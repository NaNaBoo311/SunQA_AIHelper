from pydantic import BaseModel
from typing import List, Optional

class DocumentMetadata(BaseModel):
    id: str
    filename: str
    file_type: str
    size: int
    upload_time: str
    status: str

class UploadResponse(BaseModel):
    success: bool
    message: str
    document: Optional[DocumentMetadata] = None

class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]
