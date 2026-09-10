const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite web worker mengimpor wa-sqlite.wasm; Metro default tidak
// mengenali ekstensi .wasm sebagai asset sehingga bundling web gagal.
config.resolver.assetExts.push('wasm');

module.exports = config;
