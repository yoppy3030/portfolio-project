import React, { useState, useEffect, useCallback } from 'react';
import '../style/HobbiesDisplay.css';
import GameLibraryModal from './GameLibraryModal';
import MusicAppreciationDisplay from './MusicAppreciationDisplay';
import ReadingHobbyDisplay from './ReadingHobbyDisplay'; // 新規作成するコンポーネント
import AnimeHobbyDisplay from './AnimeHobbyDisplay';

// ポートフォリオページで趣味・関心事を表示するコンポーネント
function HobbiesDisplay({ isOwner, portfolioId }) {
  // --- ステート（状態変数） ---
  const [hobbies, setHobbies] = useState([]); // 一般的な趣味のリスト
  const [playedGamesCount, setPlayedGamesCount] = useState(0); // 登録済みのゲーム数
  const [musicPreferencesCount, setMusicPreferencesCount] = useState(0); // 登録済みの音楽設定数
  const [readingBooksCount, setReadingBooksCount] = useState(0); // 登録済みの読書記録数
  const [animeCount, setAnimeCount] = useState(0); // 登録済みのアニメ数
  const [selectedHobby, setSelectedHobby] = useState(null); // 現在選択（表示）されている趣味カテゴリ
  const [loading, setLoading] = useState(true); // 読み込み中フラグ
  const [error, setError] = useState(''); // エラーメッセージ
  const [isGameLibraryModalOpen, setGameLibraryModalOpen] = useState(false); // ゲームライブラリモーダルの表示状態

  // 各種趣味が存在するかどうかのフラグ
  const [hasGameHobby, setHasGameHobby] = useState(false);
  const [hasMusicHobby, setHasMusicHobby] = useState(false);
  const [hasReadingHobby, setHasReadingHobby] = useState(false);
  const [hasAnimeHobby, setHasAnimeHobby] = useState(false);

  // サーバーから各種趣味データを取得する関数
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // 複数のAPIリクエストを並列で実行（Promise.allSettled を使用して一部が失敗しても他は処理できるようにする）
      const results = await Promise.allSettled([
        fetch('http://localhost:5000/api/hobbies', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/played-games', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/user-music-preferences', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/reading-entries', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/anime', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      // 1. 一般的な趣味データの処理
      if (results[0].status === 'fulfilled') {
        const hobbiesRes = results[0].value;
        const hobbiesData = await hobbiesRes.json();
        if (hobbiesData.success) {
          // 「音楽鑑賞」「ゲーム」「読書」「アニメ」が含まれているかチェック
          setHasGameHobby(hobbiesData.hobbies.some(h => h.name === 'ゲーム'));
          setHasMusicHobby(hobbiesData.hobbies.some(h => h.name === '音楽鑑賞'));
          setHasReadingHobby(hobbiesData.hobbies.some(h => h.name === '読書'));
          setHasAnimeHobby(hobbiesData.hobbies.some(h => h.name === 'アニメ'));

          // 「音楽鑑賞」「ゲーム」「読書」「アニメ」は個別に管理するため、一般的な趣味リストからは除外
          setHobbies(hobbiesData.hobbies.filter(h => h.name !== '音楽鑑賞' && h.name !== 'ゲーム' && h.name !== '読書' && h.name !== 'アニメ'));
        } else {
          console.error(hobbiesData.error || 'Failed to fetch hobbies');
        }
      } else {
        console.error('Hobbies fetch failed:', results[0].reason);
      }

      // 2. ゲームデータの処理
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

      // 3. 音楽データの処理
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

      // 4. 読書データの処理
      if (results[3].status === 'fulfilled') {
        const readingRes = results[3].value;
        const readingData = await readingRes.json();
        if (readingData.success) {
          setReadingBooksCount(readingData.entries.length);
        } else {
          console.error(readingData.error || 'Failed to fetch reading books');
        }
      } else {
        console.error('Reading fetch failed:', results[3].reason);
      }

      // 5. アニメデータの処理
      if (results[4].status === 'fulfilled') {
        const animeRes = results[4].value;
        const animeData = await animeRes.json();
        if (animeData.success) {
          setAnimeCount(animeData.animeList.length);
        } else {
          console.error(animeData.error || 'Failed to fetch anime list');
        }
      } else {
        console.error('Anime fetch failed:', results[4].reason);
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

  // 趣味タグがクリックされた時の処理
  // 既に選択されていれば非表示（null）にし、そうでなければ選択状態にする（トグル動作）
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

  // 表示する項目が全くない場合は何も表示しない
  if (!loading && hobbies.length === 0 && !hasGameHobby && !hasMusicHobby && !hasReadingHobby && !hasAnimeHobby) {
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
        {(playedGamesCount > 0 || hasGameHobby) && (
          <button
            className={`hobby-tag ${selectedHobby === 'ゲーム' ? 'active' : ''}`}
            onClick={() => handleHobbyClick('ゲーム')}
          >
            ゲーム
          </button>
        )}
        {(musicPreferencesCount > 0 || hasMusicHobby) && (
          <button
            className={`hobby-tag ${selectedHobby === '音楽鑑賞' ? 'active' : ''}`}
            onClick={() => handleHobbyClick('音楽鑑賞')}
          >
            音楽鑑賞
          </button>
        )}
        {(readingBooksCount > 0 || hasReadingHobby) && (
          <button
            className={`hobby-tag ${selectedHobby === '読書' ? 'active' : ''}`}
            onClick={() => handleHobbyClick('読書')}
          >
            読書
          </button>
        )}
        {(animeCount > 0 || hasAnimeHobby) && (
          <button
            className={`hobby-tag ${selectedHobby === 'アニメ' ? 'active' : ''}`}
            onClick={() => handleHobbyClick('アニメ')}
          >
            アニメ
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

      {selectedHobby === 'アニメ' && (
        <AnimeHobbyDisplay />
      )}

      {isGameLibraryModalOpen && <GameLibraryModal onClose={handleCloseModal} isOwner={isOwner} />}
    </div>
  );
}

export default HobbiesDisplay;