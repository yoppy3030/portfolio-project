import React from 'react';
import { useTranslation } from 'react-i18next';
import '../MainContent.css';

function MainContent({ theme }) {
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
        <div className="sample-area">{t('main_new_sample')}</div>
        </div>
    );
  }

export default MainContent;