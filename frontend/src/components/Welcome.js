// 必要なライブラリやフックをインポート
import React from "react";
import { useTranslation } from 'react-i18next'; // 多言語対応
import { useNavigate } from 'react-router-dom'; // ページ遷移用
import "../Welcome.css"; // このコンポーネント専用のスタイルシート

// ログイン後のウェルカムページコンポーネント
export default function Welcome({ user }) {
  const { t } = useTranslation(); // 多言語対応のt関数
  const navigate = useNavigate(); // ページ遷移をプログラム的に行うためのフック

  // 「チュートリアルへ」カードがクリックされたときの処理
  const handleTutorialClick = () => {
    navigate('/Tutorial'); // チュートリアルページに遷移
  };

  // 「はじめる」カードがクリックされたときの処理
  const handleStartClick = () => {
    // ユーザー情報にportfolioId（既存ポートフォリオのID）があればそのページへ、なければ作成ページへ遷移
    if (user && user.portfolioId) {
      navigate(`/portfolio/${user.portfolioId}`);
    } else {
      navigate('/portfolio-builder');
    }
  };

  // 「FAQ・ヘルプ」カードがクリックされたときの処理
  const handleHelpClick = () => {
    navigate('/FAQ'); // FAQページに遷移
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <h1 className="welcome-title">{t('welcome')}</h1>
        <p className="welcome-subtitle">サービスを始める準備が整いました</p>
        
        {/* アクションカードのコンテナ */}
        <div className="welcome-actions">
          {/* チュートリアルカード */}
          <div className="welcome-card" onClick={handleTutorialClick}>
            <div className="welcome-icon tutorial-icon">
              {/* アイコンSVG */}
            </div>
            <div className="welcome-card-content">
              <h3>チュートリアルへ</h3>
              <p>基本的な使い方を学ぶ</p>
            </div>
          </div>

          {/* はじめるカード */}
          <div className="welcome-card" onClick={handleStartClick}>
            <div className="welcome-icon start-icon">
              {/* アイコンSVG */}
            </div>
            <div className="welcome-card-content">
              <h3>はじめる</h3>
              <p>すぐにサービスを利用する</p>
            </div>
          </div>

          {/* ヘルプカード */}
          <div className="welcome-card" onClick={handleHelpClick}>
            <div className="welcome-icon help-icon">
              {/* アイコンSVG */}
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