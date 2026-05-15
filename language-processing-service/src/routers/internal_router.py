import os
from fastapi import APIRouter, Header, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import Any

from src.llm.llm_service import generate_json
from src.llm.prompts import VOCAB_SYSTEM_PROMPT, build_subtopic_prompt, build_word_gen_prompt, build_single_meaning_prompt
from src.s3_storage.cloud_service import upload_file

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
    cefr_range: str = "B1-B2"
    n: int = 10
    tags: list[str] = []


class GenWordsRequest(BaseModel):
    topic_title: str
    subtopic_title: str
    subtopic_description: str = ""
    cefr_level: str = "B1"


@router.post("/vocab/gen-subtopics", response_model=AiGenerateResponse)
async def gen_subtopics(
    req: GenSubtopicsRequest,
    x_worker_key: str | None = Header(default=None, alias="X-Worker-Key"),
):
    _verify_worker_key(x_worker_key)
    prompt = f"[SYSTEM]\n{VOCAB_SYSTEM_PROMPT}\n\n[USER]\n{build_subtopic_prompt(req.topic_title, req.cefr_range, req.n, req.tags)}"
    result = await generate_json(prompt)
    return AiGenerateResponse(result=result)


@router.post("/vocab/gen-words", response_model=AiGenerateResponse)
async def gen_words(
    req: GenWordsRequest,
    x_worker_key: str | None = Header(default=None, alias="X-Worker-Key"),
):
    _verify_worker_key(x_worker_key)
    prompt = f"[SYSTEM]\n{VOCAB_SYSTEM_PROMPT}\n\n[USER]\n{build_word_gen_prompt(req.topic_title, req.subtopic_title, req.subtopic_description, req.cefr_level)}"
    result = await generate_json(prompt)
    return AiGenerateResponse(result=result)


class GenSingleMeaningRequest(BaseModel):
    word: str
    pos: str
    topic_title: str
    topic_description: str = ""
    subtopic_title: str
    subtopic_description: str


@router.post("/vocab/generate-single-meaning", response_model=AiGenerateResponse)
async def gen_single_meaning(
    req: GenSingleMeaningRequest,
    x_worker_key: str | None = Header(default=None, alias="X-Worker-Key"),
):
    _verify_worker_key(x_worker_key)
    prompt = (
        f"[SYSTEM]\n{VOCAB_SYSTEM_PROMPT}\n\n[USER]\n"
        f"{build_single_meaning_prompt(req.word, req.pos, req.topic_title, req.topic_description, req.subtopic_title, req.subtopic_description)}"
    )
    result = await generate_json(prompt)
    return AiGenerateResponse(result=result)


class UploadResponse(BaseModel):
    url: str


@router.post("/upload/image", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    public_id: str | None = None,
    x_worker_key: str | None = Header(default=None, alias="X-Worker-Key"),
):
    _verify_worker_key(x_worker_key)
    pid = public_id or f"vocab_topic_{file.filename}"
    url = await upload_file(file.file, pid, resource_type="image")
    return UploadResponse(url=url)
