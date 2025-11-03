import React, { useState, useEffect } from 'react';
import './HobbiesDisplay.css';

function HobbiesDisplay() {
  const [hobbies, setHobbies] = useState([]);
  const [playedGames, setPlayedGames] = useState([]);
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        // Not logged in, so don't display anything.
        setLoading(false);
        return;
      }

      try {
        const [hobbiesRes, gamesRes] = await Promise.all([
          fetch('http://localhost:5000/api/hobbies', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/played-games', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const hobbiesData = await hobbiesRes.json();
        const gamesData = await gamesRes.json();

        if (hobbiesData.success) {
          setHobbies(hobbiesData.hobbies);
        } else {
          // Don't block the whole page if hobbies fail, just log it.
          console.error(hobbiesData.error || 'Failed to fetch hobbies');
        }

        if (gamesData.success) {
          setPlayedGames(gamesData.playedGames);
        } else {
          console.error(gamesData.error || 'Failed to fetch played games');
        }

      } catch (err) {
        setError('趣味またはゲームライブラリの読み込みに失敗しました。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleHobbyClick = (hobbyName) => {
    if (selectedHobby === hobbyName) {
      setSelectedHobby(null); // Toggle off if clicked again
    } else {
      setSelectedHobby(hobbyName);
    }
  };

  // Don't render anything if there are no hobbies and not loading.
  if (!loading && hobbies.length === 0) {
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
      </div>

      {selectedHobby === 'ゲーム' && (
        <div className="game-library-display">
          <h3>ゲームライブラリ</h3>
          <div className="game-gallery">
            {playedGames.length > 0 ? (
              playedGames.map(game => (
                <div key={game.id} className="game-card-display">
                  <img src={game.image_url} alt={game.title} />
                  <div className="game-card-title">{game.title}</div>
                </div>
              ))
            ) : (
              <p>ライブラリにゲームがありません。設定ページから追加してください。</p>
            )}
          </div>
        </div>
      )}
      {/* TODO: Add displays for other hobbies if needed */}
    </div>
  );
}

export default HobbiesDisplay;
