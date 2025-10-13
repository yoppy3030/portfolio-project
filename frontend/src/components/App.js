import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
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
import "../App.css";

// Main logic moved to a child component of <Router>
function AppContent() {
  const { t, i18n } = useTranslation(); // Get i18n instance
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language);

  // Restore login state from JWT token on page load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/verify-token', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const userData = data.user;
          setUser(userData);
          // Set theme and language from user data
          const userLang = userData.language || 'ja';
          i18n.changeLanguage(userLang);
          setLanguage(userLang);
          
          if (userData.theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
          } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
          }
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch(error => {
        console.error('Token verification error:', error);
        localStorage.removeItem('token');
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [i18n]); // Add i18n to dependency array

  // Function to update login state
  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    navigate('/'); // Redirect to homepage
  };

  // Logout process
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    navigate('/'); // Redirect to homepage
  };

  // User info update process
  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    // Also update language if it changed
    const newLang = updatedUser.language || 'ja';
    if (language !== newLang) {
      handleLanguageChange(newLang);
    }
  };

  // Language change handler
  const handleLanguageChange = (newLang) => {
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  // Don't render anything while loading
  if (isLoading) {
    return <div>{t('loading')}</div>;
  }

  return (
    <div className="wrapper">
      <Header user={user} onLogout={handleLogout} theme={user?.theme} language={language} />
      <Routes>
        <Route path="/" element={<MainContent theme={user?.theme} />} />
        <Route path="/register" element={<RegisterForm theme={user?.theme} />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} theme={user?.theme} />} />
        <Route path="/password-reset" element={<PasswordReset theme={user?.theme} />} />
        <Route path="/Welcome" element={<Welcome theme={user?.theme} />} />
        <Route path="/settings" element={<Settings user={user} onUserUpdate={handleUserUpdate} onLogout={handleLogout} onLanguageChange={handleLanguageChange} language={language} />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
      <Footer theme={user?.theme} />
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