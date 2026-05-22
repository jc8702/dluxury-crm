import 'dotenv/config';
import { db } from '../../api-lib/drizzle-db.js';
import { conhecimentoMarcenaria } from '../schema/conhecimento.js';

const CONHECIMENTO_ITEMS = [
  {
    titulo: 'Ergonomia e Alturas de Bancadas de Cozinha',
    categoria: 'ergonomia',
    conteudo: 'A altura padrão recomendada para bancadas de cozinha no Brasil varia entre 85 cm e 93 cm (sendo 90 cm a média ideal), a depender da estatura dos usuários. Essa medida deve considerar a soma do rodapé de alvenaria/MDF (geralmente 10 a 15 cm), o corpo do móvel (70 a 75 cm) e a espessura da pedra de granito ou quartzo (2 a 4 cm). Bancadas muito baixas causam dores lombares, enquanto bancadas muito altas prejudicam a articulação dos ombros durante a preparação de alimentos. Em pias de lavagem, o fundo da cuba deve permitir que o usuário apoie as mãos sem curvar excessivamente a coluna.',
  },
  {
    titulo: 'Folgas Laterais e Instalação de Gavetas e Corrediças',
    categoria: 'ferragens',
    conteudo: 'Para corrediças telescópicas padrão, é mandatória uma folga lateral livre de 13 mm de cada lado (total de 26 mm de redução na largura da gaveta em relação ao vão interno livre do armário). Se a folga for inferior a 12.5 mm, a corrediça travará ou apresentará atrito severo; se for superior a 13.5 mm, a gaveta poderá descarrilar ou apresentar folga excessiva com risco de queda. Para corrediças ocultas (invisíveis) com amortecedor, a folga lateral requerida costuma ser de 5 mm de cada lado, mas exige um rebaixo inferior de 12 mm na base da gaveta e usinagem traseira para acoplamento dos gatilhos de engate rápido.',
  },
  {
    titulo: 'Flambagem e Dimensionamento de Prateleiras em MDF 15mm vs 18mm',
    categoria: 'engenharia',
    conteudo: 'A resistência à flexão (flambagem) de prateleiras depende diretamente da espessura da chapa e do vão livre (largura do armário). Para MDF de 15mm, o vão máximo recomendado para prateleiras sem reforço estrutural é de 65 cm sob carga leve (roupas, toalhas) e 55 cm para cargas pesadas (livros, mantimentos, louças). Para MDF de 18mm, o vão livre pode se estender até 80 cm para cargas normais. Vãos maiores que esses limites exigem o uso de travessas frontais ou traseiras de MDF (reforço em L), engrossos para 30mm, suportes intermediários (tucanos/pinos de apoio adicionais) ou fixação mecânica nas laterais e no fundo para evitar o envergamento permanente da chapa.',
  },
  {
    titulo: 'Posicionamento e Distâncias Ergonômicas para Armários Aéreos',
    categoria: 'ergonomia',
    conteudo: 'Os armários aéreos de cozinha devem ser instalados com a base respeitando uma distância mínima de 50 cm a 60 cm em relação à bancada de trabalho para permitir uma área de trabalho livre e evitar colisões com a cabeça. O alinhamento superior padrão dos aéreos costuma ser a 210 cm ou 220 cm do piso acabado, coincidindo com a altura de portas e portais. A profundidade máxima recomendada para os aéreos é de 35 cm (incluindo as portas), garantindo que o usuário tenha visibilidade total da bancada e não bata a testa ao se inclinar para a frente.',
  },
  {
    titulo: 'Ventilação e Nichos para Fornos de Embutir e Micro-ondas',
    categoria: 'engenharia',
    conteudo: 'Forno elétrico e forno a gás de embutir geram calor intenso que pode danificar o MDF, descolar fitas de borda e até causar risco de incêndio se não houver ventilação adequada. O nicho do forno deve prever uma folga traseira livre de pelo menos 5 cm para circulação de ar quente e aberturas na base (respiro no rodapé) e no topo para efeito chaminé. Painéis laterais adjacentes ao forno devem ser protegidos com defletores de calor metálicos ou as fitas de borda devem ser coladas com adesivo PUR (poliuretano), que possui maior resistência térmica que o Hotmelt convencional. O micro-ondas requer folga de pelo menos 5 cm nas laterais e topo.',
  },
  {
    titulo: 'Sistemas de Fixação e Carga Máxima em Armários Suspensos (Aéreos)',
    categoria: 'engenharia',
    conteudo: 'A fixação de módulos aéreos pesados deve ser feita com cantoneiras de aço reforçadas (2 ou 4 furos) com capa plástica de acabamento, ou por meio de perfis de fixação ocultos em alumínio tipo "mão de amigo". Cada par de cantoneiras metálicas suporta, em média, de 60 kg a 80 kg de carga estática se fixado corretamente. É essencial utilizar buchas de nylon adequadas ao tipo de parede: bucha UX ou específica para drywall/gesso acartonado, bucha MU para tijolos ocos, e buchas de expansão mecânica para concreto. Os parafusos de fixação na parede devem ser de rosca soberba com diâmetro mínimo de 5.0 mm e comprimento penetrante de pelo menos 60 mm.',
  },
  {
    titulo: 'Especificações para Banheiros e Áreas Úmidas (MDF Ultra)',
    categoria: 'materiais',
    conteudo: 'Gabinetes de banheiro e módulos sob pias de lavanderia são expostos a umidade constante, respingos de água e vapores. Nesses ambientes, o uso de MDF padrão (comum) é inadequado, pois as fibras de madeira incham e se desintegram rapidamente ao absorver água por capilaridade. Recomenda-se o uso exclusivo de MDF Ultra / Hidrófugo (que possui resinas repelentes à água e coloração esverdeada no miolo) ou compensado naval tratado. Além disso, todas as bordas expostas ou usinadas devem receber fitamento completo com cola PUR e os encontros de chapas devem ser vedados com silicone de cura neutra.',
  },
  {
    titulo: 'Cálculo de Pistões a Gás para Portas Basculantes',
    categoria: 'ferragens',
    conteudo: 'O dimensionamento do pistão a gás para portas basculantes depende do peso da porta (calculado com base nas dimensões de largura, altura e espessura do MDF) e da altura da porta. A força do pistão é medida em Newtons (N). Como regra prática de marcenaria brasileira: portas de MDF 15mm de 80x40 cm utilizam pistão de 60N ou 80N. Pistões sobredimensionados (ex: usar 120N em porta leve) exercem força excessiva, dificultando o fechamento e forçando as dobradiças até arrancá-las do MDF. Pistões subdimensionados não mantêm a porta aberta. Em portas com largura superior a 70 cm, é obrigatório o uso de dois pistões instalados simetricamente para evitar empenamento e torção da folha.',
  },
  {
    titulo: 'Armários de Canto e Distanciadores para Portas e Puxadores',
    categoria: 'engenharia',
    conteudo: 'Em armários de canto reto (canto L), o maior erro de engenharia é posicionar portas e puxadores diretamente no limite do encontro das chapas. Sem um distanciador (fechamento ou montante de canto), os puxadores das duas portas colidirão na abertura de 90 graus, impedindo o acesso completo ao móvel. Recomenda-se a instalação de um montante fixo de fechamento em MDF de no mínimo 50 mm a 70 mm em cada face do canto interno. Isso garante o afastamento necessário para que as portas abram sem interferência mútua, respeitando a projeção física dos puxadores (especialmente puxadores alça ou perfil gola).',
  },
  {
    titulo: 'Diferenças de Aplicação entre MDF e MDP na Indústria Moveleira',
    categoria: 'materiais',
    conteudo: 'MDF (Medium Density Fiberboard) é composto por fibras finas de madeira compactadas, resultando em uma chapa homogênea, ideal para usinagens profundas, entalhes, cantos arredondados e pintura/laca. MDP (Medium Density Particleboard) é constituído por partículas de madeira dispostas em camadas (as mais finas nas superfícies e as maiores no miolo), conferindo-lhe maior resistência estrutural contra empenamento, menor peso físico e excelente estabilidade para peças retas (como laterais, bases, prateleiras e portas retas). MDP segura melhor o parafuso no sentido de extração física em relação ao MDF, mas não aceita usinagem de baixo-relevo.',
  },
  {
    titulo: 'Sistemas de União de Chapas: Girofix, Cavilhas e Soberba',
    categoria: 'engenharia',
    conteudo: 'A união de componentes estruturais de móveis pode ser feita por três métodos principais: 1) Cavilhas de madeira (geralmente diâmetro de 8mm), que servem para alinhar e travar o cisalhamento das peças; 2) Parafuso Soberba (4.0x50mm ou 5.0x50mm), ideal para fixação direta, rápida e de alta resistência mecânica, necessitando de pré-furo com broca de 3.2mm para não rachar o MDF; 3) Dispositivos Minifix/Girofix (tambor + pino), ideais para móveis desmontáveis (RTA), que exigem usinagem precisa com broca de 15mm na face e furação de topo, proporcionando fixação invisível do lado externo.',
  },
  {
    titulo: 'Vãos de Portas de Giro e Alinhamento de Dobradiças',
    categoria: 'ferragens',
    conteudo: 'As portas de giro devem ter uma folga de 2 mm a 3 mm entre si e em relação às laterais ou tampo do armário para permitir a regulagem fina e evitar atrito. Dobradiças tipo caneco (geralmente de 35 mm de diâmetro) exigem uma distância de furação da borda da porta (distância do copo) entre 3 mm e 5 mm. O número de dobradiças por porta depende do peso e da altura física: até 90 cm de altura bastam 2 dobradiças; de 90 cm a 160 cm usam-se 3 dobradiças; acima de 160 cm são necessárias 4 ou 5 dobradiças para mitigar o empenamento natural do MDF causado por variações de umidade e temperatura.',
  },
  {
    titulo: 'Fitas de Borda PVC, ABS e Acrílico',
    categoria: 'materiais',
    conteudo: 'Fitas de borda protegem o miolo do MDF/MDP contra umidade externa e impactos mecânicos. Para frentes de gavetas, portas e tampos de móveis, é obrigatória a aplicação de fitas de borda com espessura de 1 mm a 2 mm em PVC ou ABS, pois oferecem alta resistência a impactos cotidianos. Para as partes internas de módulos e prateleiras estruturais, fitas finas de 0,45 mm são suficientes e econômicas. O fitamento de bordas superiores em áreas úmidas deve ser total para mitigar o inchaço do MDF.',
  },
  {
    titulo: 'Tecnologia de Colagem: PUR vs Hotmelt',
    categoria: 'materiais',
    conteudo: 'A colagem de fitas de borda na indústria moveleira utiliza principalmente dois adesivos: Hotmelt tradicional (à base de EVA ou Poliolefina) e PUR (Poliuretano Reativo). O Hotmelt é termoplástico, ou seja, pode amolecer se exposto a temperaturas acima de 70°C, tornando-o inadequado para laterais adjacentes a fornos e cooktops. O adesivo PUR cura quimicamente por reação com a umidade do ar, criando uma ligação cruzada irreversível que resiste a até 150°C e impede a infiltração de água por capilaridade. A colagem PUR gera uma linha de cola quase invisível e é recomendada para cozinhas e banheiros.',
  },
  {
    titulo: 'Dobradiças Especiais e Ângulos de Abertura',
    categoria: 'ferragens',
    conteudo: 'Armários planejados com cantos complexos exigem dobradiças específicas para garantir a abertura correta das portas sem colisões. Dobradiças de 45° são usadas em módulos com chanfros de canto. Dobradiças de 135° (ou dobradiças de canto L) articulam portas em ângulo para fechamento total. A dobradiça de 165° (abertura total) é obrigatória em módulos com gavetas internas livres, permitindo que a porta abra totalmente para fora do vão do armário, evitando que a frente das gavetas colida com o perfil da porta regulada. As dobradiças modernas contam com amortecimento integrado (sistema click) para fechamento suave.',
  },
  {
    titulo: 'Sistemas de Corrediças Ocultas e Invisíveis',
    categoria: 'ferragens',
    conteudo: 'Corrediças invisíveis (ocultas) são instaladas sob o fundo da gaveta, mantendo as laterais limpas e valorizando o design. Elas oferecem melhor estabilidade de movimento e maior capacidade de carga (geralmente entre 30 kg e 45 kg) em comparação com as telescópicas tradicionais de 13mm. Exigem folga lateral específica de 5 mm de cada lado, além de rebaixo inferior de 12 mm na base da gaveta e usinagem traseira precisa para acoplamento dos gatilhos de regulagem tridimensional (altura, lateral e inclinação). Estão disponíveis com fechamento amortecido suave ou sistema de toque (push-to-open).',
  },
  {
    titulo: 'Sistemas de Montagem Minifix/VB e Dispositivos Invisíveis',
    categoria: 'engenharia',
    conteudo: 'O sistema de união de chapas Minifix (tambor de 15mm e pino de fixação) e o sistema VB (dispositivo de união rápida) permitem a montagem invisível de módulos, dispensando o uso de parafusos aparentes nas laterais externas dos armários. São essenciais para móveis desmontáveis (RTA). O Minifix exige furação com broca de 15 mm na face da peça com profundidade de 12.5 mm, e furo de topo de 8 mm para passagem do pino. O VB utiliza um tambor metálico embutido na prateleira que se acopla ao pino fixado na lateral, ideal para prateleiras estruturais suspensas de alta carga.',
  },
  {
    titulo: 'Pistões Basculantes de Abertura Dupla e Aventos',
    categoria: 'ferragens',
    conteudo: 'Portas basculantes de grandes dimensões (largura superior a 90 cm) instaladas em armários aéreos altos exigem sistemas de articulação de abertura dupla (como o sistema Aventos ou similares), onde a porta se divide horizontalmente ao meio durante a abertura. Isso reduz a projeção da porta para frente, facilitando o acesso ao interior do armário sem que o usuário precise se esquivar do móvel. Estes sistemas exigem braços articulados simétricos e regulagem fina da tensão das molas de acordo com a massa calculada do MDF, evitando desgaste prematuro das dobradiças superiores.',
  },
];

function getSimulatedEmbedding(text: string): number[] {
  const vector: number[] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  
  let seedVal = Math.abs(hash) || 1;
  for (let i = 0; i < 768; i++) {
    seedVal = (seedVal * 9301 + 49297) % 233280;
    const value = (seedVal / 233280) * 2 - 1; // entre -1 e 1
    vector.push(value);
  }
  
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text }]
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do Gemini (${response.status}): ${errorText}`);
  }

  const result = await response.json() as any;
  const values = result?.embedding?.values;
  if (!values || values.length !== 768) {
    throw new Error(`Tamanho de vetor retornado inválido. Esperado 768, recebido: ${values?.length}`);
  }
  return values;
}

async function seed() {
  /* console.log('--- INICIANDO SEEDING DA BASE DE CONHECIMENTO VETORIAL RAG ---') */;

  if (!db) {
    console.error('❌ Erro: Conexão com o banco de dados (db) não pôde ser estabelecida ou DATABASE_URL está vazia.');
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  let useSimulation = false;

  if (!apiKey) {
    console.warn('⚠️ Aviso: Chave de API do Gemini (GEMINI_API_KEY) ausente. Usando embeddings simulados.');
    useSimulation = true;
  }

  try {
    /* console.log('Limpando dados antigos da base de conhecimento para evitar duplicados...') */;
    await db.delete(conhecimentoMarcenaria);
    /* console.log('Tabela limpa com sucesso!') */;

    /* console.log(`Populando ${CONHECIMENTO_ITEMS.length} tópicos na base de marcenaria...`) */;

    let _inseridos = 0;
    for (let i = 0; i < CONHECIMENTO_ITEMS.length; i++) {
      const item = CONHECIMENTO_ITEMS[i];
      const textToEmbed = `${item.titulo}\n\n${item.conteudo}`;
      
      let vector: number[];
      if (useSimulation) {
        vector = getSimulatedEmbedding(textToEmbed);
      } else {
        try {
          vector = await getEmbedding(textToEmbed, apiKey);
        } catch (apiError: any) {
          console.warn(`⚠️ Falha ao obter embedding real via API para "${item.titulo}": ${apiError.message}`);
          console.warn('🔄 Fazendo fallback para embedding simulado para este item.');
          vector = getSimulatedEmbedding(textToEmbed);
        }
      }

      await db.insert(conhecimentoMarcenaria).values({
        titulo: item.titulo,
        categoria: item.categoria,
        conteudo: item.conteudo,
        embedding: vector,
      });
      
      _inseridos++;
      /* console.log(`✅ [${_inseridos}/${CONHECIMENTO_ITEMS.length}] Gravado no Neon Postgres: "${item.titulo}"`) */;
    }

    /* console.log('🎉 Seeding do banco de RAG concluído com sucesso!') */;
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o seeding:', error);
    process.exit(1);
  }
}

seed();

