import os
import cloudinary
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

class CloudinaryConfig(BaseSettings):
    cloud_name: str
    api_key: str
    api_secret: str

    model_config = {
        "env_file": ".env",
        "env_prefix": "CLOUDINARY_",
        "extra": "ignore",
    }

def setup_cloudinary():
    cloudinary_config = CloudinaryConfig()

    cloud_name = cloudinary_config.cloud_name
    api_key = cloudinary_config.api_key
    api_secret = cloudinary_config.api_secret

    if not all([cloud_name, api_key, api_secret]):
        print("LỖI: Thiếu biến môi trường Cloudinary.")
        raise ValueError("Thiếu cấu hình Cloudinary")
    # Cấu hình Cloudinary
    try:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True # Sử dụng HTTPS
        )
        print("✅ Cloudinary configured successfully.")
    except Exception as e:
        print(f"LỖI: Không thể cấu hình Cloudinary: {str(e)}")
        raise