import React, { useState, useEffect, useCallback } from "react";
// react-router-dom: ページ遷移（画面の切り替え）を管理するライブラリです。
// BrowserRouter: アプリ全体をルーター機能で包むためのコンポーネント。
// Routes: 複数のルート（ページ）をまとめる親コンポーネント。
// Route: URLと表示するコンポーネントを紐付ける設定。
// useNavigate: プログラムからページ移動を行いたい時に使う関数（フック）。
// useLocation: 現在のURL情報を取得するための関数。
// useMatch: 特定のURLパターンに一致しているか調べるための関数。
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useMatch } from "react-router-dom";
// react-i18next: 多言語対応（日本語/英語など）を行うためのライブラリ。
import { useTranslation } from 'react-i18next';

// 各ページ・機能のコンポーネントを読み込みます
import Header from "./Header";         // 上部のメニューバー
import MainContent from "./MainContent"; // トップページの中身
import RegisterForm from "./RegisterForm"; // ユーザー登録画面
import LoginForm from "./LoginForm";     // ログイン画面
import PasswordReset from "./PasswordReset"; // パスワードリセット画面
import Welcome from "./Welcome";         // ログイン後のウェルカム画面
import Settings from "./Settings";       // 設定画面
import FAQ from "./FAQ";                 // よくある質問画面
import Footer from "./Footer";           // ページ下部のフッター
import PortfolioBuilder from "./PortfolioBuilder"; // 新しいポートフォリオを作る画面
import Portfolio from "./Portfolio";     // 作成されたポートフォリオを表示する画面
import ProjectPage from "./ProjectPage"; // 個別のプロジェクト詳細ページ
import Tutorial from "./Tutorial";       // 使い方説明ページ
import Maintenance from "./Maintenance"; // メンテナンス中に表示する画面
import AdminPanel from "./AdminPanel";   // 管理者専用の操作画面

// アプリ全体のスタイルシート（CSS）を読み込みます
import '../style/App.css';

// --- AppContentコンポーネント ---
// ここにアプリのメインとなるロジック（仕組み）を書いています。
// <Router>タグの中でしか使えない機能（useNavigateなど）を使うため、
// Appコンポーネントとは別に、このAppContentという部品を作って切り出しています。
function AppContent() {
  // t: 翻訳関数。t('hello') と書くと、設定された言語で「こんにちは」などが返ってきます。
  // i18n: 言語切り替えなどの機能を持つオブジェクト。
  const { t, i18n } = useTranslation();

  // ページ移動をするための navigate 関数を取得します。
  // 例: navigate('/login') と書くとログイン画面に移動します。
  const navigate = useNavigate();

  // 現在開いているページのURL情報を取得します。
  const location = useLocation();

  // --- 状態変数 (State) の定義 ---
  // useStateを使うことで、アプリ内で「変化するデータ」を保存できます。

  // user: 現在ログインしているユーザーの情報を保存します。
  // null なら「ログインしていない状態」を表します。
  const [user, setUser] = useState(null);

  // isLoading: 画面の読み込み中かどうかを管理します。
  // true なら「読み込み中」、false なら「完了」です。初期値は true にしておきます。
  const [isLoading, setIsLoading] = useState(true);

  // language: アプリ全体の現在の言語設定（'ja' や 'en' など）を保存します。
  const [language, setLanguage] = useState(i18n.language);

  // activeTemplate: ポートフォリオページを表示している時に、どのテンプレート（デザイン）を使っているかを保存します。
  // デザインによって背景色などを変えるために使います。
  const [activeTemplate, setActiveTemplate] = useState(null);

  // --- メンテナンスモード関連の状態 ---
  // isMaintenanceMode: サーバーがメンテナンス中かどうか。
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  // maintenanceMessage: メンテナンス画面に表示する管理者からのメッセージ。
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  // scheduledEnd: メンテナンスがいつ終わるかの予定時刻。
  const [scheduledEnd, setScheduledEnd] = useState(null);

  // --- ポートフォリオ表示関連の状態 ---
  // portfolio: 現在表示しようとしているポートフォリオのデータを保存します。
  const [portfolio, setPortfolio] = useState(null);

  // URLが '/portfolio/xxxx' という形になっているかチェックします。
  // xxxx の部分（ID）を取り出すために使います。
  const portfolioMatch = useMatch('/portfolio/:portfolioId/*');
  const portfolioIdFromUrl = portfolioMatch?.params?.portfolioId;

  // --- 関数定義 ---

  // テンプレートが変わった時に呼び出される関数です。
  // useCallbackを使うことで、この関数が無駄に作り直されるのを防ぎ、パフォーマンスを良くしています。
  const handleTemplateChange = useCallback((templateName) => {
    setActiveTemplate(templateName);
  }, []);

  // ポートフォリオのデータをサーバーから取得する重要な関数です。
  const fetchPortfolio = useCallback(async () => {
    // まず、ユーザーがログインしているか確認するために、「トークン」を探します。
    // localStorage（ずっと保存）か sessionStorage（ブラウザ閉じるまで保存）のどちらかにあるはずです。
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // 表示すべきポートフォリオIDを決定します。
    // 基本的にはURLに含まれているID (portfolioIdFromUrl) を使います。
    let currentPortfolioId = portfolioIdFromUrl;

    // もしURLにIDがなくて、でもログインはしている場合（マイページなどから来た場合）
    // 自分のポートフォリオを探しに行きます。
    if (!currentPortfolioId && token) {
      try {
        // サーバーのAPI（/api/user/portfolio）に問い合わせます。
        const response = await fetch(`http://localhost:5000/api/user/portfolio`, {
          headers: { 'Authorization': `Bearer ${token}` }, // 「私はこのユーザーです」という証明書（トークン）を付けます
        });
        if (response.ok) { // 通信成功なら
          const data = await response.json();
          if (data.success) {
            currentPortfolioId = data.portfolioId; // 自分のポートフォリオIDが見つかった！
          }
        }
      } catch (error) {
        console.error("ユーザーのポートフォリオ情報取得時にエラーが発生しました:", error);
      }
    }

    // ポートフォリオIDが特定できたら、その中身（詳細データ）を取りに行きます。
    if (currentPortfolioId) {
      try {
        const headers = {};
        if (token) {
          // 非公開設定のポートフォリオでも、自分自身なら見られるようにトークンを送ります。
          headers['Authorization'] = `Bearer ${token}`;
        }
        // 特定のIDのポートフォリオデータを取得するAPIを呼び出します。
        const response = await fetch(`http://localhost:5000/api/portfolios/${currentPortfolioId}`, {
          headers: headers,
        });
        const data = await response.json();

        if (data.success) {
          // データが取れたら、状態変数にセットして画面に表示できるようにします。
          setPortfolio(data.portfolio);
          // そのポートフォリオで使われているテンプレート（デザイン）を適用します。
          handleTemplateChange(data.portfolio.template);
        } else {
          // 失敗したら（存在しない、見られないなど）、データは空にします。
          setPortfolio(null);
        }
      } catch (error) {
        console.error("ポートフォリオ詳細の取得に失敗しました:", error);
        setPortfolio(null);
      }
    } else {
      // IDがそもそもなければ何もしません。
      setPortfolio(null);
    }
  }, [portfolioIdFromUrl, handleTemplateChange]); // この関数はURLのIDが変わるたびに作り直されます

  // --- 副作用 (useEffect) の設定 ---
  // useEffectは、特定のデータが変わったタイミングで自動的に処理を実行する仕組みです。

  // ポートフォリオIDなどが変わったタイミングで、データを再取得します。
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // ページを移動した時の処理。
  // もしポートフォリオページ「以外」に移動したら、テンプレートのデザイン適用を解除します。
  useEffect(() => {
    if (!location.pathname.startsWith('/portfolio/')) {
      setActiveTemplate(null);
    }
  }, [location]);

  // --- アプリ起動時の初期設定 ---

  // 1. メンテナンス状態のチェック
  // サーバーに「今メンテナンス中ですか？」と聞きに行きます。
  useEffect(() => {
    fetch('http://localhost:5000/api/maintenance-status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsMaintenanceMode(data.isMaintenanceMode); // メンテナンス中かどうかセット
          setMaintenanceMessage(data.maintenanceMessage); // メッセージをセット
          setScheduledEnd(data.scheduledEnd); // 終了予定時刻をセット
        }
      })
      .catch(error => {
        // サーバーが止まっている時などはここでエラーになります。
        console.error('メンテナンス状態の取得に失敗しました:', error);
      });
  }, []); // [] は「最初の1回だけ実行する」という意味です。

  // 2. ログイン状態の復元
  // ブラウザを再読み込みしてもログアウトしないように、保存されたトークンを使ってログイン状態を戻します。
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      // トークンがあれば、それが正しいものかサーバーに確認します。
      fetch('http://localhost:5000/api/verify-token', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // トークンが正しければ、ユーザー情報を復元します。
            const userData = data.user;
            setUser(userData);

            // ユーザーが設定していた言語設定を適用します。
            const userLang = userData.language || 'ja';
            i18n.changeLanguage(userLang);
            setLanguage(userLang);
          } else {
            // トークンが無効（有効期限切れなど）なら、削除してログアウト状態にします。
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
          }
        })
        .catch(error => {
          console.error('トークン検証中にエラーが発生しました:', error);
          // エラー時も安全のためトークンを消します。
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        })
        .finally(() => {
          // 成功しても失敗しても、読み込み処理は「完了」にします。
          setIsLoading(false);
        });
    } else {
      // 最初からトークンがない場合は、すぐに読み込み完了とします。
      setIsLoading(false);
    }
  }, [i18n]);

  // 3. テーマカラー（ダークモード/ライトモード）の適用
  // ユーザーの設定（user.theme）を見て、自動的にCSSクラスを切り替えます。
  useEffect(() => {
    if (user && user.theme) {
      if (user.theme === 'dark') {
        // ダークモードなら body タグに 'dark-theme' クラスを付けます。
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        // ライトモードなら 'light-theme' クラスを付けます。
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }
    } else {
      // ログインしていない、または設定がない場合はデフォルト（ライト）にします。
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [user]); // ユーザー情報（設定）が変わるたびに実行されます。

  // --- イベントハンドラ（ボタンを押した時などの処理） ---

  // ログインが成功した時に呼ばれる関数
  const handleLogin = (userData, token, autoLogin, redirectTo) => {
    // 「自動ログイン」にチェックが入っていれば localStorage（長期間保存）を使います。
    // そうでなければ sessionStorage（ブラウザを閉じるまで）を使います。
    if (autoLogin) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }

    // アプリ上のユーザー情報をセットします。
    setUser(userData);

    // 指定されたページ、またはウェルカムページへ移動します。
    navigate(redirectTo || '/welcome');
  };

  // ログアウトする時に呼ばれる関数
  const handleLogout = () => {
    // ユーザー情報を消します。
    setUser(null);
    // 保存しておいたトークンも全て消します。
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    // トップページへ戻ります。
    navigate('/');
  };

  // ユーザー設定画面で情報が更新された時に呼ばれる関数
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    // もし言語設定が変更されていたら、アプリの言語も切り替えます。
    const newLang = updatedUser.language || 'ja';
    if (language !== newLang) {
      handleLanguageChange(newLang);
    }
  };

  // 言語を切り替える関数
  const handleLanguageChange = (newLang) => {
    i18n.changeLanguage(newLang); // ライブラリに通知
    setLanguage(newLang);       // Reactの状態も更新
  };

  // --- 画面の表示（レンダリング） ---

  // まだデータの読み込み中（初期ロード中）なら、「読み込み中...」とだけ表示して終わります。
  if (isLoading) {
    return <div>{t('loading')}</div>;
  }

  // --- メンテナンスモードのアクセス制御 ---
  // 管理者（特定のメールアドレス）だけは、メンテナンス中でもアクセスできるようにします。
  const isAdmin = user && user.email === 'test.example3030@gmail.com';

  // 条件:
  // 1. メンテナンスモードがONになっている (isMaintenanceMode)
  // 2. 自分が管理者ではない (!isAdmin)
  // 3. 今見ているページが管理者画面ではない (!/admin...)
  // 4. 今見ているページがログイン画面ではない (!/login)
  // これら全てに当てはまる場合、メンテナンス画面を表示して、それ以上先には進ませません。
  if (isMaintenanceMode && !isAdmin && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/login')) {
    return <Maintenance maintenanceMessage={maintenanceMessage} scheduledEnd={scheduledEnd} />;
  }

  // デバッグ用：現在のポートフォリオ状態をコンソールに出力して確認できます。
  console.log("Current portfolio state in App.js:", portfolio);

  // いよいよアプリのメイン画面を作成して返します。
  return (
    // wrapperクラスで全体を包みます。
    // テンプレートが選ばれていれば、そのクラス名（例: 'simple-template'）も追加して、デザインを切り替えます。
    <div className={`wrapper ${activeTemplate ? activeTemplate + '-template' : ''}`}>

      {/* ヘッダー：常に画面の上に表示されるメニューバーです。
          ユーザー情報やログアウト関数、テーマ設定などを渡しています。 */}
      <Header
        user={user}
        onLogout={handleLogout}
        theme={user?.theme || 'light'}
        language={language}
        activeTemplate={activeTemplate}
        portfolio={portfolio}
      />

      {/* ルーティング設定：ここで「どのURLの時に」「どのコンポーネントを表示するか」を決めます。 */}
      <Routes>
        {/* トップページ */}
        <Route path="/" element={<MainContent user={user} theme={user?.theme} />} />

        {/* ユーザー登録ページ */}
        <Route path="/register" element={<RegisterForm theme={user?.theme} />} />

        {/* ログインページ：成功時に handleLogin を呼んでもらうように渡します */}
        <Route path="/login" element={<LoginForm onLogin={handleLogin} theme={user?.theme} />} />

        {/* パスワードリセットページ */}
        <Route path="/password-reset" element={<PasswordReset theme={user?.theme} />} />

        {/* ログイン後のウェルカムページ */}
        <Route path="/Welcome" element={<Welcome theme={user?.theme} />} />

        {/* 設定ページ：様々な変更処理を受け取る関数を渡します */}
        <Route path="/settings" element={
          <Settings
            user={user}
            onUpdateUser={handleUserUpdate}
            onLogout={handleLogout}
            onLanguageChange={handleLanguageChange}
            language={language}
          />
        } />

        {/* よくある質問ページ */}
        <Route path="/faq" element={<FAQ />} />

        {/* チュートリアルページ */}
        <Route path="/tutorial" element={<Tutorial />} />

        {/* ポートフォリオ作成ツール */}
        <Route path="/portfolio-builder" element={<PortfolioBuilder theme={user?.theme} />} />

        {/* ポートフォリオ表示ページ
            :portfolioId の部分は、実際のID（数字など）が入ります。
            onTemplateChangeを渡すことで、ポートフォリオ側から全体のデザインを変更できるようにしています。 */}
        <Route path="/portfolio/:portfolioId" element={
          <Portfolio
            onTemplateChange={handleTemplateChange}
            portfolio={portfolio}
            setPortfolio={setPortfolio}
            fetchPortfolio={fetchPortfolio}
            user={user}
          />
        } />

        {/* ポートフォリオ内のプロジェクト詳細ページ */}
        <Route path="/portfolio/:portfolioId/project/:projectId" element={<ProjectPage user={user} />} />

        {/* 管理者専用パネル */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>

      {/* フッター：常に画面の下に表示されるコピーライトなど */}
      <Footer theme={user?.theme} activeTemplate={activeTemplate} />
    </div>
  );
}

// --- Appコンポーネント（エントリーポイント） ---
// アプリケーションの一番外側の枠組みです。
function App() {
  return (
    // <Router> でアプリ全体を包むことで、ページ遷移の機能が使えるようになります。
    // 中身のロジックは上記の AppContent に任せています。
    <Router>
      <AppContent />
    </Router>
  );
}

// 最後にこのAppコンポーネントをエクスポートして、index.jsなどで使えるようにします。
export default App;