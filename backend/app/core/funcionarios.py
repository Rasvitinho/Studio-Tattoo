# backend/app/core/funcionarios.py

from typing import Optional, Dict, Any, List
from app.db.database import Database


# ================== LOGIN ==================

def login_usuario(db: Database, login: str, senha: str) -> Optional[Dict[str, Any]]:
    row = db.autenticar_usuario(login, senha)
    if not row:
        return None
    user_id, login_db, tipo, funcionario_id = row
    return {
        "id": user_id,
        "login": login_db,
        "tipo": tipo,
        "funcionario_id": funcionario_id,
    }



# ================== FUNCIONÁRIOS (CRUD) ==================

def listar_funcionarios(db: Database) -> List[Dict[str, Any]]:
    rows = db.listar_funcionarios()
    return [
        {
            "id": r[0],
            "nome": r[1],
            "cargo": r[2],
            "perc_funcionario": r[3],
            "perc_estudio": r[4],
            "requer_aprovacao": bool(r[5]),
        }
        for r in rows
    ]


def obter_funcionario(db: Database, func_id: int) -> Optional[Dict[str, Any]]:
    r = db.obter_funcionario_por_id(func_id)
    if not r:
        return None

    return {
        "id": r[0],
        "nome": r[1],
        "cargo": r[2],
        "perc_funcionario": r[3],
        "perc_estudio": r[4],
        "requer_aprovacao": bool(r[5]),
    }

def deletar_funcionario(db: Database, func_id: int) -> None:
    """
    Remove o funcionário do banco.
    Se quiser, aqui você também pode validar se ele tem agendamentos vinculados antes de excluir.
    """
    db.remover_funcionario(func_id)


def salvar_funcionario(
    db: Database,
    func_id: Optional[int],
    nome: str,
    cargo: str,
    perc_funcionario: float,
    requer_aprovacao: bool,
    senha: Optional[str],
) -> int:
    req = 1 if requer_aprovacao else 0

    if func_id:
        db.atualizar_funcionario(func_id, nome, cargo, perc_funcionario, req, senha)
        return func_id
    else:
        novo_id = db.criar_funcionario(nome, cargo, perc_funcionario, req, senha)
        
        # NOVO: cria usuário automaticamente se tiver senha
        if senha:
            tipo_usuario = "admin" if cargo == "Administrador" else "funcionario"
            db.cursor.execute(
                "INSERT OR IGNORE INTO usuarios (login, senha, tipo, funcionario_id) VALUES (?, ?, ?, ?)",
                (nome, senha, tipo_usuario, novo_id)
            )
            db.conn.commit()

        
        return novo_id
