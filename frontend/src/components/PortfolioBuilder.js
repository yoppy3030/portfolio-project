// 必要なライブラリやコンポーネントをインポートします。
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // 多言語対応ライブラリ
import { useNavigate, useLocation } from 'react-router-dom'; // ページ遷移やURL情報を扱うためのフック
import '../PortfolioBuilder.css'; // このコンポーネント専用のスタイルシート
// テンプレート選択肢のプレビュー画像
import modernTemplate from '../assets/modern-template.svg';
import classicTemplate from '../assets/classic-template.svg';
import minimalistTemplate from '../assets/minimalist-template.svg';

// ポートフォリオビルダーコンポーネント
export default function PortfolioBuilder({ theme }) {
  const { t } = useTranslation(); // 多言語対応のための関数
  const navigate = useNavigate(); // ページ遷移をプログラム的に行うためのフック
  const location = useLocation(); // 現在のURL情報を取得するためのフック
  const [portfolioTitle, setPortfolioTitle] = useState(''); // 入力されたポートフォリオのタイトルを保持するState
  const [selectedTemplate, setSelectedTemplate] = useState(null); // 選択されたテンプレート名を保持するState

  // コンポーネントがマウントされた（表示された）時に実行される処理
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // ユーザーが既にポートフォリオを持っているか確認する非同期関数
    const checkForExistingPortfolio = async () => {
      if (token) { // ログインしている場合のみチェック
        try {
          // バックエンドにユーザーのポートフォリオ情報を問い合わせる
          const response = await fetch('http://localhost:5000/api/user/portfolio', {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // ポートフォリオが既にあれば、そのポートフォリオページにリダイレクト（移動）する
              navigate(`/portfolio/${data.portfolioId}`);
            }
            // ポートフォリオが存在しない場合(404など)は、何もしない（ビルダーページを表示し続ける）
          }
        } catch (error) {
          console.error('既存ポートフォリオのチェック中にエラー:', error);
          // エラーが発生した場合も、とりあえずビルダーページを表示し続ける
        }
      }
    };

    checkForExistingPortfolio();
  }, [navigate]); // navigate関数が変更された場合（通常は初回のみ）に実行

  // 「ポートフォリオを作成」ボタンがクリックされたときの処理
  const handleCreatePortfolio = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      // ログインしていない場合は、ログインページにリダイレクト
      // ログイン後に元のページに戻れるように、現在のURL情報(location)を渡す
      navigate('/login', { state: { from: location } });
      return;
    }

    // 入力チェック
    if (!portfolioTitle) {
      alert(t('portfolio_title_required')); // t関数で多言語対応されたアラートメッセージを表示
      return;
    }
    if (!selectedTemplate) {
      alert(t('template_selection_required'));
      return;
    }

    try {
      // バックエンドのポートフォリオ作成APIを呼び出す
      const response = await fetch('http://localhost:5000/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // 認証のためにトークンをヘッダーに含める
        },
        body: JSON.stringify({ title: portfolioTitle, template: selectedTemplate }), // タイトルとテンプレート名をJSON形式で送信
      });

      const data = await response.json();

      if (data.success) {
        // 作成に成功した場合
        alert(t('portfolio_creation_success', { title: portfolioTitle, template: selectedTemplate }));
        // 作成されたポートフォリオのページに遷移
        navigate(`/portfolio/${data.portfolio.id}`);
      } else {
        // 作成に失敗した場合
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('ポートフォリオの作成に失敗しました:', error);
      alert('ポートフォリオの作成に失敗しました。後でもう一度お試しください。');
    }
  };

  // コンポーネントの描画部分
  return (
    <div className={`portfolio-builder-container ${theme}-theme ${selectedTemplate ? `template-${selectedTemplate}` : ''}`}>
      <div className="portfolio-builder-content">
        <h1 className="portfolio-builder-title">{t('portfolio_builder_title')}</h1>
        <p className="portfolio-builder-subtitle">{t('portfolio_builder_subtitle')}</p>

        <div className="portfolio-form">
          {/* ポートフォリオのタイトル入力欄 */}
          <div className="form-group">
            <label htmlFor="portfolio-title">{t('portfolio_title_label')}</label>
            <input
              type="text"
              id="portfolio-title"
              placeholder={t('portfolio_title_placeholder')}
              value={portfolioTitle}
              onChange={(e) => setPortfolioTitle(e.target.value)} // 入力値でStateを更新
            />
          </div>

          {/* テンプレート選択肢 */}
          <div className="form-group">
            <label>{t('template_selection_label')}</label>
            <div className="template-options">
              {/* Modernテンプレート */}
              <div
                className={`template-card ${selectedTemplate === 'modern' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('modern')} // クリックで'modern'を選択
              >
                <img src={modernTemplate} alt={t('template_modern_title')} className="template-preview" />
                <h3>{t('template_modern_title')}</h3>
                <p>{t('template_modern_desc')}</p>
              </div>
              {/* Classicテンプレート */}
              <div
                className={`template-card ${selectedTemplate === 'classic' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('classic')}
              >
                <img src={classicTemplate} alt={t('template_classic_title')} className="template-preview" />
                <h3>{t('template_classic_title')}</h3>
                <p>{t('template_classic_desc')}</p>
              </div>
              {/* Minimalistテンプレート */}
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

          {/* 作成ボタン */}
          <button className="create-portfolio-btn" onClick={handleCreatePortfolio}>
            {t('create_portfolio_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
