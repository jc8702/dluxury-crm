
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkProjects() {
  try {
    const projects = await sql`SELECT * FROM projects LIMIT 10`;
    console.log('Projects found:', projects.length);
    console.log(JSON.stringify(projects, null, 2));
    
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
    `;
    console.log('Columns in projects table:', columns.map(c => c.column_name).join(', '));
  } catch (error) {
    console.error('Error checking projects:', error);
  }
}

checkProjects();
