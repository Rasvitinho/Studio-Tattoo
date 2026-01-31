from typing import List, Dict, Any
from app.db.database import Database

def listar_solicitacoes_pendentes(db: Database) -> List[Dict[str, Any]]:
    db.cursor.execute(
        """
        SELECT id, tipo, agendamento_id, funcionario_id, data, horario, cliente, servico, status, data_solicitacao
        FROM solicitacoes
        WHERE status = 'pendente'
        ORDER BY data_solicitacao DESC
        """
    )
    rows = db.cursor.fetchall()
    return [
        {
            "id": r[0],
            "tipo": r[1],
            "agendamento_id": r[2],
            "funcionario_id": r[3],
            "data": r[4],
            "horario": r[5],
            "cliente": r[6],
            "servico": r[7],
            "status": r[8],
            "data_solicitacao": r[9],
        }
        for r in rows
    ]

def aprovar_solicitacao(db: Database, solicitacao_id: int) -> Dict[str, Any]:
    db.cursor.execute(
        "SELECT agendamento_id FROM solicitacoes WHERE id = ?",
        (solicitacao_id,)
    )
    row = db.cursor.fetchone()
    if not row:
        return {"ok": False, "error": "Solicitação não encontrada"}

    agendamento_id = row[0]

    # aprova agendamento
    db.cursor.execute(
        "UPDATE agendamentos SET aprovado = 1 WHERE id = ?",
        (agendamento_id,)
    )

    # marca solicitação como aprovada
    db.cursor.execute(
        "UPDATE solicitacoes SET status = 'aprovado' WHERE id = ?",
        (solicitacao_id,)
    )
    db.conn.commit()
    return {"ok": True}

def rejeitar_solicitacao(db: Database, solicitacao_id: int) -> Dict[str, Any]:
    db.cursor.execute(
        "SELECT agendamento_id FROM solicitacoes WHERE id = ?",
        (solicitacao_id,)
    )
    row = db.cursor.fetchone()
    if not row:
        return {"ok": False, "error": "Solicitação não encontrada"}

    agendamento_id = row[0]

    # deleta agendamento
    db.cursor.execute(
        "DELETE FROM agendamentos WHERE id = ?",
        (agendamento_id,)
    )

    # marca solicitação como rejeitada
    db.cursor.execute(
        "UPDATE solicitacoes SET status = 'rejeitado' WHERE id = ?",
        (solicitacao_id,)
    )
    db.conn.commit()
    return {"ok": True}
