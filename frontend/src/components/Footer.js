import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      My Portfolio Builder<br />
      | サービス紹介 | <Link to="/faq">よくある質問</Link> | 利用規約 | プライバシーポリシー | お問い合わせ |<br />
      【運営会社】My Portfolio Builder運営事務局<br />
      【SNSリンク】 [X] [Instagram] [GitHub] など<br />
      Copyright © 2025 My Portfolio Builder. All rights reserved.<br />
    </footer>
  );
}

export default Footer;