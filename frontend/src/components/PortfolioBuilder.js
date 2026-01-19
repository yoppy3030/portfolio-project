import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import '../style/PortfolioBuilder.css';
import modernTemplate from '../assets/modern-template.svg';
import classicTemplate from '../assets/classic-template.svg';
import minimalistTemplate from '../assets/minimalist-template.svg';

// 新しいポートフォリオを作成するための画面コンポーネント
export default function PortfolioBuilder({ theme }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // --- ステート（状態変数） ---
  const [portfolioTitle, setPortfolioTitle] = useState(''); // ポートフォリオのタイトル
  const [selectedTemplate, setSelectedTemplate] = useState(null); // 選択されたテンプレートの種類

  // コンポーネントがマウントされた時に実行（既存のポートフォリオがあるかチェック）
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // 既存のポートフォリオがあるかどうかを確認する非同期関数
    const checkForExistingPortfolio = async () => {
      if (token) {
        try {
          const response = await fetch('http://localhost:5000/api/user/portfolio', {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // 既にポートフォリオが存在する場合は、そのポートフォリオページに移動（リダイレクト）
              navigate(`/portfolio/${data.portfolioId}`);
            }
          }
        } catch (error) {
          console.error('Error checking for existing portfolio:', error);
          // エラーが発生した場合は、そのままこの作成画面を表示し続ける
        }
      }
    };

    checkForExistingPortfolio();
  }, [navigate]);

  // 「ポートフォリオを作成」ボタンが押された時の処理
  const handleCreatePortfolio = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      // ログインしていなければログインページへ移動（ログイン後に戻ってこれるように現在の場所をstateで渡す）
      navigate('/login', { state: { from: location } });
      return;
    }

    // 入力チェック：タイトルとテンプレートが選択されているか
    if (!portfolioTitle) {
      alert(t('portfolio_title_required'));
      return;
    }
    if (!selectedTemplate) {
      alert(t('template_selection_required'));
      return;
    }

    try {
      // サーバーにポートフォリオ作成リクエストを送信
      const response = await fetch('http://localhost:5000/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: portfolioTitle, template: selectedTemplate }),
      });

      const data = await response.json();

      if (data.success) {
        // 作成成功：アラートを表示して、作成されたポートフォリオページへ移動
        alert(t('portfolio_creation_success', { title: portfolioTitle, template: selectedTemplate }));
        navigate(`/portfolio/${data.portfolio.id}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      alert('Failed to create portfolio. Please try again later.');
    }
  };

  return (
    <div className={`portfolio-builder-container ${theme}-theme ${selectedTemplate ? `template-${selectedTemplate}` : ''}`}>
      <div className="portfolio-builder-content">
        <h1 className="portfolio-builder-title">{t('portfolio_builder_title')}</h1>
        <p className="portfolio-builder-subtitle">{t('portfolio_builder_subtitle')}</p>

        <div className="portfolio-form">
          <div className="form-group">
            <label htmlFor="portfolio-title">{t('portfolio_title_label')}</label>
            <input
              type="text"
              id="portfolio-title"
              placeholder={t('portfolio_title_placeholder')}
              value={portfolioTitle}
              onChange={(e) => setPortfolioTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('template_selection_label')}</label>
            <div className="template-options">
              <div
                className={`template-card ${selectedTemplate === 'modern' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('modern')}
              >
                <img src={modernTemplate} alt={t('template_modern_title')} className="template-preview" />
                <h3>{t('template_modern_title')}</h3>
                <p>{t('template_modern_desc')}</p>
              </div>
              <div
                className={`template-card ${selectedTemplate === 'classic' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('classic')}
              >
                <img src={classicTemplate} alt={t('template_classic_title')} className="template-preview" />
                <h3>{t('template_classic_title')}</h3>
                <p>{t('template_classic_desc')}</p>
              </div>
              <div
                className={`template-card ${selectedTemplate === 'minimalist' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('minimalist')}
              >
                <img src={minimalistTemplate} alt={t('template_minimalist_title')} className="template-preview" />
                <h3>{t('template_minimalist_title')}</h3>
                <p>{t('template_minimalist_desc')}</p>
              </div>
            </div>
          </div>

          <button className="create-portfolio-btn" onClick={handleCreatePortfolio}>
            {t('create_portfolio_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}