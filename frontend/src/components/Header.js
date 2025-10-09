// Header.js

import React from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png"; // ロゴ画像パスを必要に応じて調整
import "../Header.css"; // 新しいCSSファイルをインポート

function Header({ user, onLogout, theme }) {
  // デフォルトアイコン
  const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDhDMTguMjA5MSA4IDIwIDkuNzkwODYgMjAgMTJDMjAgMTQuMjA5MSAxOC4yMDkxIDE2IDE2IDE2QzEzLjc5MDkgMTYgMTIgMTQuMjA5MSAxMiAxMkMxMiA5Ljc5MDg2IDEzLjc5MDkgOCAxNiA4WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNOCAyNEM4IDIwLjY4NjMgMTAuNjg2MyAxOCAxNCAxOEgxOEMyMS4zMTM3IDE4IDI0IDIwLjY4NjMgMjQgMjRWMjZIOFYyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg==";

  return (
    <header className={`header ${theme}-theme`}>
      <div className="header-main">
        <div className="header-left">
          <img src={logoImg} alt="My Portfolio Builder" className="logo-img" />
        </div>
        {user ? (
          <nav className="header-nav">
            <Link to="/dashboard">ダッシュボード</Link>
            <Link to="/study">学習</Link>
            <Link to="/hobby">趣味</Link>
            <Link to="/school">学校</Link>
            <Link to="/other">その他</Link>
            <Link to="/search"><span role="img" aria-label="検索">🔍</span>検索</Link>
            
            <div className="user-menu-container">
              <img 
                src={user?.iconUrl || defaultAvatar} 
                alt="icon" 
                className="user-icon"
                onError={(e) => { e.target.src = defaultAvatar; }}
              />
              <div className="user-menu-dropdown">
                <div className="user-info-in-dropdown">
                  <img 
                    src={user?.iconUrl || defaultAvatar} 
                    alt="icon" 
                    className="user-icon-dropdown"
                    onError={(e) => { e.target.src = defaultAvatar; }}
                  />
                  <span>{user?.name}</span>
                </div>
                <Link to="/settings" className="user-menu-item">設定</Link>
                <button onClick={onLogout} className="user-menu-item">ログアウト</button>
              </div>
            </div>
          </nav>
        ) : (
          <div className="header-right">
            <Link to="/login">ログイン</Link>
            <span>または</span>
            <Link to="/register">新規登録</Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
