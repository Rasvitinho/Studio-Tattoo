from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..db.database import Database
from ..core import agenda as core_agenda

router = APIRouter()


def get_db(request: Request) -> Database:
    return request.app.state.db


@router.get("/dashboard/proximos", response_model=List[Dict[str, Any]])
def proximos_agendamentos(
    db: Database = Depends(get_db),
    funcionario_id: int | None = None,
):
    """
    Retorna os próximos 5 agendamentos (geral ou por funcionário).
    """
    hoje_str = datetime.now().strftime("%Y-%m-%d")
    return core_agenda.buscar_proximos_agendamentos(db, hoje_str, funcionario_id)



def get_db(request: Request) -> Database:
    return request.app.state.db


class AprovarAgendamentoPayload(BaseModel):
    aprovado: bool

class AgendamentoUpdate(BaseModel):
    data: str
    horario: str
    cliente: str
    servico: str
    valor_previsto: Optional[float] = None
    funcionario_id: Optional[int] = None

class AgendamentoCreate(BaseModel):
    data: str
    horario: str
    cliente: str
    servico: str
    tipo: str = "tatuagem"
    valor_previsto: Optional[float] = None
    funcionario_id: Optional[int] = None
    aprovado: bool = True

@router.put("/{agendamento_id}")
def atualizar_agendamento(
    agendamento_id: int,
    payload: AgendamentoUpdate,
    db: Database = Depends(get_db),
):
    print("DEBUG UPDATE:", agendamento_id, payload.dict())

    ok = db.atualizar_agendamento(
        agendamento_id,
        payload.data,
        payload.horario,
        payload.cliente,
        payload.servico,
        payload.valor_previsto,
        payload.funcionario_id,
    )
    if not ok:
        return {"ok": False, "detail": "Agendamento não encontrado"}
    return {"ok": True}


@router.delete("/{agendamento_id}")
def remover_agendamento(
    agendamento_id: int,
    db: Database = Depends(get_db),
):
    ok = db.remover_agendamento(agendamento_id)
    if not ok:
        return {"ok": False, "detail": "Agendamento não encontrado"}
    return {"ok": True}


# ======================
# Agenda do gestor
# ======================

# ROTA MAIS ESPECÍFICA PRIMEIRO (período)
@router.get("/agenda-periodo/{data_ini}/{data_fim}", response_model=List[Dict[str, Any]])
def listar_agendamentos_periodo(
    data_ini: str,
    data_fim: str,
    db: Database = Depends(get_db),
):
    """
    Lista todos os agendamentos de um período (visão do gestor).
    """
    return core_agenda.listar_agendamentos_por_periodo(db, data_ini, data_fim)


# ROTA GENÉRICA POR DIA (depois)
@router.get("/{data}", response_model=List[Dict[str, Any]])
def listar_agendamentos(data: str, db: Database = Depends(get_db)):
    """
    Lista todos os agendamentos de um dia (visão do gestor).
    """
    return core_agenda.listar_agendamentos_por_dia(db, data)


# ======================
# Agenda do funcionário
# ======================

# ROTA MAIS ESPECÍFICA PRIMEIRO (período)
@router.get(
    "/funcionario-periodo/{funcionario_id}/{data_ini}/{data_fim}",
    response_model=List[Dict[str, Any]],
)
def listar_agendamentos_funcionario_periodo(
    funcionario_id: int,
    data_ini: str,
    data_fim: str,
    db: Database = Depends(get_db),
):
    """
    Lista os agendamentos de um funcionário em um período (De / Até).
    """
    return core_agenda.listar_agendamentos_funcionario_periodo(
        db,
        data_ini,
        data_fim,
        funcionario_id,
    )


# ROTA GENÉRICA POR DIA (depois)
@router.get(
    "/funcionario/{funcionario_id}/{data}",
    response_model=List[Dict[str, Any]],
)
def listar_agendamentos_funcionario(
    funcionario_id: int,
    data: str,
    db: Database = Depends(get_db),
):
    """
    Lista os agendamentos de um funcionário específico em um dia.
    """
    return core_agenda.listar_agendamentos_por_dia_e_funcionario(
        db,
        data,
        funcionario_id,
    )


# ======================
# Criação, aprovação e pagamento
# ======================

@router.post("/")
def criar_agendamento(
    payload: AgendamentoCreate,
    db: Database = Depends(get_db),
):
    core_agenda.criar_agendamento(
        db,
        payload.data,
        payload.horario,
        payload.cliente,
        payload.servico,
        payload.tipo,
        payload.valor_previsto,
        payload.funcionario_id,
    )
    return {"ok": True}


@router.put("/{agendamento_id}/aprovacao")
def atualizar_aprovacao_agendamento(
    agendamento_id: int,
    payload: AprovarAgendamentoPayload,
    db: Database = Depends(get_db),
):
    db.cursor.execute(
        "UPDATE agendamentos SET aprovado = ? WHERE id = ?",
        (1 if payload.aprovado else 0, agendamento_id),
    )
    db.conn.commit()
    return {"ok": True}


class PagamentoAgendamentoPayload(BaseModel):
    pago: bool


@router.put("/{agendamento_id}/pagamento")
def atualizar_pagamento_agendamento(
    agendamento_id: int,
    payload: PagamentoAgendamentoPayload,
    db: Database = Depends(get_db),
):
    """
    Atualiza o status de pagamento (pago ou não pago).
    """
    db.cursor.execute(
        "UPDATE agendamentos SET pago = ? WHERE id = ?",
        (1 if payload.pago else 0, agendamento_id),
    )
    db.conn.commit()
    return {"ok": True}
