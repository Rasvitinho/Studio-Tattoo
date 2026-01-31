from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel, Field
from datetime import date
from typing import Dict, Any, Optional

from app.db.database import Database
from app.core import financeiro as core_fin

router = APIRouter()


def get_db(request: Request) -> Database:
    return request.app.state.db


class PeriodoRequest(BaseModel):
    data_ini: date = Field(..., example="2026-01-01")
    data_fim: date = Field(..., example="2026-01-31")
    funcionario_id: Optional[int] = Field(None, example=1)
    tipo: Optional[str] = Field(None, example="tatuagem")


@router.post("/resumo-periodo", response_model=Dict[str, Any])
def resumo_periodo(payload: PeriodoRequest, db: Database = Depends(get_db)):
    if payload.data_ini > payload.data_fim:
        raise HTTPException(
            status_code=400,
            detail="data_ini não pode ser maior que data_fim.",
        )
    return core_fin.resumo_periodo(
        db,
        payload.data_ini,
        payload.data_fim,
        payload.funcionario_id,
        payload.tipo,
    )


class MesRequest(BaseModel):
    ano: int = Field(..., example=2026)
    mes: int = Field(..., ge=1, le=12, example=1)


@router.post("/totais-mes", response_model=Dict[str, float])
def totais_mes(payload: MesRequest, db: Database = Depends(get_db)):
    return core_fin.totais_mes(db, payload.ano, payload.mes)
