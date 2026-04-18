from pydantic import BaseModel
from typing import Optional, List, Dict

class DefinitionItem(BaseModel):
    type: str
    definition: str
    vietnamese: str
    example: str

class DictionaryWordDTO(BaseModel):
    word: str
    originWord: Optional[str]
    isValidWord: bool = True
    wordType: str = "normal"
    cefrLevel: Optional[str] = None
    phonetics: Optional[Dict[str, str]] = None
    definitions: Optional[List[DefinitionItem]] = None
