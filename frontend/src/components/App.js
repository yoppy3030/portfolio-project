/**
 * アプリケーションのメインコンポーネント
 * 
 * 【役割】
 * アプリケーション全体の構造とルーティングを管理します。
 * ユーザー認証、テーマ設定、メンテナンスモードチェックなどの
 * グローバルな状態管理を行います。
 * 
 * 【主な機能】
 * 1. ルーティング管理
 *    - 各ページへのルート設定
 *    - ログイン状態に応じたページ遷移制御
 * 
 * 2. ユーザー認証管理
 *    - JWTトークンの検証
 *    - ログイン/ログアウト処理
 *    - ユーザー情報の管理
 * 
 * 3. メンテナンスモード管理
 *    - メンテナンス状態のチェック
 *    - メンテナンス画面の表示制御
 *    - 管理者は管理パネルにアクセス可能
 * 
 * 4. グローバル設定
 *    - テーマ（ライト/ダーク）
 *    - 言語設定
 *    - ポートフォリオデータ
 */

import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useMatch } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import Header from "./Header";
import MainContent from "./MainContent";
import RegisterForm from "./RegisterForm";
import LoginForm from "./LoginForm";
import PasswordReset from "./PasswordReset";
import Welcome from "./Welcome";
import Settings from "./Settings";
import FAQ from "./FAQ";
import Footer from "./Footer";
import PortfolioBuilder from "./PortfolioBuilder";
import Portfolio from "./Portfolio";
import ProjectPage from "./ProjectPage";
import Tutorial from "./Tutorial";
import Maintenance from "./Maintenance";
import AdminPanel from "./AdminPanel";
import "../App.css";

function AppContent() {
  const { t, i18n } = useTranslation(); // 翻訳用の関数(t)と言語切り替え用(i18n)を取得
  const navigate = useNavigate();       // ページ移動のための関数
  const location = useLocation();       // 現在のURL情報を取得

  // --- アプリ全体で共有する状態管理（State） ---
  const [user, setUser] = useState(null);           // ログイン中のユーザー情報（名前、メールなど）
  const [isLoading, setIsLoading] = useState(true); // アプリの読み込み中フラグ（これがtrueの間は「読み込み中...」と表示）
  const [language, setLanguage] = useState(i18n.language); // 現在の言語設定（ja, enなど）
  const [activeTemplate, setActiveTemplate] = useState(null); // 選択中のポートフォリオテンプレート（名前）

  // --- メンテナンスモード関連の状態 ---
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false); // メンテナンス中かどうか（trueなら全画面をロック）
  const [maintenanceMessage, setMaintenanceMessage] = useState('');   // メンテナンス画面に表示する説明文
  const [scheduledEnd, setScheduledEnd] = useState(null);             // 終了予定時刻（日時データ）

  // --- ポートフォリオデータの状態管理 ---
  const [portfolio, setPortfolio] = useState(null); // 現在表示中、または編集中のポートフォリオデータ全文
  // 現在のURLが '/portfolio/ID' 形式かどうかをチェックし、IDを取り出す
  const portfolioMatch = useMatch('/portfolio/:portfolioId/*');
  const portfolioIdFromUrl = portfolioMatch?.params?.portfolioId;

  /**
   * テンプレートを切り替える関数
   * useCallbackを使っているのは、不必要な再描画を防ぐためです。
   */
  const handleTemplateChange = useCallback((templateName) => {
    setActiveTemplate(templateName);
  }, []);

  /**
   * サーバーからポートフォリオデータを取得する関数
   * 1. ログイン中の自分のポートフォリオを探す
   * 2. 指定されたIDのポートフォリオを取得する
   */
  const fetchPortfolio = useCallback(async () => {
    const token = localStorage.getItem('token');

    let currentPortfolioId = portfolioIdFromUrl;

    // URLにIDが含まれておらず、ログインしている場合、そのユーザーのポートフォリオIDを探しに行く
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
        console.error("ユーザーのポートフォリオID取得エラー:", error);
      }
    }

    // IDが特定できれば、その中身（プロジェクト一覧や自己紹介など）を取得する
    if (currentPortfolioId) {
      try {
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`http://localhost:5000/api/portfolios/${currentPortfolioId}`, {
          headers: headers,
        });
        const data = await response.json();
        if (data.success) {
          setPortfolio(data.portfolio);
          // ポートフォリオで設定されているテンプレートをアプリ全体に適用
          handleTemplateChange(data.portfolio.template);
        } else {
          setPortfolio(null);
        }
      } catch (error) {
        console.error("ポートフォリオ取得失敗:", error);
        setPortfolio(null);
      }
    } else {
      setPortfolio(null);
    }
  }, [portfolioIdFromUrl, handleTemplateChange]);

  // ポートフォリオ取得関数を実行
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);
  // --- End of Portfolio State Management ---

  useEffect(() => {
    if (!location.pathname.startsWith('/portfolio/')) {
      setActiveTemplate(null);
    }
  }, [location]);

  /**
   * メンテナンス状態の取得処理
   */
  useEffect(() => {
    fetch('http://localhost:5000/api/maintenance-status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsMaintenanceMode(data.isMaintenanceMode);
          setMaintenanceMessage(data.maintenanceMessage);
          setScheduledEnd(data.scheduledEnd);
        }
      })
      .catch(error => {
        console.error('メンテナンス状態の取得エラー:', error);
      });
  }, []);

  /**
   * ページ読み込み時のログイン状態復元処理（JWTトークンの検証）
   */
  useEffect(() => {
    // localStorage(永続) または sessionStorage(タブを閉じると消える) からトークンを探す
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/verify-token', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // トークンが正しければ、ユーザー情報をセット
            const userData = data.user;
            setUser(userData);
            // ユーザー設定の言語に切り替え
            const userLang = userData.language || 'ja';
            i18n.changeLanguage(userLang);
            setLanguage(userLang);
          } else {
            // トークンが無効なら削除
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
          // 認証チェック完了
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [i18n]);

  /**
   * テーマ（ライト/ダーク）の切り替え処理
   * ユーザー情報が変わるたびに、bodyタグにクラスを付けて色を変えます。
   */
  useEffect(() => {
    if (user && user.theme) {
      if (user.theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }
    } else {
      // ユーザー設定がない場合はデフォルトでライトテーマ
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [user]);

  /**
   * ログイン成功時の処理
   * @param {Object} userData - ユーザー情報
   * @param {string} token - 発行されたトークン
   * @param {boolean} autoLogin - 自動ログインを希望するか
   * @param {string} redirectTo - 移動先のURL
   */
  const handleLogin = (userData, token, autoLogin, redirectTo) => {
    if (autoLogin) {
      localStorage.setItem('token', token); // 永続保存
    } else {
      sessionStorage.setItem('token', token); // セッションのみ
    }
    setUser(userData);
    navigate(redirectTo || '/welcome');
  };

  /**
   * ログアウト処理
   */
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    navigate('/'); // ホーム画面へ
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    const newLang = updatedUser.language || 'ja';
    if (language !== newLang) {
      handleLanguageChange(newLang);
    }
  };

  const handleLanguageChange = (newLang) => {
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  if (isLoading) {
    return <div>{t('loading')}</div>;
  }

  // メンテナンスモード中は管理者パネル以外のページでメンテナンス画面を表示
  if (isMaintenanceMode && !location.pathname.startsWith('/admin')) {
    return <Maintenance maintenanceMessage={maintenanceMessage} scheduledEnd={scheduledEnd} />;
  }

  console.log("Current portfolio state in App.js:", portfolio);

  return (
    <div className={`wrapper ${activeTemplate ? activeTemplate + '-template' : ''}`}>
      <Header user={user} onLogout={handleLogout} theme={user?.theme || 'light'} language={language} activeTemplate={activeTemplate} portfolio={portfolio} />
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
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
      <Footer theme={user?.theme} activeTemplate={activeTemplate} />
    </div>
  );
}

// App component only sets up the Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;