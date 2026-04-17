import { generateText, tool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';

// Injecting the API Key manually if present in env, just reading directly from file
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const keyMatch = envFile.match(/GEMINI_API_KEY=(.*)/);
if (keyMatch) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = keyMatch[1].trim();
}

const modelFlash = google('gemini-2.5-flash');

const chatTools = {
  cadastrarMaterial: tool({
    description: 'Cadastra um novo item de material solto no estoque/catálogo. O sistema irá gerar um SKU automaticamente.',
    parameters: z.object({
      nome: z.string().describe('Nome principal curto e direto. Ex: Chapa MDF Guararapes'),
      descricao: z.string().describe('Toda e qualquer outra informação. Ex: Marca, dimensões, espessura, detalhes. Concatene tudo aqui!'),
      unidade_uso: z.string().optional().describe('Unidade de medida padrão para uso e compra (ex: UN, MT, M2, CX)'),
      preco_custo: z.number().optional().describe('Preço de custo unitário base (usar 0 se não souber)')
    }),
    execute: async (args) => {
      console.log('>>> EXECUTE FOI CHAMADO! <<<', args);
      return { success: true, sku: 'SKU-0001', message: 'INSERIDO' };
    }
  })
};

async function run() {
  const aiConfig = { 
    tools: chatTools, 
    maxSteps: 5, 
    system: "Você é um assistente que cadastra materiais usando a ferramenta cadastrarMaterial sempre que solicitado.",
    messages: [{ role: 'user', content: 'cadastre: MDF BP CARVALHO DIAN 15MM 2,75X1,85 2F DURATEX' }]
  };
  console.log('Chamando generateText...');
  const res = await generateText({ model: modelFlash, ...aiConfig }).catch(err => {
    console.log('NATIVE ERROR:', err);
  });
  if(res) {
    console.log('Result text:', res.text);
    if(res.steps) {
       res.steps.forEach((s, i) => {
         console.log(`Step ${i} text: '${s.text}'`);
         if (s.toolCalls && s.toolCalls.length > 0) {
            console.log(`Step ${i} chamou tools:`, s.toolCalls.map(t=>t.toolName));
         }
         if (s.toolResults && s.toolResults.length > 0) {
            console.log(`Step ${i} teve resultados de tools:`, s.toolResults.map(t=>t.result));
         }
       });
    }
  }
}
run();
