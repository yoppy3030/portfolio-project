import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../style/ReadingHobbyDisplay.css';
// Use the same CSS for grid layout

function AnimeHobbyDisplay() {
    const { t } = useTranslation();
    const [animeList, setAnimeList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAnime = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setLoading(false);
            setError(t('anime.notLoggedIn')); // Ensure this key exists or use a generic one
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/anime', {
                headers: { 'Authorization': `Bearer ${token} ` },
            });
            const data = await response.json();
            if (data.success) {
                setAnimeList(data.anime || []);
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
        fetchAnime();
    }, [fetchAnime]);

    if (loading) {
        return <p>{t('loading')}</p>;
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    return (
        <div className="reading-hobby-display">
            {animeList.length > 0 ? (
                <div className="books-grid">
                    {animeList.map(anime => (
                        <div key={anime.id} className="book-card">
                            <img
                                src={anime.image_url ? `http://localhost:5000${anime.image_url}` : 'https://via.placeholder.com/150x220.png?text=No+Image'}
                                alt={anime.title}
                                className="book-card-image"
                            />
                            <div className="book-card-content">
                                <h5 className="book-card-title">{anime.title}</h5>
                                <p className="book-card-author">{anime.original_author}</p>
                                {anime.genre && <p className="book-card-genre">{anime.genre}</p>}
                                {anime.rating > 0 && (
                                    <p className="book-card-rating">
                                        {t('anime.labelRating')}: {'★'.repeat(anime.rating)}{'☆'.repeat(10 - anime.rating)}
                                    </p>
                                )}
                                {anime.review && <p className="book-card-comment" style={{ whiteSpace: 'pre-wrap' }}>{anime.review}</p>}
                            </div>
                        </div >
                    ))}
                </div >
            ) : (
                <p>{t('anime.noEntries')}</p>
            )}
        </div >
    );
}

export default AnimeHobbyDisplay;
