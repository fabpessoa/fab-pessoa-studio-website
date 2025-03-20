import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vyjufgdgqweerppgcssj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5anVmZ2RncXdlZXJwcGdjc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NjcxMDgsImV4cCI6MjA1ODA0MzEwOH0.EO23Tfn3Ig7d5_s3Gi1Js7DzrWQ7aHqC9blkfaRVkNE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1)
    
    if (error) {
      console.error('Erro na conexão:', error.message)
      return
    }
    
    console.log('Conexão bem sucedida!')
    console.log('Dados:', data)
  } catch (err) {
    console.error('Erro:', err.message)
  }
}

testConnection() 