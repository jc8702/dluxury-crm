import fitz  # PyMuPDF
import re
import json
import pdfplumber
import os
import ezdxf

class CADParser:
    def __init__(self):
        # Regex para capturar: Nome da Peça, Largura, Altura, Espessura (opcional)
        self.pattern_dimensoes = re.compile(
            r'([a-zA-Záàâãéèêíïóôõöúçñ\d\s\-\/_]+?)\s*[:\-]?\s*(\d{2,4})\s*[xX×]\s*(\d{2,4})(?:\s*[xX×]?\s*(\d{1,2}))?',
            re.IGNORECASE | re.UNICODE
        )
        
        self.materiais_conhecidos = {
            'MDF': ['mdf', 'medium density', 'fibra média', 'lacca'],
            'MDP': ['mdp', 'aglomerado', 'particulas', 'medium density particleboard'],
            'COMPENSADO': ['compensado', 'plywood', 'madeira laminada'],
            'CHAPA_METALICA': ['aço', 'metal', 'inox', 'alumínio', 'aluminio'],
            'VIDRO': ['vidro', 'glass', 'reflecta', 'espelho']
        }

    def extrair_texto_pdf(self, caminho_pdf):
        """Extrai todo o texto do PDF preservando espaços."""
        try:
            doc = fitz.open(caminho_pdf)
            texto_completo = ""
            for pagina in doc:
                texto_completo += pagina.get_text("text") + "\n"
            return texto_completo
        except Exception as e:
            return f"Erro ao ler PDF: {str(e)}"

    def parse_pecas(self, texto):
        """Aplica regex para identificar peças e dimensões."""
        matches = self.pattern_dimensoes.finditer(texto)
        
        pecas = []
        for match in matches:
            nome_sujo = match.group(1).strip()
            
            # Limpeza básica do nome (remove quebras de linha e excesso de espaços)
            nome = re.sub(r'\s+', ' ', nome_sujo)
            
            largura = match.group(2)
            altura = match.group(3)
            espessura = match.group(4)

            # Filtro para evitar capturar números isolados que não são peças
            if len(nome) < 2: continue

            pecas.append({
                'nome': nome,
                'largura_mm': int(largura),
                'altura_mm': int(altura),
                'espessura_mm': int(espessura) if espessura else self.extrair_espessura_avulsa(nome, texto),
                'material': self.identificar_material(nome, texto),
                'metodo': 'regex_text'
            })
            
        return pecas

    def parse_tabelas(self, caminho_pdf):
        """Extrai peças de tabelas estruturadas."""
        pecas = []
        try:
            with pdfplumber.open(caminho_pdf) as pdf:
                for pagina in pdf.pages:
                    tabelas = pagina.extract_tables()
                    for tabela in tabelas:
                        # Filtro: Tabelas de peças geralmente têm > 3 colunas e > 1 linha
                        if not tabela or len(tabela) < 2 or len(tabela[0]) < 3:
                            continue
                            
                        for linha in tabela[1:]: # Pula cabeçalho
                            # Filtra linhas vazias ou com poucos dados
                            linha_limpa = [str(c).strip() for c in linha if c is not None]
                            if len(linha_limpa) < 3: continue
                            
                            # Tenta identificar colunas de dimensão via regex em cada célula
                            dims = []
                            for celula in linha_limpa:
                                num = re.findall(r'\d+', celula)
                                if num: dims.extend(num)
                            
                            if len(dims) >= 2:
                                pecas.append({
                                    'nome': linha_limpa[0],
                                    'largura_mm': int(dims[0]),
                                    'altura_mm': int(dims[1]),
                                    'espessura_mm': int(dims[2]) if len(dims) > 2 else 18,
                                    'material': self.identificar_material(linha_limpa[0], " ".join(linha_limpa)),
                                    'metodo': 'table_extraction'
                                })
        except Exception as e:
            print(f"Erro no parsing de tabela: {e}")
            
        return pecas

    def identificar_material(self, texto_peca, contexto_pdf):
        """Classifica o material baseado em keywords."""
        texto_busca = (texto_peca + " " + contexto_pdf[:5000]).lower() # Pega os primeiros 5k caracteres como contexto
        
        for material, keywords in self.materiais_conhecidos.items():
            if any(kw in texto_busca for kw in keywords):
                return material
        
        return 'MDF' # Default para marcenaria se não identificado

    def extrair_espessura_avulsa(self, nome, texto):
        """Tenta achar espessura se não estiver no formato LxAxE."""
        # Procura por "18mm", "15 mm", "espessura 6"
        padrao = re.search(r'(?:esp\.?|espessura)?\s*(\d{1,2})\s*(?:mm)?', nome + " " + texto[:1000], re.IGNORECASE)
        if padrao:
            return int(padrao.group(1))
        return 18 # Default comum

    def parse_cotas_vetoriais(self, caminho_pdf):
        """Extrai números que estão próximos a linhas de cota no PDF."""
        pecas_cotas = []
        try:
            doc = fitz.open(caminho_pdf)
            for pagina in doc:
                textos = pagina.get_text("dict")["blocks"]
                
                nums_encontrados = []
                for b in textos:
                    if b["type"] == 0: # Texto
                        for l in b["lines"]:
                            for s in l["spans"]:
                                txt = s["text"].strip()
                                # Se for um número de 2 a 4 dígitos (comum em mm)
                                if re.match(r'^\d{2,4}$', txt):
                                    nums_encontrados.append({
                                        'valor': int(txt),
                                        'bbox': s["bbox"] # [x0, y0, x1, y1]
                                    })
                
                # Heurística: se temos dois números próximos que formam um par (L x A)
                for i in range(len(nums_encontrados)):
                    for j in range(i + 1, len(nums_encontrados)):
                        n1 = nums_encontrados[i]
                        n2 = nums_encontrados[j]
                        
                        # Se estão a menos de 80 units de distância (mesma peça provável)
                        dist = ((n1['bbox'][0] - n2['bbox'][0])**2 + (n1['bbox'][1] - n2['bbox'][1])**2)**0.5
                        if dist < 80:
                            pecas_cotas.append({
                                'nome': f"PEÇA_VETORIAL_{n1['valor']}x{n2['valor']}",
                                'largura_mm': max(n1['valor'], n2['valor']),
                                'altura_mm': min(n1['valor'], n2['valor']),
                                'espessura_mm': 18,
                                'material': 'MDF',
                                'metodo': 'vector_analysis'
                            })
            doc.close()
        except Exception as e:
            print(f"Erro na análise vetorial: {e}")
            
        return pecas_cotas

    def parse_dxf(self, caminho_dxf):
        """Extrai peças de arquivos DXF (AutoCAD/SketchUp)."""
        pecas = []
        try:
            doc = ezdxf.readfile(caminho_dxf)
            msp = doc.modelspace()
            
            # Procura por LWPOLYLINE (retângulos fechados)
            for entidade in msp.query('LWPOLYLINE'):
                pontos = list(entidade.get_points())
                
                # Um retângulo tem 4 pontos (ou 5 se o último repetir o primeiro)
                if len(pontos) >= 4:
                    x_coords = [p[0] for p in pontos]
                    y_coords = [p[1] for p in pontos]
                    
                    largura = max(x_coords) - min(x_coords)
                    altura = max(y_coords) - min(y_coords)
                    
                    # Ignora geometrias muito pequenas (não são peças)
                    if largura > 50 and altura > 50:
                        pecas.append({
                            'nome': f"PEÇA_DXF_{entidade.dxf.layer}",
                            'largura_mm': round(largura),
                            'altura_mm': round(altura),
                            'espessura_mm': 18, # Geralmente vem da layer ou texto próximo
                            'material': self.identificar_material(entidade.dxf.layer, ""),
                            'metodo': 'dxf_geometry'
                        })
        except Exception as e:
            print(f"Erro no parsing DXF: {e}")
            
        return pecas

# Script de Teste Rápido
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python parser_tecnico.py caminho_do_arquivo.pdf")
    else:
        parser = CADParser()
        caminho = sys.argv[1]
        ext = os.path.splitext(caminho)[1].lower()
        
        print(f"--- Processando: {caminho} ---")
        
        if ext == '.dxf':
            resultado = parser.parse_dxf(caminho)
        else:
            # Fluxo PDF (Fases 1, 3 e 4)
            resultado = parser.parse_tabelas(caminho)
            if not resultado:
                texto_bruto = parser.extrair_texto_pdf(caminho)
                resultado = parser.parse_pecas(texto_bruto)
            if len(resultado) < 3:
                resultado.extend(parser.parse_cotas_vetoriais(caminho))
        
        print(json.dumps(resultado, indent=4, ensure_ascii=False))
        print(f"\nTotal de peças identificadas: {len(resultado)}")
