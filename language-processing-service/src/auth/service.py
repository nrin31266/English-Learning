from jose import jwt, JWTError
from authlib.jose.rfc7517.jwk import JsonWebKey
from fastapi import HTTPException, status
from src.auth.config import keycloak_config
from src.auth import dto as auth_dto
import logging
import requests

logger = logging.getLogger(__name__)

# Cache JWKS
_jwks = None

def get_jwks():
    
    global _jwks
    if _jwks is None:
        jwks_uri = f"{keycloak_config.issuer_uri}/protocol/openid-connect/certs"
        logger.info(f"Fetching JWKS from: {jwks_uri}")
        response = requests.get(jwks_uri)
        response.raise_for_status()
        _jwks = response.json()
        logger.info("JWKS fetched successfully")
    return _jwks

def get_signing_key(kid):
    jwks = get_jwks()
    for key in jwks['keys']:
        if key['kid'] == kid:
            logger.info(f"Found signing key for kid: {kid}")
            return key
    logger.error(f"Signing key not found for kid: {kid}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Signing key not found"
    )

def decode_token(token: str) -> dict:
    try:
        logger.info(f"Starting token decoding for token: {token[:50]}...")
        
        # Lấy header để lấy kid
        header = jwt.get_unverified_header(token)
        kid = header.get('kid')
        logger.info(f"Token header: {header}")
        
        if not kid:
            logger.error("No kid found in token header")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing kid"
            )
        
        # Lấy signing key
        signing_key = get_signing_key(kid)
        
        # Convert JWK to PEM format
        jwk = JsonWebKey.import_key(signing_key)
        public_key = jwk.get_public_key()
        
        logger.info("Signing key obtained, decoding token...")
        
        decoded_token = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience="account",
            issuer=keycloak_config.issuer_uri
        )
        
        logger.info("Token decoded successfully with claims: " + ", ".join(decoded_token.keys()))
        
        return decoded_token
        
    except JWTError as e:
        logger.error(f"JWT Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        logger.error(f"Token validation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed"
        )

def extract_user_principal(token: str) -> auth_dto.UserPrincipal:
    try:
        logger.info("Extracting user principal from token")
        decoded_token = decode_token(token)
        
        
        # LẤY REALM ROLES 
        realm_access = decoded_token.get('realm_access', {})
        realm_roles = realm_access.get('roles', [])
        logger.info(f"Found realm roles: {realm_roles}")
        
        # LẤY CLIENT ROLES 
        resource_access = decoded_token.get('resource_access', {})
        logger.info(f"Available clients in resource_access: {list(resource_access.keys())}")
        
        account_access = resource_access.get('account', {})
        client_roles = account_access.get('roles', [])
        logger.info(f"Found client roles from account: {client_roles}")
        
        # KẾT HỢP CẢ HAI LOẠI ROLES 
        all_roles = realm_roles + client_roles
        logger.info(f"All combined roles: {all_roles}")
        
        # Format roles: ROLE_XXX_XXX 
        formatted_roles = [
            f"ROLE_{role.replace('-', '_').upper()}" 
            for role in all_roles
        ]
        
        logger.info(f"Final formatted roles: {formatted_roles}")
        
        user_principal = auth_dto.UserPrincipal(
            email=decoded_token.get('email'),
            first_name=decoded_token.get('given_name'),
            last_name=decoded_token.get('family_name'),
            roles=formatted_roles,
            sub=decoded_token.get('sub')
        )

        logger.info(f"User principal created: email={user_principal.email}, first_name={user_principal.first_name}, last_name={user_principal.last_name}")
        return user_principal
        
    except Exception as e:
        logger.error(f"Error extracting user principal: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error extracting user information"
        )
        