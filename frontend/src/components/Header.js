/**
 * ヘッダーコンポーネント（ナビゲーションバー）
 * 
 * 【役割】
 * アプリケーション全体の上部に表示されるヘッダーです。
 * ロゴ、ナビゲーションメニュー、ユーザーアイコンなどを表示します。
 * 
 * 【主な機能】
 * - ロゴ表示とホームへのリンク
 * - カテゴリー別プロジェクトメニュー（dashboard, learning, school, other）
 * - ユーザーアイコンとドロップダウンメニュー
 *   - 設定ページへのリンク
 *   - 管理者パネルへのリンク（管理者のみ表示）
 *   - ログアウトボタン
 * - 戻るボタン（特定のページで表示）
 * 
 * 【受け取るデータ（props）】
 * @param {Object} user - ログイン中のユーザー情報
 * @param {Function} onLogout - ログアウト処理の関数
 * @param {string} theme - 現在のテーマ（light/dark）
 * @param {string} activeTemplate - アクティブなテンプレート名
 * @param {Object} portfolio - ポートフォリオデータ
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logoImg from '../assets/logo.png';
import '../Header.css';

const CATEGORIES = ["dashboard", "learning", "school", "other"];

// ヘッダーコンポーネント（ナビゲーションバー）
function Header({ user, onLogout, theme, activeTemplate, portfolio }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // --- 内部の状態管理（State） ---
  // openMenu: 現在クリックして開いているカテゴリーメニューの名前（dashboard, schoolなど）。開いていなければnull。
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null); // メニュー（ドロップダウン）の外側をクリックしたことを検知するための参照点

  // デフォルトのユーザーアイコン（画像がない場合に使用されるグレーのシルエット）
  const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTE2IDhDMTguMjA5MSA4IDIwIDkuNzkwODYgMjAgMTJDMjAgMTQuMjA5MSAxOC4yMDkxIDE2IDE2IDE2QzEzLjc5MDkgMTYgMTIgMTQuMjA5MSAxMiAxMkMxMiA5Ljc5MDg2IDEzLjc5MDkgOCAxNiA4WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNOCAyNEM4IDIwLjY4NjMgMTAuNjg2MyAxOCAxNCAxOEgxOEMyMS4zMTM3IDE4IDI0IDIwLjY4NjMgMjQgMjRWMjZIOFYyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg==";

  // 表示するユーザーアイコンのURLを決定する
  // ユーザーがアイコンを設定していればそのURLを、なければデフォルトを使用
  // ?t=... を付けているのは、アイコンを変更したときにブラウザのキャッシュを無視して最新を表示するためです
  const userIconUrl = user && user.iconUrl
    ? `http://localhost:5000${user.iconUrl}?t=${new Date().getTime()}`
    : defaultAvatar;

  /**
   * カテゴリーボタン（Learning, Schoolなど）がクリックされた時の処理
   * @param {string} category - クリックされたカテゴリー名
   */
  const handleCategoryClick = (category) => {
    if (openMenu === category) {
      setOpenMenu(null); // すでに開いていたら閉じる
    } else {
      setOpenMenu(category); // 新しく開く
    }
  };

  /**
   * メニューの外側をクリックした時にメニューを閉じる処理
   */
  const handleClickOutside = (event) => {
    // クリックされた場所がメニューの外側なら、openMenuを空にする
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setOpenMenu(null);
    }
  };

  // 画面が表示されたときにクリックイベントの監視を開始する
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    // 画面から消えるときに監視を終了する（メモリ漏れ防止）
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ホーム、ログイン、登録画面以外では「戻るボタン」を表示する
  const showBackButton = location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register';

  /**
   * カテゴリーメニューの中身（プロジェクト一覧のドロップダウン）を表示する関数
   * @param {string} category - どのカテゴリーを表示するか
   */
  const renderCategoryMenu = (category) => {
    // まだデータが届いていない場合は短いメッセージを出す
    if (!portfolio) {
      return (
        <div className="category-dropdown">
          <div className="category-menu-item">読み込み中...</div>
        </div>
      );
    }

    // ポートフォリオ内のプロジェクトから、指定されたカテゴリー（タグ）が付いているものだけを選ぶ
    const projects = portfolio.projects?.filter(p => p.tags?.includes(category)) || [];

    // プロジェクトが一つもない場合
    if (projects.length === 0) {
      return (
        <div className="category-dropdown">
          <div className="category-menu-item">{t('header_no_projects')}</div>
        </div>
      );
    }

    // プロジェクトのリストを表示
    return (
      <div className="category-dropdown">
        {projects.map(project => (
          <Link
            key={project.id}
            to={`/portfolio/${portfolio.id}/project/${project.id}`}
            className="category-menu-item"
            onClick={() => setOpenMenu(null)} // クリックしたらメニューを閉じる
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
            {user ? (
              <div className="user-menu-container">
                <img
                  src={userIconUrl}
                  alt="icon"
                  className="user-icon"
                  onError={(e) => { e.target.src = defaultAvatar; }}
                />
                <div className="user-menu-dropdown">
                  <div className="user-info-in-dropdown">
                    <img
                      src={userIconUrl}
                      alt="icon"
                      className="user-icon-dropdown"
                      onError={(e) => { e.target.src = defaultAvatar; }}
                    />
                    <span>{user?.name}</span>
                  </div>
                  <Link to="/settings" className="user-menu-item">{t('header_settings')}</Link>
                  {user?.email === 'test.example3030@gmail.com' && (
                    <Link to="/admin" className="user-menu-item">管理者パネル</Link>
                  )}
                  <button onClick={onLogout} className="user-menu-item">{t('header_logout')}</button>
                </div>
              </div>
            ) : (
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
