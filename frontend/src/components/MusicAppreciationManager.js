import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../Settings.css'; // スタイルを共有
import ManageSongsModal from './ManageSongsModal'; // ★ インポート

function MusicAppreciationManager() {
  const [genres, setGenres] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [selectedGenreId, setSelectedGenreId] = useState('');
  const [newArtistName, setNewArtistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [managingSongsOf, setManagingSongsOf] = useState(null); // ★ 曲管理モーダルのためのstate

  const { t } = useTranslation();

  // ジャンルリストの取得
  const fetchGenres = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/music-genres');
      const data = await response.json();
      if (data.success) {
        setGenres(data.genres);
        if (data.genres.length > 0) {
          setSelectedGenreId(data.genres[0].id); // デフォルトで最初のジャンルを選択
        }
      } else {
        setError(data.error || t('music_alert_fetch_genres_failed'));
      }
    } catch (err) {
      setError(t('music_alert_server_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ユーザーの音楽設定リストの取得
  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('settings_message_not_logged_in'));
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/user-music-preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.preferences);
      } else {
        setError(data.error || t('music_alert_fetch_preferences_failed'));
      }
    } catch (err) {
      setError(t('music_alert_server_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchGenres();
    fetchPreferences();
  }, [fetchGenres, fetchPreferences]);

  const handleAddPreference = async () => {
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('settings_message_not_logged_in'));
      return;
    }

    if (!selectedGenreId && !newArtistName.trim()) {
      setError(t('music_alert_genre_or_artist_required'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/user-music-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          genre_id: selectedGenreId || null, 
          artist_name: newArtistName.trim() || null 
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t('music_message_preference_added'));
        setNewArtistName('');
        fetchPreferences(); // リストを再取得
      } else {
        setError(data.error || t('music_alert_add_preference_failed'));
      }
    } catch (err) {
      setError(t('music_alert_server_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreference = async (preferenceId) => {
    if (!window.confirm(t('music_confirm_delete_preference'))) {
      return;
    }
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('settings_message_not_logged_in'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/user-music-preferences/${preferenceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t('music_message_preference_deleted'));
        fetchPreferences(); // リストを再取得
      } else {
        setError(data.error || t('music_alert_delete_preference_failed'));
      }
    } catch (err) {
      setError(t('music_alert_server_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="music-appreciation-manager">
      <h4>{t('music_title')}</h4>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="form-group">
        <label htmlFor="music-genre-select">{t('music_label_select_genre')}</label>
        <select 
          id="music-genre-select" 
          value={selectedGenreId} 
          onChange={(e) => setSelectedGenreId(e.target.value)}
          disabled={loading}
        >
          <option value="">{t('music_option_no_genre')}</option>
          {genres.map(genre => (
            <option key={genre.id} value={genre.id}>{genre.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="new-artist-name">{t('music_label_artist_name')}</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            id="new-artist-name"
            value={newArtistName}
            onChange={(e) => setNewArtistName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddPreference()}
            placeholder={t('music_placeholder_artist_name')}
            disabled={loading}
          />
          <button onClick={handleAddPreference} disabled={loading}>
            {loading ? t('music_adding') : t('music_add_button')}
          </button>
        </div>
      </div>

      <hr />

      <h4>{t('music_current_preferences')}</h4>
      {loading && <p>{t('loading')}</p>}
      <div className="music-preferences-list">
        {preferences.length > 0 ? (
          preferences.map(pref => (
            <div key={pref.id} className="music-preference-item">
              <span>
                {pref.genre_name ? `[${pref.genre_name}] ` : ''}
                {pref.artist_name || t('music_no_artist_specified')}
              </span>
              {/* ★ ボタン群を追加 */}
              <div className="preference-actions">
                <button className="btn-secondary-outline" onClick={() => setManagingSongsOf(pref)}>
                  曲を管理 ({pref.songs ? pref.songs.length : 0})
                </button>
                <button className="btn-danger-outline" onClick={() => handleDeletePreference(pref.id)} disabled={loading}>
                  {t('music_delete_button')}
                </button>
              </div>
            </div>
          ))
        ) : (
          !loading && <p>{t('music_no_preferences_registered')}</p>
        )}
      </div>

      {/* ★ モーダル表示のロジック */}
      {managingSongsOf && (
        <ManageSongsModal 
          preference={managingSongsOf}
          onClose={() => setManagingSongsOf(null)}
          onUpdate={() => {
            setManagingSongsOf(null); // モーダルを閉じる
            fetchPreferences();     // 最新の情報を再取得
          }}
        />
      )}
    </div>
  );
}

export default MusicAppreciationManager;