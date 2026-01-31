from typing import Optional, List, Dict, Any
from app.db.database import Database
from datetime import datetime

def buscar_proximos_agendamentos(
    db,
    data_referencia: str,
    funcionario_id: int | None = None,
) -> List[Dict[str, Any]]:
    cur = db.cursor
    params = [data_referencia]

    sql = """
      SELECT a.id,
             a.data,
             a.horario,
             a.cliente,
             a.servico,
             f.nome AS funcionario
      FROM agendamentos a
      LEFT JOIN funcionarios f ON f.id = a.funcionario_id
      WHERE a.data >= ?
    """

    if funcionario_id:
        sql += " AND a.funcionario_id = ?"
        params.append(funcionario_id)

    sql += " ORDER BY a.data, a.horario LIMIT 5"

    cur.execute(sql, params)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def listar_agendamentos_por_dia(db: Database, data_str: str) -> List[Dict[str, Any]]:
    rows = db.get_agendamentos_por_dia(data_str)
    return [
        {
            "id": r[0],
            "horario": r[1],
            "cliente": r[2],
            "servico": r[3],
            "funcionario": r[4],
            "valor_previsto": r[5],
            "aprovado": r[6],
        }
        for r in rows
    ]


def listar_agendamentos_por_dia_e_funcionario(
    db: Database,
    data_str: str,
    funcionario_id: int,
) -> List[Dict[str, Any]]:
    rows = db.get_agendamentos_por_dia_e_funcionario(data_str, funcionario_id)
    return [
        {
            "data": r[0],
            "id": r[1],
            "horario": r[2],
            "cliente": r[3],
            "servico": r[4],
            "funcionario": r[5],
            "valor_previsto": r[6],
            "aprovado": r[7],
        }
        for r in rows
    ]


def listar_agendamentos_funcionario_periodo(
    db: Database,
    data_ini: str,
    data_fim: str,
    funcionario_id: int,
) -> List[Dict[str, Any]]:
    """
    Lista agendamentos de um funcionário em um período (de data_ini até data_fim).
    """
    rows = db.get_agendamentos_funcionario_periodo(data_ini, data_fim, funcionario_id)
    return [
        {
            "data": r[0],
            "id": r[1],
            "horario": r[2],
            "cliente": r[3],
            "servico": r[4],
            "funcionario": r[5],
            "valor_previsto": r[6],
            "aprovado": r[7],
        }
        for r in rows
    ]

def listar_agendamentos_por_periodo(db: Database, data_ini: str, data_fim: str) -> List[Dict[str, Any]]:
    rows = db.get_agendamentos_por_periodo(data_ini, data_fim)
    return [
        {
            "data": r[0],
            "id": r[1],
            "horario": r[2],
            "cliente": r[3],
            "servico": r[4],
            "funcionario": r[5],
            "valor_previsto": r[6],
            "aprovado": r[7],
            "pago": r[8],
        }
        for r in rows
    ]


def criar_agendamento(
    db: Database,
    data: str,
    horario: str,
    cliente: str,
    servico: str,
    tipo: str = "tatuagem",
    valor_previsto: Optional[float] = None,
    funcionario_id: Optional[int] = None,
) -> None:
    from datetime import datetime

    # por padrão, aprovado
    aprovado = True

    # se tiver funcionário, verifica se requer aprovação
    if funcionario_id is not None:
        row = db.obter_funcionario_por_id(funcionario_id)
        if row is not None:
            requer_aprovacao = row[5]
            aprovado = not bool(requer_aprovacao)

    # cria agendamento na tabela principal
    db.criar_agendamento(
        data,
        horario,
        cliente,
        servico,
        tipo,
        valor_previsto,
        funcionario_id,
        aprovado,
    )

    # se não aprovado, cria solicitação para o gestor
    if not aprovado:
        agendamento_id = db.cursor.lastrowid
        agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.cursor.execute(
            """
            INSERT INTO solicitacoes
                (tipo, agendamento_id, funcionario_id, data, horario, cliente, servico, status, data_solicitacao)
            VALUES ('inclusao', ?, ?, ?, ?, ?, ?, 'pendente', ?)
            """,
            (agendamento_id, funcionario_id, data, horario, cliente, servico, agora),
        )
        db.conn.commit()
