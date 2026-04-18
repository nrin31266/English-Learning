# src.routers.spaCy_router.py
from fastapi import APIRouter
from src.dto import ApiResponse, SpaCyWordAnalysisRequest
from src.services.spaCy_service import analyze_word



router = APIRouter(prefix="/spacy", tags=["spaCy"])

@router.post("/word-analysis") # rq body: { "word": "running", "context": "I am running late." }
async def word_analysis(request: SpaCyWordAnalysisRequest) -> ApiResponse:
    return ApiResponse.success(data=await analyze_word(request.word, request.context))
