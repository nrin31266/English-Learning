import os
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import Any

from src.llm.llm_service import generate_json
from src.llm.vocab_prompts import VOCAB_SYSTEM_PROMPT, build_subtopic_prompt, build_word_gen_prompt

router = APIRouter(prefix="/internal", tags=["internal"])


class AiGenerateRequest(BaseModel):
    system_prompt: str
    user_prompt: str


class AiGenerateResponse(BaseModel):
    result: Any


def _verify_worker_key(x_worker_key: str | None):
    expected = os.getenv("WORKER_API_KEY", "")
    if not expected or x_worker_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid worker key")


@router.post("/ai/generate", response_model=AiGenerateResponse)
async def ai_generate(
    req: AiGenerateRequest,
    x_worker_key: str | None = Header(default=None, alias="X-Worker-Key"),
):
    _verify_worker_key(x_worker_key)
    full_prompt = f"[SYSTEM]\n{req.system_prompt}\n\n[USER]\n{req.user_prompt}"
    result = await generate_json(full_prompt)
    return AiGenerateResponse(result=result)


class GenSubtopicsRequest(BaseModel):
    topic_title: str
    description: str = ""
    cefr_range: str = "B1-B2"
    n: int = 10


class GenWordsRequest(BaseModel):
    topic_title: str
    subtopic_title: str
    subtopic_description: str = ""
    cefr_level: str = "B1"
    existing_keys: list[str] = []


@router.post("/vocab/gen-subtopics", response_model=AiGenerateResponse)
async def gen_subtopics(
    req: GenSubtopicsRequest,
    x_worker_key: str | None = Header(default=None, alias="X-Worker-Key"),
):
    _verify_worker_key(x_worker_key)
    prompt = f"[SYSTEM]\n{VOCAB_SYSTEM_PROMPT}\n\n[USER]\n{build_subtopic_prompt(req.topic_title, req.description, req.cefr_range, req.n)}"
    result = await generate_json(prompt)
    return AiGenerateResponse(result=result)


@router.post("/vocab/gen-words", response_model=AiGenerateResponse)
async def gen_words(
    req: GenWordsRequest,
    x_worker_key: str | None = Header(default=None, alias="X-Worker-Key"),
):
    _verify_worker_key(x_worker_key)
    prompt = f"[SYSTEM]\n{VOCAB_SYSTEM_PROMPT}\n\n[USER]\n{build_word_gen_prompt(req.topic_title, req.subtopic_title, req.subtopic_description, req.cefr_level, req.existing_keys)}"
    result = await generate_json(prompt)
    return AiGenerateResponse(result=result)
