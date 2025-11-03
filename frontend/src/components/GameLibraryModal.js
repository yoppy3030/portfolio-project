import React, { useState, useEffect, useCallback } from 'react';
import './GameLibraryModal.css';
import debounce from 'lodash.debounce';

function GameResult({ game, onAdd, isAdded }) {
  return (
    <div className="game-result-item">
      <img src={game.background_image} alt={game.name} className="game-image" />
      <div className="game-info">
        <p>{game.name}</p>
        <small>{game.released}</small>
      </div>
      <button 
        onClick={() => onAdd(game)} 
        disabled={isAdded}
        className="btn-add-game"
      >
        {isAdded ? '追加済み' : '追加'}
      </button>
    </div>
  );
}

function LibraryItem({ game, onRemove }) {
  return (
    <div className="library-item">
      <img src={game.image_url} alt={game.title} className="game-image" />
      <div className="game-info">
        <p>{game.title}</p>
        {/* TODO: Add rating and comment functionality */}
      </div>
      <button onClick={() => onRemove(game.id)} className="btn-remove-game">削除</button>
    </div>
  );
}

function GameLibraryModal({ onClose }) {
  const [myGames, setMyGames] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(''); // プラットフォーム選択の状態

  const getToken = () => localStorage.getItem('token');

  const fetchMyGames = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/played-games', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setMyGames(data.playedGames);
      } else {
        setError(data.error || 'ライブラリの取得に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyGames();
  }, [fetchMyGames]);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      setError('');
      try {
        const response = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${query}&page_size=5`);
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (err) {
        setError('ゲームの検索に失敗しました。');
      } finally {
        setSearchLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleAddGame = async (game) => {
    try {
      const response = await fetch('http://localhost:5000/api/played-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          game_api_id: String(game.id),
          title: game.name,
          image_url: game.background_image
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchMyGames(); // Refresh library
      } else {
        setError(data.error || 'ゲームの追加に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  const handleRemoveGame = async (playedGameId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/played-games/${playedGameId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        fetchMyGames(); // Refresh library
      } else {
        setError(data.error || 'ゲームの削除に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };
  
  const myGameApiIds = new Set(myGames.map(g => g.game_api_id));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ゲームライブラリを編集</h2>
          <button onClick={onClose} className="close-button"><i className="material-icons">close</i></button>
        </div>
        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}
          
          <div className="game-search-section">
            <h4>ゲームを検索して追加</h4>
            <div className="search-controls"> {/* New div for controls */}
              <input 
                type="text"
                placeholder="ゲームのタイトルを入力... (例: The Witcher 3)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                <option value="">全てのプラットフォーム</option>
                <option value="4">PC</option>
                <option value="18">PlayStation 5</option>
                <option value="187">PlayStation 4</option>
                <option value="7">Nintendo Switch</option>
                <option value="1">Xbox One</option>
                <option value="186">Xbox Series X/S</option>
                <option value="3">iOS</option>
                <option value="21">Android</option>
              </select>
            </div>
            {searchLoading && <div className="spinner"></div>}
            <div className="search-results">
              {searchResults.map(game => (
                <GameResult 
                  key={game.id} 
                  game={game} 
                  onAdd={handleAddGame}
                  isAdded={myGameApiIds.has(String(game.id))}
                />
              ))}
            </div>
          </div>
          
          <hr />
          
          <div className="my-library-section">
            <h4>マイライブラリ ({myGames.length})</h4>
            {loading ? <p>読み込み中...</p> : (
              <div className="library-grid">
                {myGames.length > 0 ? (
                  myGames.map(game => (
                    <LibraryItem key={game.id} game={game} onRemove={handleRemoveGame} />
                  ))
                ) : (
                  <p>ライブラリにゲームがありません。</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameLibraryModal;