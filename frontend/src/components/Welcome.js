// Welcome.js
import React from "react";
import { useTranslation } from 'react-i18next'; // Added
import "../Welcome.css";

export default function Welcome() {
  const { t } = useTranslation(); // Added
  const handleTutorialClick = () => {
    // チュートリアルページへの遷移
    window.location.href = '/Tutorial';
  };

  const handleStartClick = () => {
    // topページへ遷移
    window.location.href = '/top';
  };

  const handleHelpClick = () => {
    // FAQ・ヘルプページへの遷移
    window.location.href = '/FAQ';
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <h1 className="welcome-title">{t('welcome')}</h1>
        <p className="welcome-subtitle">サービスを始める準備が整いました</p>
        
        <div className="welcome-actions">
          <div className="welcome-card" onClick={handleTutorialClick}>
            <div className="welcome-icon tutorial-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2"/>
                <path d="M12 6v6l4 2" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="welcome-card-content">
              <h3>チュートリアルへ</h3>
              <p>基本的な使い方を学ぶ</p>
            </div>
          </div>

          <div className="welcome-card" onClick={handleStartClick}>
            <div className="welcome-icon start-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2196F3" strokeWidth="2"/>
                <path d="M8 12l3 3 5-6" stroke="#2196F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="welcome-card-content">
              <h3>はじめる</h3>
              <p>すぐにサービスを利用する</p>
            </div>
          </div>

          <div className="welcome-card" onClick={handleHelpClick}>
            <div className="welcome-icon help-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#FF9800" strokeWidth="2"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#FF9800" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill="#FF9800"/>
              </svg>
            </div>
            <div className="welcome-card-content">
              <h3>FAQ・ヘルプ</h3>
              <p>よくある質問を確認する</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
