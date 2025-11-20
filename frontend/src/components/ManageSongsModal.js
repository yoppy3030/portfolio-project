import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './ManageSongsModal.css';
import { FaYoutube, FaEdit } from 'react-icons/fa';

function ManageSongsModal({ preference, onClose, onUpdate }) {
  const { t } = useTranslation();
  
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
    // Only update if songs array reference actually changed
    // This prevents resetting the order when onUpdate() is called after reordering
    if (preference.songs) {
      // Check if the songs are actually different (by comparing IDs)
      const currentSongIds = songs.map(s => s.id).sort().join(',');
      const newSongIds = preference.songs.map(s => s.id).sort().join(',');
      
      // Only update if the song IDs are different (new songs added/removed)
      // or if we have no songs locally
      // Also update if we're not currently editing (to avoid overwriting edits)
      if ((currentSongIds !== newSongIds || songs.length === 0) && !editingSongId) {
        setSongs(preference.songs);
      }
    } else {
      setSongs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference.songs, editingSongId]);

  const handleAddSong = async () => {
    if (!newSongTitle.trim()) {
      setError(t('music_songs_alert_title_required'));
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
        // Update without closing modal - this will refresh the list
        if (onUpdate) {
          onUpdate(false);
        }
      } else {
        throw new Error(data.error || t('music_songs_alert_add_failed'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (!window.confirm(t('music_songs_confirm_delete'))) return;
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
        // Update local songs state immediately
        setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));
        // Update without closing modal
        if (onUpdate) {
          onUpdate(false);
        }
      } else {
        throw new Error(data.error || t('music_songs_alert_delete_failed'));
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
      setError(t('music_songs_alert_title_required'));
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
        // Update local songs state immediately
        setSongs(prevSongs => 
          prevSongs.map(song => 
            song.id === songId 
              ? { ...song, ...editedSongData }
              : song
          )
        );
        // Update without closing modal
        if (onUpdate) {
          onUpdate(false);
        }
      } else {
        throw new Error(data.error || t('music_songs_alert_update_failed'));
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

  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    // If dropped in the same position, do nothing
    if (result.source.index === result.destination.index) {
      return;
    }

    const items = Array.from(songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSongs(items); // Optimistic update of the UI
    setError(''); // Clear any previous errors

    const songIds = items.map(song => song.id);
    const token = localStorage.getItem('token');

    // Validate data before sending
    if (!preference || !preference.id) {
      setError('preferenceIdが見つかりません。');
      setSongs(preference.songs || []);
      return;
    }

    if (songIds.length === 0) {
      setError('並び替える曲がありません。');
      return;
    }

    const requestBody = {
      songIds: songIds,
      preferenceId: preference.id
    };

    console.log('Sending reorder request:', requestBody);

    // Call backend to save the new order
    fetch(`http://localhost:5000/api/songs/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    }).then(async res => {
      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error(`サーバーエラー: ${res.status} ${res.statusText}`);
      }
      
      if (!res.ok) {
        console.error('Reorder failed:', data);
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      return data;
    }).then(data => {
      if (!data.success) {
        // If backend fails, revert the optimistic update
        console.error('Reorder failed:', data);
        setError(data.error || t('music_songs_alert_reorder_failed'));
        setSongs(preference.songs || []); // Revert to original order
      } else {
        // Update parent but don't close modal (pass false to onUpdate)
        // This will refresh the data but keep the modal open
        if (onUpdate) {
          onUpdate(false);
        }
      }
    }).catch(err => {
      console.error('Reorder error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        requestBody: requestBody
      });
      // Show the actual error message if available
      const errorMessage = err.message || t('music_songs_alert_reorder_error');
      // Don't show "曲名は必須です" error for reorder operations
      if (errorMessage.includes('曲名は必須です')) {
        setError('並び替えに失敗しました。ページをリロードして再試行してください。');
      } else {
        setError(errorMessage);
      }
      setSongs(preference.songs || []); // Revert to original order
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('music_songs_modal_title', { name: preference.artist_name || preference.genre_name })}</h2>
        </div>

        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="songs">
              {(provided) => (
                <div
                  className={`song-list ${songs.length === 0 ? 'is-empty' : ''}`}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {songs.length > 0 ? (
                    songs.map((song, index) => (
                      <Draggable key={song.id} draggableId={String(song.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            className={`song-item ${snapshot.isDragging ? 'is-dragging' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            onClick={(e) => {
                              // Prevent clicks on the song item from triggering form submission
                              if (e.target.closest('.drag-handle')) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                          >
                            <div 
                              className="drag-handle" 
                              {...provided.dragHandleProps}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                            >
                              <i className="material-icons">drag_indicator</i>
                            </div>
                            {editingSongId === song.id ? (
                              <div className="song-edit-form">
                                <div className="edit-form-group">
                                  <label>{t('music_songs_label_title')} *</label>
                                  <input 
                                    type="text" 
                                    name="song_title" 
                                    value={editedSongData.song_title} 
                                    onChange={handleEditInputChange}
                                    placeholder={t('music_songs_placeholder_title')}
                                    autoFocus
                                  />
                                </div>
                                <div className="edit-form-group">
                                  <label>{t('music_songs_label_artist')}</label>
                                  <input 
                                    type="text" 
                                    name="artist_name" 
                                    value={editedSongData.artist_name} 
                                    onChange={handleEditInputChange} 
                                    placeholder={t('music_songs_placeholder_artist')} 
                                  />
                                </div>
                                <div className="edit-form-group">
                                  <label>{t('music_songs_label_youtube_url')}</label>
                                  <input 
                                    type="text" 
                                    name="youtube_url" 
                                    value={editedSongData.youtube_url} 
                                    onChange={handleEditInputChange} 
                                    placeholder={t('music_songs_placeholder_youtube_url')} 
                                  />
                                </div>
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
                                <div className="edit-actions">
                                  <button onClick={() => handleSaveEdit(song.id)} disabled={loading} className="btn-primary-small">{t('music_songs_save_button')}</button>
                                  <button onClick={handleCancelEdit} disabled={loading} className="btn-secondary-small">{t('music_songs_cancel_button')}</button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => handleEdit(song)} disabled={loading} className="btn-icon"><FaEdit /></button>
                                  <button onClick={() => handleDeleteSong(song.id)} disabled={loading} className="btn-danger-outline">{t('music_songs_delete_button')}</button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  ) : (
                    <p>{t('music_songs_no_songs_registered')}</p>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <hr />

          <h4>{t('music_songs_add_new_title')}</h4>
          <div className="form-group">
            <label>{t('music_songs_label_title')}</label>
            <input type="text" value={newSongTitle} onChange={(e) => setNewSongTitle(e.target.value)} placeholder={t('music_songs_placeholder_title')} />
          </div>
          <div className="form-group">
            <label>{t('music_songs_label_artist')}</label>
            <input type="text" value={newSongArtist} onChange={(e) => setNewSongArtist(e.target.value)} placeholder={t('music_songs_placeholder_artist')} />
          </div>
          <div className="form-group">
            <label>{t('music_songs_label_youtube_url')}</label>
            <input type="text" value={newSongUrl} onChange={(e) => setNewSongUrl(e.target.value)} placeholder={t('music_songs_placeholder_youtube_url')} />
          </div>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddSong();
            }} 
            disabled={loading} 
            className="btn-primary"
          >
            {loading ? t('music_songs_adding') : t('music_songs_add_button')}
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          >
            {t('music_songs_close_button')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageSongsModal;
