

from pydantic import BaseModel



class UserPrincipal(BaseModel):
    email: str 
    roles: list[str] = []
    first_name: str | None = None
    last_name: str | None = None
    sub: str
