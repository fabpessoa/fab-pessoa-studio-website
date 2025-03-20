import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static('.'));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Iniciar servidor
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
    });
}

// Exportar para Vercel
export default app; 