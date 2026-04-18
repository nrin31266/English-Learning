# src/gemini/gemini_service.py
import asyncio
import json
import google.generativeai as genai
from src.gemini.config import config

# Khởi tạo API key
genai.configure(api_key=config.api_key)

# Model dùng cho NLP 
model = genai.GenerativeModel(
    model_name=config.model,  # Ex: "gemini-2.5-flash"
    generation_config={
        "temperature": 0,
        "response_mime_type": "application/json",
    },
    system_instruction="You are a helpful assistant for text processing tasks. Always respond in JSON format according to the user's request.",
)


async def gemini_generate(prompt: str):
    
    response = await asyncio.to_thread(model.generate_content, prompt)

    # response.text là chuỗi JSON (theo response_mime_type)
    return json.loads(response.text)  # Luôn trả về dict
