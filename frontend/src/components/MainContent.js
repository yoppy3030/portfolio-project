// 必要なライブラリやコンポーネントをインポート
import React from 'react';
import { useTranslation } from 'react-i18next'; // 多言語対応
import { Link } from 'react-router-dom'; // ページ遷移用
import '../MainContent.css'; // このコンポーネント専用のスタイルシート

// トップページのメインコンテンツを表示するコンポーネント
function MainContent({ user, theme }) {
    const { t } = useTranslation(); // 多言語対応のt関数を取得
    
    return (
      // 親から渡されたテーマに応じてクラス名を動的に変更
      <div className={`main-content ${theme}-theme`}>
        {/* t関数を使って、多言語対応されたテキストを表示 */}
        <h1>{t('main_new_title')}</h1>
        <div className="main-description">
          {t('main_new_subtitle')}
        </div>
        <div className="main-features">
          <span>{t('main_new_feature1')}</span>
          <span>{t('main_new_feature2')}</span>
        </div>
        
        {/* ユーザーがログインしている場合のみ、「ポートフォリオを作成」ボタンを表示 */}
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
