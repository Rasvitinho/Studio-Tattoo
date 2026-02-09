from fastapi import APIRouter, Depends, UploadFile, File
from app.db.database import Database
import os
from datetime import datetime
import shutil
import sqlite3  # <-- para tratar erro de tabela inexistente

router = APIRouter()

# Diretório para armazenar fichas
FICHAS_DIR = "uploads/fichas"
os.makedirs(FICHAS_DIR, exist_ok=True)


def get_db():
    """Dependency para obter a instância do banco"""
    return Database()


@router.get("/")
async def listar_clientes(db: Database = Depends(get_db)):
    """Lista todos os clientes (pré-cadastro + confirmados)"""
    db.cursor.execute(
        """
        SELECT id, nome, telefone, email, cpf, endereco, status, tem_ficha, data_criacao, 
               data_cadastro, informacao, valor, funcionario_id
        FROM clientes
        ORDER BY nome ASC
        """
    )
    rows = db.cursor.fetchall()
    return [dict(row) for row in rows]


@router.post("/")
async def criar_cliente(data: dict, db: Database = Depends(get_db)):
    """Cria um novo cliente (pré-cadastro via agendamento ou manual)"""
    db.cursor.execute(
        """
        INSERT INTO clientes (nome, telefone, email, cpf, endereco, status, tem_ficha, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        (
            data.get("nome"),
            data.get("telefone"),
            data.get("email"),
            data.get("cpf"),
            data.get("endereco"),
            data.get("status", "pre_cadastro"),
            False,
        ),
    )
    db.conn.commit()
    return {"id": db.cursor.lastrowid, "message": "Cliente criado"}


@router.put("/{cliente_id}")
async def atualizar_cliente(cliente_id: int, data: dict, db: Database = Depends(get_db)):
    """Atualiza um cliente (confirma pré-cadastro ou edita dados)"""
    db.cursor.execute(
        """
        UPDATE clientes
        SET nome = ?, telefone = ?, email = ?, cpf = ?, endereco = ?, status = ?,
            data_cadastro = ?, informacao = ?, valor = ?, funcionario_id = ?
        WHERE id = ?
        """,
        (
            data.get("nome"),
            data.get("telefone"),
            data.get("email"),
            data.get("cpf"),
            data.get("endereco"),
            data.get("status", "confirmado"),
            data.get("data_cadastro"),
            data.get("informacao"),
            data.get("valor"),
            data.get("funcionario_id"),
            cliente_id,
        ),
    )
    db.conn.commit()
    return {"message": "Cliente atualizado"}


@router.delete("/{cliente_id}")
async def deletar_cliente(cliente_id: int, db: Database = Depends(get_db)):
    """Deleta um cliente"""
    db.cursor.execute(
        """
        DELETE FROM clientes
        WHERE id = ?
        """,
        (cliente_id,),
    )
    db.conn.commit()
    return {"message": "Cliente deletado"}


@router.post("/{cliente_id}/upload-ficha")
async def upload_ficha(
    cliente_id: int,
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
):
    """Faz upload da ficha de cadastro (foto) para um cliente"""

    # Validar se cliente existe
    db.cursor.execute("SELECT id FROM clientes WHERE id = ?", (cliente_id,))
    if not db.cursor.fetchone():
        return {"error": "Cliente não encontrado"}, 404

    try:
        # Criar caminho do arquivo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cliente_{cliente_id}_{timestamp}_{file.filename}"
        filepath = os.path.join(FICHAS_DIR, filename)

        # Salvar arquivo
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Atualizar no banco que tem ficha
        db.cursor.execute(
            """
            UPDATE clientes
            SET tem_ficha = ?, ficha_path = ?
            WHERE id = ?
            """,
            (True, filepath, cliente_id),
        )
        db.conn.commit()

        return {
            "success": True,
            "message": "Ficha anexada com sucesso",
            "filename": filename,
            "filepath": filepath,
        }

    except Exception as e:
        return {"error": str(e), "detail": "Erro ao salvar a ficha"}, 500


@router.get("/{cliente_id}/historico")
async def listar_historico_cliente(cliente_id: int, db: Database = Depends(get_db)):
    """Lista o histórico de atendimentos/pagamentos do cliente.

    Se a tabela cliente_historico não existir (ex.: banco novo na Render),
    retorna lista vazia em vez de derrubar o servidor.
    """
    try:
        db.cursor.execute(
            """
            SELECT id, tipo, descricao, valor, funcionario_id, data_registro
            FROM cliente_historico
            WHERE cliente_id = ?
            ORDER BY data_registro DESC
            """,
            (cliente_id,),
        )
        rows = db.cursor.fetchall()
    except sqlite3.OperationalError as e:
        if "no such table: cliente_historico" in str(e):
            rows = []
        else:
            raise

    return [dict(row) for row in rows]


@router.post("/{cliente_id}/historico")
async def adicionar_historico(cliente_id: int, data: dict, db: Database = Depends(get_db)):
    """Adiciona um novo registro no histórico.

    Se a tabela cliente_historico não existir, retorna erro amigável.
    """

    # Validar se cliente existe
    db.cursor.execute("SELECT id FROM clientes WHERE id = ?", (cliente_id,))
    if not db.cursor.fetchone():
        return {"error": "Cliente não encontrado"}, 404

    try:
        db.cursor.execute(
            """
            INSERT INTO cliente_historico (cliente_id, tipo, descricao, valor, funcionario_id, data_registro)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                cliente_id,
                data.get("tipo"),
                data.get("descricao"),
                data.get("valor"),
                data.get("funcionario_id"),
            ),
        )
        db.conn.commit()
        return {"id": db.cursor.lastrowid, "message": "Histórico adicionado"}

    except sqlite3.OperationalError as e:
        if "no such table: cliente_historico" in str(e):
            return {
                "error": "Tabela cliente_historico não existe no banco",
                "detail": str(e),
            }, 500
        return {"error": str(e), "detail": "Erro ao adicionar histórico"}, 500
