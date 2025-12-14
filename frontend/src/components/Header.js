// 必要なライブラリやフック、画像をインポート
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logoImg from '../assets/logo.png'; // ロゴ画像
import '../Header.css'; // このコンポーネント専用のスタイルシート

// ポートフォリオ内のプロジェクトを分類するためのカテゴリ定義
const CATEGORIES = ["dashboard", "learning", "school", "other"];

// ヘッダーコンポーネント
function Header({ user, onLogout, theme, activeTemplate, portfolio }) {
  const { t } = useTranslation(); // 多言語対応
  const navigate = useNavigate(); // ページ遷移用
  const location = useLocation(); // 現在のURL情報
  const [openMenu, setOpenMenu] = useState(null); // 開いているカテゴリメニューの名前を管理
  const menuRef = useRef(null); // メニュー要素への参照

  // デフォルトのアバター画像（SVGデータ）
  const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDhDMTguMjA5MSA4IDIwIDkuNzkwODYgMjAgMTJDMjAgMTQuMjA5MSAxOC4yMDkxIDE2IDE2IDE2QzEzLjc5MDkgMTYgMTIgMTQuMjA5MSAxMiAxMkMxMiA5Ljc5MDg2IDEzLjc5MDkgOCAxNiA4WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNOCAyNEM4IDIwLjY4NjMgMTAuNjg2MyAxOCAxNCAxOEgxOEMyMS4zMTM3IDE4IDI0IDIwLjY4NjMgMjQgMjRWMjZIOFYyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg==";

  // ユーザーアイコンのURLを決定（設定されていればそのURL、なければデフォルトアバター）
  // URLにタイムスタンプを追加して、画像のキャッシュを無効化する
  const userIconUrl = user && user.iconUrl 
    ? `http://localhost:5000${user.iconUrl}?t=${new Date().getTime()}` 
    : defaultAvatar;

  // カテゴリボタンがクリックされたときの処理
  const handleCategoryClick = (category) => {
    // 同じボタンを再度クリックしたらメニューを閉じ、違うボタンなら開く
    setOpenMenu(openMenu === category ? null : category);
  };

  // メニューの外側がクリックされたときにメニューを閉じる処理
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setOpenMenu(null);
    }
  };

  // コンポーネントのマウント時にイベントリスナーを登録し、アンマウント時に解除
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // トップページやログイン/登録ページ以外で「戻る」ボタンを表示するためのフラグ
  const showBackButton = location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register';

  // カテゴリメニューの中身をレンダリングする関数
  const renderCategoryMenu = (category) => {
    if (!portfolio) {
      return <div className="category-dropdown"><div className="category-menu-item">Loading...</div></div>;
    }
    // ポートフォリオのプロジェクトの中から、指定されたカテゴリのタグを持つものだけをフィルタリング
    const projects = portfolio.projects?.filter(p => p.tags?.includes(category)) || [];
    if (projects.length === 0) {
      return <div className="category-dropdown"><div className="category-menu-item">{t('header_no_projects')}</div></div>;
    }

    return (
      <div className="category-dropdown">
        {projects.map(project => (
          <Link
            key={project.id}
            to={`/portfolio/${portfolio.id}/project/${project.id}`}
            className="category-menu-item"
            onClick={() => setOpenMenu(null)} // リンククリックでメニューを閉じる
          >
            {project.title}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <header className={`header ${theme}-theme ${activeTemplate ? activeTemplate + '-template' : ''}`}>
      <div className="header-main">
        <div className="header-left">
          <Link to="/">
            <img src={logoImg} alt={t('logo_alt')} className="logo-img" />
          </Link>
          {showBackButton && (
            <button onClick={() => navigate(-1)} className="back-button">
              <i className="material-icons">arrow_back</i>
            </button>
          )}
        </div>

        <div className="header-right-content">
          {/* ユーザーがログインしている場合のみナビゲーションメニューを表示 */}
          {user && (
            <nav className="header-nav" ref={menuRef}>
              <Link to={portfolio ? `/portfolio/${portfolio.id}` : '/portfolio-builder'} className="header-nav-item">{t('header_portfolio')}</Link>
              {CATEGORIES.map(category => (
                <div key={category} className="header-nav-item-container">
                  <button className="header-nav-item" onClick={() => handleCategoryClick(category)}>
                    {t(`header_category_${category}`)}
                    <i className="material-icons">arrow_drop_down</i>
                  </button>
                  {openMenu === category && renderCategoryMenu(category)}
                </div>
              ))}
            </nav>
          )}

          <div className="header-right">
            {/* ユーザーのログイン状態に応じて表示を切り替え */}
            {user ? (
              // ログインしている場合：ユーザーメニュー
              <div className="user-menu-container">
                <img src={userIconUrl} alt="icon" className="user-icon" onError={(e) => { e.target.src = defaultAvatar; }} />
                <div className="user-menu-dropdown">
                  <div className="user-info-in-dropdown">
                    <img src={userIconUrl} alt="icon" className="user-icon-dropdown" onError={(e) => { e.target.src = defaultAvatar; }} />
                    <span>{user?.name}</span>
                  </div>
                  <Link to="/settings" className="user-menu-item">{t('header_settings')}</Link>
                  <button onClick={onLogout} className="user-menu-item">{t('header_logout')}</button>
                </div>
              </div>
            ) : (
              // ログインしていない場合：ログイン・新規登録リンク
              <>
                <Link to="/login">{t('header_login')}</Link>
                <span>{t('header_or')}</span>
                <Link to="/register">{t('header_register')}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;