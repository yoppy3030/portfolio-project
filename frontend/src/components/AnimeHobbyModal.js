import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../style/AnimeHobbyModal.css'; // Use distinct CSS

const StarRating = ({ rating }) => {
    const totalStars = 10;
    const fullStars = Math.floor(rating);
    const emptyStars = totalStars - fullStars;

    return (
        <div className="star-rating">
            {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} className="star filled">★</span>)}
            {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} className="star">☆</span>)}
        </div>
    );
};

const StarInput = ({ rating, setRating }) => {
    const totalStars = 10;
    return (
        <div className="star-input">
            {[...Array(totalStars)].map((_, i) => {
                const ratingValue = i + 1;
                return (
                    <span
                        key={i}
                        className={`star ${ratingValue <= rating ? 'filled' : ''}`}
                        onClick={() => setRating(ratingValue)}
                    >
                        ★
                    </span>
                );
            })}
        </div>
    );
};

function AnimeHobbyModal({ onClose, isOwner }) {
    const { t } = useTranslation();
    const [animeList, setAnimeList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // New Anime Form State
    const [newAnime, setNewAnime] = useState({
        title: '',
        original_author: '',
        genre: '',
        synopsis: '',
        rating: 0,
        review: '',
        image: null
    });

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editAnime, setEditAnime] = useState(null);

    // Suggested Genres
    const genres = [
        'アクション', '冒険', 'コメディ', 'ドラマ', 'ファンタジー',
        '魔法', '超自然', 'ホラー', 'ミステリー', '心理',
        'ロマンス', 'SF', '日常', 'スポーツ', 'メカ', '音楽', 'スリラー', 'その他'
    ];
    const popularGenres = ['アクション', 'ファンタジー', 'コメディ', 'ロマンス', 'SF', '日常', 'ミステリー', 'ホラー'];

    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const fetchAnime = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/anime', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await response.json();
            if (data.success) {
                // Support both keys just in case
                setAnimeList(data.anime || data.animeList || []);
            } else {
                setError(data.error || t('anime.fetchError'));
            }
        } catch (err) {
            setError(t('anime.serverError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (isOwner) {
            fetchAnime();
        }
    }, [isOwner, fetchAnime]);

    const handleInputChange = (e, isEdit = false) => {
        const { name, value } = e.target;
        if (isEdit) {
            setEditAnime(prev => ({ ...prev, [name]: value }));
        } else {
            setNewAnime(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleRatingChange = (rating, isEdit = false) => {
        if (isEdit) {
            setEditAnime(prev => ({ ...prev, rating }));
        } else {
            setNewAnime(prev => ({ ...prev, rating }));
        }
    };

    const handleImageChange = (e, isEdit = false) => {
        const file = e.target.files[0];
        if (isEdit) {
            setEditAnime(prev => ({ ...prev, image: file }));
        } else {
            setNewAnime(prev => ({ ...prev, image: file }));
        }
    };

    const handleAddAnime = async () => {
        if (!newAnime.title) {
            setError(t('anime.validationError'));
            return;
        }
        setError('');

        const formData = new FormData();
        formData.append('title', newAnime.title);
        formData.append('original_author', newAnime.original_author);
        formData.append('genre', newAnime.genre);
        formData.append('synopsis', newAnime.synopsis);
        formData.append('rating', newAnime.rating);
        formData.append('review', newAnime.review);
        if (newAnime.image) {
            formData.append('image', newAnime.image);
        }

        try {
            const response = await fetch('http://localhost:5000/api/anime', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                setNewAnime({ title: '', original_author: '', genre: '', synopsis: '', rating: 0, review: '', image: null });
                fetchAnime();
            } else {
                setError(data.error || t('anime.addError'));
            }
        } catch (err) {
            setError(t('anime.serverError'));
        }
    };

    const handleUpdateAnime = async () => {
        if (!editAnime.title) return;
        setError('');

        const formData = new FormData();
        formData.append('title', editAnime.title);
        formData.append('original_author', editAnime.original_author);
        formData.append('genre', editAnime.genre);
        formData.append('synopsis', editAnime.synopsis);
        formData.append('rating', editAnime.rating);
        formData.append('review', editAnime.review);
        if (editAnime.image) {
            formData.append('image', editAnime.image);
        }

        try {
            const response = await fetch(`http://localhost:5000/api/anime/${editingId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                setEditingId(null);
                setEditAnime(null);
                fetchAnime();
            } else {
                setError(data.error || t('anime.updateError'));
            }
        } catch (err) {
            setError(t('anime.serverError'));
        }
    };

    const handleDeleteAnime = async (id) => {
        if (!window.confirm(t('anime.confirmDelete'))) return;
        try {
            const response = await fetch(`http://localhost:5000/api/anime/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await response.json();
            if (data.success) {
                fetchAnime();
            } else {
                setError(data.error || t('anime.deleteError'));
            }
        } catch (err) {
            setError(t('anime.serverError'));
        }
    };

    const startEdit = (anime) => {
        setEditingId(anime.id);
        setEditAnime({ ...anime, image: null, rating: anime.rating || 0, genre: anime.genre || '' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditAnime(null);
    };

    return (
        <div className="anime-hobby-modal-backdrop" onClick={onClose}>
            <div className="modal-content anime-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{t('anime.title')}</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="modal-body">
                    {error && <p className="error-message">{error}</p>}

                    <div className="reading-hobby-manager" style={{ display: 'block' }}>
                        {/* Anime List & Form Section */}
                        <div className="book-management-section" style={{ width: '100%', borderLeft: 'none', paddingLeft: 0 }}>

                            {/* Add New Anime Form */}
                            <div className="add-book-form">
                                <h5>{t('anime.addTitle')}</h5>
                                <input
                                    type="text"
                                    name="title"
                                    placeholder={t('anime.placeholderTitle')}
                                    value={newAnime.title}
                                    onChange={(e) => handleInputChange(e)}
                                />
                                <input
                                    type="text"
                                    name="original_author"
                                    placeholder={t('anime.placeholderAuthor')}
                                    value={newAnime.original_author}
                                    onChange={(e) => handleInputChange(e)}
                                />
                                <input
                                    type="text"
                                    name="genre"
                                    list="anime-genres"
                                    placeholder={t('anime.placeholderGenre')}
                                    value={newAnime.genre}
                                    onChange={(e) => handleInputChange(e)}
                                />
                                <datalist id="anime-genres">
                                    {genres.map(g => <option key={g} value={g} />)}
                                </datalist>
                                <div className="suggested-genres" style={{ marginTop: '5px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>{t('anime.popularGenres')}:</span>
                                    {popularGenres.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setNewAnime(prev => ({ ...prev, genre: g }))}
                                            style={{
                                                fontSize: '0.8rem',
                                                margin: '0',
                                                borderRadius: '12px',
                                                border: '1px solid #ddd',
                                                backgroundColor: newAnime.genre === g ? '#e3f2fd' : '#f5f5f5',
                                                color: newAnime.genre === g ? '#1976d2' : '#333',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    name="synopsis"
                                    placeholder={t('anime.placeholderSynopsis')}
                                    value={newAnime.synopsis}
                                    onChange={(e) => handleInputChange(e)}
                                    style={{ gridColumn: '1 / -1', minHeight: '120px' }}
                                />
                                <div className="rating-input-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', gridColumn: '1 / -1' }}>
                                    <label style={{ whiteSpace: 'nowrap' }}>{t('anime.labelRating')}</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                        <StarInput rating={newAnime.rating} setRating={(r) => handleRatingChange(r)} />
                                    </div>
                                </div>
                                <textarea
                                    name="review"
                                    placeholder={t('anime.placeholderReview')}
                                    value={newAnime.review}
                                    onChange={(e) => handleInputChange(e)}
                                    style={{ gridColumn: '1 / -1', minHeight: '120px' }}
                                />
                                <div style={{ width: '100%', marginBottom: '10px', gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>{t('anime.labelTopImage')}</label>
                                    <input
                                        type="file"
                                        onChange={(e) => handleImageChange(e)}
                                        accept="image/*"
                                        style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <button onClick={handleAddAnime}>{t('anime.addButton')}</button>
                            </div>

                            <hr />

                            {/* List of Anime */}
                            <div className="book-list">
                                {loading ? <p>{t('loading')}</p> : (
                                    animeList.length > 0 ? (
                                        animeList.map(anime => (
                                            <div key={anime.id} className="book-item-wrapper">
                                                {editingId === anime.id ? (
                                                    <div className="edit-book-form">
                                                        <h5>{t('anime.editTitle')}</h5>
                                                        <input
                                                            type="text"
                                                            name="title"
                                                            placeholder={t('anime.placeholderTitle')}
                                                            value={editAnime.title}
                                                            onChange={(e) => handleInputChange(e, true)}
                                                        />
                                                        <input
                                                            type="text"
                                                            name="original_author"
                                                            placeholder={t('anime.placeholderAuthor')}
                                                            value={editAnime.original_author}
                                                            onChange={(e) => handleInputChange(e, true)}
                                                        />
                                                        <input
                                                            type="text"
                                                            name="genre"
                                                            list="anime-genres"
                                                            placeholder={t('anime.placeholderGenre')}
                                                            value={editAnime.genre}
                                                            onChange={(e) => handleInputChange(e, true)}
                                                        />
                                                        <datalist id="anime-genres">
                                                            {genres.map(g => <option key={g} value={g} />)}
                                                        </datalist>
                                                        <div className="suggested-genres" style={{ marginTop: '5px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px' }}>
                                                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{t('anime.popularGenres')}:</span>
                                                            {popularGenres.map(g => (
                                                                <button
                                                                    key={g}
                                                                    onClick={() => setEditAnime(prev => ({ ...prev, genre: g }))}
                                                                    style={{
                                                                        fontSize: '0.8rem',
                                                                        margin: '0',
                                                                        borderRadius: '12px',
                                                                        border: '1px solid #ddd',
                                                                        backgroundColor: editAnime.genre === g ? '#e3f2fd' : '#f5f5f5',
                                                                        color: editAnime.genre === g ? '#1976d2' : '#333',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {g}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <textarea
                                                            name="synopsis"
                                                            placeholder={t('anime.placeholderSynopsis')}
                                                            value={editAnime.synopsis}
                                                            onChange={(e) => handleInputChange(e, true)}
                                                            style={{ gridColumn: '1 / -1', minHeight: '120px' }}
                                                        />
                                                        <div className="rating-input-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', gridColumn: '1 / -1' }}>
                                                            <label style={{ whiteSpace: 'nowrap' }}>{t('anime.labelRating')}</label>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                                <StarInput rating={editAnime.rating} setRating={(r) => handleRatingChange(r, true)} />
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            name="review"
                                                            placeholder={t('anime.placeholderReview')}
                                                            value={editAnime.review}
                                                            onChange={(e) => handleInputChange(e, true)}
                                                            style={{ gridColumn: '1 / -1', minHeight: '120px' }}
                                                        />
                                                        <div style={{ width: '100%', marginBottom: '10px', gridColumn: '1 / -1' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>{t('anime.labelTopImage')}</label>
                                                            <input
                                                                type="file"
                                                                onChange={(e) => handleImageChange(e, true)}
                                                                accept="image/*"
                                                                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                                                            />
                                                        </div>
                                                        <div className="edit-actions">
                                                            <button onClick={handleUpdateAnime}>{t('save')}</button>
                                                            <button onClick={cancelEdit}>{t('cancel')}</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="book-item">
                                                        {anime.image_url && <img src={`http://localhost:5000${anime.image_url}`} alt={anime.title} />}
                                                        <div className="book-info">
                                                            <h5>{anime.title}</h5>
                                                            {anime.original_author && <p>{t('anime.labelAuthor')}: {anime.original_author}</p>}
                                                            {anime.genre && <p>{t('anime.labelGenre')}: {anime.genre}</p>}
                                                            <div className="rating-display" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                                                                <span style={{ whiteSpace: 'nowrap' }}>{t('anime.labelRating')}: </span>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                                    {anime.rating ? <StarRating rating={anime.rating} /> : t('anime.notRated')}
                                                                </div>
                                                            </div>
                                                            {anime.synopsis && (
                                                                <div className="anime-synopsis">
                                                                    <strong>{t('anime.labelSynopsis')}:</strong>
                                                                    <p>{anime.synopsis}</p>
                                                                </div>
                                                            )}
                                                            {anime.review && (
                                                                <div className="anime-review">
                                                                    <strong>{t('anime.labelReview')}:</strong>
                                                                    <p>{anime.review}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="book-actions">
                                                            <button className="btn-secondary-outline" onClick={() => startEdit(anime)}>{t('edit')}</button>
                                                            <button className="btn-danger-outline" onClick={() => handleDeleteAnime(anime.id)}>{t('delete')}</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p>{t('anime.noEntries')}</p>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AnimeHobbyModal;
