import React, { useState, useEffect } from 'react';

import './ManageSongsModal.css';
import { FaYoutube, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

function ManageSongsModal({ preference, onClose, onUpdate }) {
  
  const [songs, setSongs] = useState(preference.songs || []);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');
  const [newSongUrl, setNewSongUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // For editing
  const [editingSongId, setEditingSongId] = useState(null);
  const [editedSongData, setEditedSongData] = useState({ song_title: '', artist_name: '', youtube_url: '' });

  useEffect(() => {
    setSongs(preference.songs || []);
  }, [preference.songs]);

  const handleAddSong = async () => {
    if (!newSongTitle.trim()) {
      setError('曲名は必須です。');
      return;
    }
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/music-preferences/${preference.id}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          song_title: newSongTitle,
          artist_name: newSongArtist,
          youtube_url: newSongUrl
        })
      });
      const data = await response.json();
      if (data.success) {
        setNewSongTitle('');
        setNewSongArtist('');
        setNewSongUrl('');
        onUpdate();
      } else {
        throw new Error(data.error || '曲の追加に失敗しました。');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (!window.confirm('この曲を削除しますか？')) return;
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/songs/${songId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        onUpdate();
      } else {
        throw new Error(data.error || '曲の削除に失敗しました。');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (song) => {
    setEditingSongId(song.id);
    setEditedSongData({
      song_title: song.song_title,
      artist_name: song.artist_name || '',
      youtube_url: song.youtube_url || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingSongId(null);
  };

  const handleSaveEdit = async (songId) => {
    if (!editedSongData.song_title.trim()) {
      setError('曲名は必須です。');
      return;
    }
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/songs/${songId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedSongData)
      });
      const data = await response.json();
      if (data.success) {
        setEditingSongId(null);
        onUpdate();
      } else {
        throw new Error(data.error || '曲の更新に失敗しました。');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditedSongData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>「{preference.artist_name || preference.genre_name}」の曲を管理</h2>
        </div>

        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}

          <div className={`song-list ${songs.length === 0 ? 'is-empty' : ''}`}>
            {songs.length > 0 ? (
              songs.map(song => (
                <div key={song.id} className="song-item">
                  {editingSongId === song.id ? (
                    <div className="song-edit-form">
                      <input type="text" name="song_title" value={editedSongData.song_title} onChange={handleEditInputChange} />
                      <input type="text" name="artist_name" value={editedSongData.artist_name} onChange={handleEditInputChange} placeholder="アーティスト名" />
                      <input type="text" name="youtube_url" value={editedSongData.youtube_url} onChange={handleEditInputChange} placeholder="YouTube URL" />
                    </div>
                  ) : (
                    <div className="song-display">
                      {song.youtube_url && (
                        <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="song-link-icon">
                          <FaYoutube />
                        </a>
                      )}
                      <span>{song.song_title}{song.artist_name ? ` - ${song.artist_name}` : ''}</span>
                    </div>
                  )}
                  <div className="song-actions">
                    {editingSongId === song.id ? (
                      <>
                        <button onClick={() => handleSaveEdit(song.id)} disabled={loading} className="btn-icon"><FaSave /></button>
                        <button onClick={handleCancelEdit} disabled={loading} className="btn-icon"><FaTimes /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(song)} disabled={loading} className="btn-icon"><FaEdit /></button>
                        <button onClick={() => handleDeleteSong(song.id)} disabled={loading} className="btn-danger-outline">削除</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p>まだ曲が登録されていません。</p>
            )}
          </div>

          <hr />

          <h4>新しい曲を追加</h4>
          <div className="form-group">
            <label>曲名 *</label>
            <input type="text" value={newSongTitle} onChange={(e) => setNewSongTitle(e.target.value)} placeholder="例: 天体観測" />
          </div>
          <div className="form-group">
            <label>アーティスト名 (任意)</label>
            <input type="text" value={newSongArtist} onChange={(e) => setNewSongArtist(e.target.value)} placeholder="BUMP OF CHICKEN" />
          </div>
          <div className="form-group">
            <label>YouTube URL (任意)</label>
            <input type="text" value={newSongUrl} onChange={(e) => setNewSongUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={handleAddSong} disabled={loading} className="btn-primary">
            {loading ? '追加中...' : '曲を追加'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

export default ManageSongsModal;
