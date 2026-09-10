// build-dist.js - Empaqueta la extensión para Chrome y Firefox lista para distribuir
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

// Asegurar que exista la carpeta dist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function buildTarget(browser) {
  console.log(`\n📦 Empaquetando para ${browser.toUpperCase()}...`);
  const stagingDir = path.join(distDir, `staging-${browser}`);

  // Limpiar staging anterior si existe
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // 1. Copiar manifiesto correspondiente
  const manifestSource = path.join(rootDir, `manifest.${browser}.json`);
  const manifestDest = path.join(stagingDir, 'manifest.json');
  fs.copyFileSync(manifestSource, manifestDest);

  // 2. Copiar archivos raíz necesarios
  const coreFiles = ['background.js', 'content.js', 'offline_dict.js'];
  for (const file of coreFiles) {
    fs.copyFileSync(path.join(rootDir, file), path.join(stagingDir, file));
  }

  // 3. Copiar carpetas necesarias
  const copyDir = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyDir(path.join(rootDir, 'icons'), path.join(stagingDir, 'icons'));
  copyDir(path.join(rootDir, 'popup'), path.join(stagingDir, 'popup'));

  // 4. Crear archivo ZIP
  const version = JSON.parse(fs.readFileSync(manifestSource, 'utf8')).version;
  const zipName = `lector-ingles-${browser}-v${version}.zip`;
  const zipPath = path.join(distDir, zipName);

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Comprimir usando zip de macOS / Linux
  try {
    execSync(`cd "${stagingDir}" && zip -r "${zipPath}" . -x "*.DS_Store"`, { stdio: 'ignore' });
    console.log(`✅ Archivo generado con éxito: dist/${zipName}`);
  } catch (err) {
    console.error(`❌ Error al comprimir para ${browser}:`, err.message);
  }

  // Limpiar carpeta staging
  fs.rmSync(stagingDir, { recursive: true, force: true });
}

const target = process.argv[2] || 'all';

if (target === 'chrome' || target === 'all') {
  buildTarget('chrome');
}
if (target === 'firefox' || target === 'all') {
  buildTarget('firefox');
}

console.log('\n🎉 ¡Compilación completada! Los archivos ZIP están listos en la carpeta /dist');
