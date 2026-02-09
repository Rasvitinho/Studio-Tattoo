from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..db.database import Database

router = APIRouter()


def get_db(request: Request) -> Database:
    return request.app.state.db


# ======================
# MODELS BASE
# ======================

class BloqueioCreate(BaseModel):
    data: str
    tipo_bloqueio: str
    horarios_bloqueados: Optional[str] = None
    motivo: Optional[str] = None
    funcionario_id: int


class BloqueioUpdate(BaseModel):
    data: Optional[str] = None
    tipo_bloqueio: Optional[str] = None
    horarios_bloqueados: Optional[str] = None
    motivo: Optional[str] = None


# ======================
# MODELS PARA GESTOR
# ======================

class BloqueioGestorCreate(BaseModel):
    funcionario_id: int
    data: str
    tipo_bloqueio: str
    horarios_bloqueados: Optional[str] = None
    motivo: Optional[str] = None
    gestor_id: int  # por enquanto vem do frontend; depois pode vir do JWT


class BloqueioGestorRemover(BaseModel):
    gestor_id: int
    motivo: Optional[str] = None


# ======================
# BLOQUEIO CRIADO PELO PRÓPRIO FUNCIONÁRIO
# ======================

@router.post("/")
def criar_bloqueio(
    payload: BloqueioCreate,
    db: Database = Depends(get_db),
):
    """
    Cria um novo bloqueio para o próprio funcionário (fluxo do painel de funcionário).
    """
    funcionario_id = payload.funcionario_id

    if payload.tipo_bloqueio not in ["dia_completo", "horarios_especificos"]:
        raise HTTPException(
            status_code=400,
            detail="tipo_bloqueio deve ser 'dia_completo' ou 'horarios_especificos'",
        )

    if payload.tipo_bloqueio == "horarios_especificos" and not payload.horarios_bloqueados:
        raise HTTPException(
            status_code=400,
            detail="Para bloqueio de horários específicos, é necessário informar os horários",
        )

    bloqueio_id = db.criar_bloqueio(
        funcionario_id=funcionario_id,
        data=payload.data,
        tipo_bloqueio=payload.tipo_bloqueio,
        horarios_bloqueados=payload.horarios_bloqueados,
        motivo=payload.motivo,
    )

    return {"ok": True, "id": bloqueio_id}


# ======================
# BLOQUEIOS CRIADOS PELO GESTOR (COM HISTÓRICO)
# ======================

@router.post("/gestor/bloquear")
def gestor_criar_bloqueio(
    payload: BloqueioGestorCreate,
    db: Database = Depends(get_db),
):
    """
    Gestor bloqueia dia ou horário para um funcionário específico,
    registrando histórico da ação.
    """
    if payload.tipo_bloqueio not in ["dia_completo", "horarios_especificos"]:
        raise HTTPException(
            status_code=400,
            detail="tipo_bloqueio deve ser 'dia_completo' ou 'horarios_especificos'",
        )

    if payload.tipo_bloqueio == "horarios_especificos" and not payload.horarios_bloqueados:
        raise HTTPException(
            status_code=400,
            detail="Para bloqueio de horários específicos, é necessário informar os horários",
        )

    # Cria o bloqueio
    bloqueio_id = db.criar_bloqueio(
        funcionario_id=payload.funcionario_id,
        data=payload.data,
        tipo_bloqueio=payload.tipo_bloqueio,
        horarios_bloqueados=payload.horarios_bloqueados,
        motivo=payload.motivo,
    )

    # Registra histórico
    db.registrar_historico_bloqueio(
        gestor_id=payload.gestor_id,
        funcionario_id=payload.funcionario_id,
        data=payload.data,
        tipo_bloqueio=payload.tipo_bloqueio,
        horarios_bloqueados=payload.horarios_bloqueados,
        acao="bloquear",
        motivo=payload.motivo,
    )

    return {"ok": True, "id": bloqueio_id}


@router.delete("/gestor/{bloqueio_id}")
def gestor_remover_bloqueio(
    bloqueio_id: int,
    payload: BloqueioGestorRemover,
    db: Database = Depends(get_db),
):
    """
    Gestor remove um bloqueio de um funcionário, registrando histórico da ação.
    """
    # Buscar dados do bloqueio antes de remover
    db.cursor.execute(
        """
        SELECT funcionario_id, data, tipo_bloqueio, horarios_bloqueados
        FROM bloqueios
        WHERE id = ?
        """,
        (bloqueio_id,),
    )
    row = db.cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado")

    funcionario_id, data, tipo_bloqueio, horarios_bloqueados = row

    ok = db.remover_bloqueio(bloqueio_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Erro ao remover bloqueio")

    # Registrar histórico
    db.registrar_historico_bloqueio(
        gestor_id=payload.gestor_id,
        funcionario_id=funcionario_id,
        data=data,
        tipo_bloqueio=tipo_bloqueio,
        horarios_bloqueados=horarios_bloqueados,
        acao="desbloquear",
        motivo=payload.motivo,
    )

    return {"ok": True}


# ======================
# LISTAGENS
# ======================

@router.get("/funcionario/{funcionario_id}", response_model=List[Dict[str, Any]])
def listar_bloqueios_funcionario(
    funcionario_id: int,
    db: Database = Depends(get_db),
):
    """
    Lista todos os bloqueios de um funcionário específico.
    """
    return db.listar_bloqueios_por_funcionario(funcionario_id)


@router.get("/ativos")
def listar_bloqueios_ativos(
    db: Database = Depends(get_db),
):
    """
    Lista todos os bloqueios ativos (data >= hoje) de todos os funcionários.
    Ignora bloqueios cujos funcionários não existem mais.
    """
    hoje = datetime.now().strftime("%Y-%m-%d")
    print(f"\n🔍 LISTAR_BLOQUEIOS_ATIVOS:")
    print(f"   Data hoje: {hoje}")

    db.cursor.execute(
        """
        SELECT 
            b.id,
            b.funcionario_id,
            f.nome as funcionario_nome,
            b.data,
            b.tipo_bloqueio,
            b.horarios_bloqueados,
            b.motivo,
            b.criado_em
        FROM bloqueios b
        LEFT JOIN funcionarios f ON f.id = b.funcionario_id
        WHERE b.data >= ? AND f.id IS NOT NULL
        ORDER BY b.data ASC, f.nome ASC
        """,
        (hoje,),
    )

    rows = db.cursor.fetchall()
    print(f"   Bloqueios ativos (>= {hoje}): {len(rows)}")

    resultado = []

    for row in rows:
        bloqueio = {
            "id": row[0],
            "funcionario_id": row[1],
            "funcionario_nome": row[2],
            "data": row[3],
            "tipo_bloqueio": row[4],
            "horarios_bloqueados": row[5],
            "motivo": row[6],
            "criado_em": row[7],
        }
        print(f"   📌 {bloqueio}")
        resultado.append(bloqueio)

    print(f"   ✅ Retornando {len(resultado)} bloqueios\n")
    return resultado


@router.get("/historico/{funcionario_id}", response_model=List[Dict[str, Any]])
def listar_historico_bloqueios(
    funcionario_id: int,
    db: Database = Depends(get_db),
):
    """
    Lista o histórico de bloqueios/desbloqueios de um funcionário.
    """
    db.cursor.execute(
        """
        SELECT 
            h.id,
            h.gestor_id,
            g.login as gestor_login,
            h.funcionario_id,
            f.nome as funcionario_nome,
            h.data,
            h.tipo_bloqueio,
            h.horarios_bloqueados,
            h.acao,
            h.motivo,
            h.criado_em
        FROM bloqueios_historico h
        LEFT JOIN usuarios g ON g.id = h.gestor_id
        LEFT JOIN funcionarios f ON f.id = h.funcionario_id
        WHERE h.funcionario_id = ?
        ORDER BY h.criado_em DESC
        """,
        (funcionario_id,),
    )
    rows = db.cursor.fetchall()

    resultado = []
    for r in rows:
        resultado.append(
            {
                "id": r[0],
                "gestor_id": r[1],
                "gestor_login": r[2],
                "funcionario_id": r[3],
                "funcionario_nome": r[4],
                "data": r[5],
                "tipo_bloqueio": r[6],
                "horarios_bloqueados": r[7],
                "acao": r[8],
                "motivo": r[9],
                "criado_em": r[10],
            }
        )
    return resultado


# ======================
# CRUD SIMPLES (FUNCIONÁRIO/ANTIGO)
# ======================

@router.get("/{bloqueio_id}")
def obter_bloqueio(
    bloqueio_id: int,
    db: Database = Depends(get_db),
):
    """
    Obtém detalhes de um bloqueio específico.
    """
    db.cursor.execute(
        """
        SELECT 
            id,
            funcionario_id,
            data,
            tipo_bloqueio,
            horarios_bloqueados,
            motivo,
            criado_em
        FROM bloqueios
        WHERE id = ?
        """,
        (bloqueio_id,),
    )

    row = db.cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado")

    return {
        "id": row[0],
        "funcionario_id": row[1],
        "data": row[2],
        "tipo_bloqueio": row[3],
        "horarios_bloqueados": row[4],
        "motivo": row[5],
        "criado_em": row[6],
    }


@router.put("/{bloqueio_id}")
def atualizar_bloqueio(
    bloqueio_id: int,
    payload: BloqueioUpdate,
    db: Database = Depends(get_db),
):
    """
    Atualiza um bloqueio existente.
    """
    db.cursor.execute(
        "SELECT funcionario_id FROM bloqueios WHERE id = ?",
        (bloqueio_id,),
    )
    row = db.cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado")

    campos = []
    valores: List[Any] = []

    if payload.data:
        campos.append("data = ?")
        valores.append(payload.data)

    if payload.tipo_bloqueio:
        if payload.tipo_bloqueio not in ["dia_completo", "horarios_especificos"]:
            raise HTTPException(
                status_code=400,
                detail="tipo_bloqueio deve ser 'dia_completo' ou 'horarios_especificos'",
            )
        campos.append("tipo_bloqueio = ?")
        valores.append(payload.tipo_bloqueio)

    if payload.horarios_bloqueados is not None:
        campos.append("horarios_bloqueados = ?")
        valores.append(payload.horarios_bloqueados)

    if payload.motivo is not None:
        campos.append("motivo = ?")
        valores.append(payload.motivo)

    if not campos:
        return {"ok": True, "message": "Nenhuma alteração fornecida"}

    valores.append(bloqueio_id)
    query = f"UPDATE bloqueios SET {', '.join(campos)} WHERE id = ?"

    db.cursor.execute(query, valores)
    db.conn.commit()

    return {"ok": True}


@router.delete("/{bloqueio_id}")
def remover_bloqueio(
    bloqueio_id: int,
    db: Database = Depends(get_db),
):
    """
    Remove um bloqueio (fluxo antigo / funcionário).
    """
    db.cursor.execute(
        "SELECT funcionario_id FROM bloqueios WHERE id = ?",
        (bloqueio_id,),
    )
    row = db.cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado")

    ok = db.remover_bloqueio(bloqueio_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Erro ao remover bloqueio")

    return {"ok": True}
