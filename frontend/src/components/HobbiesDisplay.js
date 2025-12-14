// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect, useCallback } from 'react';
import './HobbiesDisplay.css';
import GameLibraryModal from './GameLibraryModal'; // ゲームライブラリモーダル
import MusicAppreciationDisplay from './MusicAppreciationDisplay'; // 音楽鑑賞表示エリア
import ReadingHobbyDisplay from './ReadingHobbyDisplay'; // 読書記録表示エリア

// 趣味・関心事を表示するコンポーネント
function HobbiesDisplay({ isOwner, portfolioId }) {
  // State管理
  const [hobbies, setHobbies] = useState([]); // 「その他」の趣味リスト
  const [playedGamesCount, setPlayedGamesCount] = useState(0); // プレイ済みゲームの数
  const [musicPreferencesCount, setMusicPreferencesCount] = useState(0); // 音楽設定の数
  const [readingBooksCount, setReadingBooksCount] = useState(0); // 読書記録の数
  const [selectedHobby, setSelectedHobby] = useState(null); // 現在選択されている趣味のタグ名
  const [loading, setLoading] = useState(true); // 読み込み状態
  const [error, setError] = useState(''); // エラーメッセージ
  const [isGameLibraryModalOpen, setGameLibraryModalOpen] = useState(false); // ゲームライブラリモーダルの表示状態

  // 関連する全ての趣味データを一括で取得する関数
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Promise.allSettledを使って、複数のAPI呼び出しを並行して実行
      // 一部のAPIが失敗しても、他の成功したAPIの結果は受け取れる
      const results = await Promise.allSettled([
        fetch('http://localhost:5000/api/hobbies', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/played-games', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/user-music-preferences', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/reading/books', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      // 汎用的な趣味リストの処理
      if (results[0].status === 'fulfilled') {
        const hobbiesData = await results[0].value.json();
        if (hobbiesData.success) {
          // 特殊な表示を持つ「音楽鑑賞」「ゲーム」「読書」を除外してStateにセット
          setHobbies(hobbiesData.hobbies.filter(h => h.name !== '音楽鑑賞' && h.name !== 'ゲーム' && h.name !== '読書'));
        }
      }

      // ゲームの処理
      if (results[1].status === 'fulfilled') {
        const gamesData = await results[1].value.json();
        if (gamesData.success) setPlayedGamesCount(gamesData.playedGames.length);
      }

      // 音楽の処理
      if (results[2].status === 'fulfilled') {
        const musicData = await results[2].value.json();
        if (musicData.success) setMusicPreferencesCount(musicData.preferences.length);
      }

      // 読書の処理
      if (results[3].status === 'fulfilled') {
        const readingData = await results[3].value.json();
        if (readingData.success) setReadingBooksCount(readingData.books.length);
      }

    } catch (err) {
      setError('データの読み込み中に予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 趣味タグがクリックされたときの処理
  const handleHobbyClick = (hobbyName) => {
    // 同じタグを再度クリックしたら選択解除、違うタグなら選択切り替え
    setSelectedHobby(prev => (prev === hobbyName ? null : hobbyName));
  };

  // ゲームライブラリモーダルを開く処理
  const handleOpenModal = () => {
    setGameLibraryModalOpen(true);
  };

  // ゲームライブラリモーダルを閉じる処理
  const handleCloseModal = () => {
    setGameLibraryModalOpen(false);
    fetchData(); // モーダルでデータが変更された可能性があるので、データを再取得
  };

  // 表示すべき趣味が一つもなければ、このコンポーネント自体を非表示にする
  if (!loading && hobbies.length === 0 && playedGamesCount === 0 && musicPreferencesCount === 0 && readingBooksCount === 0) {
    return null;
  }

  return (
    <div className="hobbies-display-container">
      <h2 className="hobbies-title">趣味・関心事</h2>
      
      {loading && <p>読み込み中...</p>}
      {error && <p className="error-message">{error}</p>}

      {/* 趣味のタグ一覧 */}
      <div className="hobby-tags">
        {/* 「その他」の趣味タグ */}
        {hobbies.map(hobby => (
          <button key={hobby.id} className={`hobby-tag ${selectedHobby === hobby.name ? 'active' : ''}`} onClick={() => handleHobbyClick(hobby.name)}>
            {hobby.name}
          </button>
        ))}
        {/* ゲームの趣味タグ（データがある場合のみ表示） */}
        {playedGamesCount > 0 && (
          <button className={`hobby-tag ${selectedHobby === 'ゲーム' ? 'active' : ''}`} onClick={() => handleHobbyClick('ゲーム')}>
            ゲーム
          </button>
        )}
        {/* 音楽鑑賞の趣味タグ（データがある場合のみ表示） */}
        {musicPreferencesCount > 0 && (
          <button className={`hobby-tag ${selectedHobby === '音楽鑑賞' ? 'active' : ''}`} onClick={() => handleHobbyClick('音楽鑑賞')}>
            音楽鑑賞
          </button>
        )}
        {/* 読書の趣味タグ（データがある場合のみ表示） */}
        {readingBooksCount > 0 && (
          <button className={`hobby-tag ${selectedHobby === '読書' ? 'active' : ''}`} onClick={() => handleHobbyClick('読書')}>
            読書
          </button>
        )}
      </div>

      {/* 選択された趣味に応じて詳細表示エリアを切り替え */}
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

      {/* ゲームライブラリモーダルの表示制御 */}
      {isGameLibraryModalOpen && <GameLibraryModal onClose={handleCloseModal} isOwner={isOwner} />}
    </div>
  );
}

export default HobbiesDisplay;
