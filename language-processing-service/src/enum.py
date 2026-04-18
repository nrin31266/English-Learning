from enum import Enum

class LessonSourceType(str, Enum):
    youtube = "YOUTUBE"
    audio_file = "AUDIO_FILE"
    other = "OTHER"
    
from enum import Enum

class LessonProcessingStep(str, Enum):
    NONE = "NONE"
    PROCESSING_STARTED = "PROCESSING_STARTED"
    SOURCE_FETCHED = "SOURCE_FETCHED"
    TRANSCRIBED = "TRANSCRIBED"
    NLP_ANALYZED = "NLP_ANALYZED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
