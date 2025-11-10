import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GameLibraryModal from './GameLibraryModal'; // モーダルをインポート
import '../Settings.css'; // スタイルを共有

function HobbiesManager({ isOwner }) {
  const [hobbies, setHobbies] = useState([]);
  const [newHobby, setNewHobby] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isGameModalOpen, setGameModalOpen] = useState(false); // モーダルの表示状態

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
    fetchHobbies();
  }, [fetchHobbies]);

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
        fetchHobbies(); // リストを再取得
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
        fetchHobbies(); // リストを再取得
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
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

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
                {hobby.name.toLowerCase() === 'ゲーム' && (
                  <button className="btn-secondary" style={{ marginRight: '10px' }} onClick={() => setGameModalOpen(true)}>{t('hobbies_edit_play_records')}</button>
                )}
                <button className="btn-danger-outline" onClick={() => handleDeleteHobby(hobby.id)}>{t('hobbies_delete_button')}</button>
              </div>
            </div>
          ))
        ) : (
          !loading && <p>{t('hobbies_no_hobbies_registered')}</p>
        )}
      </div>

      {isGameModalOpen && <GameLibraryModal onClose={() => setGameModalOpen(false)} isOwner={isOwner} />}
    </div>
  );
}

export default HobbiesManager;