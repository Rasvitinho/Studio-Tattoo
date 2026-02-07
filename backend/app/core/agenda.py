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
             c.nome AS cliente_nome,
             a.servico,
             f.nome AS funcionario,
             a.valor_previsto,
             a.aprovado,
             a.pago
      FROM agendamentos a
      LEFT JOIN clientes c ON c.id = a.cliente_id
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
            "data": r[0],
            "horario": r[1],
            "cliente_nome": r[2],
            "cliente": r[2],
            "servico": r[3],
            "funcionario": r[4],
            "valor_previsto": r[5],
            "aprovado": r[6],
            "pago": r[7] if len(r) > 7 else False,
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
            "cliente_nome": r[3],
            "cliente": r[3],
            "servico": r[4],
            "funcionario": r[5],
            "valor_previsto": r[6],
            "aprovado": r[7],
            "pago": r[8] if len(r) > 8 else False,
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
            "cliente_nome": r[3],
            "cliente": r[3],
            "servico": r[4],
            "funcionario": r[5],
            "valor_previsto": r[6],
            "aprovado": r[7],
            "pago": r[8] if len(r) > 8 else False,
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
            "cliente_nome": r[3],
            "cliente": r[3],
            "servico": r[4],
            "funcionario": r[5],
            "valor_previsto": r[6],
            "aprovado": r[7],
            "pago": r[8],
        }
        for r in rows
    ]

def obter_ou_criar_cliente(db: Database, nome_cliente: str) -> int:
    """
    Busca um cliente por nome. Se não existir, cria um novo em pré-cadastro.
    Retorna o ID do cliente.
    """
    print(f"\n🔍 obter_ou_criar_cliente: nome='{nome_cliente}'")
    
    # Buscar cliente existente
    db.cursor.execute(
        "SELECT id FROM clientes WHERE LOWER(nome) = LOWER(?)",
        (nome_cliente.strip(),),
    )
    row = db.cursor.fetchone()

    if row:
        cliente_id = row[0]
        print(f"✅ Cliente encontrado! ID: {cliente_id}")
        return cliente_id

    # Cliente não existe, cria novo
    print(f"➕ Cliente não existe, criando novo...")
    db.cursor.execute(
        """
        INSERT INTO clientes (nome, status, tem_ficha, data_criacao)
        VALUES (?, 'pre_cadastro', 0, datetime('now'))
        """,
        (nome_cliente.strip(),),
    )
    db.conn.commit()
    cliente_id = db.cursor.lastrowid
    print(f"✅ Cliente criado! ID: {cliente_id}")
    return cliente_id


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
    """
    Cria um agendamento. Se o cliente não existir, cria automaticamente.
    """
    cliente_id = obter_ou_criar_cliente(db, cliente)

    aprovado = True

    # Só verifica requer_aprovacao se funcionario_id foi fornecido
    if funcionario_id is not None:
        row = db.obter_funcionario_por_id(funcionario_id)
        if row is not None:
            requer_aprovacao = row[5]
            aprovado = not bool(requer_aprovacao)

    db.criar_agendamento(
        data,
        horario,
        cliente_id,
        servico,
        tipo,
        valor_previsto,
        funcionario_id,
        aprovado,
    )

    # Só cria solicitação se requer aprovação E tem funcionário
    if not aprovado and funcionario_id is not None:
        agendamento_id = db.cursor.lastrowid
        agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.cursor.execute(
            """
            INSERT INTO solicitacoes
                (tipo, agendamento_id, funcionario_id, data, horario, cliente_id, servico, status, data_solicitacao)
            VALUES ('inclusao', ?, ?, ?, ?, ?, ?, 'pendente', ?)
            """,
            (agendamento_id, funcionario_id, data, horario, cliente_id, servico, agora),
        )
        db.conn.commit()
