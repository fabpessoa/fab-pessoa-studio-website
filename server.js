import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Adicionar headers CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Explicitly handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/x-icon');
    res.sendFile(join(__dirname, 'favicon.ico'));
});

app.get('/Design%20System/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/x-icon');
    res.sendFile(join(__dirname, 'Design System', 'favicon.ico'));
});

// Set proper MIME types for favicons
app.use((req, res, next) => {
    if (req.path.endsWith('.ico')) {
        res.type('image/x-icon');
    } else if (req.path.endsWith('.png') && req.path.includes('favicon')) {
        res.type('image/png');
    }
    next();
});

// Servir arquivos estáticos com cache-control
app.use(express.static('.', {
    maxAge: '1y',
    setHeaders: (res, path) => {
        if (path.includes('node_modules')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Servir node_modules especificamente
app.use('/node_modules', express.static(join(__dirname, 'node_modules'), {
    maxAge: '1y',
    immutable: true
}));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Design System route
app.get('/design-system', (req, res) => {
    res.sendFile(join(__dirname, 'Design System', 'index.html'));
});

// Iniciar servidor
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
    });
}

// Exportar para Vercel
export default app; 