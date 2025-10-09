import React from 'react';
import { Link } from 'react-router-dom';
import '../Footer.css'; // Assuming the CSS file is in src/

function Footer({ theme }) {
    const currentTheme = theme || 'light'; // Default to 'light' if theme is undefined
    return (
        <footer className={`footer ${currentTheme}-theme`}>
      <div className="footer-container">
        <div className="footer-section">
          <h4>My Portfolio Builder</h4>
          <p>あなたの最高のポートフォリオを簡単に作成。</p>
        </div>
        <div className="footer-section">
          <h4>メニュー</h4>
          <ul>
            <li><Link to="/">サービス紹介</Link></li>
            <li><Link to="/faq">よくある質問</Link></li>
            <li><Link to="/terms">利用規約</Link></li>
            <li><Link to="/privacy">プライバシーポリシー</Link></li>
            <li><Link to="/contact">お問い合わせ</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>フォローする</h4>
          <div className="social-links">
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer">X</a>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://github.com/yoppy3030/portfolio-project" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 My Portfolio Builder. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;