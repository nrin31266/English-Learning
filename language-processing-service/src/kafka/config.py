from confluent_kafka import Producer, Consumer



def create_kafka_producer() -> Producer:
    producer_config = {
        "bootstrap.servers": "localhost:9092",
        "linger.ms": 5,  # Chờ tối đa 5ms để gom message
        "batch.num.messages": 100, # Gửi tối đa 100 message mỗi lần
        "queue.buffering.max.ms": 50, # Buffer tối đa 50ms
    }
    return Producer(producer_config)

def create_kafka_consumer(topics: list[str]) -> Consumer:
    consumer_config = {
        "bootstrap.servers": "localhost:9092", 
        "group.id": "lp-service-group", 
        "auto.offset.reset": "earliest", # Đọc từ đầu nếu chưa có offset
        "enable.auto.commit": True, # Tự động commit offset
        "auto.commit.interval.ms": 1000, # Commit mỗi giây
    }
    consumer = Consumer(consumer_config)
    consumer.subscribe(topics)
    return consumer
