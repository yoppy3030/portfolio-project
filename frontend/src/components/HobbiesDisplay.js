import React, { useState, useEffect, useCallback } from 'react';
import './HobbiesDisplay.css';
import GameLibraryModal from './GameLibraryModal';
import MusicAppreciationDisplay from './MusicAppreciationDisplay';
import ReadingHobbyDisplay from './ReadingHobbyDisplay'; // 新規作成するコンポーネント

function HobbiesDisplay({ isOwner, portfolioId }) {
  const [hobbies, setHobbies] = useState([]);
  const [playedGamesCount, setPlayedGamesCount] = useState(0);
  const [musicPreferencesCount, setMusicPreferencesCount] = useState(0);
  const [readingBooksCount, setReadingBooksCount] = useState(0); // 読書用のstateを追加
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGameLibraryModalOpen, setGameLibraryModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled([
        fetch('http://localhost:5000/api/hobbies', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/played-games', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/user-music-preferences', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/reading/books', { headers: { 'Authorization': `Bearer ${token}` } }) // 読書APIを追加
      ]);

      // Hobbies
      if (results[0].status === 'fulfilled') {
        const hobbiesRes = results[0].value;
        const hobbiesData = await hobbiesRes.json();
        if (hobbiesData.success) {
          setHobbies(hobbiesData.hobbies.filter(h => h.name !== '音楽鑑賞' && h.name !== 'ゲーム' && h.name !== '読書'));
        } else {
          console.error(hobbiesData.error || 'Failed to fetch hobbies');
        }
      } else {
        console.error('Hobbies fetch failed:', results[0].reason);
      }

      // Games
      if (results[1].status === 'fulfilled') {
        const gamesRes = results[1].value;
        const gamesData = await gamesRes.json();
        if (gamesData.success) {
          setPlayedGamesCount(gamesData.playedGames.length);
        } else {
          console.error(gamesData.error || 'Failed to fetch played games');
        }
      } else {
        console.error('Games fetch failed:', results[1].reason);
      }

      // Music
      if (results[2].status === 'fulfilled') {
        const musicRes = results[2].value;
        const musicData = await musicRes.json();
        if (musicData.success) {
          setMusicPreferencesCount(musicData.preferences.length);
        } else {
          console.error(musicData.error || 'Failed to fetch music preferences');
        }
      } else {
        console.error('Music fetch failed:', results[2].reason);
      }

      // Reading
      if (results[3].status === 'fulfilled') {
        const readingRes = results[3].value;
        const readingData = await readingRes.json();
        if (readingData.success) {
          setReadingBooksCount(readingData.books.length);
        } else {
          console.error(readingData.error || 'Failed to fetch reading books');
        }
      } else {
        console.error('Reading fetch failed:', results[3].reason);
      }

    } catch (err) {
      setError('データの読み込み中に予期せぬエラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleHobbyClick = (hobbyName) => {
    setSelectedHobby(prev => (prev === hobbyName ? null : hobbyName));
  };

  const handleOpenModal = () => {
    setGameLibraryModalOpen(true);
  };

  const handleCloseModal = () => {
    setGameLibraryModalOpen(false);
    fetchData();
  };

  if (!loading && hobbies.length === 0 && playedGamesCount === 0 && musicPreferencesCount === 0 && readingBooksCount === 0) {
    return null;
  }

  return (
    <div className="hobbies-display-container">
      <h2 className="hobbies-title">趣味・関心事</h2>
      
      {loading && <p>読み込み中...</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="hobby-tags">
        {hobbies.map(hobby => (
          <button 
            key={hobby.id} 
            className={`hobby-tag ${selectedHobby === hobby.name ? 'active' : ''}`}
            onClick={() => handleHobbyClick(hobby.name)}
          >
            {hobby.name}
          </button>
        ))}
        {playedGamesCount > 0 && (
          <button 
            className={`hobby-tag ${selectedHobby === 'ゲーム' ? 'active' : ''}`}
            onClick={() => handleHobbyClick('ゲーム')}
          >
            ゲーム
          </button>
        )}
        {musicPreferencesCount > 0 && (
          <button 
            className={`hobby-tag ${selectedHobby === '音楽鑑賞' ? 'active' : ''}`}
            onClick={() => handleHobbyClick('音楽鑑賞')}
          >
            音楽鑑賞
          </button>
        )}
        {readingBooksCount > 0 && (
          <button 
            className={`hobby-tag ${selectedHobby === '読書' ? 'active' : ''}`}
            onClick={() => handleHobbyClick('読書')}
          >
            読書
          </button>
        )}
      </div>

      {selectedHobby === 'ゲーム' && (
        <div className="game-library-summary">
          <div className="summary-content">
            <p>{playedGamesCount}個のゲームがライブラリにあります。</p>
            <button onClick={handleOpenModal} className="manage-library-btn">
              ライブラリを見る
            </button>
          </div>
        </div>
      )}
      
      {selectedHobby === '音楽鑑賞' && (
        <MusicAppreciationDisplay />
      )}

      {selectedHobby === '読書' && (
        <ReadingHobbyDisplay />
      )}

      {isGameLibraryModalOpen && <GameLibraryModal onClose={handleCloseModal} isOwner={isOwner} />}
    </div>
  );
}

export default HobbiesDisplay;