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
import "../App.css";

// Main logic moved to a child component of <Router>
function AppContent() {
  const { t, i18n } = useTranslation(); // Get i18n instance
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(i18n.language);
  const [activeTemplate, setActiveTemplate] = useState(null);

  // --- Portfolio State Management ---
  const [portfolio, setPortfolio] = useState(null);
  const portfolioMatch = useMatch('/portfolio/:portfolioId/*');
  const portfolioIdFromUrl = portfolioMatch?.params?.portfolioId;

  const handleTemplateChange = useCallback((templateName) => {
    setActiveTemplate(templateName);
  }, []);

  const fetchPortfolio = useCallback(async () => {
    const token = localStorage.getItem('token');
    // No need to check for user here, as public portfolios can be fetched.

    let currentPortfolioId = portfolioIdFromUrl;

    if (!currentPortfolioId && token) { // Only check for user-specific portfolio if logged in
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
        console.error("Error fetching user's portfolio link:", error);
      }
    }

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
          handleTemplateChange(data.portfolio.template);
        } else {
          setPortfolio(null);
        }
      } catch (error) {
        console.error("Failed to fetch portfolio:", error);
        setPortfolio(null);
      }
    } else {
      setPortfolio(null);
    }
  }, [portfolioIdFromUrl, handleTemplateChange]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);
  // --- End of Portfolio State Management ---

  useEffect(() => {
    if (!location.pathname.startsWith('/portfolio/')) {
      setActiveTemplate(null);
    }
  }, [location]);

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
          const userLang = userData.language || 'ja';
          i18n.changeLanguage(userLang);
          setLanguage(userLang);
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
  }, [i18n]);

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
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [user]);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    navigate('/');
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

  return (
    <div className={`wrapper ${activeTemplate ? activeTemplate + '-template' : ''}`}>
      <Header user={user} onLogout={handleLogout} theme={user?.theme || 'light'} language={language} activeTemplate={activeTemplate} portfolio={portfolio} />
      <Routes>
        <Route path="/" element={<MainContent user={user} theme={user?.theme} />} />
        <Route path="/register" element={<RegisterForm theme={user?.theme} />} />
        <Route path="/login" element={<LoginForm onLogin={handleLogin} theme={user?.theme} />} />
        <Route path="/password-reset" element={<PasswordReset theme={user?.theme} />} />
        <Route path="/Welcome" element={<Welcome theme={user?.theme} />} />
        <Route path="/settings" element={<Settings user={user} onUserUpdate={handleUserUpdate} onLogout={handleLogout} onLanguageChange={handleLanguageChange} language={language} />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/portfolio-builder" element={<PortfolioBuilder theme={user?.theme} />} />
        <Route path="/portfolio/:portfolioId" element={<Portfolio onTemplateChange={handleTemplateChange} portfolio={portfolio} fetchPortfolio={fetchPortfolio} user={user} />} />
        <Route path="/portfolio/:portfolioId/project/:projectId" element={<ProjectPage user={user} />} />
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