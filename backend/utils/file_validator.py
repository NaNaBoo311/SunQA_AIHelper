import os
import magic
from fastapi import UploadFile

ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.md', '.txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Mapping of allowed MIME types to their corresponding extensions
ALLOWED_MIME_TYPES = {
    'application/pdf': {'.pdf'},
    'application/msword': {'.doc'},
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {'.docx', '.doc'}, # Sometimes doc is detected as docx and vice versa
    'application/zip': {'.docx'}, # docx is a zip file
    'text/markdown': {'.md'},
    'text/plain': {'.txt', '.md'},
}

async def validate_file(upload_file: UploadFile) -> tuple[bool, str]:
    if not upload_file.filename:
        return False, "Filename is missing"
        
    ext = os.path.splitext(upload_file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File extension {ext} not allowed. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}"
        
    # Check size
    if upload_file.size is not None and upload_file.size > MAX_FILE_SIZE:
        return False, f"File size exceeds 10MB limit."
        
    # Check MIME type
    try:
        # Read the first 2048 bytes for magic
        header = await upload_file.read(2048)
        await upload_file.seek(0)
        
        if len(header) == 0:
            return False, "File is empty"
            
        mime_type = magic.from_buffer(header, mime=True)
        
        if mime_type not in ALLOWED_MIME_TYPES:
            # Sometime markdown/text files are detected oddly depending on contents.
            # If it's a known extension, we might just allow it if it starts with text
            if mime_type.startswith('text/') and ext in {'.txt', '.md'}:
                pass
            else:
                return False, f"Invalid MIME type: {mime_type} for extension {ext}"
        else:
            allowed_exts_for_mime = ALLOWED_MIME_TYPES[mime_type]
            if ext not in allowed_exts_for_mime:
                 return False, f"MIME type {mime_type} does not match extension {ext}"
             
    except Exception as e:
        return False, f"Error validating file: {str(e)}"
        
    return True, ""
