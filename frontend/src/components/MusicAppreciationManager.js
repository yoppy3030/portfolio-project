// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../Settings.css'; // 設定ページのスタイルを共有
import ManageSongsModal from './ManageSongsModal'; // 曲を管理するためのモーダルコンポーネント

// 音楽鑑賞設定を管理するコンポーネント
function MusicAppreciationManager() {
  const [genres, setGenres] = useState([]); // 音楽ジャンルのリスト
  const [preferences, setPreferences] = useState([]); // ユーザーの音楽設定（好きなジャンル・アーティスト）のリスト
  const [selectedGenreId, setSelectedGenreId] = useState(''); // 選択されているジャンルID
  const [newArtistName, setNewArtistName] = useState(''); // 新しく追加するアーティスト名
  const [loading, setLoading] = useState(false); // 読み込み状態
  const [error, setError] = useState(''); // エラーメッセージ
  const [message, setMessage] = useState(''); // 成功メッセージ
  const [managingSongsOf, setManagingSongsOf] = useState(null); // 曲を管理する対象の設定オブジェクト

  const { t } = useTranslation(); // 多言語対応

  // バックエンドから音楽ジャンルのリストを取得する関数
  const fetchGenres = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/music-genres');
      const data = await response.json();
      if (data.success) {
        setGenres(data.genres);
        if (data.genres.length > 0) {
          setSelectedGenreId(data.genres[0].id); // デフォルトで最初のジャンルを選択状態にする
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

  // ユーザーの音楽設定リストをバックエンドから取得する関数
  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('settings_message_not_logged_in'));
      setLoading(false);
      return [];
    }
    try {
      const response = await fetch('http://localhost:5000/api/user-music-preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.preferences);
        return data.preferences;
      } else {
        setError(data.error || t('music_alert_fetch_preferences_failed'));
        return [];
      }
    } catch (err) {
      setError(t('music_alert_server_error'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [t]);

  // コンポーネントのマウント時にジャンルと設定リストを取得
  useEffect(() => {
    fetchGenres();
    fetchPreferences();
  }, [fetchGenres, fetchPreferences]);

  // 新しい音楽設定（ジャンル・アーティスト）を追加する処理
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          genre_id: selectedGenreId || null, 
          artist_name: newArtistName.trim() || null 
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t('music_message_preference_added'));
        setNewArtistName(''); // 入力欄をクリア
        fetchPreferences(); // 設定リストを再取得して表示を更新
      } else {
        setError(data.error || t('music_alert_add_preference_failed'));
      }
    } catch (err) {
      setError(t('music_alert_server_error'));
    } finally {
      setLoading(false);
    }
  };

  // 音楽設定を削除する処理
  const handleDeletePreference = async (preferenceId) => {
    if (!window.confirm(t('music_confirm_delete_preference'))) return;
    
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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t('music_message_preference_deleted'));
        fetchPreferences(); // 設定リストを再取得して表示を更新
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

      {/* 設定追加フォーム */}
      <div className="form-group">
        <label htmlFor="music-genre-select">{t('music_label_select_genre')}</label>
        <select id="music-genre-select" value={selectedGenreId} onChange={(e) => setSelectedGenreId(e.target.value)} disabled={loading}>
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

      {/* 登録済みの設定リスト */}
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
              <div className="preference-actions">
                {/* 「曲を管理」ボタン：クリックすると曲管理モーダルを開く */}
                <button className="btn-secondary-outline" onClick={() => setManagingSongsOf(pref)}>
                  {t('music_songs_manage_button')} ({pref.songs ? pref.songs.length : 0})
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

      {/* 曲管理モーダルの表示（managingSongsOfにデータがセットされているとき） */}
      {managingSongsOf && (
        <ManageSongsModal 
          preference={managingSongsOf}
          onClose={() => setManagingSongsOf(null)}
          onUpdate={async (closeModal = true) => {
            // 曲情報が更新されたら、設定リストを再取得
            const updatedPrefs = await fetchPreferences();
            if (closeModal) {
              setManagingSongsOf(null); // モーダルを閉じる
            } else {
              // モーダルを開いたまま、表示データを最新に更新する
              if (updatedPrefs && updatedPrefs.length > 0 && managingSongsOf) {
                const updatedPref = updatedPrefs.find(p => p.id === managingSongsOf.id);
                if (updatedPref) {
                  setManagingSongsOf(updatedPref);
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default MusicAppreciationManager;
