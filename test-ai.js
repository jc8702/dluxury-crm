import { generateText, tool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import dotenv from 'dotenv';
dotenv.config();
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;

const modelFlash = google('gemini-2.5-flash');

const chatTools = {
  cadastrarMaterial: tool({
    description: 'Cadastra material',
    parameters: z.object({
      nome: z.string(),
      descricao: z.string()
    }),
    execute: async (args) => {
      console.log('TOOL CALL EXECUTED WITH ARGS:', args);
      return { success: true, sku: 'SKU-0001' };
    }
  })
};

async function run() {
  const systemPrompt = `Você é o Copilot. IMPORTANTE: SE ele pedir para adicionar, VOCÊ TEM que acionar a ferramenta 'cadastrarMaterial'. SEMPRE ACIONE a Tool.`;
  const messagesArray = [{ role: 'user', content: 'cadastre: MDF BP CARVALHO DIAN 15MM 2,75X1,85 2F DURATEX' }];
  
  const aiConfig = { 
    tools: chatTools, 
    maxSteps: 5, 
    system: systemPrompt,
    messages: messagesArray 
  };
  console.log('Calling generateText...');
  const res = await generateText({ model: modelFlash, ...aiConfig }).catch(console.error);
  if(res) {
    console.log('Result text:', res.text);
    console.log('Tool calls:', res.toolCalls);
    console.log('Tool results:', res.toolResults);
    if(res.steps) {
       res.steps.forEach((s, i) => {
         console.log(`Step ${i} text:`, s.text, 'toolCalls:', s.toolCalls?.map(t=>t.toolName));
       });
    }
  }
}
run();
