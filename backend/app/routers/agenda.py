from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..db.database import Database
from ..core import agenda as core_agenda

router = APIRouter()


def get_db(request: Request) -> Database:
    return request.app.state.db


# ======================
# DASHBOARD - DEVE VIR PRIMEIRO
# ======================

@router.get("/dashboard/proximos", response_model=List[Dict[str, Any]])
def proximos_agendamentos(
    db: Database = Depends(get_db),
    funcionario_id: int | None = None,
):
    """
    Retorna os próximos 10 agendamentos (geral ou por funcionário).
    """
    hoje_str = datetime.now().strftime("%Y-%m-%d")
    return core_agenda.buscar_proximos_agendamentos(db, hoje_str, funcionario_id)


# ======================
# MODELS
# ======================

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


class PagamentoAgendamentoPayload(BaseModel):
    pago: bool


# ======================
# CRIAÇÃO DE AGENDAMENTO
# ======================

@router.post("/")
def criar_agendamento(
    payload: AgendamentoCreate,
    db: Database = Depends(get_db),
):
    """Cria um novo agendamento"""
    
    print(f"\n🔍 CRIAR AGENDAMENTO:")
    print(f"   Data: {payload.data}")
    print(f"   Horário: {payload.horario}")
    print(f"   Funcionário ID: {payload.funcionario_id}")
    
    # VERIFICAR BLOQUEIOS antes de criar o agendamento
    if payload.funcionario_id:
        print(f"🔍 Verificando bloqueio para funcionário {payload.funcionario_id}...")
        bloqueio = db.verificar_bloqueio(
            payload.funcionario_id,
            payload.data,
            payload.horario
        )
        
        print(f"   Resultado verificação: {bloqueio}")
        
        if bloqueio:
            print(f"🚫 BLOQUEIO DETECTADO - IMPEDINDO AGENDAMENTO")
            tipo = bloqueio.get("tipo_bloqueio", "dia_completo")
            if tipo == "dia_completo":
                raise HTTPException(
                    status_code=400,
                    detail=f"O funcionário bloqueou o dia {payload.data} completamente. Não é possível agendar."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"O horário {payload.horario} está bloqueado pelo funcionário. Escolha outro horário."
                )
        else:
            print(f"✅ Sem bloqueio - pode criar agendamento")
    
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
    print(f"✅ Agendamento criado com sucesso!\n")
    return {"ok": True}


# ======================
# ATUALIZAÇÃO E REMOÇÃO
# ======================

@router.put("/{agendamento_id}")
def atualizar_agendamento(
    agendamento_id: int,
    payload: AgendamentoUpdate,
    db: Database = Depends(get_db),
):
    """Atualiza um agendamento"""
    print("DEBUG UPDATE:", agendamento_id, payload.dict())

    # VERIFICAR BLOQUEIOS antes de atualizar
    if payload.funcionario_id:
        print(f"🔍 Verificando bloqueio para funcionário {payload.funcionario_id} em {payload.data} às {payload.horario}")
        bloqueio = db.verificar_bloqueio(
            payload.funcionario_id,
            payload.data,
            payload.horario
        )
        if bloqueio:
            print(f"🚫 BLOQUEIO ENCONTRADO: {bloqueio}")
            tipo = bloqueio.get("tipo_bloqueio", "dia_completo")
            if tipo == "dia_completo":
                raise HTTPException(
                    status_code=400,
                    detail=f"O funcionário bloqueou o dia {payload.data} completamente."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"O horário {payload.horario} está bloqueado pelo funcionário."
                )
        else:
            print(f"✅ Sem bloqueio - pode atualizar")

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
    """Deleta um agendamento"""
    ok = db.remover_agendamento(agendamento_id)
    if not ok:
        return {"ok": False, "detail": "Agendamento não encontrado"}
    return {"ok": True}


# ======================
# APROVAÇÃO E PAGAMENTO
# ======================

@router.put("/{agendamento_id}/aprovacao")
def atualizar_aprovacao_agendamento(
    agendamento_id: int,
    payload: AprovarAgendamentoPayload,
    db: Database = Depends(get_db),
):
    """Aprova ou desaprova um agendamento"""
    db.cursor.execute(
        "UPDATE agendamentos SET aprovado = ? WHERE id = ?",
        (1 if payload.aprovado else 0, agendamento_id),
    )
    db.conn.commit()
    return {"ok": True}


@router.put("/{agendamento_id}/pagamento-com-historico")
def atualizar_pagamento_e_historico(
    agendamento_id: int,
    payload: PagamentoAgendamentoPayload,
    db: Database = Depends(get_db),
):
    """
    Marca agendamento como pago E cria registro no histórico do cliente.
    """
    print(f"\n🔍 INICIANDO: agendamento_id={agendamento_id}, pago={payload.pago}")
    
    # 1. Buscar os dados do agendamento E o nome do funcionário
    db.cursor.execute(
        """
        SELECT a.cliente, a.cliente_id, a.valor_previsto, a.servico, a.funcionario_id, f.nome
        FROM agendamentos a
        LEFT JOIN funcionarios f ON f.id = a.funcionario_id
        WHERE a.id = ?
        """,
        (agendamento_id,),
    )
    resultado = db.cursor.fetchone()
    
    if not resultado:
        print(f"❌ Agendamento {agendamento_id} não encontrado!")
        return {"ok": False, "detail": "Agendamento não encontrado"}
    
    cliente_nome, cliente_id, valor, servico, funcionario_id, funcionario_nome = resultado
    print(f"📋 Agendamento encontrado:")
    print(f"   - cliente_nome: {cliente_nome}")
    print(f"   - cliente_id: {cliente_id}")
    print(f"   - valor: {valor}")
    print(f"   - servico: {servico}")
    print(f"   - funcionario_id: {funcionario_id}")
    print(f"   - funcionario_nome: {funcionario_nome}")
    
    # Se não tiver cliente_id, tenta buscar pelo nome
    if not cliente_id and cliente_nome:
        print(f"⚠️ cliente_id vazio, buscando por nome: {cliente_nome}")
        db.cursor.execute(
            "SELECT id FROM clientes WHERE LOWER(nome) = LOWER(?)",
            (cliente_nome,),
        )
        cliente_result = db.cursor.fetchone()
        if cliente_result:
            cliente_id = cliente_result[0]
            print(f"✅ Cliente encontrado por nome! ID: {cliente_id}")
        else:
            print(f"❌ Cliente não encontrado por nome!")
    
    # 2. Atualizar status de pagamento
    db.cursor.execute(
        "UPDATE agendamentos SET pago = ? WHERE id = ?",
        (1 if payload.pago else 0, agendamento_id),
    )
    print(f"💳 Agendamento marcado como pago: {payload.pago}")
    
    # 3. Se marcou como PAGO e tem cliente_id, registra no histórico
    if payload.pago and cliente_id:
        try:
            # Monta a descrição com o nome do funcionário
            descricao = f"Pagamento recebido - {servico}"
            if funcionario_nome:
                descricao += f" (Atendente: {funcionario_nome})"
            
            print(f"📝 Tentando inserir histórico...")
            print(f"   - cliente_id: {cliente_id}")
            print(f"   - descricao: {descricao}")
            print(f"   - valor: {valor}")
            
            db.cursor.execute(
                """
                INSERT INTO cliente_historico (cliente_id, tipo, descricao, valor, funcionario_id, data_registro)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    cliente_id,
                    "pagamento",
                    descricao,
                    valor,
                    funcionario_id,
                ),
            )
            print(f"✅ Histórico inserido com sucesso!")
        except Exception as e:
            print(f"❌ Erro ao inserir histórico: {e}")
            import traceback
            traceback.print_exc()
    elif payload.pago and not cliente_id:
        print(f"⚠️ Não foi possível criar histórico: cliente_id={cliente_id}, pago={payload.pago}")
    
    db.conn.commit()
    print(f"✅ Transação finalizada\n")
    return {"ok": True, "message": "Pagamento atualizado"}


@router.put("/{agendamento_id}/pagamento")
def atualizar_pagamento_agendamento(
    agendamento_id: int,
    payload: PagamentoAgendamentoPayload,
    db: Database = Depends(get_db),
):
    """
    Atualiza o status de pagamento (pago ou não pago).
    DEPRECATED: Use /pagamento-com-historico em vez disso.
    """
    db.cursor.execute(
        "UPDATE agendamentos SET pago = ? WHERE id = ?",
        (1 if payload.pago else 0, agendamento_id),
    )
    db.conn.commit()
    return {"ok": True}


# ======================
# AGENDA DO GESTOR - ROTAS GENÉRICAS VÊM POR ÚLTIMO
# ======================

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


# ======================
# AGENDA DO FUNCIONÁRIO
# ======================

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
# ESTA ROTA DEVE SER A ÚLTIMA (É A MAIS GENÉRICA)
# ======================

@router.get("/{data}", response_model=List[Dict[str, Any]])
def listar_agendamentos(data: str, db: Database = Depends(get_db)):
    """
    Lista todos os agendamentos de um dia (visão do gestor).
    ATENÇÃO: Esta rota deve ser a última pois captura qualquer /{string}
    """
    return core_agenda.listar_agendamentos_por_dia(db, data)
