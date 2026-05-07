from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from parser_tecnico import CADParser
import tempfile
import os

app = FastAPI()

# Habilita CORS para o seu frontend React/Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

parser = CADParser()

@app.post("/api/importar-cad")
async def importar_cad(file: UploadFile = File(...)):
    # Salva arquivo temporário para processamento
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        if suffix == '.dxf':
            pecas = parser.parse_dxf(tmp_path)
        else:
            # Fluxo inteligente para PDF
            pecas = parser.parse_tabelas(tmp_path)
            if not pecas:
                texto = parser.extrair_texto_pdf(tmp_path)
                pecas = parser.parse_pecas(texto)
            if len(pecas) < 3:
                pecas.extend(parser.parse_cotas_vetoriais(tmp_path))

        # Calcula nível de confiança (heurística simples)
        confianca = 100 if any(p['metodo'] == 'table_extraction' for p in pecas) else 75
        if not pecas: confianca = 0

        return {
            "success": True,
            "filename": file.filename,
            "total_pecas": len(pecas),
            "confianca": confianca,
            "data": pecas
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        os.unlink(tmp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
