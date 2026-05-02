import os
import uuid
import datetime
import aiofiles
from fastapi import UploadFile
from services.markdown_converter import MarkdownConverter

class DocumentProcessor:
    @staticmethod
    async def process_upload(upload_file: UploadFile, upload_dir: str) -> dict:
        doc_id = str(uuid.uuid4())
        original_filename = upload_file.filename
        file_ext = os.path.splitext(original_filename)[1].lower()
        file_type = file_ext.lstrip('.') if file_ext else 'unknown'
        
        saved_filename = f"{doc_id}_{original_filename}"
        saved_path = os.path.join(upload_dir, saved_filename)
        
        # Save the file
        try:
            await upload_file.seek(0)
            async with aiofiles.open(saved_path, 'wb') as f:
                while content := await upload_file.read(1024 * 1024):  # read in 1MB chunks
                    await f.write(content)
        except Exception as e:
            return {
                "id": doc_id,
                "original_filename": original_filename,
                "saved_path": saved_path,
                "file_type": file_type,
                "size": upload_file.size or 0,
                "upload_time": datetime.datetime.now(datetime.UTC).isoformat(),
                "markdown_content": "",
                "status": "failed",
                "error": f"Failed to save file: {str(e)}"
            }

        # Convert to markdown
        try:
            markdown_content = MarkdownConverter.convert(saved_path, original_filename)
            status = "completed"
            error = None
        except Exception as e:
            markdown_content = ""
            status = "failed"
            error = f"Failed to convert to markdown: {str(e)}"
            
        # Clean up the raw file immediately to save disk space
        try:
            if os.path.exists(saved_path):
                os.remove(saved_path)
        except Exception as e:
            print(f"Warning: Failed to remove temporary file {saved_path}: {e}")

        return {
            "id": doc_id,
            "original_filename": original_filename,
            "saved_path": saved_path,
            "file_type": file_type,
            "size": upload_file.size or os.path.getsize(saved_path),
            "upload_time": datetime.datetime.now(datetime.UTC).isoformat(),
            "markdown_content": markdown_content,
            "status": status,
            "error": error
        }
