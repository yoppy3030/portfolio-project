/**
 * メインコンテンツ・ラッパーコンポーネント
 * 
 * 【役割】
 * アプリケーションの主要な表示領域を管理するコンポーネントです。
 * ヘッダーやフッターを除いた、コンテンツ部分（Welcome画面やPortfolio画面など）のレイアウトを整えます。
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import '../MainContent.css';

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
      <div className="sample-area">{t('main_new_sample')}</div>
    </div>
  );
}

export default MainContent;