import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GameLibraryModal from './GameLibraryModal';
import MusicAppreciationManager from './MusicAppreciationManager'; // 新しくインポート
import '../Settings.css';

function HobbiesManager({ isOwner }) {
  const [hobbies, setHobbies] = useState([]);
  const [newHobby, setNewHobby] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeHobbyTab, setActiveHobbyTab] = useState('general'); // 新しい状態変数
  const [isGameModalOpen, setGameModalOpen] = useState(false);

  const { t } = useTranslation();

  const fetchHobbies = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setHobbies(data.hobbies);
      } else {
        setError(data.error || t('hobbies_alert_fetch_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeHobbyTab === 'general') { // 'general'タブがアクティブな時のみフェッチ
      fetchHobbies();
    }
  }, [fetchHobbies, activeHobbyTab]);

  const handleAddHobby = async () => {
    if (!newHobby.trim()) {
      setError(t('hobbies_alert_name_required'));
      return;
    }
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newHobby })
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t('hobbies_message_added'));
        setNewHobby('');
        fetchHobbies();
      } else {
        setError(data.error || t('hobbies_alert_add_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    }
  };

  const handleDeleteHobby = async (hobbyId) => {
    if (!window.confirm(t('hobbies_confirm_delete'))) {
      return;
    }
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/hobbies/${hobbyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t('hobbies_message_deleted'));
        fetchHobbies();
      } else {
        setError(data.error || t('hobbies_alert_delete_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    }
  };

  return (
    <div className="settings-content">
      <h3>{t('hobbies_title')}</h3>

      <div className="settings-sub-navigation">
        <button 
          className={activeHobbyTab === 'general' ? 'active' : ''} 
          onClick={() => { setActiveHobbyTab('general'); setMessage(''); setError(''); }}
        >
          {t('hobbies_tab_general')}
        </button>
        <button 
          className={activeHobbyTab === 'game' ? 'active' : ''} 
          onClick={() => { setActiveHobbyTab('game'); setMessage(''); setError(''); setGameModalOpen(true); }}
        >
          {t('hobbies_tab_game_records')}
        </button>
        <button 
          className={activeHobbyTab === 'music' ? 'active' : ''} 
          onClick={() => { setActiveHobbyTab('music'); setMessage(''); setError(''); }}
        >
          {t('hobbies_tab_music_appreciation')}
        </button>
      </div>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {activeHobbyTab === 'general' && (
        <>
          <div className="form-group">
            <label htmlFor="new-hobby">{t('hobbies_label_add_new')}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                id="new-hobby"
                value={newHobby}
                onChange={(e) => setNewHobby(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddHobby()}
                placeholder={t('hobbies_placeholder_example')}
                disabled={loading}
              />
              <button onClick={handleAddHobby} disabled={loading}>
                {loading ? t('hobbies_adding') : t('hobbies_add_button')}
              </button>
            </div>
          </div>

          <hr />

          <h4>{t('hobbies_current_hobbies')}</h4>
          {loading && <p>{t('loading')}</p>}
          <div className="hobbies-list">
            {hobbies.length > 0 ? (
              hobbies.map(hobby => (
                <div key={hobby.id} className="hobby-item">
                  <span>{hobby.name}</span>
                  <div className="hobby-actions">
                    <button className="btn-danger-outline" onClick={() => handleDeleteHobby(hobby.id)}>{t('hobbies_delete_button')}</button>
                  </div>
                </div>
              ))
            ) : (
              !loading && <p>{t('hobbies_no_hobbies_registered')}</p>
            )}
          </div>
        </>
      )}

      {activeHobbyTab === 'game' && isGameModalOpen && (
        <GameLibraryModal onClose={() => setGameModalOpen(false)} isOwner={isOwner} />
      )}

      {activeHobbyTab === 'music' && (
        <MusicAppreciationManager />
      )}
    </div>
  );
}

export default HobbiesManager;