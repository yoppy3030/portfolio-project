import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../Settings.css'; // スタイルを共有
import ManageSongsModal from './ManageSongsModal'; // 曲管理のためのモーダルコンポーネント

function MusicAppreciationManager() {
  // --- ステート（状態変数）の定義 ---
  // 音楽ジャンルのリスト
  const [genres, setGenres] = useState([]);
  // ユーザーの音楽の好みリスト
  const [preferences, setPreferences] = useState([]);
  // フォームで選択されたジャンルのID
  const [selectedGenreId, setSelectedGenreId] = useState('');
  // フォームに入力されたアーティスト名
  const [newArtistName, setNewArtistName] = useState('');
  // 読み込み中フラグ
  const [loading, setLoading] = useState(false);
  // エラーメッセージ
  const [error, setError] = useState('');
  // 成功メッセージ（追加・削除完了時など）
  const [message, setMessage] = useState('');
  // 曲管理画面（モーダル）を開いている対象の「好み」データ（nullなら閉じた状態）
  const [managingSongsOf, setManagingSongsOf] = useState(null);

  const { t } = useTranslation();

  // ジャンルリストの取得
  // 音楽ジャンルのリストをサーバーから取得
  const fetchGenres = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // APIからジャンル一覧を取得
      const response = await fetch('http://localhost:5000/api/music-genres');
      const data = await response.json();
      if (data.success) {
        setGenres(data.genres);
        // デフォルトでリストの最初のジャンルを選択状態にする
        if (data.genres.length > 0) {
          setSelectedGenreId(data.genres[0].id);
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
  // ユーザーの登録済み音楽設定（好み）を取得
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
      // 認証トークンを使ってAPIから個人の設定を取得
      const response = await fetch('http://localhost:5000/api/user-music-preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.preferences);
        return data.preferences; // 最新のデータを返す（後続の処理で使うため）
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
        fetchPreferences(); // 追加後にリストを再取得
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
        fetchPreferences(); // 削除後にリストを再取得
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
              {/* 好みの項目に対する操作ボタン */}
              <div className="preference-actions">
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

      {/* 曲管理モーダルの表示（managingSongsOf がセットされている時のみ表示） */}
      {managingSongsOf && (
        <ManageSongsModal
          preference={managingSongsOf}
          onClose={() => setManagingSongsOf(null)}
          onUpdate={async (closeModal = true) => {
            // 曲の追加・削除などがあった場合、設定リスト全体を再取得して最新の状態にする
            const updatedPrefs = await fetchPreferences();

            if (closeModal) {
              setManagingSongsOf(null); // モーダルを閉じる
            } else {
              // モーダルを開いたままデータを更新する場合（例: 曲順変更など）
              if (updatedPrefs && updatedPrefs.length > 0 && managingSongsOf) {
                const updatedPref = updatedPrefs.find(p => p.id === managingSongsOf.id);
                if (updatedPref) {
                  setManagingSongsOf(updatedPref); // モーダル内の表示データを更新
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