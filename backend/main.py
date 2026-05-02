import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import documents
from api.routes import analyzer
from api.routes import task_builder
from api.routes import generator
from api.routes import validator
from api.routes import final_table

app = FastAPI(
    title="Game QA Document Retriever API",
    description="API for uploading documents and converting them to markdown context for Game QA.",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://sun-qa-ai-helper.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(analyzer.router, prefix="/api", tags=["analyzer"])
app.include_router(task_builder.router, prefix="/api", tags=["task-builder"])
app.include_router(generator.router, prefix="/api", tags=["generator"])
app.include_router(validator.router, prefix="/api", tags=["validator"])
app.include_router(final_table.router, prefix="/api", tags=["final-table"])

@app.on_event("startup")
async def startup_event():
    # Create uploads directory
    uploads_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

@app.get("/")
async def root():
    return {
        "name": "Game QA Document Retriever API",
        "status": "online",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
