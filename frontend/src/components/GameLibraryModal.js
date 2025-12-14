// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './GameLibraryModal.css';
import debounce from 'lodash.debounce'; // 入力イベントを間引いて、APIの過剰な呼び出しを防ぐ
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; // ドラッグ&ドロップ機能

// --- 子コンポーネント定義 ---

// 登録済みの曲からBGMを選択するためのモーダル
function SelectSongModal({ songs, existingBgms, onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  // 既にBGMとして追加されている曲を除外し、検索語でフィルタリング
  const filteredSongs = songs.filter(song => {
    const isAlreadyAdded = existingBgms.some(bgm => bgm.url === song.youtube_url && bgm.title === song.song_title);
    if (isAlreadyAdded) return false;
    if (searchTerm === '') return true;
    return (song.song_title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            song.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* ... モーダルの内容 ... */}
      </div>
    </div>
  );
}

// ゲーム検索結果の1項目を表示するコンポーネント
function GameResult({ game, onAdd, isAdded, translateToJapanese }) {
  const getPlatformNames = (platforms) => { /* ... */ };
  const platformNames = getPlatformNames(game.platforms);
  const displayName = translateToJapanese ? translateToJapanese(game.name) : game.name;
  const showEnglishName = displayName !== game.name;

  return (
    <div className="game-result-item">
      {/* ... 検索結果の表示 ... */}
      <button onClick={() => onAdd(game)} disabled={isAdded}>
        {isAdded ? '追加済み' : '追加'}
      </button>
    </div>
  );
}

// ライブラリ内の1項目を表示・編集するコンポーネント
function LibraryItem({ game, onRemove, onUpdate, allUserSongs, ... }) {
  const [isEditing, setIsEditing] = useState(false);
  // 評価、コメント、プレイ時間などのState
  const [rating, setRating] = useState(game.rating || null);
  const [comment, setComment] = useState(game.comment || '');
  const [playtimeHours, setPlaytimeHours] = useState(game.playtime_hours ? String(game.playtime_hours) : '');
  const [series, setSeries] = useState(game.series || '');
  const [bgms, setBgms] = useState(game.bgms || []);
  const [showSelectSongModal, setShowSelectSongModal] = useState(false);

  // 保存ボタンが押されたときの処理
  const handleSave = async () => {
    const updateData = { /* ... 評価、コメント、BGMなどのデータ ... */ };
    await onUpdate(game.id, updateData); // 親コンポーネントの更新関数を呼び出す
    setIsEditing(false);
  };

  // BGMリストのドラッグ&ドロップ終了時の処理
  const handleBgmDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedBgms = Array.from(bgms);
    const [movedBgm] = reorderedBgms.splice(result.source.index, 1);
    reorderedBgms.splice(result.destination.index, 0, movedBgm);
    setBgms(reorderedBgms);
  };

  // ...
  return (
    <div className="library-item">
      {/* ... ゲーム情報の表示 ... */}
      {isEditing ? (
        <div className="edit-form">
          {/* ... 編集フォーム ... */}
          <div className="bgm-section">
            <label>好きなBGM:</label>
            <DragDropContext onDragEnd={handleBgmDragEnd}>
              {/* ... BGMのドラッグ&ドロップリスト ... */}
            </DragDropContext>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={addBgm}>手動で追加</button>
              <button onClick={() => setShowSelectSongModal(true)}>登録済み曲から追加</button>
            </div>
          </div>
          <button onClick={handleSave}>保存</button>
          <button onClick={handleCancel}>キャンセル</button>
        </div>
      ) : (
        <div className="game-details">
          {/* ... 詳細表示 ... */}
          <button onClick={() => setIsEditing(true)}>編集</button>
        </div>
      )}
    </div>
  );
}


// --- メインコンポーネント ---
function GameLibraryModal({ onClose, isOwner }) {
  // State管理
  const [myGames, setMyGames] = useState([]); // ライブラリ内のゲームリスト
  const [searchResults, setSearchResults] = useState([]); // 外部APIからの検索結果
  const [searchTerm, setSearchTerm] = useState(''); // 検索キーワード
  const [loading, setLoading] = useState(false); // ライブラリの読み込み状態
  const [searchLoading, setSearchLoading] = useState(false); // 検索の読み込み状態
  const [error, setError] = useState(''); // エラーメッセージ
  const [sortOrder, setSortOrder] = useState('added'); // ライブラリの並び順
  const [allUserSongs, setAllUserSongs] = useState([]); // ユーザーが登録した全曲リスト

  const getToken = () => localStorage.getItem('token');

  // ユーザーが登録した曲のリストを取得する関数
  const fetchAllUserSongs = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user-songs', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) setAllUserSongs(data.songs);
    } catch (err) {
      console.error('Error fetching user songs:', err);
    }
  }, []);

  // ライブラリのゲームリストをバックエンドから取得する関数
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

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchMyGames();
    fetchAllUserSongs();
  }, [fetchMyGames, fetchAllUserSongs]);

  // RAWG.io APIキー
  const RAWG_API_KEY = process.env.REACT_APP_RAWG_API_KEY || '';

  // 日本語と英語のゲーム名の対応表
  const japaneseToEnglishMapping = { /* ... */ };
  const englishToJapaneseMapping = useMemo(() => ({ /* ... */ }), []);

  // 英語名を日本語名に変換する関数
  const translateToJapanese = useCallback((englishName) => { /* ... */ }, [englishToJapaneseMapping]);
  // 日本語キーワードを英語に変換する関数
  const translateJapaneseKeyword = (keyword) => { /* ... */ };

  // ゲームを検索する関数（debounceで連続実行を防止）
  const debouncedSearch = useCallback(
    debounce(async (query, platformId, page = 1, append = false) => {
      if (query.length < 2) return;
      if (!RAWG_API_KEY) {
        setError('RAWG APIキーが設定されていません。');
        return;
      }
      setSearchLoading(true);
      try {
        const translatedQuery = translateJapaneseKeyword(query);
        const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(translatedQuery)}&page_size=20&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        // ... 検索結果を処理してStateにセット ...
      } catch (err) {
        setError(`ゲームの検索に失敗しました: ${err.message}`);
      } finally {
        setSearchLoading(false);
      }
    }, 500),
    [RAWG_API_KEY, translateToJapanese]
  );

  // 検索キーワードやプラットフォームが変わったら検索を実行
  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm, selectedPlatform);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedPlatform, debouncedSearch]);

  // ゲームをライブラリに追加する処理
  const handleAddGame = async (game) => {
    try {
      await fetch('http://localhost:5000/api/played-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          game_api_id: String(game.id),
          title: game.name,
          // ... 他のゲーム情報 ...
        })
      });
      fetchMyGames(); // ライブラリを再取得
    } catch (err) { /* ... */ }
  };

  // ゲームをライブラリから削除する処理
  const handleRemoveGame = async (playedGameId) => {
    try {
      await fetch(`http://localhost:5000/api/played-games/${playedGameId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchMyGames(); // ライブラリを再取得
    } catch (err) { /* ... */ }
  };

  // ゲーム情報を更新する処理（評価、コメントなど）
  const handleUpdateGame = async (playedGameId, updateData) => {
    // UIを即座に更新（楽観的更新）
    setMyGames(prevGames => prevGames.map(game =>
      game.id === playedGameId ? { ...game, ...updateData } : game
    ));
    try {
      const response = await fetch(`http://localhost:5000/api/played-games/${playedGameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) fetchMyGames(); // 失敗したらサーバーのデータに戻す
    } catch (err) {
      fetchMyGames(); // エラー時もサーバーのデータに戻す
    }
  };

  // ...
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content game-library-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ゲームライブラリを管理</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          {/* ゲーム検索セクション */}
          <div className="game-search-section">
            {/* ... */}
          </div>
          <hr />
          {/* マイライブラリセクション */}
          <div className="my-library-section">
            {/* ... */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameLibraryModal;
