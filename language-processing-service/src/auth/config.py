from pydantic_settings import BaseSettings


class KeycloakConfig(BaseSettings):
    issuer_uri: str 


    model_config = {
        "env_file": ".env",
        "env_prefix": "KEYCLOAK_",
        "extra": "ignore"
    }
keycloak_config = KeycloakConfig()  # instance