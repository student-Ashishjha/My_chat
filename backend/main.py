from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User, ChatHistory
from schemas import UserSchema, ChatRequest
from auth import verify_password, create_user, create_token, verify_token
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.7,
    convert_system_message_to_human=True
)

@app.post("/register")
def register(user: UserSchema, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    create_user(db, user.username, user.password)
    return {"message": "User registered successfully"}

@app.post("/login")
def login(user: UserSchema, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.username)
    return {"token": token}

@app.post("/chat")
def chat(data: ChatRequest, db: Session = Depends(get_db)):

    try:
        username = verify_token(data.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

    db.add(ChatHistory(username=username, role="user", message=data.message))
    db.commit()

    history = db.query(ChatHistory).filter(
        ChatHistory.username == username
    ).all()

    prompt = ChatPromptTemplate.from_messages(
        [
            ("human", "You are a helpful AI assistant."),
            *[(h.role, h.message) for h in history]
        ]
    )

    chain = prompt | model
    response = chain.invoke({})

    db.add(ChatHistory(username=username, role="assistant", message=response.content))
    db.commit()

    return {
        "reply": response.content,
        "length": len(response.content),
        "status": "success"
    }

@app.post("/clear")
def clear_chat(data: dict, db: Session = Depends(get_db)):
    username = verify_token(data["token"])

    db.query(ChatHistory).filter(
        ChatHistory.username == username
    ).delete()

    db.commit()

    return {"message": "Chat cleared"}
