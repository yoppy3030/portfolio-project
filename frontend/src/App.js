import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import MainContent from "./components/MainContent";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";
import PasswordReset from "./components/PasswordReset";
import Welcome from "./components/Welcome";
import Settings from "./components/Settings";
import Footer from "./components/Footer";
import "./App.css";

// メインのロジックを<Router>の子コンポーネントに移動
function AppContent() {
  const navigate = useNavigate(); // ここでフックを使用
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
          setIsLoggedIn(true);
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

  // ログイン状態を更新する関数
  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsLoggedIn(true);
    if (token) {
      localStorage.setItem('token', token);
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    navigate('/'); // ホームページにリダイレクト
  };

  // ローディング中は何も表示しない
  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="wrapper">
      <Header isLoggedIn={isLoggedIn} user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<MainContent />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/Welcome" element={<Welcome />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <Footer />
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