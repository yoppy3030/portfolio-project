// Reactライブラリと、非同期処理（翻訳ファイルの読み込みなど）を扱うためのSuspenseをインポート
import React, { Suspense } from 'react';
// ReactアプリケーションをブラウザのDOMにレンダリングするためのライブラリ
import ReactDOM from 'react-dom/client';
// グローバルなスタイルシート
import './index.css';
// アプリケーションのメインコンポーネント
import App from './components/App';
// 多言語対応ライブラリi18nextの初期化ファイルをインポート（このファイルを読み込むことでi18nが設定される）
import './i18n';

// public/index.htmlにあるid='root'のDOM要素を取得
const rootElement = document.getElementById('root');
// 取得したDOM要素をReactのルートとして作成
const root = ReactDOM.createRoot(rootElement);

// Reactアプリケーションのレンダリングを実行
root.render(
  // <React.StrictMode>は、開発モード時に潜在的な問題を検出するためのヘルパーコンポーネント
  <React.StrictMode>
    {/* 
      <Suspense>は、内部のコンポーネントがまだ表示準備できていない（例：翻訳ファイルの読み込み中）場合に、
      fallbackで指定されたUI（ここでは"loading..."というテキスト）を表示するためのコンポーネント
    */}
    <Suspense fallback="loading...">
      <App />
    </Suspense>
  </React.StrictMode>
);