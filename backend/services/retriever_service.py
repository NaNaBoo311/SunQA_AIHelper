import os
import json

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "db_state.json")

class RetrieverService:
    def __init__(self):
        self.documents = {}
        self.analysis_result = None
        self.task_builder_result = None
        self.generator_result = None
        self.validator_result = None
        self.final_table = None
        self.user_guidelines = ""
        self.combined_context = ""
        self._load_state()

    def _load_state(self):
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    state = json.load(f)
                    # Support legacy state where it was just a dict of documents
                    if "documents" in state:
                        self.documents = state.get("documents", {})
                        self.analysis_result = state.get("analysis_result")
                        self.task_builder_result = state.get("task_builder_result")
                        self.generator_result = state.get("generator_result")
                        self.validator_result = state.get("validator_result")
                        self.final_table = state.get("final_table")
                        self.user_guidelines = state.get("user_guidelines", "")
                    else:
                        self.documents = state
                
                import asyncio
                # refresh combined context synchronously for init
                combined = []
                for doc_id, doc in self.documents.items():
                    if doc.get('status') == 'completed' and doc.get('markdown_content'):
                        combined.append(f"\n\n---\n# Document: {doc['original_filename']}\n---\n\n{doc['markdown_content']}")
                self.combined_context = "".join(combined)
            except Exception as e:
                print(f"Failed to load state: {e}")

    def _save_state(self):
        try:
            with open(STATE_FILE, "w", encoding="utf-8") as f:
                state = {
                    "documents": self.documents,
                    "analysis_result": self.analysis_result,
                    "task_builder_result": self.task_builder_result,
                    "generator_result": self.generator_result,
                    "validator_result": self.validator_result,
                    "final_table": self.final_table,
                    "user_guidelines": self.user_guidelines,
                }
                json.dump(state, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Failed to save state: {e}")

    async def save_analysis_result(self, result: dict):
        self.analysis_result = result
        self._save_state()

    async def get_analysis_result(self) -> dict:
        return self.analysis_result
        
    async def save_task_builder_result(self, result: dict):
        self.task_builder_result = result
        self._save_state()

    async def get_task_builder_result(self) -> dict:
        return self.task_builder_result

    async def save_generator_result(self, result: dict):
        self.generator_result = result
        self._save_state()

    async def get_generator_result(self) -> dict:
        return self.generator_result

    async def save_validator_result(self, result: dict):
        self.validator_result = result
        self._save_state()

    async def get_validator_result(self) -> dict:
        return self.validator_result

    async def save_final_table(self, result: dict):
        self.final_table = result
        self._save_state()

    async def get_final_table(self) -> dict:
        return self.final_table

    async def save_user_guidelines(self, guidelines: str):
        self.user_guidelines = guidelines
        self._save_state()

    async def get_user_guidelines(self) -> str:
        return self.user_guidelines or ""

    async def add_document(self, document_metadata: dict):
        doc_id = document_metadata['id']
        self.documents[doc_id] = document_metadata
        await self.refresh_combined_context()
        self._save_state()

    async def get_combined_markdown(self) -> str:
        return self.combined_context

    async def get_document(self, doc_id: str) -> dict:
        return self.documents.get(doc_id)

    async def get_all_documents(self) -> list:
        # Return only metadata
        docs = []
        for doc in self.documents.values():
            docs.append({
                "id": doc["id"],
                "filename": doc["original_filename"],
                "file_type": doc["file_type"],
                "size": doc["size"],
                "upload_time": doc["upload_time"],
                "status": doc["status"]
            })
        # Sort by upload time descending
        return sorted(docs, key=lambda x: x["upload_time"], reverse=True)

    async def delete_document(self, doc_id: str) -> bool:
        if doc_id in self.documents:
            doc = self.documents[doc_id]
            # Try to remove the physical file
            try:
                if 'saved_path' in doc and doc['saved_path'] and os.path.exists(doc['saved_path']):
                    os.remove(doc['saved_path'])
            except Exception as e:
                print(f"Failed to delete file {doc.get('saved_path')}: {e}")
                
            del self.documents[doc_id]
            await self.refresh_combined_context()
            self._save_state()
            return True
        return False

    async def refresh_combined_context(self):
        combined = []
        for doc_id, doc in self.documents.items():
            if doc['status'] == 'completed' and doc['markdown_content']:
                combined.append(f"\n\n---\n# Document: {doc['original_filename']}\n---\n\n{doc['markdown_content']}")
        self.combined_context = "".join(combined)

    async def get_document_preview(self, doc_id: str, max_chars: int = 200) -> str:
        doc = self.documents.get(doc_id)
        if doc and doc['markdown_content']:
            return doc['markdown_content'][:max_chars] + "..." if len(doc['markdown_content']) > max_chars else doc['markdown_content']
        return ""

    async def get_summary(self) -> dict:
        total_docs = len(self.documents)
        total_size = sum(doc['size'] for doc in self.documents.values())
        file_type_breakdown = {}
        for doc in self.documents.values():
            ft = doc['file_type']
            file_type_breakdown[ft] = file_type_breakdown.get(ft, 0) + 1
            
        return {
            "total_docs": total_docs,
            "total_size_bytes": total_size,
            "file_type_breakdown": file_type_breakdown
        }

    async def clear_all_data(self) -> bool:
        # Delete all physical files
        for doc_id, doc in list(self.documents.items()):
            try:
                if 'saved_path' in doc and doc['saved_path'] and os.path.exists(doc['saved_path']):
                    os.remove(doc['saved_path'])
            except Exception as e:
                print(f"Failed to delete file {doc.get('saved_path')}: {e}")
        
        # Reset state variables
        self.documents = {}
        self.analysis_result = None
        self.task_builder_result = None
        self.generator_result = None
        self.validator_result = None
        self.final_table = None
        self.user_guidelines = ""
        self.combined_context = ""
        
        # Save empty state
        self._save_state()
        return True

# Global instance to be imported by routes
retriever_service = RetrieverService()
