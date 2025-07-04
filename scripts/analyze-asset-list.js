// scripts/diagnose-images.js (ESM Version)
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURAÇÃO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// CAMINHOS PARA OS ARQUIVOS DE DADOS (IMPORTANTE: COLOQUE OS ARQUIVOS NA RAIZ DO PROJETO)
const PHYSICAL_FILES_LIST_PATH = path.join(projectRoot, 'full_image_list.txt');
const DB_PRODUCT_IMAGES_PATH = path.join(projectRoot, 'SELECT filename, thumbnail_filename FROM product_images WHERE filename IS NOT NULL.json');
const DB_STORE_IMAGES_PATH = path.join(projectRoot, 'SELECT filename, thumbnail_filename FROM store_images WHERE filename IS NOT NULL.json');
const UPLOADS_DIR_IDENTIFIER = 'public/uploads/stores';


// --- FUNÇÕES AUXILIARES ---
async function readLines(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return new Set(data.split('\n').filter(Boolean)); // Usa Set para eficiência
    } catch (error) {
        console.error(`❌ Erro ao ler o arquivo: ${filePath}`, error.message);
        return new Set();
    }
}

async function readJson(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ Erro ao ler o arquivo JSON: ${filePath}`, error.message);
        return [];
    }
}

function getDbPaths(dbRecords) {
    const paths = new Set();
    for (const record of dbRecords) {
        if (record.filename) {
            // Constrói o caminho relativo como aparece no full_image_list.txt
            const fullPath = path.join(UPLOADS_DIR_IDENTIFIER, record.filename).replace(/\\/g, '/');
            paths.add(fullPath);
        }
        if (record.thumbnail_filename) {
            const thumbPath = path.join(UPLOADS_DIR_IDENTIFIER, record.thumbnail_filename).replace(/\\/g, '/');
            paths.add(thumbPath);
        }
    }
    return paths;
}


// --- LÓGICA PRINCIPAL DO DIAGNÓSTICO ---
async function runDiagnosis() {
    console.log('--- 🚀 Iniciando Diagnóstico Seguro de Imagens ---');

    // Carregar todos os dados
    const physicalFiles = await readLines(PHYSICAL_FILES_LIST_PATH);
    const productImagesDb = await readJson(DB_PRODUCT_IMAGES_PATH);
    const storeImagesDb = await readJson(DB_STORE_IMAGES_PATH);
    const dbImages = getDbPaths([...productImagesDb, ...storeImagesDb]);

    // Categorias para o relatório
    const results = {
        validSystemImages: [],
        potentialOrphans: [],
        protectedAssets: [],
        brokenDbRecords: [],
    };

    // 1. Classificar arquivos físicos
    for (const file of physicalFiles) {
        const isSystemUpload = file.startsWith(UPLOADS_DIR_IDENTIFIER);
        if (isSystemUpload) {
            if (dbImages.has(file)) {
                results.validSystemImages.push(file);
            } else {
                results.potentialOrphans.push(file);
            }
        } else {
            results.protectedAssets.push(file);
        }
    }

    // 2. Encontrar registros quebrados no banco
    for (const dbImage of dbImages) {
        if (!physicalFiles.has(dbImage)) {
            results.brokenDbRecords.push(dbImage);
        }
    }

    // 3. Imprimir o Relatório
    console.log("\n\n--- ✅ RELATÓRIO DE DIAGNÓSTICO ---\n");
    console.log(`📊 Total de arquivos físicos analisados: ${physicalFiles.size}`);
    console.log(`🗃️ Total de registros de imagem no banco: ${dbImages.size}`);
    console.log("\n---------------------------------------\n");

    console.log(`✅ IMAGENS DE SISTEMA VÁLIDAS (${results.validSystemImages.length})`);
    console.log("   (Arquivos em 'public/uploads/stores/' que estão corretamente no banco)\n");


    console.log(`🎯 IMAGENS POTENCIALMENTE ÓRFÃS (${results.potentialOrphans.length})`);
    console.log("   (Arquivos em 'public/uploads/stores/' SEM registro no banco. Candidatos à limpeza.)");
    results.potentialOrphans.forEach(f => console.log(`   - ${f}`));
    console.log("\n");

    console.log(`🛡️ ASSETS PROTEGIDOS (${results.protectedAssets.length})`);
    console.log("   (Arquivos fora da pasta de uploads, como prints e outros assets. Serão ignorados.)");
    results.protectedAssets.forEach(f => console.log(`   - ${f}`));
    console.log("\n");

    console.log(`🔍 REGISTROS QUEBRADOS NO BANCO (${results.brokenDbRecords.length})`);
    console.log("   (Registros no banco que apontam para arquivos que NÃO existem mais.)");
    results.brokenDbRecords.forEach(f => console.log(`   - ${f}`));
    console.log("\n");

    console.log("--- 🏁 Diagnóstico Concluído. Nenhum arquivo foi modificado. ---");
}

runDiagnosis();