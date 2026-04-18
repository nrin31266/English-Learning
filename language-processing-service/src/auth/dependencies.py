from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.auth.service import extract_user_principal
from src.auth import dto as auth_dto
import logging
from src.errors.base_error_code import BaseErrorCode
from src.errors.base_exception import BaseException


logger = logging.getLogger(__name__)

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> auth_dto.UserPrincipal:
    try:
        logger.info("get_current_user dependency called")
        
        if not credentials:
            logger.error("No credentials provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication credentials provided"
            )
        
        token = credentials.credentials
        logger.info(f"Token received: {token[:20]}...")
        
        user_principal = extract_user_principal(token)
        logger.info(f"User principal extracted successfully: {user_principal}")
        
        return user_principal
        
    except HTTPException as he:
        logger.warning(f"HTTPException in get_current_user: {he.detail}")
        raise BaseException(
            BaseErrorCode.UNAUTHORIZED,
            message=he.detail
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}", exc_info=True)
        raise BaseException(
            BaseErrorCode.UNAUTHORIZED,
            message="Failed to authenticate user"
        )

def require_roles(required_roles: list[str]):
    
    def role_checker(current_user: auth_dto.UserPrincipal = Depends(get_current_user)):
        logger.info(f"Checking roles: user has {current_user.roles}, required {required_roles}")
        
        user_roles = set(current_user.roles)
        required_roles_set = set(required_roles)
        
        if not required_roles_set.intersection(user_roles):
            logger.warning(f"Access denied: user roles {user_roles} don't include any of {required_roles_set}")
            raise BaseException(
                BaseErrorCode.NO_ACCESS,
                message="User does not have the required roles"
            )
        
        logger.info("Role check passed")
        return current_user
    return role_checker