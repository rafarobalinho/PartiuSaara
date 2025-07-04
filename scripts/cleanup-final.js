// scripts/cleanup-final.js (v4 - Basename Fix)
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { db } from '../server/db.js';
import { productImages, storeImages } from '../shared/schema.js';

// --- CONFIGURAÇÃO ---
const projectRoot = process.cwd();
const UPLOADS_DIR = path.join(projectRoot, 'public', 'uploads', 'stores');
const BACKUP_DIR = path.join(projectRoot, 'backups', `orphan-backup-${Date.now()}`);

// --- FUNÇÕES AUXILIARES ---
async function findImageFiles(dir) {
    // Mapeia o nome do arquivo para seu caminho completo
    const fileMap = new Map(); 
    try {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of dirents) {
            const fullPath = path.join(dir, dirent.name);
            if (dirent.isDirectory()) {
                const nestedFiles = await findImageFiles(fullPath);
                nestedFiles.forEach((p, name) => fileMap.set(name, p));
            } else if (/\.(jpg|jpeg|png|webp)$/i.test(fullPath)) {
                fileMap.set(path.basename(fullPath), fullPath);
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') console.error(`Erro ao ler diretório ${dir}:`, error);
    }
    return fileMap;
}

async function getDatabaseImageBasenames() {
    const dbBasenames = new Set();
    const pImages = await db.select().from(productImages);
    const sImages = await db.select().from(storeImages);

    const addBasenames = (record) => {
        if (record.filename) dbBasenames.add(path.basename(record.filename));
        if (record.thumbnailFilename) dbBasenames.add(path.basename(record.thumbnailFilename));
    };

    pImages.forEach(addBasenames);
    sImages.forEach(addBasenames);
    return dbBasenames;
}

// --- LÓGICA PRINCIPAL ---
async function runCleanup() {
    console.log('--- 🚀 Iniciando Limpeza Segura de Imagens Órfãs (v4 - Final) ---');
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const shouldBackup = !isDryRun;

    const physicalImageMap = await findImageFiles(UPLOADS_DIR);
    const dbImageBasenames = await getDatabaseImageBasenames();

    const orphanFullPaths = [];
    physicalImageMap.forEach((fullPath, basename) => {
        if (!dbImageBasenames.has(basename)) {
            orphanFullPaths.push(fullPath);
        }
    });

    console.log(`\n📊 Análise Definitiva:`);
    console.log(`   - Arquivos físicos encontrados: ${physicalImageMap.size}`);
    console.log(`   - Imagens (nomes) registradas no banco: ${dbImageBasenames.size}`);
    console.log(`   - 🎯 Imagens órfãs para remover: ${orphanFullPaths.length}`);

    if (orphanFullPaths.length === 0) {
        console.log('\n✅ Nenhuma imagem órfã encontrada. Sistema limpo!');
        return;
    }

    console.log('\n📋 Lista de arquivos a serem removidos:');
    orphanFullPaths.forEach(p => console.log(`   - ${path.relative(projectRoot, p)}`));

    if (isDryRun) {
        console.log('\n\n--- 🛡️ MODO DRY-RUN ---');
        console.log('Nenhum arquivo foi modificado. Execute "npm run images:clean" para limpar.');
        return;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question(`\n⚠️ Confirma a REMOÇÃO de ${orphanFullPaths.length} arquivos? (s/N) `, resolve));
    rl.close();

    if (answer.toLowerCase() !== 's') {
        console.log('\n❌ Operação cancelada pelo usuário.');
        return;
    }

    if (shouldBackup) {
        console.log(`\n📦 Fazendo backup para ${path.relative(projectRoot, BACKUP_DIR)}...`);
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        for (const orphanPath of orphanFullPaths) {
            const backupPath = path.join(BACKUP_DIR, path.basename(orphanPath));
            await fs.copyFile(orphanPath, backupPath);
        }
        console.log('   - Backup concluído!');
    }

    console.log('\n🗑️ Removendo arquivos órfãos...');
    let deletedCount = 0;
    for (const orphanPath of orphanFullPaths) {
        try {
            await fs.unlink(orphanPath);
            deletedCount++;
        } catch (error) {
            console.error(`   - Erro ao remover ${orphanPath}:`, error);
        }
    }
    console.log(`\n\n--- ✨ Limpeza Concluída: ${deletedCount} de ${orphanFullPaths.length} arquivos removidos. ---`);
}

runCleanup().catch(error => {
    console.error("\n--- 💥 ERRO CRÍTICO ---");
    console.error(error);
    process.exit(1);
});