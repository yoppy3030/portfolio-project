import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logoImg from '../assets/logo.png';
import '../Header.css';

const CATEGORIES = ["ダッシュボード", "学習", "学校", "その他"];

function Header({ user, onLogout, theme, language, activeTemplate, portfolio }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const handleCategoryClick = (category) => {
    if (openMenu === category) {
      setOpenMenu(null);
    } else {
      setOpenMenu(category);
    }
  };

  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setOpenMenu(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDhDMTguMjA5MSA4IDIwIDkuNzkwODYgMjAgMTJDMjAgMTQuMjA5MSAxOC4yMDkxIDE2IDE2IDE2QzEzLjc5MDkgMTYgMTIgMTQuMjA5MSAxMiAxMkMxMiA5Ljc5MDg2IDEzLjc5MDkgOCAxNiA4WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNOCAyNEM4IDIwLjY4NjMgMTAuNjg2MyAxOCAxNCAxOEgxOEMyMS4zMTM3IDE4IDI0IDIwLjY4NjMgMjQgMjRWMjZIOFYyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg==";

  const showBackButton = location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register';

  const renderCategoryMenu = (category) => {
    if (!portfolio) {
      return (
        <div className="category-dropdown">
          <div className="category-menu-item">Loading...</div>
        </div>
      );
    }
    const projects = portfolio.projects?.filter(p => p.tags?.includes(category)) || [];
    if (projects.length === 0) {
      return (
        <div className="category-dropdown">
          <div className="category-menu-item">プロジェクトがありません</div>
        </div>
      );
    }

    return (
      <div className="category-dropdown">
        {projects.map(project => (
          <Link
            key={project.id}
            to={`/portfolio/${portfolio.id}/project/${project.id}`}
            className="category-menu-item"
            onClick={() => setOpenMenu(null)}
          >
            {project.title}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <header className={`header ${theme}-theme ${activeTemplate ? activeTemplate + '-template' : ''}`}>
      <div className="header-main">
        <div className="header-left">
          <Link to="/">
            <img src={logoImg} alt={t('logo_alt')} className="logo-img" />
          </Link>
          {showBackButton && (
            <button onClick={() => navigate(-1)} className="back-button">
              <i className="material-icons">arrow_back</i>
            </button>
          )}
        </div>

        <div className="header-right-content">
          {user && (
            <nav className="header-nav" ref={menuRef}>
              <Link to={portfolio ? `/portfolio/${portfolio.id}` : '/portfolio-builder'} className="header-nav-item">ポートフォリオ</Link>
              {CATEGORIES.map(category => (
                <div key={category} className="header-nav-item-container">
                  <button className="header-nav-item" onClick={() => handleCategoryClick(category)}>
                    {category}
                    <i className="material-icons">arrow_drop_down</i>
                  </button>
                  {openMenu === category && renderCategoryMenu(category)}
                </div>
              ))}
            </nav>
          )}

          <div className="header-right">
            {user ? (
              <div className="user-menu-container">
                <img
                  src={user?.iconUrl || defaultAvatar}
                  alt="icon"
                  className="user-icon"
                  onError={(e) => { e.target.src = defaultAvatar; }}
                />
                <div className="user-menu-dropdown">
                  <div className="user-info-in-dropdown">
                    <img
                      src={user?.iconUrl || defaultAvatar}
                      alt="icon"
                      className="user-icon-dropdown"
                      onError={(e) => { e.target.src = defaultAvatar; }}
                    />
                    <span>{user?.name}</span>
                  </div>
                  <Link to="/settings" className="user-menu-item">{t('header_settings')}</Link>
                  <button onClick={onLogout} className="user-menu-item">{t('header_logout')}</button>
                </div>
              </div>
            ) : (
              <>
                <Link to="/login">{t('header_login')}</Link>
                <span>{t('header_or')}</span>
                <Link to="/register">{t('header_register')}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;