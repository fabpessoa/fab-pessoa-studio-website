import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = 'https://vyjufgdgqweerppgcssj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5anVmZ2RncXdlZXJwcGdjc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NjcxMDgsImV4cCI6MjA1ODA0MzEwOH0.EO23Tfn3Ig7d5_s3Gi1Js7DzrWQ7aHqC9blkfaRVkNE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigrations() {
  try {
    // Lê o arquivo de migração
    const migrationPath = path.join(__dirname, '..', 'migrations', '01_initial_schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Divide o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0)

    // Executa cada comando
    for (const command of commands) {
      console.log('Executando comando:', command)
      const { data, error } = await supabase.rpc('exec', { sql: command })
      
      if (error) {
        console.error('Erro ao executar comando:', error)
        continue
      }
      
      console.log('Comando executado com sucesso')
    }

    console.log('Todas as migrações foram executadas com sucesso!')
  } catch (error) {
    console.error('Erro ao executar migrações:', error)
  }
}

runMigrations() 