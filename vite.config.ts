import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Fontsource の CSS から古い woff 形式の指定を外し、woff2 だけを出力する。
 * woff2 は現在の主要ブラウザすべてが対応しており、公開ファイルの数と容量がおよそ半分になる。
 */
function woff2Only(): Plugin {
  return {
    name: 'woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource') || !id.endsWith('.css')) return null;
      return code.replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, '');
    },
  };
}

// 静的ホスティング前提。サブディレクトリ配信でも動くよう相対パスで出力する。
export default defineConfig({
  base: './',
  plugins: [woff2Only(), react()],
});
