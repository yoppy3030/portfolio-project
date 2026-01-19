import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../style/Footer.css';

function Footer({ theme, activeTemplate }) {
  const { t } = useTranslation();
  const currentTheme = theme || 'light';
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`footer ${currentTheme}-theme ${activeTemplate ? activeTemplate + '-template' : ''}`}>
      <div className="footer-container">
        <div className="footer-section">
          <h4>My Portfolio Builder</h4>
          <p>{t('footer_brand_subtitle')}</p>
        </div>
        <div className="footer-section">
          <h4>{t('footer_menu_title')}</h4>
          <ul>
            <li><Link to="/">{t('footer_menu_intro')}</Link></li>
            <li><Link to="/faq">{t('footer_menu_faq')}</Link></li>
            <li><Link to="/terms">{t('footer_menu_terms')}</Link></li>
            <li><Link to="/privacy">{t('footer_menu_privacy')}</Link></li>
            <li><Link to="/contact">{t('footer_menu_contact')}</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>{t('footer_social_title')}</h4>
          <div className="social-links">
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer">X</a>
            <a href="https://github.com/yoppy3030/portfolio-project.git" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>{t('footer_copyright_brand', { year: currentYear })}</p>
      </div>
    </footer>
  );
}

export default Footer;
