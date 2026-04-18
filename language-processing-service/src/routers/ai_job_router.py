
from datetime import datetime
import uuid 
from fastapi import APIRouter, status
from src.dto import ApiResponse, AIJobResponse
router = APIRouter(prefix="/ai-jobs", tags=["ai-jobs"])

@router.post("/", response_model=ApiResponse[AIJobResponse], status_code=status.HTTP_201_CREATED)
def create_ai_job(
):
    # Placeholder implementation
    ai_job = AIJobResponse(
        id= str(uuid.uuid4()),
        user_id="example_user",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    return ApiResponse.success(data=ai_job)