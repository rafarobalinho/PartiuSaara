// scripts/list-all-images.js (Versão Corrigida com import)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Em ES Modules, __dirname não existe por padrão. Esta é a forma correta de obtê-lo.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..'); // Sobe um nível de 'scripts' para a raiz

async function findImageFiles(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            // Ignora pastas que não são relevantes
            if (dirent.name !== 'node_modules' && dirent.name !== '.git') {
                await findImageFiles(fullPath);
            }
        } else {
            if (/\.(jpg|jpeg|png|webp)$/i.test(fullPath)) {
                // Imprime o caminho relativo à raiz do projeto
                console.log(path.relative(projectRoot, fullPath));
            }
        }
    }
}

findImageFiles(projectRoot).catch(console.error);