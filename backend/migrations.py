# migrations.py

def create_tables(cursor, is_postgres=False):
    """Cria as tabelas se não existirem"""
    
    if is_postgres:
        # PostgreSQL
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                telefone VARCHAR(20),
                celular VARCHAR(20),
                endereco VARCHAR(500),
                procedimento VARCHAR(255),
                alergias TEXT,
                usa_pomada_anestesica VARCHAR(100),
                fuma VARCHAR(50),
                bebe VARCHAR(50),
                data_cadastro DATE,
                informacao TEXT,
                valor NUMERIC(10, 2),
                funcionario_id INTEGER,
                tem_ficha BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agendamentos (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER NOT NULL,
                data DATE NOT NULL,
                hora TIME NOT NULL,
                tatuador_id INTEGER,
                status VARCHAR(50) DEFAULT 'agendado',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id)
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS funcionarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                telefone VARCHAR(20),
                cargo VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS financeiro (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER,
                agendamento_id INTEGER,
                tipo VARCHAR(50),
                descricao TEXT,
                valor NUMERIC(10, 2),
                data_transacao DATE,
                status VARCHAR(50) DEFAULT 'pendente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
            );
        """)

def run_migrations(db):
    """Executa as migrations na inicialização"""
    try:
        import os
        is_postgres = bool(os.getenv("DATABASE_URL"))
        
        create_tables(db.cursor, is_postgres=is_postgres)
        db.conn.commit()
        print("✅ Migrations executadas com sucesso")
    except Exception as e:
        print(f"❌ Erro ao executar migrations: {e}")
        raise
