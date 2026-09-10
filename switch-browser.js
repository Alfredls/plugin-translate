// switch-browser.js - Utility to swap manifest between Chrome and Firefox
const fs = require('fs');
const path = require('path');

const target = (process.argv[2] || 'chrome').toLowerCase();

if (target === 'firefox') {
  if (fs.existsSync('manifest.firefox.json')) {
    fs.copyFileSync('manifest.firefox.json', 'manifest.json');
    console.log('✅ Manifest configurado para Mozilla Firefox.');
  } else {
    console.error('❌ No se encontró manifest.firefox.json');
  }
} else if (target === 'chrome') {
  if (fs.existsSync('manifest.chrome.json')) {
    fs.copyFileSync('manifest.chrome.json', 'manifest.json');
    console.log('✅ Manifest configurado para Google Chrome.');
  } else {
    console.log('✅ Manifest actual ya configurado para Google Chrome.');
  }
} else {
  console.log('Uso: node switch-browser.js [chrome|firefox]');
}
