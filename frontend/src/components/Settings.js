// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect } from 'react';
import { withTranslation } from 'react-i18next'; // 多言語対応のための高階コンポーネント
import HobbiesManager from './HobbiesManager'; // 趣味管理コンポーネント
import '../Settings.css'; // このコンポーネント専用のスタイルシート

// 設定ページのメインコンポーネント
function Settings({ user, onUpdateUser, onLogout, t, i18n, onLanguageChange, language }) {
  // 現在表示している設定タブ（'profile', 'account'など）を管理するState
  const [activeTab, setActiveTab] = useState('profile');
  
  // --- 各タブの入力値を管理するState ---
  // プロフィールタブ
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicFile, setProfilePicFile] = useState(null); // アップロードするプロフィール画像ファイル

  // アカウントタブ
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 通知タブ
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [featureAnnouncements, setFeatureAnnouncements] = useState(true);
  const [maintenanceInfo, setMaintenanceInfo] = useState(true);

  // 一般設定タブ
  const [theme, setTheme] = useState('light');
  const [deletePassword, setDeletePassword] = useState(''); // アカウント削除時のパスワード

  // ユーザーへのメッセージ（成功・エラーなど）を表示するためのState
  const [message, setMessage] = useState('');

  // userオブジェクト（親から渡されるログインユーザー情報）が変更されたときに実行
  useEffect(() => {
    if (user) {
      // ユーザー情報から各Stateを初期化する
      setUsername(user.name || '');
      setBio(user.bio || '');
      setEmailNotifications(user.email_notifications === 1);
      setFeatureAnnouncements(user.feature_announcements === 1);
      setMaintenanceInfo(user.maintenance_info === 1);
      setTheme(user.theme || 'light');
    }
  }, [user]); // userが変更されるたびに再実行

  // プロフィール画像のファイルが選択されたときに呼ばれる
  const handleFileChange = (e) => {
    setProfilePicFile(e.target.files[0]);
  };

  // 「プロフィールを保存」ボタンの処理
  const handleProfileSave = async () => {
    setMessage(''); // メッセージをリセット
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    // FormDataを使って、テキストとファイルを一緒に送信する
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
          // 'Content-Type'はFormDataを使う場合、ブラウザが自動で設定するため指定しない
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setMessage(t('settings_message_profile_updated'));
        onUpdateUser(data.user); // 親コンポーネントにユーザー情報の更新を通知
        setProfilePicFile(null); // ファイル選択をリセット
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_profile_update_failed'));
    }
  };

  // 「パスワードを変更」ボタンの処理
  const handleChangePassword = async () => {
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }
    // パスワード強度の簡易チェック
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
        // 成功したら入力欄をクリア
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_password_change_failed'));
    }
  };

  // 「通知設定を保存」ボタンの処理
  const handleNotificationSave = async () => {
    setMessage('');
    const token = localStorage.getItem('token');
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
        // 設定を保存した後、最新のユーザー情報を取得して親コンポーネントに通知
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

  // 「アカウントを削除」ボタンの処理
  const handleDeleteAccount = async () => {
    setMessage('');
    // 重要な操作なので確認ダイアログを表示
    if (!window.confirm(t('settings_confirm_delete_account'))) {
      return;
    }

    const token = localStorage.getItem('token');
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
        body: JSON.stringify({ password: deletePassword }) // パスワードを送信して本人確認
      });

      const data = await response.json();
      if (data.success) {
        alert(t('settings_message_account_deleted'));
        onLogout(); // 親コンポーネントのログアウト処理を呼び出す
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_account_delete_failed'));
    }
  };

  // 「一般設定を保存」ボタンの処理
  const handleGeneralSave = async () => {
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    const generalSettings = { language, theme };

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
        onUpdateUser(data.user); // 親コンポーネントにユーザー情報の更新を通知
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_general_update_failed'));
    }
  };
  
  // コンポーネントの描画部分
  return (
    <div className="settings-container">
      <h2>{t('settings_title')}</h2>
      <div className="settings-layout">
        {/* サイドバー：各設定タブへの切り替えボタン */}
        <div className="settings-sidebar">
          <button onClick={() => { setMessage(''); setActiveTab('profile'); }} className={activeTab === 'profile' ? 'active' : ''}>{t('settings_profile_button')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('hobbies'); }} className={activeTab === 'hobbies' ? 'active' : ''}>{t('settings_hobbies_button', '趣味')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('account'); }} className={activeTab === 'account' ? 'active' : ''}>{t('settings_account_button')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('notifications'); }} className={activeTab === 'notifications' ? 'active' : ''}>{t('settings_notifications_button')}</button>
          <button onClick={() => { setMessage(''); setActiveTab('general'); }} className={activeTab === 'general' ? 'active' : ''}>{t('settings_general_title')}</button>
        </div>
        {/* メインコンテンツ：選択中のタブに応じて内容を切り替える */}
        <div className="settings-main">
          {/* プロフィールタブ */}
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
          {/* 趣味タブ */}
          {activeTab === 'hobbies' && (
            <HobbiesManager isOwner={true} />
          )}
          {/* アカウントタブ */}
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
          {/* 通知タブ */}
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
          {/* 一般設定タブ */}
          {activeTab === 'general' && (
            <div className="settings-content">
              <h3>{t('settings_general_title')}</h3>
              {message && <p>{message}</p>}
              <div className="form-group">
                <label htmlFor="language">{t('settings_language_label')}</label>
                <select id="language" value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                  {/* 多言語の選択肢 */}
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                  {/* ... 他の言語 ... */}
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
        </div>
      </div>
    </div>
  );
}

// withTranslation()でコンポーネントをラップすることで、t関数などの多言語対応機能がpropsとして渡される
export default withTranslation()(Settings);
