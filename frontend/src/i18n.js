// i18nextのコアライブラリ
import i18n from 'i18next';
// i18nextをReactコンポーネントで使えるようにするためのライブラリ
import { initReactI18next } from 'react-i18next';
// ブラウザの言語設定（`navigator.language`）を自動で検出するためのプラグイン
import LanguageDetector from 'i18next-browser-languagedetector';
// HTTP経由で翻訳ファイル（JSONなど）を非同期に読み込むためのプラグイン
import Backend from 'i18next-http-backend';

i18n
  // .use()でプラグインをi18nextに登録
  .use(Backend) // 翻訳ファイルをHTTPで読み込むBackendプラグイン
  .use(LanguageDetector) // ブラウザの言語設定を検出するプラグイン
  .use(initReactI18next) // i18nextをReactに接続するプラグイン
  
  // i18nextの初期化設定
  .init({
    // デバッグモードを有効にする。コンソールにi18nextの動作ログが出力される
    debug: true,
    
    // fallbackLng: 対応する言語の翻訳ファイルが見つからない場合に、代わりに使われる言語を指定
    fallbackLng: 'en', // ここでは英語(en)をフォールバック言語に設定
    
    interpolation: {
      // ReactはデフォルトでXSS（クロスサイトスクリプティング）対策としてエスケープ処理を行うため、
      // i18next側でのエスケープは不要に設定
      escapeValue: false, 
    },
    
    // Backendプラグインの設定
    backend: {
      // 翻訳ファイルのパスを指定
      // {{lng}}の部分が言語コード（'en', 'ja'など）に置き換えられる
      // 例: /locales/ja/translation.json
      loadPath: '/locales/{{lng}}/translation.json',
    },
  });

// 設定済みのi18nインスタンスをエクスポートして、他のファイルで使えるようにする
export default i18n;
