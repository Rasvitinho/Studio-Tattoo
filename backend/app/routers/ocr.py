from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/ficha", summary="Extrai dados da ficha de cadastro")
async def ocr_ficha(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Envie uma imagem de ficha (jpeg, png, etc.)")

    # TODO: aqui depois vamos plugar OCR de verdade.
    # Por enquanto, só devolve estrutura vazia para integrar frontend.

    campos = {
        "nome": "",
        "telefone": "",
        "endereco": "",
        "celular": "",
        "procedimento": "",
        "alergias": "",
        "usa_pomada_anestesica": "",
        "fuma": "",
        "bebe": "",
    }

    incertezas = list(campos.keys())

    return JSONResponse({"campos": campos, "incertezas": incertezas})
