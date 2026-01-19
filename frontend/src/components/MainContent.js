import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import '../style/MainContent.css';

function MainContent({ user, theme }) {
  const { t } = useTranslation();
  return (
    <div className={`main-content ${theme}-theme`}>
      <h1>{t('main_new_title')}</h1>
      <div className="main-description">
        {t('main_new_subtitle')}
      </div>
      <div className="main-features">
        <span>{t('main_new_feature1')}</span>
        <span>{t('main_new_feature2')}</span>
      </div>
      {user && (
        <div className="main-actions">
          <Link to="/portfolio-builder" className="create-portfolio-button">
            {t('create_new_portfolio')}
          </Link>
        </div>
      )}
      <div className="sample-area">
        <div className="sample-label">{t('sample_image_label')}</div>
        <img src="/sample_capture.png" alt="Sample Capture" className="sample-capture-img" />
      </div>
    </div>
  );
}

export default MainContent;