import React, { useState, useEffect, useCallback } from 'react';
import './MusicAppreciationDisplay.css';
import { FaYoutube } from 'react-icons/fa';

// 曲リストを表示する新しいコンポーネント
// 曲リストを表示するコンポーネント
// YouTubeリンクがある場合はアイコンとリンクを表示します
function SongList({ songs }) {
  if (!songs || songs.length === 0) {
    return <p className="no-songs-message">登録されている曲はありません。</p>;
  }
  return (
    <ul className="song-list-display">
      {songs.map(song => (
        <li key={song.id}>
          {song.youtube_url ? (
            <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="song-link">
              <FaYoutube className="youtube-icon" /> {song.song_title}
            </a>
          ) : (
            <span>{song.song_title}</span>
          )}
          {song.artist_name && <span className="song-artist"> - {song.artist_name}</span>}
        </li>
      ))}
    </ul>
  );
}

// 音楽の好み（アーティスト・ジャンル）一覧を表示するメインコンポーネント
function MusicAppreciationDisplay() {
  // --- ステート（状態変数） ---
  const [preferences, setPreferences] = useState([]); // ユーザーの音楽の好みリスト
  const [loading, setLoading] = useState(true); // 読み込み中フラグ
  const [error, setError] = useState(''); // エラーメッセージ
  const [expandedCardId, setExpandedCardId] = useState(null); // クリックして展開されているカードのID

  // APIから音楽設定を取得する関数
  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError('ログインが必要です。');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/user-music-preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.preferences);
      } else {
        setError(data.error || '音楽設定の取得に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // カードがクリックされた時の処理（展開/折りたたみ）
  const handleCardClick = (preferenceId) => {
    setExpandedCardId(prevId => (prevId === preferenceId ? null : preferenceId));
  };

  if (loading) {
    return <p>音楽設定を読み込み中...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (preferences.length === 0) {
    return <p>登録されている音楽設定はありません。</p>;
  }

  return (
    <div className="music-appreciation-grid">
      {preferences.map(pref => (
        <div key={pref.id} className={`music-card-container ${expandedCardId === pref.id ? 'expanded' : ''}`}>
          <div className="music-card" onClick={() => handleCardClick(pref.id)}>
            <div className="music-card-content">
              <span className="music-genre-badge">{pref.genre_name || '指定なし'}</span>
              <h4 className="music-artist-name">{pref.artist_name || 'ジャンルのみ'}</h4>
              {pref.songs && pref.songs.length > 0 && (
                <span className="song-count">{pref.songs.length} 曲</span>
              )}
            </div>
          </div>
          {/* 展開される曲リスト */}
          {expandedCardId === pref.id && (
            <div className="song-list-container">
              <SongList songs={pref.songs} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default MusicAppreciationDisplay;