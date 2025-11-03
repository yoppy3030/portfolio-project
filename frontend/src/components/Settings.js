import React, { useState, useEffect } from 'react';
import { withTranslation } from 'react-i18next';
import HobbiesManager from './HobbiesManager';
import '../Settings.css';

function Settings({ user, onUserUpdate, onLogout, t, i18n, onLanguageChange, language }) {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicFile, setProfilePicFile] = useState(null);

  // Account state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [featureAnnouncements, setFeatureAnnouncements] = useState(true);
  const [maintenanceInfo, setMaintenanceInfo] = useState(true);

  // General state
  const [theme, setTheme] = useState('light');
  const [deletePassword, setDeletePassword] = useState('');

  // General message state
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.name || '');
      setBio(user.bio || '');
      setEmailNotifications(user.email_notifications === 1 ? true : false);
      setFeatureAnnouncements(user.feature_announcements === 1 ? true : false);
      setMaintenanceInfo(user.maintenance_info === 1 ? true : false);
      setTheme(user.theme || 'light');
    }
  }, [user]);

  const handleFileChange = (e) => {
    setProfilePicFile(e.target.files[0]);
  };

  const handleProfileSave = async () => {
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

    let profileData = { name: username, bio };

    if (profilePicFile) {
      const reader = new FileReader();
      reader.readAsDataURL(profilePicFile);
      reader.onloadend = async () => {
        profileData.iconUrl = reader.result;
        await updateProfile(profileData);
      };
      reader.onerror = () => {
        setMessage(t('settings_message_file_read_error'));
      };
    } else {
      await updateProfile(profileData);
    }
  };

  const updateProfile = async (profileData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();
      if (data.success) {
        setMessage(t('settings_message_profile_updated'));
        onUserUpdate(data.user);
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_profile_update_failed'));
    }
  }

  const handleChangePassword = async () => {
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage(t('settings_message_not_logged_in'));
      return;
    }

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
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_password_change_failed'));
    }
  };

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
        const verifyResponse = await fetch('http://localhost:5000/api/verify-token', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const verifyData = await verifyResponse.json();
        if (verifyData.success) {
          onUserUpdate(verifyData.user);
        }
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_notifications_update_failed'));
    }
  };

  const handleDeleteAccount = async () => {
    setMessage('');
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
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await response.json();
      if (data.success) {
        alert(t('settings_message_account_deleted'));
        onLogout();
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage(t('settings_message_account_delete_failed'));
    }
  };

  const handleGeneralSave = async () => {
    setMessage('');
    const token = localStorage.getItem('token');
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
        onUserUpdate(data.user);
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
            <HobbiesManager />
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

export default withTranslation()(Settings);