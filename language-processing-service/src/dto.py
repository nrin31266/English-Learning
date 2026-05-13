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
    # phonemeScore: Optional[float] = None  # 0.0 - 1.0
    
    phonemeDiff: dict | None = None  # THÊM: chứa diff_tokens cho UI
    extraOrMissingIpa: dict | None = None  # THÊM: cho EXTRA/MISSING


class DiffToken(BaseModel):
    type: Literal["MATCH", "MISMATCH", "MISSING", "EXTRA", "NO_DATA"]
    expected_ipa: Optional[str] = None
    actual_ipa: Optional[str] = None
    position: Optional[int] = None  # Vị trí trong câu (từ thứ mấy)
    class Config:
        from_attributes = True
class PhonemeDiff(BaseModel):
 
    score: float
    diff_tokens: List[DiffToken] = []
    expected_ipa: Optional[str] = None
    actual_ipa: Optional[str] = None
    class Config:
        from_attributes = True
class ShadowingResult(BaseModel):
    sentenceId: int
    expectedText: str
    recognizedText: str
    totalWords: int
    correctWords: int          # chỉ đếm CORRECT (exact)
    accuracy: float            # % (correctWords / totalWords)
    weightedAccuracy: float    # % (theo score)
    fluencyScore: float        # 0.0 - 1.0
    avgPause: float            # giây
    speechRate: float          # words/second
    recognizedWordCount: int
    lastRecognizedPosition: int
    compares: List[ShadowingWordCompare]
    phoneme_diff: Optional[PhonemeDiff] = None  # THÊM: nếu có data phoneme diff, sẽ điền ở đây
    

class ShadowingWord(BaseModel):
    id: int
    wordText: str
    wordNormalized: str
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
    errorCode: str | None = None
    errorMessage: str | None = None
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
    posTag: Optional[str] = None
    entityType: Optional[str] = None
    lemma: Optional[str] = None
    class Config:
        from_attributes = True


class SegmentDto(BaseModel):
    start: float
    end: float
    text: str
    words: List[WordDto]
    phoneticUs: Optional[str] = None      # Thêm field mới
    translationVi: Optional[str] = None   # Thêm field mới
    class Config:
        from_attributes = True

# XÓA HOÀN TOÀN các class sau (không cần dùng nữa):
# - WordAnalyzedDto
# - SentenceAnalyzedDto  
# - NlpAnalyzedDto


class TranscribedDto(BaseModel):
    segments: List[SegmentDto]
    class Config:
        from_attributes = True

# class SentenceAnalyzedDto(BaseModel):
#     orderIndex: int
#     phoneticUs: Optional[str] = None
#     translationVi: Optional[str] = None
#     class Config:
#         from_attributes = True

# class NlpAnalyzedDto(BaseModel):
#     sentences: List[SentenceAnalyzedDto]
#     class Config:
#         from_attributes = True

class LessonGenerationAiMetadataDto(BaseModel):
    sourceFetched: Optional[SourceFetchedDto] = None
    transcribed: Optional[TranscribedDto] = None

    class Config:
        from_attributes = True


    
class SpaCyWordAnalysisRequest(BaseModel):
    word: str
    context: str | None = None


class SingleMeaningRequest(BaseModel):
    word: str
    pos: str
    topic_title: str
    subtopic_title: str
    subtopic_description: str


class SingleMeaningDefinition(BaseModel):
    definition: str
    meaning_vi: str
    example: str
    vi_example: str
    level: str