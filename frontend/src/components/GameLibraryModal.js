/**
 * ゲームライブラリ管理モーダル
 * 
 * 【役割】
 * ユーザーがプレイしたゲームを検索して追加したり、評価や感想を記録したりする画面です。
 * RAWG APIという外部サービスを使ってゲーム情報を検索します。
 * 
 * 【主な機能】
 * 1. ゲーム検索 (RAWG API)
 *    - キーワード入力によるリアルタイム検索（日本語からの自動翻訳付き）
 *    - プラットフォーム（Switch, PS5など）による絞り込み
 *    - ページネーション（さらに読み込む）
 * 
 * 2. マイライブラリ管理
 *    - 登録済みゲームの評価（★1〜10）、プレイ時間、感想の編集
 *    - シリーズごとのグループ表示とフォルダ開閉
 *    - ドラッグ＆ドロップによる自由な並び替え（カスタム並び替え）
 *    - BGM（YouTubeなどのURL）の登録と管理
 * 
 * 3. データの並び替えとフィルタリング
 *    - 追加順、評価順、プレイ時間順、タイトル順、カスタム順
 *    - ライブラリ内でのプラットフォーム・ジャンル絞り込み
 */

// Reactとその機能（フック）をインポートします
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './GameLibraryModal.css';
// lodash.debounce: 入力が終わるまで処理を待つための便利な道具（検索処理などで使用）
import debounce from 'lodash.debounce';
// @hello-pangea/dnd: ドラッグ＆ドロップ機能を実現するライブラリ
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * 登録済み曲から選択するモーダルコンポーネント
 * @param {Object[]} songs - ユーザーの全曲リスト
 * @param {Object[]} existingBgms - 現在設定されているBGMリスト（重複除外用）
 * @param {Function} onSelect - 曲が選択されたときのコールバック
 * @param {Function} onClose - モーダルを閉じる関数
 */
function SelectSongModal({ songs, existingBgms, onSelect, onClose }) {
  // ★重要: useState（ステートフック）の使い方
  // const [変数名, 更新関数] = useState(初期値);
  // ここでは、検索ボックスの文字を管理する `searchTerm` と、それを書き換える `setSearchTerm` を作っています。
  const [searchTerm, setSearchTerm] = useState('');

  // 既にBGMとして追加されている曲と、検索語でフィルタリング
  const filteredSongs = songs.filter(song => {
    const isAlreadyAdded = existingBgms.some(bgm => bgm.url === song.youtube_url && bgm.title === song.song_title);
    if (isAlreadyAdded) {
      return false;
    }
    if (searchTerm === '') {
      return true;
    }
    return (song.song_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>曲を選択</h2>
          <button onClick={onClose} className="close-button"><i className="material-icons">close</i></button>
        </div>
        <div className="modal-body">
          <div className="song-search-bar">
            <input
              type="text"
              placeholder="曲名やアーティスト名で検索..."
              value={searchTerm}
              // 入力エリアの値が変わった時に実行される関数：
              // 入力された文字（e.target.value）を searchTerm にセットします
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="song-selection-list">
            {filteredSongs.length > 0 ? (
              filteredSongs.map(song => (
                <div key={song.id} className="song-selection-item" onClick={() => onSelect(song)}>
                  <div className="song-info">
                    <p className="song-title">{song.song_title}</p>
                    <p className="song-artist">{song.artist_name}</p>
                  </div>
                  <button className="btn-add-song">追加</button>
                </div>
              ))
            ) : (
              <p>追加できる曲がありません。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * 検索結果のゲーム項目を表示するコンポーネント
 * @param {Object} game - ゲームデータ
 * @param {Function} onAdd - 追加ボタンが押されたときのハンドラ
 * @param {boolean} isAdded - 既に追加済みかどうか
 * @param {Function} translateToJapanese - 英語名を日本語に変換する関数
 */
function GameResult({ game, onAdd, isAdded, translateToJapanese }) {
  // プラットフォーム名を取得（Nintendo Switch, PlayStation, Xbox, PC など）
  // props（親から渡されたデータ）を使って表示内容を決めます
  const getPlatformNames = (platforms) => {
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return 'プラットフォーム情報なし';
    }

    const platformNames = platforms
      .map(p => p.platform?.name || p.name)
      .filter(Boolean)
      .slice(0, 3); // 最大3つまで表示

    return platformNames.length > 0 ? platformNames.join(', ') : 'プラットフォーム情報なし';
  };

  const platformNames = getPlatformNames(game.platforms);
  // 日本語名があれば日本語名を、なければ英語名を表示
  const displayName = translateToJapanese ? translateToJapanese(game.name) : game.name;
  const showEnglishName = displayName !== game.name; // 日本語名に変換できた場合

  return (
    <div className="game-result-item">
      <img src={game.background_image} alt={displayName} className="game-image" />
      <div className="game-info">
        <p>{displayName}</p>
        {showEnglishName && (
          <small style={{ display: 'block', color: '#999', fontSize: '0.75rem', marginTop: '2px' }}>
            {game.name}
          </small>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
          {game.released && (
            <small style={{ color: '#666' }}>{game.released}</small>
          )}
          {game.rating && game.rating > 0 && (
            <small style={{
              color: '#ff9800',
              fontWeight: '600',
              backgroundColor: '#fff3e0',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              ⭐ {game.rating.toFixed(1)}
            </small>
          )}
        </div>
        <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '0.8rem' }}>
          {platformNames}
        </small>
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

/**
 * ライブラリ内の各ゲームアイテムを表示・編集するコンポーネント
 * ドラッグ&ドロップ、評価、コメント編集、BGM管理の機能を持つ
 */
function LibraryItem({ game, onRemove, onUpdate, allSeries, isDraggable, dndProvided, dndSnapshot, isOwner, layoutMode, allUserSongs }) {
  console.log(`[DEBUG] LibraryItem for game "${game.title}" received allSeries:`, allSeries);
  // --- ステート（状態変数）の定義エリア ---
  // ここで画面に表示したり、編集したりするデータを管理します。

  // 編集モードかどうかを切り替える変数。trueなら編集画面を表示、falseなら通常の表示画面。
  const [isEditing, setIsEditing] = useState(false);
  // ゲームの評価（★の数）を保存する変数。初期値は props で渡された game.rating です。
  const [rating, setRating] = useState(game.rating || null);
  // 感想コメントを保存する変数
  const [comment, setComment] = useState(game.comment || '');
  // プレイ時間を保存する変数。文字列として扱います。
  const [playtimeHours, setPlaytimeHours] = useState(game.playtime_hours ? String(game.playtime_hours) : '');
  // シリーズ名を保存する変数
  const [series, setSeries] = useState(game.series || '');
  // 設定されたBGMリストを保存する変数。配列 [] で管理します。
  const [bgms, setBgms] = useState(game.bgms || []);
  // 曲選択モーダルを表示するかどうかを決めるフラグ変数
  const [showSelectSongModal, setShowSelectSongModal] = useState(false);

  useEffect(() => {
    // 親コンポーネントから渡された game データが変わったら、
    // ローカルの状態（rating, comment など）も更新して同期します
    setRating(game.rating || null);
    setComment(game.comment || '');
    setPlaytimeHours(game.playtime_hours ? String(game.playtime_hours) : '');
    setSeries(game.series || '');
    setBgms(game.bgms || []);
  }, [game.rating, game.comment, game.playtime_hours, game.series, game.bgms]);

  // ★データを保存する関数
  // async (非同期) と await (待機) を使って、保存処理が終わるのを待ってから次の処理（編集モード終了）を行います。
  const handleSave = async () => {
    // サーバーに送るためのデータオブジェクトを作成
    const updateData = {
      rating: rating === null || rating === 0 ? null : rating,
      // trim() は文字の前後の空白を削除します。「  あいう  」→「あいう」
      comment: comment && comment.trim() ? comment.trim() : null,
      playtime_hours: playtimeHours && playtimeHours.trim() ? parseFloat(playtimeHours) : null,
      series: series && series.trim() ? series.trim() : null,
      // タイトルかURLが入っているBGMだけを残します（空の行を削除）
      bgms: bgms.filter(bgm => (bgm.title && bgm.title.trim() !== '') || (bgm.url && bgm.url.trim() !== '')),
    };

    console.log('[DEBUG] handleSave: bgms before filtering:', bgms);
    console.log('Saving game update:', game.id, updateData);
    // 親コンポーネントから渡された更新関数（onUpdate）を実行
    await onUpdate(game.id, updateData);
    // 編集モードを終了して表示モードに戻る
    setIsEditing(false);
  };

  const handleCancel = () => {
    setRating(game.rating || null);
    setComment(game.comment || '');
    setPlaytimeHours(game.playtime_hours ? String(game.playtime_hours) : '');
    setSeries(game.series || '');
    setBgms(game.bgms || []);
    setIsEditing(false);
  };

  const handleBgmChange = (index, field, value) => {
    const newBgms = [...bgms];
    newBgms[index][field] = value;
    setBgms(newBgms);
  };

  const addBgm = () => {
    setBgms([...bgms, { title: '', url: '' }]);
  };

  // ★ 登録済み曲からBGMを選択して追加するハンドラ
  const handleSelectSong = (song) => {
    // 重複チェック
    const isAlreadyAdded = bgms.some(bgm => bgm.url === song.youtube_url && bgm.title === song.song_title);
    if (!isAlreadyAdded) {
      setBgms([...bgms, { title: song.song_title, url: song.youtube_url }]);
    }
    setShowSelectSongModal(false); // モーダルを閉じる
  };

  const removeBgm = (index) => {
    const newBgms = bgms.filter((_, i) => i !== index);
    setBgms(newBgms);
  };

  // BGMリストのドラッグ&ドロップによる並び替え終了時の処理
  const handleBgmDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const reorderedBgms = Array.from(bgms);
    const [movedBgm] = reorderedBgms.splice(result.source.index, 1);
    reorderedBgms.splice(result.destination.index, 0, movedBgm);

    setBgms(reorderedBgms);
  };

  // ★星マークを表示する関数
  // Array.from({ length: 10 }) で10個の要素を持つ配列を作り、mapでループして星を表示します。
  const renderStars = (value, interactive = false) => {
    const ratingValue = value || 0;
    return (
      <div className="star-rating">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
          <span
            key={star}
            className={`star ${star <= ratingValue ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // isDraggable に応じて props を準備するが、コンポーネントの構造は変えない
  const ref = isDraggable ? dndProvided.innerRef : null;
  const draggableProps = isDraggable ? dndProvided.draggableProps : {};
  const dragHandleProps = isDraggable ? dndProvided.dragHandleProps : {};
  const style = isDraggable
    ? {
      ...dndProvided.draggableProps.style,
      boxShadow: dndSnapshot.isDragging ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
    }
    : {};
  const className = `library-item ${isDraggable ? 'draggable' : ''} ${layoutMode}`;

  return (
    <div ref={ref} {...draggableProps} style={style} className={className}>
      {/* ★ 曲選択モーダルの表示 */}
      {showSelectSongModal && (
        <SelectSongModal
          songs={allUserSongs}
          existingBgms={bgms}
          onSelect={handleSelectSong}
          onClose={() => setShowSelectSongModal(false)}
        />
      )}

      {isDraggable && (
        <div className="drag-handle" {...dragHandleProps}>
          <i className="material-icons">drag_indicator</i>
        </div>
      )}
      <img src={game.image_url} alt={game.title} className="game-image" />
      <div className="game-info">
        <p>{game.title}</p>
        {isEditing ? (
          <div className="edit-form">
            <div className="rating-section">
              <label>評価:</label>
              {renderStars(rating || 0, true)}
              <button
                type="button"
                onClick={() => setRating(null)}
                className="btn-clear-rating"
                style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '2px 8px' }}
              >
                評価をクリア
              </button>
            </div>
            <div className="playtime-section">
              <label>プレイ時間（時間）:</label>
              <input
                type="number"
                value={playtimeHours}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                    setPlaytimeHours(value);
                  }
                }}
                placeholder="例: 50.5"
                min="0"
                step="0.5"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '0.85rem' }}>
                例: 50.5（50時間30分）、100（100時間）
              </small>
            </div>
            <div className="comment-section">
              <label>コメント:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ゲームの感想を入力..."
                rows={6}
              />
            </div>
            <div className="series-section">
              <label>シリーズ名:</label>
              <input
                type="text"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="例: ポケモン、ゼルダの伝説"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div className="bgm-section">
              <label>好きなBGM:</label>
              <DragDropContext onDragEnd={handleBgmDragEnd}>
                <Droppable droppableId="bgm-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {bgms.map((bgm, index) => (
                        <Draggable key={index} draggableId={`bgm-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bgm-entry"
                              style={{
                                ...provided.draggableProps.style,
                                backgroundColor: snapshot.isDragging ? '#e0e0e0' : 'white',
                                border: snapshot.isDragging ? '1px solid #ccc' : '1px solid #eee',
                                padding: '8px',
                                marginBottom: '5px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                              }}
                            >
                              <i className="material-icons" style={{ cursor: 'grab' }}>drag_indicator</i>
                              <div className="bgm-entry-content">
                                <div className="bgm-input-group">
                                  <label>BGM名:</label>
                                  <input
                                    type="text"
                                    value={bgm.title}
                                    onChange={(e) => handleBgmChange(index, 'title', e.target.value)}
                                    placeholder="BGMのタイトル (例: メインテーマ)"
                                  />
                                </div>
                                <div className="bgm-input-group">
                                  <label>URL:</label>
                                  <input
                                    type="text"
                                    value={bgm.url}
                                    onChange={(e) => handleBgmChange(index, 'url', e.target.value)}
                                    placeholder="URL (例: https://www.youtube.com/...)"
                                  />
                                </div>
                              </div>
                              <button type="button" onClick={() => removeBgm(index)} className="btn-remove-bgm">削除</button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              {/* ★ ボタンを2つにする */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={addBgm} className="btn-add-bgm">
                  手動で追加
                </button>
                <button type="button" onClick={() => setShowSelectSongModal(true)} className="btn-add-bgm-from-library">
                  登録済み曲から追加
                </button>
              </div>
            </div>

            <div className="edit-actions">
              <button onClick={handleSave} className="btn-save">保存</button>
              <button onClick={handleCancel} className="btn-cancel">キャンセル</button>
            </div>
          </div>
        ) : (
          <div className="game-details">
            {rating !== null && rating !== undefined && rating > 0 ? (
              <div className="rating-display">
                <label>評価:</label>
                {renderStars(rating)}
              </div>
            ) : null}
            {playtimeHours && parseFloat(playtimeHours) > 0 ? (
              <div className="playtime-display">
                <label>プレイ時間:</label>
                <span style={{ fontWeight: '600', color: '#2196F3' }}>
                  {parseFloat(playtimeHours).toFixed(1)}時間
                </span>
              </div>
            ) : null}
            {comment && comment.trim() ? (
              <div className="comment-display">
                <p>{comment}</p>
              </div>
            ) : null}
            {bgms && bgms.length > 0 ? (
              <div className="bgm-display">
                <label>好きなBGM:</label>
                <ul>
                  {bgms.map((bgm, index) => (
                    <li key={index}>
                      <a href={bgm.url} target="_blank" rel="noopener noreferrer">
                        {bgm.title || `BGM ${index + 1}`}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(!rating || rating === 0) && !playtimeHours && !comment && (!bgms || bgms.length === 0) && (
              <p className="no-details">評価、プレイ時間、コメント、BGMを追加してください</p>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  console.log('Edit button clicked for game:', game.id);
                  setIsEditing(true);
                }}
                className="btn-edit"
              >
                編集
              </button>
            )}
          </div>
        )}
      </div>
      {isOwner && <button onClick={() => onRemove(game.id)} className="btn-remove-game">削除</button>}
    </div>
  );
}

/**
 * ゲームライブラリ管理のメインモーダル
 * APIからのデータ取得、検索、並び替え、シリーズごとのグループ化などを管理
 */
function GameLibraryModal({ onClose, isOwner }) {
  // --- 1. ライブラリの状態 (My Library) ---
  const [myGames, setMyGames] = useState([]); // 自分のライブラリにある全ゲーム
  const [loading, setLoading] = useState(false); // 読み込み中フラグ
  const [error, setError] = useState(''); // エラーメッセージ

  // --- 2. 検索機能の状態 (Search) ---
  const [searchResults, setSearchResults] = useState([]); // 検索で見つかったゲーム
  const [searchTerm, setSearchTerm] = useState(''); // 検索窓の入力値
  const [searchLoading, setSearchLoading] = useState(false); // 検索中フラグ
  const [selectedPlatform, setSelectedPlatform] = useState(''); // 検索時のプラットフォーム絞り込みID
  const [currentPage, setCurrentPage] = useState(1); // 検索結果の現在のページ
  const [hasMoreResults, setHasMoreResults] = useState(false); // まだ次の検索結果があるか
  const [loadingMore, setLoadingMore] = useState(false); // 「さらに読み込む」ボタンの実行中フラグ

  // --- 3. 表示・並び替えの状態 (View Options) ---
  const [sortOrder, setSortOrder] = useState(() => {
    // 設定をブラウザ(localStorage)に保存しておくことで、次回開いたときも同じ順序にする
    try {
      const savedSortOrder = localStorage.getItem('sortOrderState');
      return savedSortOrder ? JSON.parse(savedSortOrder) : 'added';
    } catch (error) {
      return 'added';
    }
  });
  const [isCustomOrder, setIsCustomOrder] = useState(false); // ユーザーが手動で並び替えた状態か
  const [selectedLibraryPlatform, setSelectedLibraryPlatform] = useState(''); // ライブラリ内のプラットフォーム絞り込み
  const [selectedLibraryGenre, setSelectedLibraryGenre] = useState(''); // ライブラリ内のジャンル絞り込み
  const [layoutMode, setLayoutMode] = useState('grid'); // 画面レイアウト（タイル or リスト）

  // --- 4. シリーズ・BGM関連の状態 ---
  const [expandedSeries, setExpandedSeries] = useState(() => {
    // どのシリーズフォルダが開いているかを保存しておく
    try {
      const savedState = localStorage.getItem('expandedSeriesState');
      return savedState ? JSON.parse(savedState) : {};
    } catch (error) {
      return {};
    }
  });
  const [allUserSongs, setAllUserSongs] = useState([]); // BGMとして選べる全曲のリスト

  const getToken = () => localStorage.getItem('token');

  // ユーザーの全曲を取得する関数
  // useCallbackを使うと、関数の再生成を防いでパフォーマンスを改善できます
  const fetchAllUserSongs = useCallback(async () => {
    try {
      // サーバー（バックエンド）のAPIを呼び出して曲データを取得
      const response = await fetch('http://localhost:5000/api/user-songs', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setAllUserSongs(data.songs);
      } else {
        console.error('Failed to fetch user songs:', data.error);
      }
    } catch (err) {
      console.error('Error fetching user songs:', err);
    }
  }, []);


  // ★サーバーから自分のゲームリストを取得する関数
  // useCallback はこの関数を再利用するために使います（無駄な再生成を防ぐ）
  const fetchMyGames = useCallback(async () => {
    console.log('[DEBUG] fetchMyGames called');

    // データの取得を開始するので、ローディング表示をONにします
    setLoading(true);

    try {
      // API（サーバーのURL）にリクエストを送ります
      // headers には認証トークン（ログイン情報）を含めます
      const response = await fetch('http://localhost:5000/api/played-games', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      // サーバーからの返事（レスポンス）をJSON形式のデータとして読み取ります
      const data = await response.json();
      if (data.success) {
        const games = data.playedGames;
        console.log('[DEBUG] fetchMyGames: Setting myGames to:', games.map(g => g.title));
        // 常にAPIから取得した順序でセットする
        setMyGames(games);
        console.log('[DEBUG] fetchMyGames: myGames set.');

        setUpdateCounter(c => c + 1); // 強制再描画をトリガー

        // 既存のlocalStorageの状態を尊重しつつ、新しいシリーズはデフォルトで開く
        setExpandedSeries(prev => {
          const seriesNames = [...new Set(games.map(g => g.series && g.series.trim() !== '' ? g.series.trim() : '未分類'))];
          const newExpansionState = { ...prev };
          seriesNames.forEach(name => {
            if (newExpansionState[name] === undefined) {
              newExpansionState[name] = true;
            }
          });
          try {
            localStorage.setItem('expandedSeriesState', JSON.stringify(newExpansionState));
          } catch (error) {
            console.error('Failed to save expandedSeriesState to localStorage', error);
          }
          return newExpansionState;
        });

      } else {
        setError(data.error || 'ライブラリの取得に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  // 並び替え機能
  const getSortedGames = (games, order) => {
    if (!games || games.length === 0) return games;

    const sorted = [...games];

    switch (order) {
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'playtime':
        return sorted.sort((a, b) => (b.playtime_hours || 0) - (a.playtime_hours || 0));
      case 'title':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'));
      case 'added':
      default:
        // created_atでソート（最新が先）
        return sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      case 'custom':
        // カスタム順序はドラッグ&ドロップで維持
        return sorted;
    }
  };



  // ドラッグ&ドロップの処理
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) {
      return;
    }

    setMyGames(prevMyGames => { // 関数形式の更新
      const items = Array.from(prevMyGames); // prevMyGames を参照
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      console.log('myGames after setMyGames (function update):', items.map(g => g.title)); // 更新後の myGames の内容をログ出力
      return items;
    });

    setIsCustomOrder(true);
    setSortOrder('custom');
    localStorage.setItem('sortOrderState', JSON.stringify('custom'));
  }, []); // myGames に依存しない

  useEffect(() => {
    fetchMyGames();
    fetchAllUserSongs(); // ★ 曲リストも取得
  }, [fetchMyGames, fetchAllUserSongs]);

  const RAWG_API_KEY = process.env.REACT_APP_RAWG_API_KEY || '';

  console.log('GameLibraryModal - RAWG_API_KEY:', RAWG_API_KEY ? '設定済み' : '未設定');

  // 日本語ゲーム名から英語名へのマッピング（検索用）
  const japaneseToEnglishMapping = {
    'ゼルダ': 'Zelda',
    'ゼルダの伝説': 'The Legend of Zelda',
    'マリオ': 'Mario',
    'スーパーマリオ': 'Super Mario',
    'ポケモン': 'Pokemon',
    'スプラトゥーン': 'Splatoon',
    'モンスターハンター': 'Monster Hunter',
    'MH': 'Monster Hunter',
    'MH2': 'Monster Hunter 2',
    'MH2ndG': 'Monster Hunter Freedom Unite',
    'MH3': 'Monster Hunter 3',
    'MHW': 'Monster Hunter: World',
    'MHXX': 'Monster Hunter Generations Ultimate',
    'MHRise': 'Monster Hunter Rise',
    'ドラゴンクエスト': 'Dragon Quest',
    'ファイナルファンタジー': 'Final Fantasy',
    'あつまれどうぶつの森': 'Animal Crossing',
    '動物の森': 'Animal Crossing',
    'スーパースマッシュブラザーズ': 'Super Smash Bros',
    'スマブラ': 'Super Smash Bros',
    'ファイアーエムブレム': 'Fire Emblem',
    'ゼノブレイド': 'Xenoblade',
    '異度神剣': 'Xenoblade',
    'リングフィット': 'Ring Fit Adventure',
    'カービー': 'Kirby',
    '星のカービー': 'Kirby',
    'メトロイド': 'Metroid',
    'ドンキーコング': 'Donkey Kong',
    'ピクミン': 'Pikmin',
    'ベヨネッタ': 'Bayonetta',
    'フェアリーテイル': 'Fairy Tail',
    '妖怪ウォッチ': 'Yo-kai Watch',
    '真・三國無双': 'Dynasty Warriors',
    '三國無双': 'Dynasty Warriors',
    'ペルソナ': 'Persona',
    'ソニック': 'Sonic',
    'ストリートファイター': 'Street Fighter',
    '鉄拳': 'Tekken',
    'ダークソウル': 'Dark Souls',
    'エルデンリング': 'Elden Ring',
    'フォートナイト': 'Fortnite',
    '原神': 'Genshin Impact',
    'Apex Legends': 'Apex Legends',
    'オーバーウォッチ': 'Overwatch',
    'マインクラフト': 'Minecraft',
    'レッドデッドリデンプション': 'Red Dead Redemption',
    'グランド・セフト・オート': 'Grand Theft Auto',
    'GTA': 'Grand Theft Auto',
    'ウィッチャー': 'The Witcher',
    'サイバーパンク': 'Cyberpunk',
    'ホライゾン': 'Horizon',
    'ゴッド・オブ・ウォー': 'God of War',
    'スパイダーマン': 'Spider-Man',
    'アサシンクリード': 'Assassin\'s Creed',
    'バトルフィールド': 'Battlefield',
    'コールオブデューティ': 'Call of Duty',
    'COD': 'Call of Duty',
    // ポケモン略称
    'DP': 'Pokemon Diamond Pearl',
    'BW': 'Pokemon Black White',
    'XY': 'Pokemon X Y',
    'USSM': 'Pokemon Ultra Sun Ultra Moon',
    'SV': 'Pokemon Scarlet Violet',
    'SS': 'Pokemon Sword Shield',
    'LGPE': 'Pokemon Let\'s Go Pikachu Eevee',
    'BDSP': 'Pokemon Brilliant Diamond Shining Pearl',
    'PLA': 'Pokemon Legends Arceus',
    'SM': 'Pokemon Sun Moon',
    'ORAS': 'Pokemon Omega Ruby Alpha Sapphire',
    'HGSS': 'Pokemon HeartGold SoulSilver',
    'PT': 'Pokemon Platinum',
    'RSE': 'Pokemon Ruby Sapphire Emerald',
    'FRLG': 'Pokemon FireRed LeafGreen',
    'GSC': 'Pokemon Gold Silver Crystal',
    'RBY': 'Pokemon Red Blue Yellow',

    // 追加の略称対応
    'モンハン': 'Monster Hunter',
    'MH': 'Monster Hunter',
    'スマブラ': 'Super Smash Bros',
    'ブレワイ': 'The Legend of Zelda Breath of the Wild',
    'ティアキン': 'The Legend of Zelda Tears of the Kingdom',
    'あつ森': 'Animal Crossing New Horizons',
    'どう森': 'Animal Crossing',
    'ドラクエ': 'Dragon Quest',
    'DQ': 'Dragon Quest',
    'FF': 'Final Fantasy',
    'FE': 'Fire Emblem',
    'マイクラ': 'Minecraft',
    'フォトナ': 'Fortnite',
    'エペ': 'Apex Legends',
    'OW': 'Overwatch',
    'バロ': 'VALORANT',
    'バイオ': 'Resident Evil',
    'メタギア': 'Metal Gear Solid',
    'MGS': 'Metal Gear Solid',
    'キンハ': 'Kingdom Hearts',
    'KH': 'Kingdom Hearts',
    'ニーア': 'Nier',
    'パルワールド': 'Palworld',
    'ウマ娘': 'Uma Musume'
  };

  // 英語名から日本語名へのマッピング（表示用）
  const englishToJapaneseMapping = useMemo(() => ({
    // Nintendo
    'The Legend of Zelda': 'ゼルダの伝説',
    'Zelda': 'ゼルダ',
    'Breath of the Wild': 'ブレス オブ ザ ワイルド',
    'Tears of the Kingdom': 'ティアーズ オブ ザ キングダム',
    'Super Mario': 'スーパーマリオ',
    'Mario': 'マリオ',
    'Super Mario Bros': 'スーパーマリオブラザーズ',
    'Super Mario Odyssey': 'スーパーマリオ オデッセイ',
    'Super Mario Galaxy': 'スーパーマリオギャラクシー',
    'Pokemon': 'ポケモン',
    'Pokémon': 'ポケモン',
    'Pokemon Sword': 'ポケットモンスター ソード',
    'Pokemon Shield': 'ポケットモンスター シールド',
    'Splatoon': 'スプラトゥーン',
    'Splatoon 2': 'スプラトゥーン2',
    'Splatoon 3': 'スプラトゥーン3',
    'Monster Hunter': 'モンスターハンター',
    'Monster Hunter Rise': 'モンスターハンターライズ',
    'Monster Hunter World': 'モンスターハンターワールド',
    'Dragon Quest': 'ドラゴンクエスト',
    'Final Fantasy': 'ファイナルファンタジー',
    'Animal Crossing': 'あつまれどうぶつの森',
    'Super Smash Bros': 'スーパースマッシュブラザーズ',
    'Fire Emblem': 'ファイアーエムブレム',
    'Xenoblade': 'ゼノブレイド',
    'Ring Fit Adventure': 'リングフィット アドベンチャー',
    'Kirby': 'カービー',
    'Metroid': 'メトロイド',
    'Donkey Kong': 'ドンキーコング',
    'Pikmin': 'ピクミン',
    'Bayonetta': 'ベヨネッタ',
    'Yo-kai Watch': '妖怪ウォッチ',
    'Dynasty Warriors': '真・三國無双',
    'Persona': 'ペルソナ',
    'Persona 5': 'ペルソナ5',
    'Sonic': 'ソニック',
    'Street Fighter': 'ストリートファイター',
    'Tekken': '鉄拳',
    // アクション・RPG
    'Dark Souls': 'ダークソウル',
    'Elden Ring': 'エルデンリング',
    'Fortnite': 'フォートナイト',
    'Genshin Impact': '原神',
    'Overwatch': 'オーバーウォッチ',
    'Minecraft': 'マインクラフト',
    'Red Dead Redemption': 'レッドデッドリデンプション',
    'Grand Theft Auto': 'グランド・セフト・オート',
    'The Witcher': 'ウィッチャー',
    'The Witcher 3': 'ウィッチャー3',
    'Cyberpunk': 'サイバーパンク',
    'Cyberpunk 2077': 'サイバーパンク2077',
    'Horizon': 'ホライゾン',
    'Horizon Zero Dawn': 'ホライゾン ゼロ ドーン',
    'God of War': 'ゴッド・オブ・ウォー',
    'Spider-Man': 'スパイダーマン',
    'Assassin\'s Creed': 'アサシンクリード',
    'Battlefield': 'バトルフィールド',
    'Call of Duty': 'コールオブデューティ',
    // その他の人気タイトル
    'Apex Legends': 'Apex Legends',
    'League of Legends': 'リーグ・オブ・レジェンド',
    'VALORANT': 'VALORANT',
    'Counter-Strike': 'カウンターストライク',
    'The Last of Us': 'ラスト・オブ・アス',
    'Uncharted': 'アンチャーテッド',
    'Bloodborne': 'ブラッドボーン',
    'Ghost of Tsushima': 'ゴースト・オブ・ツシマ',
    'Resident Evil': 'バイオハザード',
    'Metal Gear Solid': 'メタルギアソリッド',
    'Kingdom Hearts': 'キングダムハーツ',
    'Tales of': 'テイルズ オブ',
    'Dragon Ball': 'ドラゴンボール',
    'One Piece': 'ワンピース',
    'Naruto': 'ナルト',
    'FIFA': 'FIFA',
    'Pro Evolution Soccer': 'ウイニングイレブン',
    'PES': 'ウイニングイレブン'
  }), []);

  // 英語名を日本語名に変換（表示用）
  const translateToJapanese = useCallback((englishName) => {
    if (!englishName) return '';

    // 完全一致をチェック
    if (englishToJapaneseMapping[englishName]) {
      return englishToJapaneseMapping[englishName];
    }

    // 部分一致をチェック（より長いマッチを優先）
    const sortedEntries = Object.entries(englishToJapaneseMapping).sort((a, b) => b[0].length - a[0].length);
    for (const [en, jp] of sortedEntries) {
      const enLower = en.toLowerCase();
      const nameLower = englishName.toLowerCase();
      if (nameLower.includes(enLower)) {
        // 元の名前に含まれるシリーズ名を日本語に置換
        return englishName.replace(new RegExp(escapeRegExp(en), 'gi'), jp);
      }
    }

    // 翻訳できない場合は元の英語名を返す
    return englishName;
  }, [englishToJapaneseMapping]);

  // 正規表現の特殊文字をエスケープするヘルパー関数
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
  };

  // 日本語キーワードを英語に変換（部分マッチ）
  const translateJapaneseKeyword = (keyword) => {
    // 完全一致を優先
    if (japaneseToEnglishMapping[keyword]) {
      return japaneseToEnglishMapping[keyword];
    }

    const lowerKeyword = keyword.toLowerCase();

    // 長い略語から先にチェックするようにソート
    const sortedKeys = Object.keys(japaneseToEnglishMapping).sort((a, b) => b.length - a.length);

    for (const jp of sortedKeys) {
      if (lowerKeyword.includes(jp.toLowerCase())) {
        return japaneseToEnglishMapping[jp];
      }
    }

    return keyword;
  };

  // ★ゲーム検索機能（デバウンス処理付き）
  // debounce（デバウンス）とは？
  // ユーザーが文字を入力するたびに検索するとサーバー負荷などの問題があるため、
  // 入力が一区切りついたタイミング（ここでは500ミリ秒後）に一度だけ検索を実行する仕組みです。
  const debouncedSearch = useCallback(
    debounce(async (query, platformId, page = 1, append = false) => {
      console.log('debouncedSearch called with:', { query, platformId, queryLength: query.length, page, append });

      if (query.length < 2) {
        console.log('検索文字数が少なすぎます。結果をクリアします。');
        setSearchResults([]);
        setSearchLoading(false);
        setCurrentPage(1);
        setHasMoreResults(false);
        return;
      }

      if (!RAWG_API_KEY) {
        console.warn('RAWG_API_KEY is not set');
        setError('RAWG APIキーが設定されていません。ゲーム検索機能を使用するには、環境変数REACT_APP_RAWG_API_KEYを設定してください。フロントエンドのルートディレクトリに.envファイルを作成し、REACT_APP_RAWG_API_KEY=あなたのAPIキー を追加してください。');
        setSearchLoading(false);
        setLoadingMore(false);
        return;
      }

      if (page === 1) {
        console.log('検索を開始します...');
        setSearchLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');

      try {
        // 日本語キーワードを英語に変換
        const translatedQuery = translateJapaneseKeyword(query);
        console.log('Original query:', query, 'Translated query:', translatedQuery);

        // 元のクエリと翻訳後のクエリの両方で検索
        const searchQueries = translatedQuery !== query
          ? [translatedQuery, query] // 翻訳された場合、両方試す
          : [query]; // 翻訳できない場合は元のクエリのみ

        let allResults = [];
        let lastError = null;

        // 複数のクエリで検索を試行
        for (const searchQuery of searchQueries) {
          try {
            // ページサイズを増やして、より多くの結果を取得
            // ordering=-rating で評価順（人気順）にソート
            // プラットフォームフィルターはクライアント側で適用するため、APIには送らない
            let url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=20&page=${page}&ordering=-rating`;

            console.log('ゲームを取得中:', url, 'プラットフォームフィルターはクライアント側で適用されます:', platformId || 'なし');

            const response = await fetch(url);
            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('API Error:', errorData);
              lastError = new Error(errorData.error || `HTTP error! status: ${response.status}`);
              continue; // 次のクエリを試す
            }

            const data = await response.json();
            console.log('クエリに対するRAWG APIの生の結果:', searchQuery, data.results);
            console.log('Number of results:', data.results ? data.results.length : 0);

            if (data.results && data.results.length > 0) {
              // 重複を避けて結果を追加し、日本語名を追加
              const newGames = data.results
                .filter(game => !allResults.some(existing => existing.id === game.id))
                .map(game => ({
                  ...game,
                  japaneseName: translateToJapanese(game.name)
                }));
              allResults = [...allResults, ...newGames];

              // 次のページがあるかチェック
              if (data.next && data.results.length === 20) {
                setHasMoreResults(true);
              } else {
                setHasMoreResults(false);
              }
            } else {
              setHasMoreResults(false);
            }
          } catch (err) {
            console.error('Search error for query:', searchQuery, err);
            lastError = err;
            continue; // 次のクエリを試す
          }
        }

        console.log('クライアント側の絞り込み前の結果数:', allResults.length, allResults.map(g => g.name));

        // プラットフォームフィルターが選択されている場合、クライアント側でもフィルタリング
        if (platformId && platformId !== '') {
          console.log('クライアント側でプラットフォームによる絞り込み:', platformId);
          allResults = allResults.filter(game => {
            const gamePlatforms = game.platforms || [];
            const hasPlatform = gamePlatforms.some(p => {
              const platformIdStr = String(p.platform?.id || p.id || '');
              const selectedPlatformStr = String(platformId);
              return platformIdStr === selectedPlatformStr;
            });

            if (!hasPlatform) {
              console.log(`ゲーム "${game.name}" (ID: ${game.id}) はプラットフォーム ${platformId} に対応していません`, {
                gamePlatforms: gamePlatforms.map(p => ({ id: p.platform?.id || p.id, name: p.platform?.name || p.name }))
              });
            }
            return hasPlatform;
          });
          console.log('After client-side platform filtering, results count:', allResults.length, allResults.map(g => g.name)); // クライアントサイドフィルタリング後の結果
        }

        // 結果を関連性スコアでソート（より関連性の高い結果を上位に）
        allResults = allResults.map(game => {
          const gameName = game.name.toLowerCase();
          const searchLower = translatedQuery.toLowerCase();
          const originalLower = query.toLowerCase();

          let relevanceScore = 0;

          // 完全一致（最高スコア）
          if (gameName === searchLower || gameName === originalLower) {
            relevanceScore = 1000;
          }
          // タイトルの先頭から一致
          else if (gameName.startsWith(searchLower) || gameName.startsWith(originalLower)) {
            relevanceScore = 500;
          }
          // フレーズ全体が含まれている（複数単語の場合に重要）
          else if (gameName.includes(searchLower) || gameName.includes(originalLower)) {
            relevanceScore = 400;
          }
          // 単語の先頭から一致（例: "Monster Hunter" の "Monster" 部分）
          else if (gameName.split(' ').some(word => word.startsWith(searchLower) || word.startsWith(originalLower))) {
            relevanceScore = 300;
          }
          // 検索クエリが複数単語の場合、全ての単語が含まれているかチェック
          else {
            const searchWords = searchLower.split(' ').filter(w => w.length > 0);
            const gameWords = gameName.split(' ');

            // 全ての検索単語がゲーム名に含まれている場合のみスコアを付ける
            if (searchWords.length > 1) {
              const allWordsMatch = searchWords.every(searchWord =>
                gameWords.some(gameWord => gameWord.includes(searchWord))
              );

              if (allWordsMatch) {
                // 全単語が含まれているが、連続していない場合
                relevanceScore = 150;
              }
            } else {
              // 単一単語の検索で部分一致
              if (gameWords.some(word => word.includes(searchLower))) {
                relevanceScore = 100;
              }
            }
          }

          // 評価も考慮（関連性スコアに加算）
          relevanceScore += (game.rating || 0) * 10;

          return { ...game, relevanceScore };
        });

        // 関連性スコアでソート
        allResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        // 関連性が低すぎる結果を除外
        // 閾値を100に設定することで、フレーズ全体が含まれているゲームのみ表示
        // (フレーズ一致400点 + rating最大50点 = 最大450点)
        // 単語の一部だけが一致するゲーム（例: "Dragon"だけ、"Quest"だけ）は除外される
        const minRelevanceThreshold = 100;
        const beforeFilterCount = allResults.length;
        allResults = allResults.filter(game => {
          const score = game.relevanceScore || 0;
          // 検索語が含まれていない場合は除外（スコアが評価のみの場合）
          if (score < minRelevanceThreshold) return false;
          return true;
        });

        console.log(`Relevance filtering: ${beforeFilterCount} -> ${allResults.length} results`);
        console.log('After relevance filtering:', allResults.map(g => ({ name: g.name, score: g.relevanceScore })));

        // 検索結果の各ゲームのプラットフォーム情報を確認
        if (allResults.length > 0) {
          // Nintendo Switch対応ゲームを確認
          const nintendoGames = allResults.filter(game =>
            game.platforms?.some(p => {
              const platformName = (p.platform?.name || p.name || '').toLowerCase();
              return platformName.includes('nintendo') || platformName.includes('switch');
            })
          );
          console.log(`Nintendo games found: ${nintendoGames.length}`, nintendoGames.map(g => g.name));

          allResults.forEach((game, index) => {
            const platformNames = game.platforms?.map(p => p.platform?.name || p.name).filter(Boolean) || [];
            const hasNintendo = platformNames.some(name =>
              name.toLowerCase().includes('nintendo') || name.toLowerCase().includes('switch')
            );
            console.log(`Game ${index + 1}: ${game.name}`, {
              platforms: platformNames,
              hasNintendo: hasNintendo,
              rating: game.rating,
              released: game.released
            });
          });

          // 結果を表示（append=trueの場合は追加、falseの場合は置き換え）
          if (append) {
            setSearchResults(prev => {
              // 重複を避けてリストを結合します
              const combined = [...prev];
              allResults.forEach(game => {
                if (!combined.some(existing => existing.id === game.id)) {
                  combined.push(game);
                }
              });
              return combined;
            });
          } else {
            setSearchResults(allResults);
          }

          setCurrentPage(page);
          setError('');
          console.log('Search results set:', allResults.length, 'games');
        } else {
          setSearchResults([]);
          if (platformId && platformId !== '') {
            setError('選択したプラットフォームでの検索結果が見つかりませんでした。プラットフォームフィルターを解除するか、別のキーワードで試してください。');
          } else {
            setError('検索結果が見つかりませんでした。別のキーワードで試してください。');
          }
          console.log('No results found');
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
        setError(`ゲームの検索に失敗しました: ${err.message}`);
      } finally {
        setSearchLoading(false);
        setLoadingMore(false);
        console.log('Search completed');
      }
    }, 500),
    [RAWG_API_KEY, translateToJapanese]
  );

  // スクロールイベントハンドラー
  const handleScroll = useCallback((e) => {
    const element = e.target;
    const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    // 一番下から100px以内に来たら次のページを読み込む
    if (scrollBottom < 100 && hasMoreResults && !loadingMore && !searchLoading && searchTerm.length >= 2) {
      console.log('Loading more results, current page:', currentPage);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      debouncedSearch(searchTerm, selectedPlatform, nextPage, true);
    }
  }, [hasMoreResults, loadingMore, searchLoading, searchTerm, currentPage, selectedPlatform, debouncedSearch]);

  useEffect(() => {
    console.log('useEffect triggered - searchTerm:', searchTerm, 'selectedPlatform:', selectedPlatform);
    if (searchTerm) {
      setCurrentPage(1);
      setHasMoreResults(false);
      debouncedSearch(searchTerm, selectedPlatform, 1, false);
    } else {
      setSearchResults([]);
      setSearchLoading(false);
      setCurrentPage(1);
      setHasMoreResults(false);
    }
  }, [searchTerm, selectedPlatform, debouncedSearch]);

  // ゲームをライブラリに追加するハンドラ
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
          image_url: game.background_image,
          platforms: game.platforms, // RAWG APIから取得したプラットフォーム情報をそのまま送信
          genres: game.genres,       // RAWG APIから取得したジャンル情報をそのまま送信
          series: selectedSeriesForAdd.trim() !== '' ? selectedSeriesForAdd.trim() : null, // シリーズ情報を追加
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchMyGames(); // ライブラリを再取得（更新）
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
        fetchMyGames(); // ライブラリを再取得（更新）
      } else {
        setError(data.error || 'ゲームの削除に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  // ゲーム情報の更新ハンドラ（評価、コメントなど）
  // ユーザー体験向上のため、サーバー応答を待たずにUIを即座に更新（楽観的更新）
  const handleUpdateGame = async (playedGameId, updateData) => {
    console.log('[DEBUG] handleUpdateGame called with:', playedGameId, updateData);

    // 楽観的更新: UIを即座に更新
    setMyGames(prevGames => {
      console.log('[DEBUG] 楽観的更新を実行中...');
      const newGames = prevGames.map(game =>
        game.id === playedGameId ? { ...game, ...updateData } : game
      );
      const updatedGame = newGames.find(g => g.id === playedGameId);
      console.log('[DEBUG] 楽観的更新後のゲームオブジェクト:', updatedGame);
      return newGames;
    });

    try {
      const response = await fetch(`http://localhost:5000/api/played-games/${playedGameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();
      if (data.success) {
        // サーバーからの正式なデータで再同期（念のため）
        // fetchMyGames(); // 楽観的更新が成功すれば不要な場合もある
        setError('');
        console.log('[DEBUG] API update successful. Response data:', data);
      } else {
        // 失敗した場合: UIをサーバーの状態にロールバック
        setError(data.error || 'ゲーム情報の更新に失敗しました。');
        fetchMyGames();
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('サーバーとの通信に失敗しました。');
      // 失敗した場合: UIをサーバーの状態にロールバック
      fetchMyGames();
    }
  };

  let filteredMyGames = myGames;

  if (selectedLibraryPlatform) {
    filteredMyGames = filteredMyGames.filter(game => {
      const gamePlatforms = game.platforms || [];
      return gamePlatforms.some(p => String(p.platform?.id || p.id) === selectedLibraryPlatform);
    });
  }

  if (selectedLibraryGenre) {
    filteredMyGames = filteredMyGames.filter(game => {
      const gameGenres = game.genres || [];
      return gameGenres.some(g => g.name === selectedLibraryGenre);
    });
  }

  filteredMyGames = getSortedGames(filteredMyGames, sortOrder);

  const myGameApiIds = new Set(myGames.map(g => g.game_api_id));

  // groupedMyGames を useMemo から外し、直接計算するように変更
  // ゲームをシリーズごとにグループ化して整理
  const groupedMyGames = (() => {
    const groups = {};
    filteredMyGames.forEach(game => {
      const seriesName = game.series && game.series.trim() !== '' ? game.series.trim() : '未分類';
      if (!groups[seriesName]) {
        groups[seriesName] = [];
      }
      groups[seriesName].push(game);
    });
    // シリーズ名をアルファベット順にソート
    const sortedSeriesNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ja'));
    const sortedGroups = {};
    sortedSeriesNames.forEach(name => {
      sortedGroups[name] = groups[name];
    });
    return sortedGroups;
  })();

  const toggleSeriesExpansion = useCallback((seriesName) => {
    setExpandedSeries(prev => {
      const newState = {
        ...prev,
        [seriesName]: !prev[seriesName]
      };
      try {
        localStorage.setItem('expandedSeriesState', JSON.stringify(newState));
      } catch (error) {
        console.error('Failed to save expandedSeriesState to localStorage', error);
      }
      return newState;
    });
  }, []);

  console.log('[DEBUG] GameLibraryModal Render. Current myGames (first 3):', myGames.slice(0, 3).map(g => g.title));
  console.log('[DEBUG] GameLibraryModal Render. Current sortOrder:', sortOrder);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content game-library-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ゲームライブラリを管理</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}

          <div className="game-search-section">
            <h4>ゲームを検索して追加</h4>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
              💡 検索のヒント: 日本語名（例: ゼルダ、マリオ）や英語名（例: Zelda, Mario, Pokemon）で検索できます
            </p>
            <div className="search-controls"> {/* New div for controls */}
              <input
                type="text"
                placeholder="ゲームのタイトルを入力... (例: ゼルダの伝説、Mario, Pokemon)"
                value={searchTerm}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log('Input changed:', newValue);
                  setSearchTerm(newValue);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    console.log('Enter key pressed, current searchTerm:', searchTerm);
                  }
                }}
              />

              <select
                value={selectedPlatform}
                onChange={(e) => {
                  console.log('Platform changed to:', e.target.value);
                  setSelectedPlatform(e.target.value);
                }}
              >
                <option value="">全てのプラットフォーム</option>
                <optgroup label="Nintendo">
                  <option value="7">Nintendo Switch</option>
                  <option value="83">Nintendo 3DS</option>
                  <option value="20">Nintendo DS</option>
                  <option value="10">Wii U</option>
                  <option value="11">Wii</option>
                  <option value="105">Game Boy Advance</option>
                </optgroup>
                <optgroup label="PlayStation">
                  <option value="18">PlayStation 5</option>
                  <option value="187">PlayStation 4</option>
                  <option value="16">PlayStation 3</option>
                  <option value="15">PlayStation 2</option>
                  <option value="19">PlayStation Vita</option>
                  <option value="17">PlayStation Portable (PSP)</option>
                </optgroup>
                <optgroup label="Xbox">
                  <option value="186">Xbox Series X/S</option>
                  <option value="1">Xbox One</option>
                  <option value="14">Xbox 360</option>
                </optgroup>
                <optgroup label="その他">
                  <option value="4">PC</option>
                  <option value="3">iOS</option>
                  <option value="21">Android</option>
                </optgroup>
              </select>
            </div>
            {searchLoading && (
              <div className="search-loading-container">
                <div className="spinner-centered"></div>
                <p style={{ marginTop: '10px', color: '#666' }}>検索中...</p>
              </div>
            )}
            {!searchLoading && searchTerm.length >= 2 && searchResults.length === 0 && (
              <p style={{ padding: '10px', color: '#666', textAlign: 'center' }}>
                検索結果がありません
              </p>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div
                className="search-results"
                onScroll={handleScroll}
                ref={setSearchResultsRef}
                style={{ maxHeight: '400px', overflowY: 'auto' }}
              >
                {searchResults.map(game => (
                  <GameResult
                    key={game.id}
                    game={game}
                    onAdd={handleAddGame}
                    isAdded={myGameApiIds.has(String(game.id))}
                    translateToJapanese={translateToJapanese}
                  />
                ))}
                {loadingMore && (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '10px', color: '#666' }}>さらに読み込み中...</p>
                  </div>
                )}
                {!hasMoreResults && searchResults.length > 0 && (
                  <p style={{ textAlign: 'center', padding: '10px', color: '#999', fontSize: '0.9rem' }}>
                    すべての結果を表示しました
                  </p>
                )}
              </div>
            )}
          </div>

          <hr />

          <div className="my-library-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0 }}>マイライブラリ ({filteredMyGames.length})</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label htmlFor="sort-order" style={{ fontSize: '0.9rem', color: '#666' }}>並び替え:</label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(e) => {
                    const newSortOrder = e.target.value;
                    setSortOrder(newSortOrder);
                    localStorage.setItem('sortOrderState', JSON.stringify(newSortOrder));
                    setIsCustomOrder(false);
                  }}
                  style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                >
                  <option value="added">追加日順（新しい順）</option>
                  <option value="rating">評価順（高い順）</option>
                  <option value="playtime">プレイ時間順（多い順）</option>
                  <option value="title">タイトル順（あいうえお順）</option>
                </select>

                <label htmlFor="library-platform-filter" style={{ fontSize: '0.9rem', color: '#666' }}>機種:</label>
                <select
                  id="library-platform-filter"
                  value={selectedLibraryPlatform}
                  onChange={(e) => setSelectedLibraryPlatform(e.target.value)}
                  style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                >
                  <option value="">全ての機種</option>
                  <optgroup label="Nintendo">
                    <option value="7">Nintendo Switch</option>
                    <option value="83">Nintendo 3DS</option>
                    <option value="20">Nintendo DS</option>
                    <option value="10">Wii U</option>
                    <option value="11">Wii</option>
                    <option value="105">Game Boy Advance</option>
                  </optgroup>
                  <optgroup label="PlayStation">
                    <option value="18">PlayStation 5</option>
                    <option value="187">PlayStation 4</option>
                    <option value="16">PlayStation 3</option>
                    <option value="15">PlayStation 2</option>
                    <option value="19">PlayStation Vita</option>
                    <option value="17">PlayStation Portable (PSP)</option>
                  </optgroup>
                  <optgroup label="Xbox">
                    <option value="186">Xbox Series X/S</option>
                    <option value="1">Xbox One</option>
                    <option value="14">Xbox 360</option>
                  </optgroup>
                  <optgroup label="その他">
                    <option value="4">PC</option>
                    <option value="3">iOS</option>
                    <option value="21">Android</option>
                  </optgroup>
                </select>

                <label htmlFor="library-genre-filter" style={{ fontSize: '0.9rem', color: '#666' }}>ジャンル:</label>
                <select
                  id="library-genre-filter"
                  value={selectedLibraryGenre}
                  onChange={(e) => setSelectedLibraryGenre(e.target.value)}
                  style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                >
                  <option value="">全てのジャンル</option>
                  <option value="Action">アクション</option>
                  <option value="Adventure">アドベンチャー</option>
                  <option value="RPG">RPG</option>
                  <option value="Strategy">ストラテジー</option>
                  <option value="Shooter">シューター</option>
                  <option value="Puzzle">パズル</option>
                  <option value="Racing">レース</option>
                  <option value="Sports">スポーツ</option>
                  <option value="Simulation">シミュレーション</option>
                  <option value="Fighting">格闘</option>
                  <option value="Family">ファミリー</option>
                  <option value="Arcade">アーケード</option>
                  <option value="Platformer">プラットフォーマー</option>
                </select>
                <div className="layout-toggle">
                  <button onClick={() => setLayoutMode('grid')} className={layoutMode === 'grid' ? 'active' : ''}>
                    <i className="material-icons">grid_view</i>
                  </button>
                  <button onClick={() => setLayoutMode('list')} className={layoutMode === 'list' ? 'active' : ''}>
                    <i className="material-icons">view_list</i>
                  </button>
                </div>
              </div>
            </div>
            {loading ? <p>読み込み中...</p> : (
              Object.keys(groupedMyGames).length > 0 ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="series-list">
                    {Object.entries(groupedMyGames).map(([seriesName, games]) => (
                      <div key={seriesName} className="series-folder">
                        <div className="series-header" onClick={() => toggleSeriesExpansion(seriesName)}>
                          <h3>
                            {seriesName} ({games.length})
                            <i className="material-icons" style={{ marginLeft: '10px' }}>
                              {expandedSeries[seriesName] ? 'expand_less' : 'expand_more'}
                            </i>
                          </h3>
                        </div>
                        {expandedSeries[seriesName] && (
                          sortOrder === 'custom' ? (
                            <Droppable droppableId={`library-grid-${seriesName}`} type="game">
                              {(provided, snapshot) => (
                                <div
                                  className={`library-grid ${layoutMode}`}
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                  style={{
                                    backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent',
                                    transition: 'background-color 0.2s',
                                  }}
                                >
                                  {games.map((game, index) => (
                                    <Draggable key={game.id} draggableId={String(game.id)} index={index}>
                                      {(provided, snapshot) => (
                                        <LibraryItem
                                          key={game.id}
                                          game={game}
                                          onRemove={handleRemoveGame}
                                          onUpdate={handleUpdateGame}
                                          isDraggable={false}
                                          isOwner={isOwner}
                                          layoutMode={layoutMode}
                                          allUserSongs={allUserSongs} // ★ 曲リストを渡す
                                        />
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          ) : (
                            sortOrder === 'custom' ? (
                              <Droppable droppableId={`library-grid-${seriesName}`} type="game">
                                {(provided, snapshot) => (
                                  <div
                                    className={`library-grid ${layoutMode}`}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    style={{
                                      backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent',
                                      transition: 'background-color 0.2s',
                                    }}
                                  >
                                    {games.map((game, index) => (
                                      <Draggable key={game.id} draggableId={String(game.id)} index={index}>
                                        {(provided, snapshot) => (
                                          <LibraryItem
                                            game={game}
                                            onRemove={handleRemoveGame}
                                            onUpdate={handleUpdateGame}
                                            isDraggable={true}
                                            dndProvided={provided}
                                            dndSnapshot={snapshot}
                                            layoutMode={layoutMode}
                                            allUserSongs={allUserSongs} // ★ 曲リストを渡す
                                          />
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            ) : (
                              <div className={`library-grid ${layoutMode}`}>
                                {games.map(game => (
                                  <LibraryItem
                                    key={game.id}
                                    game={game}
                                    onRemove={handleRemoveGame}
                                    onUpdate={handleUpdateGame}
                                    isDraggable={false}
                                    isOwner={isOwner}
                                    layoutMode={layoutMode}
                                    allUserSongs={allUserSongs} // ★ 曲リストを渡す
                                  />
                                ))}
                              </div>
                            )
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </DragDropContext>
              ) : (
                <p>ライブラリにゲームがありません。</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameLibraryModal;