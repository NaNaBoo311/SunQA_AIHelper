import os
import json
from ollama import chat
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "env")
load_dotenv(dotenv_path=env_path)

def parse_llm_json(raw: str):
    """Strips markdown fences and parses the LLM output."""
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except Exception as e:
        print(f"[LLM Client] JSON parse error: {e}")
        print(f"[LLM Client] Raw output was: {raw[:500]}")
        raise

async def call_llm(system_prompt: str, user_message: str, model_name: str = None, temperature: float = 0.1, max_tokens: int = 6000):
    """
    Centralized function to call the LLM and return parsed JSON.
    Routes the request based on the SDK environment variable.
    Includes max_tokens to prevent runaway generation and quota burn.
    """
    sdk = os.getenv("SDK", "ollama").lower()
    
    if sdk == "ollama":
        if not model_name:
            model_name = os.getenv("OLLAMA_MODEL")
            
        response = chat(
            model=model_name,
            format="json",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            options={
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 16384
            },
        )
        raw = response.message.content or ""
        return parse_llm_json(raw)
    
    elif sdk == "wokushop":
        from openai import AsyncOpenAI
        
        if not model_name:
            model_name = os.getenv("WOKUSHOP_MODEL")
            
        api_key = os.getenv("WOKUSHOP_API_KEY")
        if not api_key:
            raise ValueError("WOKUSHOP_API_KEY is missing from environment variables.")
            
        client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://llm.wokushop.com/v1"
        )
        
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        raw = response.choices[0].message.content or ""
        return parse_llm_json(raw)
        
    elif sdk == "openai":
        # Placeholder for OpenAI / other future SDKs
        raise NotImplementedError("OpenAI SDK integration is not yet implemented.")
        
    else:
        raise ValueError(f"Unsupported SDK specified in env: {sdk}")
