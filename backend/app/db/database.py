import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date, timedelta

class Database:
    def __init__(self):
        database_url = os.getenv("DATABASE_URL")
        self.is_postgres = False  # Força SQLite por enquanto
        
        # Comentado por enquanto
        # if database_url:
        #     ...PostgreSQL...
        
        # Usa sempre SQLite
        self.conn = sqlite3.connect("studio_tattoo.db", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        print("✅ Conectado ao SQLite local")


    # ---------- helpers genéricos ----------

    def get_one(self, table: str, where: dict):
        """Pega um único registro WHERE."""
        if not where:
            raise ValueError("where não pode ser vazio em get_one")
        where_clause = " AND ".join([f"{k}=?" for k in where.keys()])
        query = f"SELECT * FROM {table} WHERE {where_clause}"
        row = self.conn.execute(query, list(where.values())).fetchone()
        if row is None:
            return None
        return dict(row)

    def upsert(self, table: str, where: dict, data: dict):
        """INSERT ou UPDATE baseado em WHERE."""
        existing = self.get_one(table, where)
        if existing:
            # UPDATE
            set_clause = ", ".join([f"{k}=?" for k in data.keys()])
            where_clause = " AND ".join([f"{k}=?" for k in where.keys()])
            query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
            values = list(data.values()) + list(where.values())
        else:
            # INSERT
            columns = ", ".join(data.keys())
            placeholders = ", ".join(["?" for _ in data])
            query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
            values = list(data.values())
        self.conn.execute(query, values)

    # ---------- criação de tabelas ----------

    def create_tables(self):
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS config (
                id INTEGER PRIMARY KEY,
                nome_estudio TEXT DEFAULT 'Estúdio Tatuagem',
                cor_primaria TEXT DEFAULT '#FF4500',
                cor_secundaria TEXT DEFAULT '#FFD700',
                logo_path TEXT
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS funcionarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT,
                cargo TEXT,
                porcentagem REAL DEFAULT 0.7,
                perc_estudio REAL DEFAULT 30,
                perc_funcionario REAL DEFAULT 70,
                requer_aprovacao INTEGER DEFAULT 1,
                senha TEXT
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS bloqueios_funcionario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                funcionario_id INTEGER NOT NULL,
                data DATE,
                horario_inicio TIME,
                horario_fim TIME,
                tipo TEXT DEFAULT 'dia',
                motivo TEXT,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
            )
        """
        )

        self.cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS bloqueios_funcionario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            funcionario_id INTEGER NOT NULL,
            data DATE,
            horario_inicio TIME,
            horario_fim TIME,
            tipo TEXT DEFAULT 'dia',
            motivo TEXT,
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
        )
    """
    )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS bloqueios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                funcionario_id INTEGER NOT NULL,
                data TEXT NOT NULL,
                tipo_bloqueio TEXT NOT NULL,
                horarios_bloqueados TEXT,
                motivo TEXT,
                criado_em TEXT,
                FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
            )
            """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS bloqueios_historico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gestor_id INTEGER NOT NULL,
                funcionario_id INTEGER NOT NULL,
                data TEXT NOT NULL,
                tipo_bloqueio TEXT NOT NULL,      -- 'dia_completo' ou 'horarios_especificos'
                horarios_bloqueados TEXT,         -- JSON string com horários, se aplicável
                acao TEXT NOT NULL,               -- 'bloquear' ou 'desbloquear'
                motivo TEXT,
                criado_em TEXT DEFAULT (datetime('now'))
            )
            """
        )

        
        self.conn.commit()

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS agendamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT,
                horario TEXT,
                cliente TEXT,
                funcionario_id INTEGER,
                servico TEXT,
                pago INTEGER DEFAULT 0,
                valor_previsto REAL,
                aprovado INTEGER DEFAULT 0,
                cancelado_solicitado INTEGER DEFAULT 0,
                tipo TEXT DEFAULT 'tatuagem'
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS pagamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agendamento_id INTEGER,
                valor REAL,
                data_pagto TEXT
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                login TEXT NOT NULL UNIQUE,
                senha TEXT NOT NULL,
                tipo TEXT NOT NULL,
                funcionario_id INTEGER NULL
            )
        """
        )

        # usuário gestor padrão (cria ou garante senha) - agora como superadmin
        self.cursor.execute("SELECT id FROM usuarios WHERE login = ?", ("gestor",))
        row = self.cursor.fetchone()
        if not row:
            self.cursor.execute(
                """
                INSERT INTO usuarios (login, senha, tipo, funcionario_id)
                VALUES (?, ?, 'superadmin', NULL)
                """,
                ("gestor", "2512"),
            )
        else:
            self.cursor.execute(
                """
                UPDATE usuarios
                SET senha = ?, tipo = 'superadmin', funcionario_id = NULL
                WHERE login = ?
                """,
                ("2512", "gestor"),
            )

        self.cursor.execute("INSERT OR IGNORE INTO config (id) VALUES (1)")
        self.conn.commit()

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS solicitacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT,
                agendamento_id INTEGER,
                funcionario_id INTEGER,
                data TEXT,
                horario TEXT,
                cliente TEXT,
                servico TEXT,
                status TEXT DEFAULT 'pendente',
                data_solicitacao TEXT
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                telefone TEXT,
                email TEXT,
                cpf TEXT,
                endereco TEXT,
                data_criacao TEXT,
                status TEXT DEFAULT 'pre_cadastro'
            )
        """
        )

        self.cursor.execute("INSERT OR IGNORE INTO config (id) VALUES (1)")
        self.conn.commit()

    def criar_tabelas_tatuagem(self):
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tattoo_regioes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT UNIQUE NOT NULL
            )
        """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS tattoo_locais (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                regiao_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                FOREIGN KEY (regiao_id) REFERENCES tattoo_regioes (id)
            )
        """
        )
        self.conn.commit()

    def aplicar_migracoes_simples(self):
        # funcionarios
        self.cursor.execute("PRAGMA table_info(funcionarios)")
        cols_func = [c[1] for c in self.cursor.fetchall()]
        if "perc_estudio" not in cols_func:
            self.cursor.execute(
                "ALTER TABLE funcionarios ADD COLUMN perc_estudio REAL DEFAULT 30"
            )
        if "perc_funcionario" not in cols_func:
            self.cursor.execute(
                "ALTER TABLE funcionarios ADD COLUMN perc_funcionario REAL DEFAULT 70"
            )
        if "requer_aprovacao" not in cols_func:
            self.cursor.execute(
                "ALTER TABLE funcionarios ADD COLUMN requer_aprovacao INTEGER DEFAULT 1"
            )
        if "senha" not in cols_func:
            self.cursor.execute(
                "ALTER TABLE funcionarios ADD COLUMN senha TEXT"
            )

        # agendamentos
        self.cursor.execute("PRAGMA table_info(agendamentos)")
        cols_ag = [c[1] for c in self.cursor.fetchall()]
        if "cliente_id" not in cols_ag:
            self.cursor.execute(
                "ALTER TABLE agendamentos ADD COLUMN cliente_id INTEGER"
            )
        if "status" not in cols_ag:
            self.cursor.execute(
                "ALTER TABLE agendamentos ADD COLUMN status TEXT DEFAULT 'pre_cadastro'"
            )

        # clientes (mantém o que já existe)
        self.cursor.execute("PRAGMA table_info(clientes)")
        cols_clientes = [c[1] for c in self.cursor.fetchall()]
        if "status" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN status TEXT DEFAULT 'pre_cadastro'"
            )
        if "tem_ficha" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN tem_ficha BOOLEAN DEFAULT FALSE"
            )
        # ... resto das colunas de clientes que você já tem ...

        self.conn.commit()


        # clientes
        self.cursor.execute("PRAGMA table_info(clientes)")
        cols_clientes = [c[1] for c in self.cursor.fetchall()]
        if "status" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN status TEXT DEFAULT 'pre_cadastro'"
            )
        if "tem_ficha" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN tem_ficha BOOLEAN DEFAULT FALSE"
            )
        if "data_cadastro" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN data_cadastro DATE"
            )
        if "celular" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN celular TEXT"
            )
        if "alergias" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN alergias TEXT"
            )
        if "usa_pomada_anestesica" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN usa_pomada_anestesica TEXT"
            )
        if "fuma" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN fuma TEXT"
            )
        if "bebe" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN bebe TEXT"
            )
        if "procedimento" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN procedimento TEXT"
            )
        if "endereco" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN endereco TEXT"
            )
        if "informacao" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN informacao TEXT"
            )
        if "valor" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN valor REAL"
            )
        if "funcionario_id" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN funcionario_id INTEGER"
            )

        self.conn.commit()


        # agendamentos
        self.cursor.execute("PRAGMA table_info(agendamentos)")
        cols_ag = [c[1] for c in self.cursor.fetchall()]
        if "valor_previsto" not in cols_ag:
            self.cursor.execute(
                "ALTER TABLE agendamentos ADD COLUMN valor_previsto REAL"
            )
        if "aprovado" not in cols_ag:
            self.cursor.execute(
                "ALTER TABLE agendamentos ADD COLUMN aprovado INTEGER DEFAULT 0"
            )
        if "cancelado_solicitado" not in cols_ag:
            self.cursor.execute(
                "ALTER TABLE agendamentos ADD COLUMN cancelado_solicitado INTEGER DEFAULT 0"
            )
        if "tipo" not in cols_ag:
            self.cursor.execute(
                "ALTER TABLE agendamentos ADD COLUMN tipo TEXT DEFAULT 'tatuagem'"
            )
        if "status" not in cols_ag:
            self.cursor.execute(
                "ALTER TABLE agendamentos ADD COLUMN status TEXT DEFAULT 'pre_cadastro'"
            )

        # clientes
        self.cursor.execute("PRAGMA table_info(clientes)")
        cols_clientes = [c[1] for c in self.cursor.fetchall()]
        if "status" not in cols_clientes:
            self.cursor.execute(
                "ALTER TABLE clientes ADD COLUMN status TEXT DEFAULT 'pre_cadastro'"
            )

        self.conn.commit()

    # ---------- autenticação ----------

    def autenticar_usuario(self, login: str, senha: str):
        if self.is_postgres:
            # PostgreSQL usa %s
            self.cursor.execute(
                """
                SELECT id, login, tipo, funcionario_id
                FROM usuarios
                WHERE login = %s AND senha = %s
                """,
                (login, senha),
            )
        else:
            # SQLite usa ?
            self.cursor.execute(
                """
                SELECT id, login, tipo, funcionario_id
                FROM usuarios
                WHERE login = ? AND senha = ?
                """,
                (login, senha),
            )
        return self.cursor.fetchone()

    # ---------- métodos usados pela agenda ----------
    def get_agendamentos_por_dia(self, data_str):
        self.cursor.execute(
            """
            SELECT a.id,
                a.horario,
                c.nome,
                a.servico,
                f.nome,
                a.valor_previsto,
                a.aprovado,
                a.pago
            FROM agendamentos a
            LEFT JOIN clientes c ON c.id = a.cliente_id
            LEFT JOIN funcionarios f ON a.funcionario_id = f.id
            WHERE a.data = ?
            ORDER BY a.horario ASC, f.nome ASC
        """,
            (data_str,),
        )
        return self.cursor.fetchall()

    def criar_agendamento(
        self,
        data_str,
        horario,
        cliente,
        servico,
        tipo,
        valor_previsto,
        funcionario_id,
        aprovado=True,
        status: str = "pre_cadastro",
    ):
        self.cursor.execute(
            """
            INSERT INTO agendamentos
                (data, horario, cliente_id, servico, tipo,
                valor_previsto, funcionario_id, aprovado, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data_str,
                horario,
                cliente,
                servico,
                tipo,
                valor_previsto,
                funcionario_id,
                1 if aprovado else 0,
                status,
            ),
        )
        self.conn.commit()

    def atualizar_agendamento(
        self,
        agendamento_id: int,
        data_str: str,
        horario: str,
        cliente: str,
        servico: str,
        valor_previsto: float | None,
        funcionario_id: int | None,
    ) -> bool:
        self.cursor.execute(
            """
            UPDATE agendamentos
            SET data = ?,
                horario = ?,
                cliente_id = ?,
                servico = ?,
                valor_previsto = ?,
                funcionario_id = ?
            WHERE id = ?
            """,
            (
                data_str,
                horario,
                cliente,
                servico,
                valor_previsto,
                funcionario_id,
                agendamento_id,
            ),
        )
        self.conn.commit()
        return self.cursor.rowcount > 0

    def remover_agendamento(self, agendamento_id: int) -> bool:
        self.cursor.execute(
            "DELETE FROM agendamentos WHERE id = ?",
            (agendamento_id,),
        )
        self.conn.commit()
        return self.cursor.rowcount > 0

    def get_agendamentos_por_dia_e_funcionario(self, data_str, funcionario_id):
        self.cursor.execute(
            """
            SELECT
                a.data,
                a.id,
                a.horario,
                c.nome,
                a.servico,
                f.nome,
                a.valor_previsto,
                a.aprovado,
                a.pago
            FROM agendamentos a
            LEFT JOIN clientes c ON c.id = a.cliente_id
            LEFT JOIN funcionarios f ON a.funcionario_id = f.id
            WHERE a.data = ? AND a.funcionario_id = ?
            ORDER BY a.horario ASC, f.nome ASC
            """,
            (data_str, funcionario_id),
        )
        return self.cursor.fetchall()

    def get_agendamentos_por_periodo(self, data_ini, data_fim):
        self.cursor.execute(
            """
            SELECT
                a.data,
                a.id,
                a.horario,
                c.nome,
                a.servico,
                f.nome,
                a.valor_previsto,
                a.aprovado,
                a.pago
            FROM agendamentos a
            LEFT JOIN clientes c ON c.id = a.cliente_id
            LEFT JOIN funcionarios f ON a.funcionario_id = f.id
            WHERE a.data BETWEEN ? AND ?
            ORDER BY a.data ASC, a.horario ASC, f.nome ASC
            """,
            (data_ini, data_fim),
        )
        return self.cursor.fetchall()

    def get_agendamentos_funcionario_periodo(self, data_ini, data_fim, funcionario_id):
        self.cursor.execute(
            """
            SELECT
                a.data,
                a.id,
                a.horario,
                c.nome,
                a.servico,
                f.nome,
                a.valor_previsto,
                a.aprovado,
                a.pago
            FROM agendamentos a
            LEFT JOIN clientes c ON c.id = a.cliente_id
            LEFT JOIN funcionarios f ON a.funcionario_id = f.id
            WHERE a.data BETWEEN ? AND ?
            AND a.funcionario_id = ?
            ORDER BY a.data ASC, a.horario ASC, f.nome ASC
            """,
            (data_ini, data_fim, funcionario_id),
        )
        return self.cursor.fetchall()

    def marcar_agendamento_como_pago(self, agendamento_id):
        self.cursor.execute(
            "UPDATE agendamentos SET pago = 1 WHERE id = ?",
            (agendamento_id,),
        )
        self.conn.commit()

    # ---------- FUNCIONÁRIOS ----------

    def listar_funcionarios(self):
        self.cursor.execute(
            """
            SELECT id, nome, cargo, perc_funcionario, perc_estudio, requer_aprovacao
            FROM funcionarios
            ORDER BY id
        """
        )
        return self.cursor.fetchall()

    def obter_funcionario_por_id(self, func_id: int):
        self.cursor.execute(
            """
            

            SELECT id, nome, cargo, perc_funcionario, perc_estudio, requer_aprovacao
            FROM funcionarios
            WHERE id = ?
        """,
            (func_id,),
        )
        return self.cursor.fetchone()

    def criar_funcionario(
        self,
        nome: str,
        cargo: str,
        perc_funcionario: float,
        requer_aprovacao: int,
        senha: str | None = None,
    ):
        perc_estudio = 100.0 - perc_funcionario
        self.cursor.execute(
            """
            INSERT INTO funcionarios
                (nome, cargo, perc_funcionario, perc_estudio,
                 requer_aprovacao, senha)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (nome, cargo, perc_funcionario, perc_estudio, requer_aprovacao, senha),
        )
        self.conn.commit()
        return self.cursor.lastrowid

    def atualizar_funcionario(
        self,
        func_id: int,
        nome: str,
        cargo: str,
        perc_funcionario: float,
        requer_aprovacao: int,
        senha: str | None = None,
    ):
        perc_estudio = 100.0 - perc_funcionario
        self.cursor.execute(
            """
            UPDATE funcionarios
               SET nome = ?,
                   cargo = ?,
                   perc_funcionario = ?,
                   perc_estudio = ?,
                   requer_aprovacao = ?,
                   senha = ?
             WHERE id = ?
        """,
            (nome, cargo, perc_funcionario, perc_estudio, requer_aprovacao, senha, func_id),
        )
        self.conn.commit()
    def remover_funcionario(self, funcionario_id: int) -> bool:
        # Remove bloqueios do funcionário
        self.cursor.execute(
            "DELETE FROM bloqueios WHERE funcionario_id = ?",
            (funcionario_id,),
        )

        # Remove usuários vinculados a esse funcionário
        self.cursor.execute(
            "DELETE FROM usuarios WHERE funcionario_id = ?",
            (funcionario_id,),
        )

        # Remove o próprio funcionário
        self.cursor.execute(
            "DELETE FROM funcionarios WHERE id = ?",
            (funcionario_id,),
        )

        removidos = self.cursor.rowcount
        self.conn.commit()
        return removidos > 0


    def get_exige_aprovacao_funcionario(self, funcionario_id: int) -> int:
        self.cursor.execute(
            "SELECT exige_aprovacao FROM funcionarios WHERE id = ?",
            (funcionario_id,),
        )
        row = self.cursor.fetchone()
        return row[0] if row else 0

    # ---------- FINANCEIRO / RESUMOS ----------

    def calcularresumo(self, dataref: date):
        ano = dataref.year
        mes = dataref.month

        data_hoje = dataref.strftime("%Y-%m-%d")

        dia_sem = dataref.weekday()
        inicio_semana = (dataref - timedelta(days=dia_sem)).strftime("%Y-%m-%d")
        fim_semana = (dataref + timedelta(days=6 - dia_sem)).strftime("%Y-%m-%d")

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(valor_previsto), 0.0)
            FROM agendamentos
            WHERE aprovado = 1 AND pago = 1 AND data = ?
            """,
            (data_hoje,),
        )
        total_hoje = self.cursor.fetchone()[0]

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(valor_previsto), 0.0)
            FROM agendamentos
            WHERE aprovado = 1 AND pago = 1
              AND data BETWEEN ? AND ?
            """,
            (inicio_semana, fim_semana),
        )
        total_semana = self.cursor.fetchone()[0]

        data_ini_mes = f"{ano:04d}-{mes:02d}-01"
        data_fim_mes = f"{ano:04d}-{mes:02d}-31"
        self.cursor.execute(
            """
            SELECT COALESCE(SUM(valor_previsto), 0.0)
            FROM agendamentos
            WHERE aprovado = 1 AND pago = 1
              AND data BETWEEN ? AND ?
            """,
            (data_ini_mes, data_fim_mes),
        )
        total_mes = self.cursor.fetchone()[0]

        return total_hoje, total_semana, total_mes

    def calcularfinanceiroperiodo(
        self,
        dataini: str,
        datafim: str,
        funcionario_id: int | None = None,
        tipo: str | None = None,
    ):
        params_total: list = [dataini, datafim]
        params_func: list = [dataini, datafim]
        where_extra_total = ""
        where_extra_func = ""

        # Para a primeira query (sem alias)
        if funcionario_id is not None:
            where_extra_total += " AND funcionario_id = ?"
            params_total.append(funcionario_id)

        if tipo is not None:
            where_extra_total += " AND LOWER(tipo) = ?"
            params_total.append(tipo.lower())

        # Para a segunda query (com alias a.)
        if funcionario_id is not None:
            where_extra_func += " AND a.funcionario_id = ?"
            params_func.append(funcionario_id)

        if tipo is not None:
            where_extra_func += " AND LOWER(a.tipo) = ?"
            params_func.append(tipo.lower())

        # total do período
        self.cursor.execute(
            f"""
            SELECT COALESCE(SUM(valor_previsto), 0.0)
            FROM agendamentos
            WHERE aprovado = 1
            AND pago = 1
            AND data BETWEEN ? AND ?{where_extra_total}
            """,
            params_total,
        )
        faturamento_total = self.cursor.fetchone()[0] or 0.0

        # por funcionário
        self.cursor.execute(
            f"""
            SELECT f.id,
                f.nome,
                f.perc_estudio,
                f.perc_funcionario,
                COALESCE(SUM(a.valor_previsto), 0.0) AS faturamento_func
            FROM agendamentos a
            INNER JOIN funcionarios f ON f.id = a.funcionario_id
            WHERE a.aprovado = 1
            AND a.pago = 1
            AND a.data BETWEEN ? AND ?{where_extra_func}
            GROUP BY f.id, f.nome, f.perc_estudio, f.perc_funcionario
            """,
            params_func,
        )
        rows = self.cursor.fetchall()

        lista = []
        lucro_estudio = 0.0
        for idfunc, nome, perc_est, perc_func, faturamento_func in rows:
            faturamento_func = faturamento_func or 0.0
            parte_est = faturamento_func * (perc_est / 100.0)
            parte_func = faturamento_func * (perc_func / 100.0)
            lucro_estudio += parte_est
            lista.append(
                (
                    idfunc,
                    nome,
                    perc_est,
                    perc_func,
                    faturamento_func,
                    parte_est,
                    parte_func,
                )
            )

        return faturamento_total, lucro_estudio, lista

    def calculartotaismes(self, ano: int, mes: int):
        dataini = f"{ano:04d}-{mes:02d}-01"
        datafim = f"{ano:04d}-{mes:02d}-31"

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(valor_previsto), 0.0)
            FROM agendamentos
            WHERE pago = 1
              AND data BETWEEN ? AND ?
            """,
            (dataini, datafim),
        )
        total_mes = self.cursor.fetchone()[0]

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(a.valor_previsto), 0.0)
            FROM agendamentos a
            LEFT JOIN funcionarios f ON f.id = a.funcionario_id
            WHERE a.pago = 1
              AND a.data BETWEEN ? AND ?
              AND LOWER(a.tipo) = 'tatuagem'
            """,
            (dataini, datafim),
        )
        total_tattoo = self.cursor.fetchone()[0]

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(a.valor_previsto), 0.0)
            FROM agendamentos a
            LEFT JOIN funcionarios f ON f.id = a.funcionario_id
            WHERE a.pago = 1
              AND a.data BETWEEN ? AND ?
              AND LOWER(a.tipo) = 'piercing'
            """,
            (dataini, datafim),
        )
        total_piercing = self.cursor.fetchone()[0]

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(a.valor_previsto * f.perc_estudio / 100.0), 0.0)
            FROM agendamentos a
            INNER JOIN funcionarios f ON f.id = a.funcionario_id
            WHERE a.pago = 1
              AND a.data BETWEEN ? AND ?
            """,
            (dataini, datafim),
        )
        total_estudio = self.cursor.fetchone()[0]

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(a.valor_previsto * f.perc_funcionario / 100.0), 0.0)
            FROM agendamentos a
            INNER JOIN funcionarios f ON f.id = a.funcionario_id
            WHERE a.pago = 1
              AND a.data BETWEEN ? AND ?
              AND LOWER(a.tipo) = 'piercing'
            """,
            (dataini, datafim),
        )
        total_piercer_comissao = self.cursor.fetchone()[0]

        self.cursor.execute(
            """
            SELECT COALESCE(SUM(a.valor_previsto * f.perc_funcionario / 100.0), 0.0)
            FROM agendamentos a
            INNER JOIN funcionarios f ON f.id = a.funcionario_id
            WHERE a.pago = 1
              AND a.data BETWEEN ? AND ?
              AND LOWER(a.tipo) = 'tatuagem'
            """,
            (dataini, datafim),
        )
        total_tatuador_comissao = self.cursor.fetchone()[0]

        return (
            total_mes,
            total_tattoo,
            total_piercing,
            total_estudio,
            total_piercer_comissao,
            total_tatuador_comissao,
        )

    # ---------- BLOQUEIOS DE FUNCIONÁRIO ----------

    def registrar_historico_bloqueio(
        self,
        gestor_id: int,
        funcionario_id: int,
        data: str,
        tipo_bloqueio: str,
        horarios_bloqueados: str | None,
        acao: str,
        motivo: str | None = None,
    ):
        """
        Registra uma ação de bloqueio/desbloqueio feita pelo gestor
        na tabela bloqueios_historico.
        """
        self.cursor.execute(
            """
            INSERT INTO bloqueios_historico 
                (gestor_id, funcionario_id, data, tipo_bloqueio, horarios_bloqueados, acao, motivo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (gestor_id, funcionario_id, data, tipo_bloqueio, horarios_bloqueados, acao, motivo),
        )
        self.conn.commit()


    def criar_bloqueio(self, funcionario_id, data, tipo_bloqueio, horarios_bloqueados=None, motivo=None):
        """
        Cria um novo bloqueio para um funcionário.
        
        Args:
            funcionario_id: ID do funcionário
            data: Data do bloqueio (formato YYYY-MM-DD)
            tipo_bloqueio: 'dia_completo' ou 'horarios_especificos'
            horarios_bloqueados: JSON string com array de horários (opcional)
            motivo: Motivo do bloqueio (opcional)
        
        Returns:
            ID do bloqueio criado
        """
        self.cursor.execute(
            """
            INSERT INTO bloqueios (funcionario_id, data, tipo_bloqueio, horarios_bloqueados, motivo, criado_em)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (funcionario_id, data, tipo_bloqueio, horarios_bloqueados, motivo)
        )
        self.conn.commit()
        return self.cursor.lastrowid


    def listar_bloqueios_por_funcionario(self, funcionario_id):
        """
        Lista todos os bloqueios de um funcionário específico.
        """
        self.cursor.execute(
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
            WHERE funcionario_id = ?
            ORDER BY data DESC
            """,
            (funcionario_id,)
        )
        
        rows = self.cursor.fetchall()
        resultado = []
        
        for row in rows:
            bloqueio = {
                "id": row[0],
                "funcionario_id": row[1],
                "data": row[2],
                "tipo_bloqueio": row[3],
                "horarios_bloqueados": row[4],
                "motivo": row[5],
                "criado_em": row[6],
            }
            resultado.append(bloqueio)
        
        return resultado


    def remover_bloqueio(self, bloqueio_id):
        """
        Remove um bloqueio pelo ID.
        """
        self.cursor.execute(
            "DELETE FROM bloqueios WHERE id = ?",
            (bloqueio_id,)
        )
        self.conn.commit()
        return self.cursor.rowcount > 0


    def verificar_bloqueio(self, funcionario_id, data, horario):
        """
        Verifica se existe bloqueio para um funcionário em uma data/horário específico.
        
        Returns:
            Dict com informações do bloqueio se existir, None caso contrário
        """
        print(f"\n🔍 VERIFICAR_BLOQUEIO:")
        print(f"   funcionario_id: {funcionario_id}")
        print(f"   data: {data}")
        print(f"   horario: {horario}")
        
        self.cursor.execute(
            """
            SELECT id, tipo_bloqueio, horarios_bloqueados, motivo
            FROM bloqueios
            WHERE funcionario_id = ? AND data = ?
            """,
            (funcionario_id, data)
        )
        
        row = self.cursor.fetchone()
        print(f"   Query resultado: {row}")
        
        if not row:
            print(f"   ❌ Nenhum bloqueio encontrado")
            return None
        
        bloqueio = {
            "id": row[0],
            "tipo_bloqueio": row[1],
            "horarios_bloqueados": row[2],
            "motivo": row[3]
        }
        
        print(f"   📌 Bloqueio encontrado: {bloqueio}")
        
        # Se for dia completo, retorna o bloqueio
        if bloqueio["tipo_bloqueio"] == "dia_completo":
            print(f"   🚫 DIA COMPLETO BLOQUEADO!")
            return bloqueio
        
        # Se for horários específicos, verifica se o horário está na lista
        if bloqueio["tipo_bloqueio"] == "horarios_especificos" and bloqueio["horarios_bloqueados"]:
            try:
                import json
                horarios_lista = json.loads(bloqueio["horarios_bloqueados"])
                print(f"   📋 Horários bloqueados: {horarios_lista}")
                print(f"   🔍 Verificando se {horario} está em {horarios_lista}")
                if horario in horarios_lista:
                    print(f"   🚫 HORÁRIO BLOQUEADO!")
                    return bloqueio
                else:
                    print(f"   ✅ Horário não está bloqueado")
            except Exception as e:
                print(f"   ❌ Erro ao parsear horários: {e}")
        
        print(f"   ✅ Sem bloqueio para este horário")
        return None
