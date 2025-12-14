// 必要なライブラリやコンポーネントをインポート
import React from 'react';
import { Link } from 'react-router-dom'; // ページ遷移のためのコンポーネント
import { useTranslation } from 'react-i18next'; // 多言語対応
import '../Footer.css'; // このコンポーネント専用のスタイルシート

// フッターコンポーネント
function Footer({ theme, activeTemplate }) {
    const { t } = useTranslation(); // 多言語対応のt関数を取得
    const currentTheme = theme || 'light'; // 親から渡されたテーマ、なければ'light'をデフォルトに
    const currentYear = new Date().getFullYear(); // 現在の年を動的に取得

    return (
        // フッターのルート要素。テーマやテンプレートに応じてクラス名を動的に変更
        <footer className={`footer ${currentTheme}-theme ${activeTemplate ? activeTemplate + '-template' : ''}`}>
      <div className="footer-container">
        {/* ブランド情報セクション */}
        <div className="footer-section">
          <h4>My Portfolio Builder</h4>
          <p>{t('footer_brand_subtitle')}</p>
        </div>
        {/* メニューリンクのセクション */}
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
        {/* ソーシャルリンクのセクション */}
        <div className="footer-section">
          <h4>{t('footer_social_title')}</h4>
          <div className="social-links">
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer">X</a>
            <a href="https://github.com/yoppy3030/portfolio-project.git" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </div>
      {/* フッターの最下部 */}
      <div className="footer-bottom">
        <p>{t('footer_copyright_brand', { year: currentYear })}</p>
      </div>
    </footer>
  );
}

export default Footer;