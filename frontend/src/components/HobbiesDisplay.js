import React, { useState, useEffect, useCallback } from 'react';
import './HobbiesDisplay.css';
import GameLibraryModal from './GameLibraryModal'; // GameLibraryModalをインポート

function HobbiesDisplay({ isOwner, portfolioId }) {
  const [hobbies, setHobbies] = useState([]);
  const [playedGamesCount, setPlayedGamesCount] = useState(0); // ゲームの数だけを保持
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGameLibraryModalOpen, setGameLibraryModalOpen] = useState(false); // モーダルの表示状態

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // APIリクエストを並列で実行
      const [hobbiesRes, gamesRes] = await Promise.all([
        fetch('http://localhost:5000/api/hobbies', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/played-games', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const hobbiesData = await hobbiesRes.json();
      if (hobbiesData.success) {
        setHobbies(hobbiesData.hobbies);
      } else {
        console.error(hobbiesData.error || 'Failed to fetch hobbies');
      }

      const gamesData = await gamesRes.json();
      if (gamesData.success) {
        setPlayedGamesCount(gamesData.playedGames.length); // ゲームの数だけを保存
      } else {
        console.error(gamesData.error || 'Failed to fetch played games');
      }

    } catch (err) {
      setError('趣味またはゲームライブラリの読み込みに失敗しました。');
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
    fetchData(); // モーダルを閉じたらデータを再取得して表示を更新
  };

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
        <div className="game-library-summary">
          <div className="summary-content">
            {playedGamesCount > 0 ? (
              <p>{playedGamesCount}個のゲームがライブラリにあります。</p>
            ) : (
              <p>ライブラリにゲームがありません。</p>
            )}
            <button onClick={handleOpenModal} className="manage-library-btn">
              {playedGamesCount > 0 ? 'ライブラリを見る' : 'ゲームを追加する'}
            </button>
          </div>
        </div>
      )}
      {/* TODO: Add displays for other hobbies if needed */}

      {isGameLibraryModalOpen && <GameLibraryModal onClose={handleCloseModal} isOwner={isOwner} />}
    </div>
  );
}

export default HobbiesDisplay;