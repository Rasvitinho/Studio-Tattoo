from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Database
from app.routers import agenda, auth, funcionarios, financeiro, solicitacoes, ocr, clientes
import os
from migrations import run_migrations

app = FastAPI(title="SLion1 Studio")

# Adiciona CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # desenvolvimento local React
        "http://localhost:5173",  # se usar Vite
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://studio-tattoo-git-main-rasvitinhos-projects.vercel.app",  # sua Vercel
        "*",  # libera qualquer origem em DEV (remova em produção se quiser ser mais restritivo)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(agenda.router, prefix="/agenda", tags=["agenda"])
app.include_router(funcionarios.router, prefix="/funcionarios", tags=["funcionarios"])
app.include_router(financeiro.router, prefix="/financeiro", tags=["financeiro"])
app.include_router(solicitacoes.router, prefix="/solicitacoes", tags=["solicitacoes"])
app.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
app.include_router(clientes.router, prefix="/clientes", tags=["clientes"])


@app.on_event("startup")
async def startup():
    app.state.db = Database()
    # Cria as tabelas se não existirem
    app.state.db.create_tables()
    app.state.db.aplicar_migracoes_simples()
    print("✅ Backend iniciado com sucesso")

@app.on_event("shutdown")
async def shutdown():
    if hasattr(app.state, "db"):
        app.state.db.conn.close()
