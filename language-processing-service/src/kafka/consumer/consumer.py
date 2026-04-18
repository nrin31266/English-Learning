from typing import Any, Callable, Dict, Tuple, Type
import asyncio
import json
from confluent_kafka import KafkaError
from src.kafka.config import create_kafka_consumer
from src.kafka.event import LessonGenerationRequestedEvent
from src.kafka.topic import LESSON_GENERATION_REQUESTED_TOPIC

TopicHandler = Callable[[Any], asyncio.Task | Any]
TopicRoute = Tuple[Type[Any], Callable[[Any], Any]]
from src.kafka.consumer.lesson_generation import handle_lesson_generation_requested

TOPIC_ROUTES: Dict[str, TopicRoute] = {
    LESSON_GENERATION_REQUESTED_TOPIC: (LessonGenerationRequestedEvent, handle_lesson_generation_requested),
}


async def consume_events():
    topics = list(TOPIC_ROUTES.keys())
    consumer = await asyncio.to_thread(create_kafka_consumer, topics)
    print(f"kafka_consumer_started topics={topics}")

    try:
        while True:
            msg = await asyncio.to_thread(consumer.poll, 0.1)
            if msg is None:
                continue

            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    print(f"kafka_error err={msg.error()}")
                continue

            route = TOPIC_ROUTES.get(msg.topic())
            if not route:
                print(f"KAFKA UNKNOWN TOPIC {msg.topic()}")
                continue

            model_cls, handler = route

            try:
                payload = json.loads(msg.value().decode("utf-8"))
                event = model_cls(**payload)
                asyncio.create_task(handler(event))
            except Exception as e:
                print(f"kafka_message_error topic={msg.topic()} err={e}")

    except asyncio.CancelledError:
        print("kafka_consumer_stopping")
    finally:
        await asyncio.to_thread(consumer.close)
        print("kafka_consumer_stopped")


async def start_kafka_consumers():
    await consume_events()