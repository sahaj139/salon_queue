import express from 'express';
import { fileURLToPath } from 'node:url';
import { api } from './api.js';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const app = express();
app.use(api);
app.use(express.static(dist));
app.get('/{*path}', (req, res) => res.sendFile('index.html', { root: dist })); // SPA routes like /reception
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Salon Queue running on http://localhost:${port}`));
