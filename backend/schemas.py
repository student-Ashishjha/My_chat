from pydantic import BaseModel

class UserSchema(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    message: str
    token: str
