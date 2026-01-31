from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import List, Dict, Any

from app.db.database import Database
from app.core import solicitacoes as core_sol

router = APIRouter()

def get_db(request: Request) -> Database:
    return request.app.state.db

@router.get("/", response_model=List[Dict[str, Any]])
def listar_solicitacoes(db: Database = Depends(get_db)):
    return core_sol.listar_solicitacoes_pendentes(db)

class AprovarSolicitacaoPayload(BaseModel):
    solicitacao_id: int

@router.post("/{solicitacao_id}/aprovar")
def aprovar_solicitacao(solicitacao_id: int, db: Database = Depends(get_db)):
    return core_sol.aprovar_solicitacao(db, solicitacao_id)

@router.post("/{solicitacao_id}/rejeitar")
def rejeitar_solicitacao(solicitacao_id: int, db: Database = Depends(get_db)):
    return core_sol.rejeitar_solicitacao(db, solicitacao_id)
