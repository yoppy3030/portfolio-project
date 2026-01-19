import React, { useState, useEffect } from 'react';
import { withTranslation } from 'react-i18next';
import HobbiesManager from './HobbiesManager';
import '../Settings.css';

/**
 * ユーザー設定画面のメインコンポーネント
 * 
 * ユーザーのプロフィール変更、パスワード変更、通知設定、言語設定、
 * そして趣味（ゲーム、読書、音楽）のデータ管理（バックアップ機能など）を行います。
 * 
 * @param {Object} user - 現在ログインしているユーザーの情報
 * @param {Function} onUpdateUser - 親コンポーネント(App.js)のユーザー状態を更新する関数
 * @param {Function} onLogout - ログアウト処理を行う関数
 * @param {Function} t - 多言語対応のための翻訳関数 (react-i18next)
 * @param {Object} i18n - 言語設定を管理するオブジェクト
 * @param {Function} onLanguageChange - 言語切り替え時のコールバック関数
 * @param {string} language - 現在選択されている言語コード ('ja' または 'en')
 */
function Settings({ user, onUpdateUser, onLogout, t, i18n, onLanguageChange, language }) {
  // --- ステート変数（画面の状態を管理する変数）の定義 ---

  // 現在表示している設定タブのIDを管理します
  // 初期値は 'profile'（プロフィール設定画面）です
  const [activeTab, setActiveTab] = useState('profile');

  // --- プロフィール設定用のステート ---
  const [username, setUsername] = useState(''); // 入力されたユーザー名
  const [bio, setBio] = useState(''); // 入力された自己紹介文
  const [profilePicFile, setProfilePicFile] = useState(null); // アップロードする新しいプロフィール画像ファイル

  // --- アカウント設定用のステート ---
  const [currentPassword, setCurrentPassword] = useState(''); // 入力された現在のパスワード（変更時確認用）
  const [newPassword, setNewPassword] = useState(''); // 入力された新しいパスワード

  // --- 通知設定用のステート ---
  // APIから取得したユーザー設定に基づいて初期化されます（1: ON, 0: OFF）
  const [emailNotifications, setEmailNotifications] = useState(true); // メール通知を受け取るか
  const [featureAnnouncements, setFeatureAnnouncements] = useState(true); // 新機能のお知らせを受け取るか
  const [maintenanceInfo, setMaintenanceInfo] = useState(true); // メンテナンス情報を受け取るか

  // --- 一般設定用のステート ---
  const [theme, setTheme] = useState('light'); // テーマ設定（'light' または 'dark'）
  const [deletePassword, setDeletePassword] = useState(''); // アカウント削除時の確認入力用パスワード

  // 画面上部に表示する通知メッセージ（「更新しました」やエラーメッセージなど）
  const [message, setMessage] = useState('');

  /**
   * コンポーネントが表示された時や、userプロパティが更新された時に実行される副作用フック
   * 親コンポーネントから渡された最新のuser情報を、このコンポーネントの入力フォーム（ステート）に反映させます。
   */
  useEffect(() => {
    if (user) {
      // ユーザー情報が存在する場合、各ステートに値をセット
      setUsername(user.name || '');
      setBio(user.bio || '');
      // データベースでは 1(true) / 0(false) で保存されているため、真偽値に変換
      setEmailNotifications(user.email_notifications === 1);
      setFeatureAnnouncements(user.feature_announcements === 1);
      setMaintenanceInfo(user.maintenance_info === 1);
      setTheme(user.theme || 'light');
    }
  }, [user]); // user が変更されるたびにこの処理が再実行されます

  // プロフィール画像ファイル選択時の処理
  const handleFileChange = (e) => {
    // 選択されたファイルの1つ目を取得してステートに保存
    setProfilePicFile(e.target.files[0]);
  };

  /**
   * プロフィール情報の保存処理
   * ユーザー名、自己紹介、アイコン画像をサーバーに送信して更新します。
   */
  const handleProfileSave = async () => {
    setMessage(''); // メッセージをクリア
    // 認証トークンを取得（localStorage または sessionStorage から）
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // トークンがない（ログインしていない）場合はエラーを表示して終了
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    // 画像を含むデータを送るため、FormDataオブジェクトを使用
    const formData = new FormData();
    formData.append('name', username);
    formData.append('bio', bio);
    if (profilePicFile) {
      formData.append('icon', profilePicFile);
    }

    try {
      // プロフィール更新APIを呼び出し
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // FormDataを送る際は 'Content-Type': 'multipart/form-data' を自動設定させるため、
          // ここではContent-Typeを指定しません。指定するとバウンダリ等の設定がうまくいかずエラーになります。
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // 更新成功時
        setMessage(t('settings_message_profile_updated'));
        onUpdateUser(data.user); // 親コンポーネント（App.js）のユーザー情報を更新して画面全体に反映
        setProfilePicFile(null); // ファイル入力は一度クリア
      } else {
        // サーバーからのエラーメッセージを表示
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_profile_update_failed')); // 通信エラーなど
    }
  };

  /**
   * パスワード変更処理
   * 現在のパスワードと新しいパスワードを送信して検証・更新します。
   */
  const handleChangePassword = async () => {
    setMessage('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    // パスワードの長さチェック（8文字以上）
    if (newPassword.length < 8) {
      setMessage(t('settings_message_password_too_short'));
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(t('settings_message_password_changed'));
        // フォームをクリア
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_password_change_failed'));
    }
  };

  /**
   * 通知設定の保存処理
   * メール通知などのON/OFF設定を保存します。
   */
  const handleNotificationSave = async () => {
    setMessage('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    const newSettings = {
      email_notifications: emailNotifications,
      feature_announcements: featureAnnouncements,
      maintenance_info: maintenanceInfo
    };

    try {
      const response = await fetch('http://localhost:5000/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });

      const data = await response.json();
      if (data.success) {
        setMessage(t('settings_message_notifications_updated'));

        // 設定更新後、アプリ全体のユーザー情報を最新化するためにトークン検証APIを呼び出します
        // これにより、props.user が更新され、他のコンポーネントでも最新の設定が参照できるようになります
        const verifyResponse = await fetch('http://localhost:5000/api/verify-token', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const verifyData = await verifyResponse.json();
        if (verifyData.success) {
          onUpdateUser(verifyData.user);
        }
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_notifications_update_failed'));
    }
  };

  /**
   * アカウント削除処理
   * 削除確認の後、パスワードと共に削除リクエストを送信します。
   */
  const handleDeleteAccount = async () => {
    setMessage('');
    // ブラウザ標準の確認ダイアログを表示
    if (!window.confirm(t('settings_confirm_delete_account'))) {
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword }) // セキュリティのためパスワード確認が必要
      });

      const data = await response.json();
      if (data.success) {
        alert(t('settings_message_account_deleted'));
        onLogout(); // ログアウト処理（ログイン画面へ遷移など）
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_account_delete_failed'));
    }
  };

  /**
   * 一般設定（言語・テーマ）の保存処理
   */
  const handleGeneralSave = async () => {
    setMessage('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    const generalSettings = {
      language,
      theme
    };

    try {
      const response = await fetch('http://localhost:5000/api/general-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(generalSettings)
      });

      const data = await response.json();

      if (data.success) {
        setMessage(t('settings_message_general_updated'));
        onUpdateUser(data.user); // ユーザー情報を更新（テーマ変更などを即時反映）
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_general_update_failed'));
    }
  };

  // レンダリング（画面表示）
  return (
    <div className="settings-container">
      <h2>{t('settings_title')}</h2>
      <div className="settings-layout">

        {/* --- 左側のサイドバー（タブ切り替えボタン） --- */}
        <div className="settings-sidebar">
          <button
            onClick={() => { setMessage(''); setActiveTab('profile'); }}
            className={activeTab === 'profile' ? 'active' : ''}
          >
            {t('settings_profile_button')}
          </button>
          <button
            onClick={() => { setMessage(''); setActiveTab('hobbies'); }}
            className={activeTab === 'hobbies' ? 'active' : ''}
          >
            {t('settings_hobbies_button', '趣味')}
          </button>
          <button
            onClick={() => { setMessage(''); setActiveTab('account'); }}
            className={activeTab === 'account' ? 'active' : ''}
          >
            {t('settings_account_button')}
          </button>
          <button
            onClick={() => { setMessage(''); setActiveTab('notifications'); }}
            className={activeTab === 'notifications' ? 'active' : ''}
          >
            {t('settings_notifications_button')}
          </button>
          <button
            onClick={() => { setMessage(''); setActiveTab('general'); }}
            className={activeTab === 'general' ? 'active' : ''}
          >
            {t('settings_general_title')}
          </button>
          <button
            onClick={() => { setMessage(''); setActiveTab('backups'); }}
            className={activeTab === 'backups' ? 'active' : ''}
          >
            {t('settings_backups_button', 'バックアップ')}
          </button>
        </div>

        {/* --- 右側のメインコンテンツエリア --- */}
        <div className="settings-main">

          {/* プロフィール設定タブの内容 */}
          {activeTab === 'profile' && (
            <div className="settings-content">
              <h3>{t('settings_profile_title')}</h3>
              {message && <p>{message}</p>}
              <div className="form-group">
                <label htmlFor="username">{t('settings_username_label')}</label>
                <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="profile-pic">{t('settings_profile_pic_label')}</label>
                <input type="file" id="profile-pic" onChange={handleFileChange} accept="image/*" />
              </div>
              <div className="form-group">
                <label htmlFor="bio">{t('settings_bio_label')}</label>
                <textarea id="bio" rows="4" value={bio} onChange={(e) => setBio(e.target.value)}></textarea>
              </div>
              <button onClick={handleProfileSave}>{t('settings_save_button')}</button>
            </div>
          )}

          {/* 趣味設定タブの内容（コンポーネント呼び出し） */}
          {activeTab === 'hobbies' && (
            <HobbiesManager isOwner={true} />
          )}

          {/* アカウント設定タブの内容 */}
          {activeTab === 'account' && (
            <div className="settings-content">
              <h3>{t('settings_account_title')}</h3>
              {message && <p>{message}</p>}
              <div className="form-group">
                <label htmlFor="email">{t('settings_email_label')}</label>
                <input type="email" id="email" value={user?.email || ''} disabled />
              </div>
              <hr />
              <h4>{t('settings_change_password_title')}</h4>
              <div className="form-group">
                <label htmlFor="current-password">{t('settings_current_password_label')}</label>
                <input type="password" id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">{t('settings_new_password_label')}</label>
                <input type="password" id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <button onClick={handleChangePassword}>{t('settings_change_password_button')}</button>
            </div>
          )}

          {/* 通知設定タブの内容 */}
          {activeTab === 'notifications' && (
            <div className="settings-content">
              <h3>{t('settings_notifications_title')}</h3>
              {message && <p>{message}</p>}
              <div className="toggle-group">
                <label>{t('settings_email_notifications_label')}</label>
                <label className="switch"><input type="checkbox" checked={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} /><span className="slider round"></span></label>
              </div>
              <div className="toggle-group">
                <label>{t('settings_feature_announcements_label')}</label>
                <label className="switch"><input type="checkbox" checked={featureAnnouncements} onChange={() => setFeatureAnnouncements(!featureAnnouncements)} /><span className="slider round"></span></label>
              </div>
              <div className="toggle-group">
                <label>{t('settings_maintenance_info_label')}</label>
                <label className="switch"><input type="checkbox" checked={maintenanceInfo} onChange={() => setMaintenanceInfo(!maintenanceInfo)} /><span className="slider round"></span></label>
              </div>
              <button onClick={handleNotificationSave}>{t('settings_save_button')}</button>
            </div>
          )}

          {/* 一般設定タブの内容（言語・テーマ・アカウント削除） */}
          {activeTab === 'general' && (
            <div className="settings-content">
              <h3>{t('settings_general_title')}</h3>
              {message && <p>{message}</p>}
              <div className="form-group">
                <label htmlFor="language">{t('settings_language_label')}</label>
                <select id="language" value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁體中文</option>
                  <option value="ko">한국어</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                  <option value="pt">Português</option>
                  <option value="ru">Русский</option>
                  <option value="ar">العربية</option>
                  <option value="th">ไทย</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="id">Bahasa Indonesia</option>
                  <option value="hi">हिन्दी</option>
                  <option value="tr">Türkçe</option>
                  <option value="nl">Nederlands</option>
                  <option value="sv">Svenska</option>
                  <option value="no">Norsk</option>
                  <option value="da">Dansk</option>
                  <option value="fi">Suomi</option>
                  <option value="pl">Polski</option>
                  <option value="cs">Čeština</option>
                  <option value="hu">Magyar</option>
                  <option value="ro">Română</option>
                  <option value="el">Ελληνικά</option>
                  <option value="he">עברית</option>
                  <option value="ms">Bahasa Melayu</option>
                  <option value="tl">Tagalog</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('settings_theme_label')}</label>
                <div className="radio-group">
                  <label><input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} /> {t('settings_theme_light')}</label>
                  <label><input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} /> {t('settings_theme_dark')}</label>
                </div>
              </div>
              <button onClick={handleGeneralSave}>{t('settings_save_button')}</button>
              <hr />
              <h4>{t('settings_delete_account_title')}</h4>
              <p>{t('settings_delete_account_warning')}</p>
              <div className="form-group">
                <label htmlFor="delete-password">{t('settings_delete_password_label')}</label>
                <input type="password" id="delete-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
              </div>
              <button className="danger" onClick={handleDeleteAccount}>{t('settings_delete_account_button')}</button>
            </div>
          )}
          {/* バックアップ設定タブの内容 */}
          {activeTab === 'backups' && (
            <div className="settings-content">
              <h3>{t('settings_backups_title', 'データのバックアップ')}</h3>

              {/* 成功/エラーメッセージの表示 */}
              {message && <p className={message.includes('エラー') || message.includes('Error') ? 'error-message' : 'success-message'}>{message}</p>}

              {/* ゲームライブラリのバックアップセクション */}
              <div className="backup-section">
                <h4>{t('settings_backup_games_title', 'ゲームライブラリ')}</h4>
                <p>{t('settings_backup_games_desc', 'プレイ済みゲームとBGMデータを保存します。')}</p>
                <div className="backup-actions">

                  {/* エクスポートボタン（データをダウンロード） */}
                  <button onClick={() => {
                    setMessage('');
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    // バックアップAPIを呼び出し
                    fetch('http://localhost:5000/api/backup/games', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          // JSONデータをBlobオブジェクトに変換してダウンロードリンクを作成
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `games_backup_${new Date().toISOString().slice(0, 10)}.json`; // ファイル名に日付を含める
                          a.click(); // 自動クリックでダウンロード開始
                          window.URL.revokeObjectURL(url); // メモリ解放
                          setMessage(t('settings_backup_export_success', 'エクスポートが完了しました。'));
                        } else {
                          setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました: ') + data.error);
                        }
                      })
                      .catch(err => setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました。')));
                  }}>{t('settings_backup_export_button', 'エクスポート')}</button>

                  {/* インポートボタン（ファイルをアップロード） */}
                  <label className="import-button">
                    {t('settings_backup_import_button', 'インポート')}
                    <input type="file" style={{ display: 'none' }} accept=".json" onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      // ファイルの内容を読み込む
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        try {
                          const json = JSON.parse(e.target.result);
                          // 簡単な形式チェック
                          if (!json.games) throw new Error('Invalid format');

                          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                          // インポートAPIを呼び出し
                          const res = await fetch('http://localhost:5000/api/backup/games/import', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ games: json.games })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setMessage(data.message); // 「追加: X件, スキップ: Y件」などの詳細を表示
                          } else {
                            setMessage(t('settings_backup_import_error', 'インポートに失敗しました: ') + data.error);
                          }
                        } catch (err) {
                          setMessage(t('settings_backup_import_invalid', '無効なファイル形式です。'));
                        }
                      };
                      reader.readAsText(file); // テキストとして読み込み開始
                      e.target.value = ''; // 同じファイルを再選択できるようにリセット
                    }} />
                  </label>
                </div>
              </div>
              <hr />

              {/* 読書記録のバックアップセクション */}
              <div className="backup-section">
                <h4>{t('settings_backup_reading_title', '読書記録')}</h4>
                <p>{t('settings_backup_reading_desc', '登録作家と書籍データを保存します。')}</p>
                <div className="backup-actions">
                  <button onClick={() => {
                    setMessage('');
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    fetch('http://localhost:5000/api/backup/reading', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `reading_backup_${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          setMessage(t('settings_backup_export_success', 'エクスポートが完了しました。'));
                        } else {
                          setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました: ') + data.error);
                        }
                      })
                      .catch(err => setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました。')));
                  }}>{t('settings_backup_export_button', 'エクスポート')}</button>

                  <label className="import-button">
                    {t('settings_backup_import_button', 'インポート')}
                    <input type="file" style={{ display: 'none' }} accept=".json" onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        try {
                          const json = JSON.parse(e.target.result);
                          if (!json.readingData) throw new Error('Invalid format');

                          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                          const res = await fetch('http://localhost:5000/api/backup/reading/import', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ readingData: json.readingData })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setMessage(data.message);
                          } else {
                            setMessage(t('settings_backup_import_error', 'インポートに失敗しました: ') + data.error);
                          }
                        } catch (err) {
                          setMessage(t('settings_backup_import_invalid', '無効なファイル形式です。'));
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
              <hr />

              {/* 音楽鑑賞のバックアップセクション */}
              <div className="backup-section">
                <h4>{t('settings_backup_music_title', '音楽鑑賞')}</h4>
                <p>{t('settings_backup_music_desc', '音楽の好みとお気に入りの曲データを保存します。')}</p>
                <div className="backup-actions">
                  <button onClick={() => {
                    setMessage('');
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    fetch('http://localhost:5000/api/backup/music', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `music_backup_${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          setMessage(t('settings_backup_export_success', 'エクスポートが完了しました。'));
                        } else {
                          setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました: ') + data.error);
                        }
                      })
                      .catch(err => setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました。')));
                  }}>{t('settings_backup_export_button', 'エクスポート')}</button>

                  <label className="import-button">
                    {t('settings_backup_import_button', 'インポート')}
                    <input type="file" style={{ display: 'none' }} accept=".json" onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        try {
                          const json = JSON.parse(e.target.result);
                          if (!json.musicData) throw new Error('Invalid format');

                          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                          const res = await fetch('http://localhost:5000/api/backup/music/import', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ musicData: json.musicData })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setMessage(data.message);
                          } else {
                            setMessage(t('settings_backup_import_error', 'インポートに失敗しました: ') + data.error);
                          }
                        } catch (err) {
                          setMessage(t('settings_backup_import_invalid', '無効なファイル形式です。'));
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
              <hr />

              {/* アニメのバックアップセクション */}
              <div className="backup-section">
                <h4>{t('settings_backup_anime_title', 'アニメ')}</h4>
                <p>{t('settings_backup_anime_desc', 'アニメの登録データを保存します。')}</p>
                <div className="backup-actions">
                  <button onClick={() => {
                    setMessage('');
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    fetch('http://localhost:5000/api/backup/anime', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `anime_backup_${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          setMessage(t('settings_backup_export_success', 'エクスポートが完了しました。'));
                        } else {
                          setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました: ') + data.error);
                        }
                      })
                      .catch(err => setMessage(t('settings_backup_export_error', 'エクスポートに失敗しました。')));
                  }}>{t('settings_backup_export_button', 'エクスポート')}</button>

                  <label className="import-button">
                    {t('settings_backup_import_button', 'インポート')}
                    <input type="file" style={{ display: 'none' }} accept=".json" onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        try {
                          const json = JSON.parse(e.target.result);
                          if (!json.animeData) throw new Error('Invalid format');

                          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                          const res = await fetch('http://localhost:5000/api/backup/anime/import', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ animeData: json.animeData })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setMessage(data.message);
                          } else {
                            setMessage(t('settings_backup_import_error', 'インポートに失敗しました: ') + data.error);
                          }
                        } catch (err) {
                          setMessage(t('settings_backup_import_invalid', '無効なファイル形式です。'));
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 多言語対応コンポーネントとしてエクスポート
export default withTranslation()(Settings);