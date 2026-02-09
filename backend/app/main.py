from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Database
from app.routers import (
    agenda, 
    auth, 
    funcionarios, 
    financeiro, 
    solicitacoes, 
    ocr, 
    clientes,
    bloqueios  # ✅ NOVO IMPORT
)
import os
from migrations import run_migrations


app = FastAPI(
    title="SLion1 Studio",
    description="Sistema de Gestão para Estúdio de Tatuagem e Piercing",
    version="1.0.0"
)


# ========== CORS CONFIGURATION ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://studio-tattoo-two.vercel.app",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== ROUTERS ==========
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(agenda.router, prefix="/agenda", tags=["agenda"])
app.include_router(funcionarios.router, prefix="/funcionarios", tags=["funcionarios"])
app.include_router(financeiro.router, prefix="/financeiro", tags=["financeiro"])
app.include_router(solicitacoes.router, prefix="/solicitacoes", tags=["solicitacoes"])
app.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
app.include_router(clientes.router, prefix="/clientes", tags=["clientes"])
app.include_router(bloqueios.router, prefix="/bloqueios", tags=["bloqueios"])  # ✅ NOVO ROUTER


# ========== STARTUP & SHUTDOWN ==========
@app.on_event("startup")
async def startup():
    """Inicializa o banco de dados na startup"""
    try:
        app.state.db = Database()
        app.state.db.create_tables()
        app.state.db.aplicar_migracoes_simples()
        print("✅ Backend iniciado com sucesso")
        print("✅ Tabelas criadas/validadas")
        print("✅ Migrações aplicadas")
    except Exception as e:
        print(f"❌ Erro ao iniciar backend: {e}")
        raise


@app.on_event("shutdown")
async def shutdown():
    """Fecha conexão com banco de dados na shutdown"""
    try:
        if hasattr(app.state, "db"):
            app.state.db.conn.close()
            print("✅ Conexão com banco de dados encerrada")
    except Exception as e:
        print(f"❌ Erro ao encerrar banco de dados: {e}")


# ========== HEALTH CHECK ==========
@app.get("/health")
async def health_check():
    """Verifica se o backend está rodando"""
    return {
        "status": "✅ OK",
        "message": "Backend está funcionando normalmente",
        "service": "SLion1 Studio API"
    }


# ========== ROOT ==========
@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "app": "SLion1 Studio",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
