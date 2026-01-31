# backend/app/routers/funcionarios.py

from fastapi import APIRouter, Depends, Request, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.db.database import Database
from app.core import funcionarios as core_func

router = APIRouter()  # <<< ESTE É O router QUE O main.py PROCURA


def get_db(request: Request) -> Database:
    return request.app.state.db


class FuncionarioBase(BaseModel):
    nome: str = Field(..., min_length=1)
    cargo: str
    perc_funcionario: float = Field(70, ge=0, le=100)
    requer_aprovacao: bool = True
    senha: Optional[str] = None


class FuncionarioCreate(FuncionarioBase):
    pass


class FuncionarioUpdate(FuncionarioBase):
    id: int


@router.get("/", response_model=List[Dict[str, Any]])
def listar_funcionarios(db: Database = Depends(get_db)):
    return core_func.listar_funcionarios(db)


@router.get("/{func_id}", response_model=Dict[str, Any])
def obter_funcionario(func_id: int, db: Database = Depends(get_db)):
    func = core_func.obter_funcionario(db, func_id)
    if not func:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funcionário não encontrado.",
        )
    return func


@router.post("/", response_model=Dict[str, Any])
def criar_funcionario(payload: FuncionarioCreate, db: Database = Depends(get_db)):
    func_id = core_func.salvar_funcionario(
        db,
        func_id=None,
        nome=payload.nome,
        cargo=payload.cargo,
        perc_funcionario=payload.perc_funcionario,
        requer_aprovacao=payload.requer_aprovacao,
        senha=payload.senha,
    )
    return core_func.obter_funcionario(db, func_id)


@router.put("/", response_model=Dict[str, Any])
def atualizar_funcionario(payload: FuncionarioUpdate, db: Database = Depends(get_db)):
    if not core_func.obter_funcionario(db, payload.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funcionário não encontrado.",
        )

    core_func.salvar_funcionario(
        db,
        func_id=payload.id,
        nome=payload.nome,
        cargo=payload.cargo,
        perc_funcionario=payload.perc_funcionario,
        requer_aprovacao=payload.requer_aprovacao,
        senha=payload.senha,
    )
    return core_func.obter_funcionario(db, payload.id)


@router.delete("/{func_id}")
def deletar_funcionario(func_id: int, db: Database = Depends(get_db)):
    if not core_func.obter_funcionario(db, func_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funcionário não encontrado.",
        )
    core_func.deletar_funcionario(db, func_id)
    return {"ok": True}
