from fastapi import APIRouter, Depends, Request, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import jwt
import os

from app.db.database import Database
from app.core import funcionarios as core_func

router = APIRouter()

def get_db(request: Request) -> Database:
    return request.app.state.db

class LoginRequest(BaseModel):
    login: str
    senha: str

class LoginResponse(BaseModel):
    id: int
    login: str
    tipo: str
    funcionario_id: Optional[int] = None
    token: str  # ✅ NOVO: Token JWT

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Autentica usuário e retorna token JWT"""
    print("🔍 DEBUG: Login iniciado")  # ✅ NOVO
    print(f"🔍 DEBUG: Login={payload.login}, Senha={payload.senha}")  # ✅ NOVO
    
    user = core_func.login_usuario(db, payload.login, payload.senha)
    print(f"🔍 DEBUG: User encontrado? {user}")  # ✅ NOVO
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha inválidos.",
        )

    # ✅ CRIAR TOKEN JWT
    secret_key = os.getenv("SECRET_KEY", "sua-chave-secreta-super-segura")
    token = jwt.encode(
        {
            "id": user["id"],
            "login": user["login"],
            "tipo": user["tipo"],
            "funcionario_id": user.get("funcionario_id")
        },
        secret_key,
        algorithm="HS256"
    )
    print(f"🔍 DEBUG: Token criado com sucesso")  # ✅ NOVO

    # ✅ RETORNAR COM TOKEN
    return {
        "id": user["id"],
        "login": user["login"],
        "tipo": user["tipo"],
        "funcionario_id": user.get("funcionario_id"),
        "token": token
    }


# ----------------------------
# Configurações do estúdio
# ----------------------------

class StudioConfig(BaseModel):
    studio_name: str = "Meu Estúdio"
    studio_logo: Optional[str] = None
    primary_color: str = "#ff4500"
    font_family: str = "Roboto, Arial, sans-serif"

@router.get("/studio/config", response_model=StudioConfig)
def get_studio_config(db: Database = Depends(get_db)):
    """Retorna configurações do estúdio"""
    try:
        cfg = db.get_one("config", {"id": 1})
        if not cfg:
            return StudioConfig()
        return StudioConfig(
            studio_name=cfg.get("nome_estudio") or "Meu Estúdio",
            studio_logo=cfg.get("logo_path"),
            primary_color=cfg.get("cor_primaria") or "#ff4500",
            font_family="Roboto, Arial, sans-serif",
        )
    except Exception as e:
        print(f"❌ Erro ao carregar studio_config: {e}")
        return StudioConfig()

@router.put("/studio/config", response_model=StudioConfig)
def update_studio_config(payload: StudioConfig, db: Database = Depends(get_db)):
    """Atualiza configurações do estúdio"""
    try:
        db.upsert(
            "config",
            {"id": 1},
            {
                "id": 1,
                "nome_estudio": payload.studio_name,
                "logo_path": payload.studio_logo,
                "cor_primaria": payload.primary_color,
                "cor_secundaria": "#FFD700",
            },
        )
        db.conn.commit()
        return payload
    except Exception as e:
        print(f"❌ Erro ao salvar studio_config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao salvar configurações do estúdio.",
        )
