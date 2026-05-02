# SunStudio Multi-Agent QA Pipeline

A multi-agent, AI-driven QA orchestration tool designed to ingest Game Design Documents (GDDs) and automatically generate structured, professional Test Specifications ready for Notion synchronization.

This project implements a custom **4-Agent Architecture** with a human-in-the-loop frontend, featuring adversarial validation and strict deterministic routing to prevent LLM hallucinations.

## 🚀 Key Features
- **Agent A (Analyzer):** Evaluates the GDD, extracts team rosters, and flags logical holes.
- **Agent B (Task Builder):** Breaks down game mechanics into atomic functional requirements.
- **Agent C (Generator):** Synthesizes Gherkin BDD test cases (`Given/When/Then`) and safely routes broken tasks to PMs.
- **Agent D (Validator):** An adversarial Red-Team AI that audits the pipeline for hallucinations, missing coverage, and misassignments.
- **Interactive Visualizer:** Real-time frontend visualization of the pipeline with manual mid-pipeline overrides.

---

## 📄 Expected Inputs
When running the pipeline via the frontend UI, the system expects you to upload project documents. 
**For the pipeline to fully function, your uploaded documents must contain at least:**
1. The **Game Design Document (GDD)** detailing the core mechanics and requirements.
2. A **Team Roster & Roles** list so the AI can successfully map technical domains and assign test cases.
*(Note: If the team list is missing, the pipeline has strict anti-hallucination fallbacks to prevent crashes, but all tasks will explicitly remain unassigned).*

> 💡 **Sample Files Included:** For your convenience, I have provided ready-to-use sample documents in the `samples/` directory at the root of the project. You can upload these directly into the UI to immediately test the pipeline!

---

## 🛠️ How to Start Locally

### 1. Backend (FastAPI)
The backend requires Python 3.11+ and manages the AI orchestration logic.

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React)
Requires Node.js (v18+).

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```
The app will be available at `http://localhost:3000`.

---

## 🔑 Managing API Keys and LLM Providers

This project uses a centralized LLM Client (`backend/services/llm_client.py`) that acts as a router, allowing you to easily switch between local models (Ollama) and cloud APIs (Wokushop).

1. Copy the example environment file in the `backend` directory:
   ```bash
   cp backend/env_example backend/env
   ```
2. Open `backend/env` and configure your active SDK:

```env
# SDK Selection: The project currently supports "ollama" or "wokushop". You can change the sdk as you want and update llm_client.py
SDK=wokushop

# If using Wokushop (OpenAI compatible API)
WOKUSHOP_API_KEY=sk-your-api-key-here
WOKUSHOP_MODEL=<your_model_name>

# If using local Ollama
OLLAMA_MODEL=<your_model_name>
```

---

