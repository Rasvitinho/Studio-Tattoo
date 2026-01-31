from typing import Dict, Any, List, Optional
from datetime import date
from app.db.database import Database


def resumo_periodo(
    db: Database,
    data_ini: date,
    data_fim: date,
    funcionario_id: Optional[int] = None,
    tipo: Optional[str] = None,
) -> Dict[str, Any]:
    dataini_str = data_ini.strftime("%Y-%m-%d")
    datafim_str = data_fim.strftime("%Y-%m-%d")

    faturamento_total, lucro_estudio, lista = db.calcularfinanceiroperiodo(
        dataini_str, datafim_str, funcionario_id, tipo
    )
    
    por_funcionario: List[Dict[str, Any]] = []
    for (
        idfunc,
        nome,
        perc_est,
        perc_func,
        faturamento_func,
        parte_est,
        parte_func,
    ) in lista:
        por_funcionario.append(
            {
                "id": idfunc,
                "nome": nome,
                "perc_estudio": float(perc_est or 0),
                "perc_funcionario": float(perc_func or 0),
                "faturamento": float(faturamento_func or 0),
                "parte_estudio": float(parte_est or 0),
                "parte_funcionario": float(parte_func or 0),
            }
        )

    return {
        "faturamento_total": float(faturamento_total or 0),
        "lucro_estudio": float(lucro_estudio or 0),
        "por_funcionario": por_funcionario,
    }
