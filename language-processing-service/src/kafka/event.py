# src/kafka/event.py
from pydantic import BaseModel, Field
from typing import Optional

from src.enum import LessonSourceType, LessonProcessingStep
class LessonGenerationRequestedEvent(BaseModel):
    source_type: LessonSourceType = Field(..., alias="sourceType")
    source_url: Optional[str] = Field(None, alias="sourceUrl")
    ai_job_id: Optional[str] = Field(None, alias="aiJobId")
    lesson_id: Optional[int] = Field(None, alias="lessonId")
    source_license_type: Optional[str] = Field(None, alias="sourceLicenseType")
    title: Optional[str] = Field(None, alias="title")
    description: Optional[str] = Field(None, alias="description")
    ai_meta_data_url: Optional[str] = Field(None, alias="aiMetadataUrl")
    is_restart: Optional[bool] = Field(False, alias="isRestart")

    class Config:
        from_attributes = True
        populate_by_name = True


class LessonProcessingStepUpdatedEvent(BaseModel):
    processing_step: LessonProcessingStep = Field(..., alias="processingStep")
    ai_message: Optional[str] = Field(None, alias="aiMessage")
    ai_job_id: Optional[str] = Field(None, alias="aiJobId")
    audio_url: Optional[str] = Field(None, alias="audioUrl")
    source_reference_id: Optional[str] = Field(None, alias="sourceReferenceId")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    is_skip: Optional[bool] = Field(None, alias="isSkip")
    ai_meta_data_url: Optional[str] = Field(None, alias="aiMetadataUrl")
    duration_seconds: Optional[int] = Field(None, alias="durationSeconds")
    title: Optional[str] = Field(None, alias="title")
    slug: Optional[str] = Field(None, alias="slug")
    description: Optional[str] = Field(None, alias="description")
    language_level: Optional[str] = Field(None, alias="languageLevel")
    source_language: Optional[str] = Field(None, alias="sourceLanguage")
    source_license_type: Optional[str] = Field(None, alias="sourceLicenseType")

    class Config:
        from_attributes = True
        populate_by_name = True
        validate_assignment = True
