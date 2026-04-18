from src.kafka.config import create_kafka_producer

from src.kafka.config import create_kafka_producer
from src.kafka.event import LessonProcessingStepUpdatedEvent
from src.kafka.topic import LESSON_PROCESSING_STEP_UPDATED_TOPIC
import asyncio

producer = create_kafka_producer()
async def publish_lesson_processing_step_updated(event: LessonProcessingStepUpdatedEvent) -> None:
    producer.produce(
        topic=LESSON_PROCESSING_STEP_UPDATED_TOPIC,
        key=str(event.ai_job_id),
        value=event.model_dump_json(by_alias=True),
    )
    await asyncio.to_thread(producer.poll, 0)
    


# Background task để flush messages định kỳ
async def periodic_flush():
    while True:
        await asyncio.sleep(1)  # Chạy mỗi giây
        # Flush trong thread để tránh blocking event loop
        await asyncio.to_thread(producer.flush, 0.1)  # Timeout ngắn