/**
 * ユーザー設定画面のメインコンポーネント
 * 
 * 【役割】
 * ユーザーのプロフィール、趣味、アカウントセキュリティ、通知設定、バックアップなどの
 * 全てのユーザー設定を一元管理する画面です。
 * 
 * 【主な機能】
 * 1. プロフィール編集
 *    - ユーザー名、自己紹介の変更
 *    - プロフィール画像のアップロード
 * 
 * 2. 趣味（Hobbies）管理
 *    - ゲーム、読書、音楽などの嗜好データの管理（HobbiesManagerを呼び出し）
 * 
 * 3. アカウントセキュリティ
 *    - パスワードの変更
 *    - アカウントの完全削除
 * 
 * 4. 通知設定
 *    - メール通知、新機能、メンテナンス情報の受け取り設定
 * 
 * 5. 一般設定
 *    - 言語設定（i18n）、テーマ設定（ライト/ダーク）
 * 
 * 6. データバックアップ
 *    - ゲーム、読書、音楽データのJSONエクスポート/インポート
 */

import React, { useState, useEffect } from 'react';
import { withTranslation } from 'react-i18next';
import HobbiesManager from './HobbiesManager';
import '../Settings.css';

// ユーザー設定画面のメインコンポーネント
function Settings({ user, onUpdateUser, onLogout, t, i18n, onLanguageChange, language }) {
  // --- 画面表示用の状態管理 (State) ---
  // activeTab: 現在右側に表示している設定カテゴリー（profile, hobbies, accountなど）
  const [activeTab, setActiveTab] = useState('profile');

  // --- 1. プロフィール設定用の状態 ---
  const [username, setUsername] = useState(''); // 画面上のユーザー名
  const [bio, setBio] = useState(''); // 画面上の自己紹介文
  const [profilePicFile, setProfilePicFile] = useState(null); // アップロード待ちの画像ファイル

  // --- 2. アカウント設定用の状態 ---
  const [currentPassword, setCurrentPassword] = useState(''); // 現在のパスワード（確認用）
  const [newPassword, setNewPassword] = useState(''); // 新しいパスワード

  // --- 3. 通知設定用の状態 ---
  const [emailNotifications, setEmailNotifications] = useState(true); // 全体通知を許可するか
  const [featureAnnouncements, setFeatureAnnouncements] = useState(true); // 新機能情報を受け取るか
  const [maintenanceInfo, setMaintenanceInfo] = useState(true); // メンテナンス情報を受け取るか

  // --- 4. 一般設定用の状態 ---
  const [theme, setTheme] = useState('light'); // ライト/ダークテーマの選択状態
  const [deletePassword, setDeletePassword] = useState(''); // アカウント削除時の最終確認用パスワード

  // サーバーとの通信結果（「保存しました」やエラー）を表示するためのテキスト
  const [message, setMessage] = useState('');

  // ユーザーがログインして「user」プロパティが変わったら、現在の値を入力欄に埋める
  useEffect(() => {
    if (user) {
      setUsername(user.name || '');
      setBio(user.bio || '');
      // データベースの数値(1/0)をJavaScriptの真偽値(true/false)に変換してセット
      setEmailNotifications(user.email_notifications === 1 ? true : false);
      setFeatureAnnouncements(user.feature_announcements === 1 ? true : false);
      setMaintenanceInfo(user.maintenance_info === 1 ? true : false);
      setTheme(user.theme || 'light');
    }
  }, [user]);

  /**
   * ファイルが選択されたときに、ファイルの中身を状態に保存する
   */
  const handleFileChange = (e) => {
    setProfilePicFile(e.target.files[0]);
  };

  /**
   * プロフィール情報（名前、自己紹介、アイコン）を保存する処理
   */
  const handleProfileSave = async () => {
    setMessage('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    // 文字だけでなくファイルも送るため「FormData」という形式を使います
    const formData = new FormData();
    formData.append('name', username);
    formData.append('bio', bio);
    if (profilePicFile) {
      formData.append('icon', profilePicFile);
    }

    try {
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // FormDataを送る際は Content-Type を書くとエラーになるので省略します
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setMessage(t('settings_message_profile_updated'));
        onUpdateUser(data.user); // 全体（App.js）のユーザー情報を新しいものに差し替える
        setProfilePicFile(null); // ファイル入力を完了したのでクリア
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_profile_update_failed'));
    }
  };

  /**
   * パスワードを変更する処理
   */
  const handleChangePassword = async () => {
    setMessage('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    // 最低限のバリデーション
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
        // 成功したら入力欄を空にする
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
   * 通知設定（メール、新機能、メンテナンス）を保存する処理
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
        // 最新のユーザー情報を再取得してアプリ全体に反映
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
   * アカウントを完全に削除する処理（戻せないので確認ダイアログを出します）
   */
  const handleDeleteAccount = async () => {
    setMessage('');
    if (!window.confirm(t('settings_confirm_delete_account'))) {
      return; // キャンセルされたら何もしない
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
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await response.json();
      if (data.success) {
        alert(t('settings_message_account_deleted'));
        onLogout(); // ログインできないようにログアウトさせる
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_account_delete_failed'));
    }
  };

  /**
   * 一般設定（言語、テーマ）をサーバーに保存する処理
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
        onUpdateUser(data.user);
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_general_update_failed'));
    }
  };

  return (
    <div className="settings-container">
      <h2>{t('settings_title')}</h2>
      <div className="settings-layout">
        <div className="settings-sidebar">
          <button onClick={() => { setMessage(''); setActiveTab('profile'); }} className={activeTab === 'profile' ? 'active' : ''}>{t('settings_profile_button')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('hobbies'); }} className={activeTab === 'hobbies' ? 'active' : ''}>{t('settings_hobbies_button', '趣味')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('account'); }} className={activeTab === 'account' ? 'active' : ''}>{t('settings_account_button')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('notifications'); }} className={activeTab === 'notifications' ? 'active' : ''}>{t('settings_notifications_button')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('general'); }} className={activeTab === 'general' ? 'active' : ''}>{t('settings_general_title')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('backups'); }} className={activeTab === 'backups' ? 'active' : ''}>{t('settings_backups_button', 'バックアップ')}</button>
        </div>
        <div className="settings-main">
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
          {activeTab === 'hobbies' && (
            <HobbiesManager isOwner={true} />
          )}
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
          {activeTab === 'backups' && (
            <div className="settings-content">
              <h3>{t('settings_backups_title', 'データのバックアップ')}</h3>
              {message && <p className={message.includes('エラー') || message.includes('Error') ? 'error-message' : 'success-message'}>{message}</p>}

              <div className="backup-section">
                <h4>{t('settings_backup_games_title', 'ゲームライブラリ')}</h4>
                <p>{t('settings_backup_games_desc', 'プレイ済みゲームとBGMデータを保存します。')}</p>
                <div className="backup-actions">
                  <button onClick={() => {
                    setMessage('');
                    const token = localStorage.getItem('token');
                    fetch('http://localhost:5000/api/backup/games', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `games_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
                          if (!json.games) throw new Error('Invalid format');

                          const token = localStorage.getItem('token');
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
                            setMessage(data.message);
                          } else {
                            setMessage(t('settings_backup_import_error', 'インポートに失敗しました: ') + data.error);
                          }
                        } catch (err) {
                          setMessage(t('settings_backup_import_invalid', '無効なファイル形式です。'));
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = ''; // Reset input
                    }} />
                  </label>
                </div>
              </div>
              <hr />

              <div className="backup-section">
                <h4>{t('settings_backup_reading_title', '読書記録')}</h4>
                <p>{t('settings_backup_reading_desc', '登録作家と書籍データを保存します。')}</p>
                <div className="backup-actions">
                  <button onClick={() => {
                    setMessage('');
                    const token = localStorage.getItem('token');
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

                          const token = localStorage.getItem('token');
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
                      e.target.value = ''; // Reset input
                    }} />
                  </label>
                </div>
              </div>
              <hr />

              <div className="backup-section">
                <h4>{t('settings_backup_music_title', '音楽鑑賞')}</h4>
                <p>{t('settings_backup_music_desc', '音楽の好みとお気に入りの曲データを保存します。')}</p>
                <div className="backup-actions">
                  <button onClick={() => {
                    setMessage('');
                    const token = localStorage.getItem('token');
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

                          const token = localStorage.getItem('token');
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
                      e.target.value = ''; // Reset input
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

export default withTranslation()(Settings);