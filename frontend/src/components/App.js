// 必要なライブラリやコンポーネントをインポートします。
import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useMatch } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // 多言語対応のためのライブラリ
import Header from "./Header"; // ヘッダーコンポーネント
import MainContent from "./MainContent"; // メインコンテンツ（トップページ）
import RegisterForm from "./RegisterForm"; // 新規登録フォーム
import LoginForm from "./LoginForm"; // ログインフォーム
import PasswordReset from "./PasswordReset"; // パスワードリセット
import Welcome from "./Welcome"; // ログイン後のウェルカムページ
import Settings from "./Settings"; // 設定ページ
import FAQ from "./FAQ"; // FAQページ
import Footer from "./Footer"; // フッターコンポーネント
import PortfolioBuilder from "./PortfolioBuilder"; // ポートフォリオ作成ページ
import Portfolio from "./Portfolio"; // ポートフォリオ表示ページ
import ProjectPage from "./ProjectPage"; // プロジェクト詳細ページ
import Tutorial from "./Tutorial"; // チュートリアルページ
import "../App.css"; // アプリケーション全体のスタイルシート

// アプリケーションの主要なロジックを持つコンポーネント
// <Router>内でないとuseNavigateなどのフックが使えないため、コンポーネントを分割しています。
function AppContent() {
  const { t, i18n } = useTranslation(); // 多言語対応の関数などを取得
  const navigate = useNavigate(); // ページ遷移を制御するためのフック
  const location = useLocation(); // 現在のURL情報を取得するためのフック
  const [user, setUser] = useState(null); // ログインしているユーザーの情報を保持するState
  const [isLoading, setIsLoading] = useState(true); // データの読み込み状態を管理するState
  const [language, setLanguage] = useState(i18n.language); // 現在の言語を保持するState
  const [activeTemplate, setActiveTemplate] = useState(null); //適用中のポートフォリオテンプレートを管理するState

  // --- ポートフォリオの状態管理 ---
  const [portfolio, setPortfolio] = useState(null); // 表示するポートフォリオのデータを保持するState
  // URLが '/portfolio/:portfolioId/...' にマッチするかどうかを判定
  const portfolioMatch = useMatch('/portfolio/:portfolioId/*');
  // マッチした場合、URLからportfolioIdを取得
  const portfolioIdFromUrl = portfolioMatch?.params?.portfolioId;

  // ポートフォリオのテンプレートが変更されたときにactiveTemplateを更新する関数
  const handleTemplateChange = useCallback((templateName) => {
    setActiveTemplate(templateName);
  }, []);

  // ポートフォリオのデータをバックエンドから取得する関数
  const fetchPortfolio = useCallback(async () => {
    const token = localStorage.getItem('token');
    let currentPortfolioId = portfolioIdFromUrl;

    // URLにIDがなく、かつログインしている場合、ユーザーに紐づくポートフォリオIDを取得しにいく
    if (!currentPortfolioId && token) {
      try {
        const response = await fetch(`http://localhost:5000/api/user/portfolio`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            currentPortfolioId = data.portfolioId;
          }
        }
      } catch (error) {
        console.error("ユーザーのポートフォリオリンク取得エラー:", error);
      }
    }

    // 表示すべきポートフォリオIDがあれば、詳細データを取得
    if (currentPortfolioId) {
      try {
        const headers = {};
        if (token) { // ログインしていれば、所有者情報を付与してもらうためにトークンを送る
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`http://localhost:5000/api/portfolios/${currentPortfolioId}`, { headers });
        const data = await response.json();
        if (data.success) {
          setPortfolio(data.portfolio); // 取得したデータをStateにセット
          handleTemplateChange(data.portfolio.template); // テンプレートを適用
        } else {
          setPortfolio(null);
        }
      } catch (error) {
        console.error("ポートフォリオの取得に失敗:", error);
        setPortfolio(null);
      }
    } else {
      setPortfolio(null);
    }
  }, [portfolioIdFromUrl, handleTemplateChange]);

  // `fetchPortfolio`関数（またはその依存関係）が変更されたときにポートフォリオデータを再取得
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);
  // --- ポートフォリオの状態管理終了 ---

  // URLのパスが変わった時に、ポートフォリオページでなければテンプレートを解除する
  useEffect(() => {
    if (!location.pathname.startsWith('/portfolio/')) {
      setActiveTemplate(null);
    }
  }, [location]);

  // ページ読み込み時に、ローカルストレージやセッションストレージのトークンを使ってログイン状態を復元する
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      // バックエンドにトークンを送り、有効性を検証
      fetch('http://localhost:5000/api/verify-token', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // 検証成功ならユーザー情報をStateにセット
          const userData = data.user;
          setUser(userData);
          // ユーザー設定に合わせた言語に切り替え
          const userLang = userData.language || 'ja';
          i18n.changeLanguage(userLang);
          setLanguage(userLang);
        } else {
          // 検証失敗ならトークンを削除
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        }
      })
      .catch(error => {
        console.error('トークン検証エラー:', error);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      })
      .finally(() => {
        setIsLoading(false); // 読み込み完了
      });
    } else {
      setIsLoading(false); // トークンがなければ即読み込み完了
    }
  }, [i18n]); // i18nインスタンスは初回のみ取得

  // ユーザー情報が更新されたときに、テーマ（ライト/ダーク）をbodyタグに適用する
  useEffect(() => {
    if (user && user.theme) {
      document.body.classList.toggle('dark-theme', user.theme === 'dark');
      document.body.classList.toggle('light-theme', user.theme !== 'dark');
    } else {
      // デフォルトはライトテーマ
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [user]); // userオブジェクトが変更されるたびに実行

  // ログイン処理
  const handleLogin = (userData, token, autoLogin, redirectTo) => {
    if (autoLogin) {
      localStorage.setItem('token', token); // 「自動ログイン」ならローカルストレージ
    } else {
      sessionStorage.setItem('token', token); // それ以外はセッションストレージ
    }
    setUser(userData); // ユーザー情報をセット
    navigate(redirectTo || '/welcome'); // 指定されたページまたはウェルカムページに遷移
  };

  // ログアウト処理
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    navigate('/'); // トップページに遷移
  };

  // ユーザー情報（設定など）が更新されたときの処理
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    const newLang = updatedUser.language || 'ja';
    if (language !== newLang) {
      handleLanguageChange(newLang); // 言語設定が変更されていたら適用
    }
  };

  // 言語切り替え処理
  const handleLanguageChange = (newLang) => {
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  // 最初のデータ読み込み中はローディング画面を表示
  if (isLoading) {
    return <div>{t('loading')}</div>;
  }

  // 各コンポーネントを描画
  return (
    // wrapperクラスにテンプレート名を付与して、CSSでデザインを切り替えられるようにする
    <div className={`wrapper ${activeTemplate ? activeTemplate + '-template' : ''}`}>
      <Header user={user} onLogout={handleLogout} theme={user?.theme || 'light'} language={language} activeTemplate={activeTemplate} portfolio={portfolio} />
      
      {/* URLのパスに応じて表示するコンポーネントを切り替える */}
      <Routes>
        <Route path="/" element={<MainContent user={user} theme={user?.theme} />} />
        <Route path="/register" element={<RegisterForm theme={user?.theme} />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} theme={user?.theme} />} />
        <Route path="/password-reset" element={<PasswordReset theme={user?.theme} />} />
        <Route path="/Welcome" element={<Welcome theme={user?.theme} />} />
        <Route path="/settings" element={<Settings user={user} onUpdateUser={handleUserUpdate} onLogout={handleLogout} onLanguageChange={handleLanguageChange} language={language} />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/portfolio-builder" element={<PortfolioBuilder theme={user?.theme} />} />
        <Route path="/portfolio/:portfolioId" element={<Portfolio onTemplateChange={handleTemplateChange} portfolio={portfolio} setPortfolio={setPortfolio} fetchPortfolio={fetchPortfolio} user={user} />} />
        <Route path="/portfolio/:portfolioId/project/:projectId" element={<ProjectPage user={user} />} />
      </Routes>
      
      <Footer theme={user?.theme} activeTemplate={activeTemplate} />
    </div>
  );
}

// Appコンポーネント本体。Routerのセットアップのみを行う。
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
