import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const { handleAIChat } = await import('./src/api-lib/ai-chat.ts');
  const req = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.APP_PIN}`
    },
    body: {
      message: "QUAIS ITENS TENHO EM ESTOQUE?",
      agentMode: "engenharia",
      conversation_history: [],
      context: {}
    }
  };

  const res = {
    status: (code) => {
      console.log("Status:", code);
      return {
        json: (data) => console.log("JSON:", JSON.stringify(data, null, 2)),
        end: () => console.log("End")
      };
    }
  };

  await handleAIChat(req, res);
}

run().catch(console.error);
