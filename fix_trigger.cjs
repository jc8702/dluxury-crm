require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  await sql`
    CREATE OR REPLACE FUNCTION atualizar_timestamp_retalho()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  console.log('Trigger fixed.');
}
run();
