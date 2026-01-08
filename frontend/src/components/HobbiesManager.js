import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MusicAppreciationManager from './MusicAppreciationManager';
import GameLibraryModal from './GameLibraryModal'; // GameLibraryModalをインポート
import ReadingHobbyModal from './ReadingHobbyModal'; // ReadingHobbyModalをインポート
import './HobbiesDisplay.css';

function HobbiesManager({ isOwner }) {
  const { t } = useTranslation();
  const [hobbies, setHobbies] = useState([]);
  const [newHobby, setNewHobby] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGameLibrary, setShowGameLibrary] = useState(false); // ゲーム用モーダル表示用のstate
  const [showReadingModal, setShowReadingModal] = useState(false); // 読書用モーダル表示用のstate

  const fetchHobbies = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        headers: { 'Authorization': `Bearer ${token}` },
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
    if (isOwner) {
      fetchHobbies();
    }
  }, [isOwner, fetchHobbies]);

  const handleAddHobby = async () => {
    if (!newHobby.trim()) return;
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newHobby }),
      });
      const data = await response.json();
      if (data.success) {
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
    if (!window.confirm(t('hobbies_confirm_delete'))) return;
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/hobbies/${hobbyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchHobbies(); // リストを再取得
      } else {
        setError(data.error || t('hobbies_alert_delete_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    }
  };

  // 「音楽鑑賞」の趣味があるかどうかをチェック
  const hasMusicHobby = hobbies.some(hobby => hobby.name === '音楽鑑賞');

  if (!isOwner) return null;

  return (
    <div className="hobbies-manager">
      <h4>{t('hobbies_title')}</h4>
      {error && <p className="error-message">{error}</p>}
      
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
          />
          <button onClick={handleAddHobby} disabled={loading}>
            {loading ? t('hobbies_adding') : t('hobbies_add_button')}
          </button>
        </div>
      </div>

      <div className="hobbies-list">
        {loading ? <p>{t('loading')}</p> : (
          hobbies.length > 0 ? (
            hobbies.map(hobby => (
              <div key={hobby.id} className="hobby-item">
                <span>{hobby.name}</span>
                <div className="hobby-actions">
                  {hobby.name === 'ゲーム' && (
                    <button onClick={() => setShowGameLibrary(true)} className="btn-secondary-outline">
                      {t('hobbies_edit_play_records')}
                    </button>
                  )}
                  {hobby.name === '読書' && (
                    <button onClick={() => setShowReadingModal(true)} className="btn-secondary-outline">
                      {t('hobbies.manageReadingButton')}
                    </button>
                  )}
                  <button onClick={() => handleDeleteHobby(hobby.id)} className="btn-danger-outline">
                    {t('hobbies_delete_button')}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>{t('hobbies_no_hobbies_registered')}</p>
          )
        )}
      </div>

      {/* 音楽鑑賞の趣味がある場合にのみ、音楽設定セクションを表示 */}
      {hasMusicHobby && (
        <div className="music-appreciation-section" style={{ marginTop: '2rem' }}>
          <hr />
          <MusicAppreciationManager />
        </div>
      )}

      {/* ゲームライブラリモーダルの表示 */}
      {showGameLibrary && (
        <GameLibraryModal 
          isOwner={true}
          onClose={() => setShowGameLibrary(false)} 
        />
      )}

      {/* 読書管理モーダルの表示 */}
      {showReadingModal && (
        <ReadingHobbyModal
          isOwner={isOwner}
          onClose={() => setShowReadingModal(false)}
        />
      )}
    </div>
  );
}

export default HobbiesManager;
