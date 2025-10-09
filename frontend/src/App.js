import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Added
import Header from "./components/Header";
import MainContent from "./components/MainContent";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";
import PasswordReset from "./components/PasswordReset";
import Welcome from "./components/Welcome";
import Settings from "./components/Settings";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import "./App.css";

// メインのロジックを<Router>の子コンポーネントに移動
function AppContent() {
  const { t } = useTranslation(); // Added
  const navigate = useNavigate(); // ここでフックを使用
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ページロード時にJWTトークンからログイン状態を復元
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // トークンを検証
      fetch('http://localhost:5000/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch(error => {
        console.error('トークン検証エラー:', error);
        localStorage.removeItem('token');
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }, [user?.theme]);

  // ログイン状態を更新する関数
  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    navigate('/'); // ホームページにリダイレクト
  };

  // ログアウト処理
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    navigate('/'); // ホームページにリダイレクト
  };

  // ユーザー情報更新処理
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  // ローディング中は何も表示しない
  if (isLoading) {
    return <div>{t('loading')}</div>; // Translated
  }

  return (
    <div className="wrapper">
      <Header user={user} onLogout={handleLogout} theme={user?.theme} />
      <Routes>
        <Route path="/" element={<MainContent theme={user?.theme} />} />
        <Route path="/register" element={<RegisterForm theme={user?.theme} />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} theme={user?.theme} />} />
        <Route path="/password-reset" element={<PasswordReset theme={user?.theme} />} />
        <Route path="/Welcome" element={<Welcome theme={user?.theme} />} />
        <Route path="/settings" element={<Settings user={user} onUserUpdate={handleUserUpdate} onLogout={handleLogout} />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
      <Footer theme={user?.theme} />
    </div>
  );
}

// AppコンポーネントはRouterのセットアップのみを行う
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;