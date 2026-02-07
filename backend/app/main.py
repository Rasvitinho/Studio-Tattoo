from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Database
from app.routers import agenda, auth, funcionarios, financeiro, solicitacoes, ocr, clientes


app = FastAPI(title="Studio Manager API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # libera qualquer origem em DEV
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


@app.on_event("shutdown")
async def shutdown():
    if hasattr(app.state, "db"):
        app.state.db.conn.close()
