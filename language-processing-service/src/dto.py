from typing import Generic, TypeVar, Optional, Any, Dict, List
from pydantic import BaseModel, Field
from pydantic.generics import GenericModel  # THÊM DÒNG NÀY
from datetime import datetime as DateTime
from typing import Literal
from src.enum   import LessonProcessingStep
T = TypeVar("T")
class ShadowingWordCompare(BaseModel):
    position: int
    expectedWord: Optional[str]
    recognizedWord: Optional[str]
    expectedNormalized: Optional[str]
    recognizedNormalized: Optional[str]
    status: Literal["CORRECT", "NEAR", "WRONG", "MISSING", "EXTRA"]
    score: float  # 0.0 – 1.0

class ShadowingResult(BaseModel):
    sentenceId: int
    expectedText: str
    recognizedText: str
    totalWords: int
    correctWords: int          # chỉ đếm CORRECT (exact)
    accuracy: float            # % (correctWords / totalWords)
    weightedAccuracy: float    # % (theo score)
    recognizedWordCount: int
    lastRecognizedPosition: int
    compares: List[ShadowingWordCompare]
class ShadowingWord(BaseModel):
    id: int
    wordText: str
    wordLower: str
    wordNormalized: str
    wordSlug: str
    orderIndex: int
    class Config:
        from_attributes = True

class ShadowingRequest(BaseModel):
    sentenceId: int
    expectedWords: list[ShadowingWord]
    class Config:
        from_attributes = True

class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str
    words: Optional[List[Dict[str, Any]]] = []

class TranscriptionResponse(BaseModel):
    id: str
    filename: str
    duration: float
    language: str
    segments: List[TranscriptionSegment]
    full_text: str
    created_at: DateTime = None
    shadowingResult: ShadowingResult | None = None  #  thêm

    def __init__(self, **data):
        super().__init__(**data)
        self.created_at = DateTime.now()

class TranscribeUrlRequest(BaseModel):
    audio_url: str

class ApiResponse(GenericModel, Generic[T]):  # GenericModel
    """
    Một lớp response chung cho API.
    """

    code: int = Field(default=200, description="Mã code ứng dụng")
    message: Optional[str] = Field(default="Success", description="Thông điệp kết quả")
    result: Optional[T] = Field(default=None, description="Dữ liệu trả về")

    @classmethod
    def success(cls, data: Optional[T] = None, message: str = "Success"):
        """Factory method tương tự trong Java"""
        return cls(code=200, message=message, result=data)

    @classmethod
    def error(cls, code: int, message: str):
        """Factory method cho lỗi chung"""
        return cls(code=code, message=message)


class MediaAudioCreateRequest(BaseModel):
    input_url: str
    audio_name: Optional[str] = None
    
class AudioInfo(BaseModel):
    file_path: str
    duration: Optional[int] = None  # duration in seconds
    sourceReferenceId: Optional[str] = Field(None, alias="sourceReferenceId")
    thumbnailUrl: Optional[str] = Field(None, alias="thumbnailUrl")
    audioUrl: Optional[str] = Field(None, alias="audioUrl")
    class Config:
        from_attributes = True

class AIJobResponse(BaseModel):
    id: str
    user_id: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True



class SourceFetchedDto(BaseModel):
    file_path: Optional[str] = None
    duration: Optional[int] = None  # duration in seconds
    sourceReferenceId: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    audioUrl: Optional[str] = None
    class Config:
        from_attributes = True
class WordDto(BaseModel):
    word: str
    start: float
    end: float
    score: float
    class Config:
        from_attributes = True


class SegmentDto(BaseModel):
    start: float
    end: float
    text: str
    words: List[WordDto]
    class Config:
        from_attributes = True
    


class TranscribedDto(BaseModel):
    segments: List[SegmentDto]
    class Config:
        from_attributes = True
class SentenceAnalyzedDto(BaseModel):
    orderIndex: int
    phoneticUk: Optional[str] = None
    phoneticUs: Optional[str] = None
    translationVi: Optional[str] = None
    class Config:
        from_attributes = True

class NlpAnalyzedDto(BaseModel):
    sentences: List[SentenceAnalyzedDto]
    class Config:
        from_attributes = True

class LessonGenerationAiMetadataDto(BaseModel):
    sourceFetched: Optional[SourceFetchedDto] = None
    transcribed: Optional[TranscribedDto] = None
    nlpAnalyzed: Optional[NlpAnalyzedDto] = None  

    class Config:
        from_attributes = True


    
class SpaCyWordAnalysisRequest(BaseModel):
    word: str
    context: str | None = None