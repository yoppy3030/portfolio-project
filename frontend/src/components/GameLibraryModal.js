// Reactとその機能（フック）をインポートします
// useState: 画面に表示するデータ（状態）を管理する機能
// useEffect: 画面が表示された後やデータが変わった時に動く機能（副作用）
// useCallback: 関数を再利用して、無駄な処理を減らす機能
// useMemo: 計算結果を保存して、無駄な計算を減らす機能
// useRef: 特定のHTML要素（inputタグなど）を直接操作するための機能
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import '../style/GameLibraryModal.css';
// lodash.debounce: 検索などで、入力が終わるまで処理を待つための便利な道具
// （例：文字を打つたびに検索すると重くなるので、打ち終わってから0.5秒後に検索する、という時に使います）
import debounce from 'lodash.debounce';
// @hello-pangea/dnd: ドラッグ＆ドロップ機能を実現するライブラリ
// DragDropContext: ドラッグ＆ドロップができる範囲全体を囲むもの
// Droppable: ドロップできる場所（リストなど）
// Draggable: ドラッグできる要素（リストの中身など）
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * 【SelectSongModal】
 * 登録済みの音楽リストからBGMを選択するポップアップ画面（モーダル）です。
 * 
 * @param {Object[]} songs - ユーザーが登録している全曲のリスト
 * @param {Object[]} existingBgms - すでにこのゲームに設定されているBGM（重複して追加しないように確認用）
 * @param {Function} onSelect - 曲を選んだ時に実行される関数（親コンポーネントに伝えます）
 * @param {Function} onClose - 「閉じる」ボタンを押した時に実行される関数
 */
function SelectSongModal({ songs, existingBgms, onSelect, onClose }) {
  // ★重要: useState（ステートフック）の使い方
  // const [変数名, 更新関数] = useState(初期値);
  // ここでは、検索ボックスに入力された文字を管理する `searchTerm` と、
  // それを更新するための `setSearchTerm` を作っています。初期値は空文字 '' です。
  const [searchTerm, setSearchTerm] = useState('');

  // 表示する曲リストをフィルター（絞り込み）する処理
  // 1. すでにBGMとして追加されている曲は除外します
  // 2. 検索ボックスに文字が入っていれば、曲名かアーティスト名で検索します
  const filteredSongs = songs.filter(song => {
    // 既にリストにあるかチェック（some関数は、1つでも条件に合うものがあれば true を返します）
    const isAlreadyAdded = existingBgms.some(bgm => bgm.url === song.youtube_url && bgm.title === song.song_title);

    // 既にあるなら表示しない（false）
    if (isAlreadyAdded) {
      return false;
    }

    // 検索文字が空なら、全ての曲を表示（true）
    if (searchTerm === '') {
      return true;
    }

    // 曲名 または アーティスト名 に検索文字が含まれているかチェック
    // toLowerCase() で小文字に変換してから比較することで、大文字小文字を区別せずに検索できます（例: "ABC" と "abc" が一致）
    return (
      (song.song_title && song.song_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (song.artist_name && song.artist_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    // モーダルの背景（暗くなっている部分）。ここをクリックすると閉じます。
    <div className="modal-backdrop" onClick={onClose}>
      {/* モーダルの中身。stopPropagation() は、中身をクリックした時に背景のクリックイベント（閉じる処理）が発生しないようにします */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>曲を選択</h2>
          <button onClick={onClose} className="close-button"><i className="material-icons">close</i></button>
        </div>
        <div className="modal-body">
          <div className="song-search-bar">
            {/* 検索ボックス */}
            <input
              type="text"
              placeholder="曲名やアーティスト名で検索..."
              value={searchTerm}
              // 入力エリアの値が変わった時に実行される関数：
              // 入力された文字（e.target.value）を searchTerm にセットして画面を更新します
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="song-selection-list">
            {/* フィルターされた曲がある場合はリストを表示、なければメッセージを表示 */}
            {filteredSongs.length > 0 ? (
              filteredSongs.map(song => (
                // key はReactがリストを管理するために必要な一意のIDです
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
 * 【GameResult】
 * 検索結果のリストの1つ1つのゲームを表示するコンポーネントです。
 * ゲームの画像、タイトル、発売日、評価などを表示し、「追加」ボタンを持ちます。
 * 
 * @param {Object} game - 表示するゲームのデータ
 * @param {Function} onAdd - 「追加」ボタンが押されたときの関数
 * @param {boolean} isAdded - すでにライブラリに追加済みかどうか（trueならボタンを押せなくする）
 * @param {Function} translateToJapanese - 英語のゲーム名を日本語に変換する関数
 */
function GameResult({ game, onAdd, isAdded, translateToJapanese }) {
  // プラットフォーム名（Switch, PS5 etc）を取得して、見やすい文字列にする関数
  const getPlatformNames = (platforms) => {
    // データがない場合のチェック
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return 'プラットフォーム情報なし';
    }

    // プラットフォームの配列から名前だけを取り出して、最大3つまで取得
    const platformNames = platforms
      .map(p => p.platform?.name || p.name) // データ構造に合わせて名前を取得
      .filter(Boolean) // 空のデータあれば除外
      .slice(0, 3); // 長すぎるとレイアウト崩れるので3つまで

    // カンマ区切りで結合して返す（例: "PlayStation 5, PC, Xbox"）
    return platformNames.length > 0 ? platformNames.join(', ') : 'プラットフォーム情報なし';
  };

  const platformNames = getPlatformNames(game.platforms);

  // 日本語名への翻訳を試みます。翻訳関数があれば使い、なければそのまま英語名を使います。
  const displayName = translateToJapanese ? translateToJapanese(game.name) : game.name;

  // 表示名と元の名前が違う場合（＝翻訳できた場合）、元の英語名も小さく表示するためのフラグ
  const showEnglishName = displayName !== game.name;

  return (
    <div className="game-result-item">
      {/* ゲームのパッケージ画像 */}
      <img src={game.background_image} alt={displayName} className="game-image" />

      <div className="game-info">
        <p>{displayName}</p>

        {/* 翻訳があった場合のみ、元の英語名を表示 */}
        {showEnglishName && (
          <small style={{ display: 'block', color: '#999', fontSize: '0.75rem', marginTop: '2px' }}>
            {game.name}
          </small>
        )}

        {/* 発売日と評価（星）の表示エリア */}
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
              {/* toFixed(1) は小数を1桁まで表示する関数です（例: 4.53 → 4.5） */}
              ⭐ {game.rating.toFixed(1)}
            </small>
          )}
        </div>

        {/* プラットフォーム名の表示 */}
        <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '0.8rem' }}>
          {platformNames}
        </small>
      </div>

      {/* 追加ボタン。既に追加済みの場合は disabled（無効化）にして押せなくします */}
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
 * 【LibraryItem】
 * ライブラリ（自分のリスト）にあるゲームを表示・編集するコンポーネントです。
 * 通常時はゲーム情報を表示し、編集ボタンを押すと入力フォームが表示されます。
 * 
 * @param {Object} game - ゲームの詳細データ（タイトル、画像、評価、コメントなど）
 * @param {Function} onRemove - 「削除」ボタンを押したときの関数
 * @param {Function} onUpdate - 「保存」ボタンを押したときの関数（データを更新する）
 * @param {boolean} isDraggable - ドラッグ並び替えが可能かどうか
 * @param {Object} dndProvided - ドラッグ＆ドロップライブラリから渡される設定データ
 * @param {Object} dndSnapshot - ドラッグ中の状態（ドラッグ中かどうかなど）
 * @param {boolean} isOwner - このライブラリの持ち主かどうか（編集権限の確認）
 * @param {string} layoutMode - 表示モード（'grid' = グリッド表示, 'list' = リスト表示）
 * @param {Object[]} allUserSongs - BGMとして選択可能な全曲リスト
 */
function LibraryItem({ game, onRemove, onUpdate, allSeries, isDraggable, dndProvided, dndSnapshot, isOwner, layoutMode, allUserSongs }) {
  console.log(`[DEBUG] LibraryItem for game "${game.title}" received allSeries:`, allSeries);

  // --- useState: 各入力項目の状態管理 ---

  // 編集モードかどうか（trueなら編集画面、falseなら表示画面）
  const [isEditing, setIsEditing] = useState(false);

  // 評価（星の数）。初期値はゲームデータにある値を使います。
  const [rating, setRating] = useState(game.rating || null);

  // 感想コメント
  const [comment, setComment] = useState(game.comment || '');

  // プレイ時間（計算しやすいように文字列として扱います）
  const [playtimeHours, setPlaytimeHours] = useState(game.playtime_hours ? String(game.playtime_hours) : '');

  // シリーズ名（例: ポケモン、ゼルダ）
  const [series, setSeries] = useState(game.series || '');

  // 設定されたBGMのリスト。配列 [] で管理します。
  const [bgms, setBgms] = useState(game.bgms || []);

  // 曲選択モーダルを表示するかどうかのフラグ
  const [showSelectSongModal, setShowSelectSongModal] = useState(false);

  // --- useEffect: データの同期 ---
  // 親コンポーネントから渡された `game` プロップが変わった時に、
  // ローカルのstate（入力欄の中身）も新しいデータに合わせて更新します。
  useEffect(() => {
    setRating(game.rating || null);
    setComment(game.comment || '');
    setPlaytimeHours(game.playtime_hours ? String(game.playtime_hours) : '');
    setSeries(game.series || '');
    setBgms(game.bgms || []);
  }, [game.rating, game.comment, game.playtime_hours, game.series, game.bgms]);

  // --- 保存処理 ---
  // 「保存」ボタンが押された時の処理です。
  const handleSave = async () => {
    // 更新するデータを作成
    const updateData = {
      // 0やnullの扱いに注意してセットします
      rating: rating === null || rating === 0 ? null : rating,

      // trim() で前後の余分な空白を削除します。「  こんにちは  」→「こんにちは」
      comment: comment && comment.trim() ? comment.trim() : null,

      // 文字列を数値（小数）に変換します
      playtime_hours: playtimeHours && playtimeHours.trim() ? parseFloat(playtimeHours) : null,

      series: series && series.trim() ? series.trim() : null,

      // BGMリストから、タイトルもURLも空っぽの無効なデータを取り除きます
      bgms: bgms.filter(bgm => (bgm.title && bgm.title.trim() !== '') || (bgm.url && bgm.url.trim() !== '')),
    };

    console.log('[DEBUG] Saving game update:', game.id, updateData);

    // 親コンポーネントの更新関数を呼び出して、サーバーにデータを送ります
    // await を使うことで、保存が終わるのを待ちます
    await onUpdate(game.id, updateData);

    // 編集モードを終了して、通常の表示に戻します
    setIsEditing(false);
  };

  // --- キャンセル処理 ---
  // 「キャンセル」ボタンが押された時、変更を破棄して元のデータに戻します
  const handleCancel = () => {
    setRating(game.rating || null);
    setComment(game.comment || '');
    setPlaytimeHours(game.playtime_hours ? String(game.playtime_hours) : '');
    setSeries(game.series || '');
    setBgms(game.bgms || []);
    setIsEditing(false);
  };

  // --- BGM関連の処理 ---

  // BGMの入力欄（タイトルやURL）が変更された時の処理
  const handleBgmChange = (index, field, value) => {
    // stateの配列を直接書き換えてはいけないので、コピーを作ってから変更します
    const newBgms = [...bgms];
    newBgms[index][field] = value;
    setBgms(newBgms); // 更新した新しい配列をセット
  };

  // 手動で空のBGM行を追加する処理
  const addBgm = () => {
    setBgms([...bgms, { title: '', url: '' }]);
  };

  // 登録済み曲から選択して追加する処理
  const handleSelectSong = (song) => {
    // 同じ曲が既にないかチェック（重複防止）
    const isAlreadyAdded = bgms.some(bgm => bgm.url === song.youtube_url && bgm.title === song.song_title);
    if (!isAlreadyAdded) {
      // 既存のリストの後ろに新しい曲を追加します
      setBgms([...bgms, { title: song.song_title, url: song.youtube_url }]);
    }
    setShowSelectSongModal(false); // 選択画面を閉じる
  };

  // BGMを削除する処理
  const removeBgm = (index) => {
    // 指定された番号（index）のBGM以外を残すことで、削除を実現します（filter関数）
    const newBgms = bgms.filter((_, i) => i !== index);
    setBgms(newBgms);
  };

  // BGMのドラッグ＆ドロップ並び替えが終わった時の処理
  const handleBgmDragEnd = (result) => {
    // ドロップ先がない場合（枠外に落とした場合など）は何もしない
    if (!result.destination) {
      return;
    }

    const reorderedBgms = Array.from(bgms);
    // 元の位置から削除し、
    const [movedBgm] = reorderedBgms.splice(result.source.index, 1);
    // 新しい位置に挿入します
    reorderedBgms.splice(result.destination.index, 0, movedBgm);

    setBgms(reorderedBgms);
  };

  // --- 星評価の表示 ---
  // interactive=true の場合はクリックして評価を変更できます
  const renderStars = (value, interactive = false) => {
    const ratingValue = value || 0;
    // 1から10までの配列を作って、それぞれの星を表示します
    return (
      <div className="star-rating">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
          <span
            key={star}
            // 現在の評価以下なら 'filled' クラスをつけて色を塗ります
            className={`star ${star <= ratingValue ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            // クリック時の処理（編集モードのみ）
            onClick={interactive ? () => setRating(star) : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // ドラッグ可能な場合のみ、ドラッグ用の設定（props）を適用します
  const ref = isDraggable ? dndProvided.innerRef : null; // 要素への参照
  const draggableProps = isDraggable ? dndProvided.draggableProps : {}; // ドラッグ機能
  const dragHandleProps = isDraggable ? dndProvided.dragHandleProps : {}; // ドラッグハンドル（掴む場所）

  // ドラッグ中のスタイル調整（影をつけるなど）
  const style = isDraggable
    ? {
      ...dndProvided.draggableProps.style,
      boxShadow: dndSnapshot.isDragging ? '0 6px 12px rgba(0,0,0,0.2)' : 'none',
    }
    : {};

  // クラス名の生成（リスト表示かグリッド表示か、など）
  const className = `library-item ${isDraggable ? 'draggable' : ''} ${layoutMode}`;

  return (
    <div ref={ref} {...draggableProps} style={style} className={className}>
      {/* 曲選択モーダルの表示（showSelectSongModalがtrueの時だけ表示） */}
      {showSelectSongModal && (
        <SelectSongModal
          songs={allUserSongs}
          existingBgms={bgms}
          onSelect={handleSelectSong}
          onClose={() => setShowSelectSongModal(false)}
        />
      )}

      {/* ドラッグハンドル（並び替え用のつまみ） */}
      {isDraggable && (
        <div className="drag-handle" {...dragHandleProps}>
          <i className="material-icons">drag_indicator</i>
        </div>
      )}

      {/* ゲーム画像の表示 */}
      <img src={game.image_url} alt={game.title} className="game-image" />

      <div className="game-info">
        <p>{game.title}</p>

        {/* 編集モードの場合の表示 */}
        {isEditing ? (
          <div className="edit-form">
            {/* 評価（星）の設定 */}
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

            {/* プレイ時間の入力 */}
            <div className="playtime-section">
              <label>プレイ時間（時間）:</label>
              <input
                type="number"
                value={playtimeHours}
                onChange={(e) => {
                  const value = e.target.value;
                  // 数値のみ入力可能にするチェック
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

            {/* コメント入力 */}
            <div className="comment-section">
              <label>コメント:</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ゲームの感想を入力..."
                rows={6}
              />
            </div>

            {/* シリーズ名入力 */}
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

            {/* BGM設定エリア（ドラッグ＆ドロップ対応） */}
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

              {/* BGM追加ボタン（2種類） */}
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
          // 通常表示モード（編集していない時）
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
            {/* 何も情報がない場合のメッセージ */}
            {(!rating || rating === 0) && !playtimeHours && !comment && (!bgms || bgms.length === 0) && (
              <p className="no-details">評価、プレイ時間、コメント、BGMを追加してください</p>
            )}

            {/* 自分のライブラリの場合のみ編集ボタンを表示 */}
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
      {/* 削除ボタン */}
      {isOwner && <button onClick={() => onRemove(game.id)} className="btn-remove-game">削除</button>}
    </div>
  );
}

/**
 * 【GameLibraryModal】
 * ゲームライブラリ管理のメイン画面（モーダル）です。
 * 自分の持っているゲームの表示、新しいゲームの検索・追加、データの保存などを行います。
 */
function GameLibraryModal({ onClose, isOwner }) {
  // --- ステート（状態変数）の定義 ---
  // 画面の表示に必要なデータを全てここで管理しています。

  // 自分のライブラリにあるゲームのリスト。
  const [myGames, setMyGames] = useState([]);

  // 検索結果のゲームリスト。検索APIから返ってきたデータを入れます。
  const [searchResults, setSearchResults] = useState([]);

  // 検索ボックスに入力中の文字。
  const [searchTerm, setSearchTerm] = useState('');

  // 読み込み中かどうか（ローディング表示用）
  // loading: 自分のライブラリの読み込み
  // searchLoading: ゲーム検索中
  // loadingMore: 検索結果の「もっと見る」読み込み中
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // エラーメッセージ。何か失敗した時にユーザーに表示する文字を入れます。
  const [error, setError] = useState('');

  // 検索条件や表示設定
  const [selectedPlatform, setSelectedPlatform] = useState(''); // 検索時の機種絞り込み
  const [currentPage, setCurrentPage] = useState(1); // 検索結果のページ番号
  const [hasMoreResults, setHasMoreResults] = useState(false); // 次のページがあるか
  const [searchResultsRef, setSearchResultsRef] = useState(null); // スクロール位置管理用

  // 並び替え順序の保存
  // localStorageに入前回の設定が残っていればそれを使い、なければ 'added'（追加日順）にします
  const [sortOrder, setSortOrder] = useState(() => {
    try {
      const savedSortOrder = localStorage.getItem('sortOrderState');
      return savedSortOrder ? JSON.parse(savedSortOrder) : 'added';
    } catch (error) {
      console.error('Failed to parse sortOrderState from localStorage', error);
      return 'added';
    }
  });

  const [isCustomOrder, setIsCustomOrder] = useState(false); // ドラッグして順番を変えたかどうか
  const [selectedLibraryPlatform, setSelectedLibraryPlatform] = useState(''); // ライブラリ表示時の機種絞り込み
  const [selectedLibraryGenre, setSelectedLibraryGenre] = useState(''); // ライブラリ表示時のジャンル絞り込み
  const [selectedSeriesForAdd, setSelectedSeriesForAdd] = useState(''); // 追加時に指定するシリーズ名

  // シリーズごとのフォルダ開閉状態を保存
  // { "ポケモン": true, "ゼルダ": false } のように管理します
  const [expandedSeries, setExpandedSeries] = useState(() => {
    try {
      const savedState = localStorage.getItem('expandedSeriesState');
      return savedState ? JSON.parse(savedState) : {};
    } catch (error) {
      console.error('Failed to parse expandedSeriesState from localStorage', error);
      return {};
    }
  });

  const [updateCounter, setUpdateCounter] = useState(0); // 強制的に画面を更新させるためのカウンター
  const [layoutMode, setLayoutMode] = useState('grid'); // 表示モード 'grid' (タイル状) か 'list' (リスト状)
  const [allUserSongs, setAllUserSongs] = useState([]); // BGMとして選べる自分の曲リスト

  // 手動追加フォーム関連
  const [showManualAdd, setShowManualAdd] = useState(false); // 手動追加画面を表示するか
  const [manualTitle, setManualTitle] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualSeries, setManualSeries] = useState('');
  const [manualImageFile, setManualImageFile] = useState(null);
  const fileInputRef = useRef(null); // ファイル選択ボタンをリセットするために使用

  // 認証トークン（ログイン情報）を取得する関数
  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // --- データの取得を行う関数 ---

  // 1. ユーザーの全曲を取得する関数（BGM選択用）
  const fetchAllUserSongs = useCallback(async () => {
    try {
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

  // 2. 自分のゲームライブラリを取得する関数
  const fetchMyGames = useCallback(async () => {
    console.log('[DEBUG] fetchMyGames called');
    setLoading(true); // 読み込み中マークを表示

    try {
      const response = await fetch('http://localhost:5000/api/played-games', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      const data = await response.json();
      if (data.success) {
        const games = data.playedGames;
        console.log('[DEBUG] fetchMyGames: Setting myGames to:', games.map(g => g.title));

        // 取得したゲームリストをstateにセット
        setMyGames(games);
        console.log('[DEBUG] fetchMyGames: myGames set.');

        setUpdateCounter(c => c + 1); // 画面更新

        // 新しいシリーズが見つかったら、デフォルトで開いた状態にする処理
        setExpandedSeries(prev => {
          // 重複なしのシリーズ名リストを作成
          const seriesNames = [...new Set(games.map(g => g.series && g.series.trim() !== '' ? g.series.trim() : '未分類'))];
          const newExpansionState = { ...prev };

          seriesNames.forEach(name => {
            // まだ設定がないシリーズなら true (開いた状態) にする
            if (newExpansionState[name] === undefined) {
              newExpansionState[name] = true;
            }
          });

          // 次回のためにlocalStorageに保存
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
      setLoading(false); // 読み込み完了（成功しても失敗しても実行）
    }
  }, []);

  // 並び替えを実行する関数
  const getSortedGames = (games, order) => {
    if (!games || games.length === 0) return games;

    // 元の配列を変えないようにコピーを作成
    const sorted = [...games];

    switch (order) {
      case 'rating': // 評価順
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'playtime': // プレイ時間順
        return sorted.sort((a, b) => (b.playtime_hours || 0) - (a.playtime_hours || 0));
      case 'title': // タイトル順
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'));
      case 'added': // 追加日順（デフォルト）
      default:
        return sorted.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA; // 新しい日付が先
        });
      case 'custom': // ユーザー定義順（ドラッグで並び替えた順）
        return sorted;
    }
  };

  // 自分のライブラリ内でのドラッグ＆ドロップ並び替え完了時の処理
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) {
      return;
    }

    // 配列の並び替え
    setMyGames(prevMyGames => {
      const items = Array.from(prevMyGames);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      console.log('myGames after setMyGames (function update):', items.map(g => g.title));
      return items;
    });

    // 並び替え順を「カスタム」に変更して保存
    setIsCustomOrder(true);
    setSortOrder('custom');
    localStorage.setItem('sortOrderState', JSON.stringify('custom'));
  }, []);

  // 画面が表示された時に一度だけ実行する処理
  useEffect(() => {
    fetchMyGames();       // ゲームリストを取得
    fetchAllUserSongs();  // 曲リストを取得
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

  // 日本語キーワードを英語に変換（部分一致でも検索できるようにする）
  const translateJapaneseKeyword = (keyword) => {
    // 完全一致があればそれを返す
    if (japaneseToEnglishMapping[keyword]) {
      return japaneseToEnglishMapping[keyword];
    }

    const lowerKeyword = keyword.toLowerCase();

    // 長い略語から順にチェック（例: "MH" と "MH2" がある場合、"MH2" を先にチェックしないと間違って変換してしまうため）
    const sortedKeys = Object.keys(japaneseToEnglishMapping).sort((a, b) => b.length - a.length);

    for (const jp of sortedKeys) {
      if (lowerKeyword.includes(jp.toLowerCase())) {
        return japaneseToEnglishMapping[jp];
      }
    }

    // 変換できなければ、元のキーワードをそのまま返す
    return keyword;
  };

  // ★ゲーム検索機能（デバウンス処理付き）
  // debounce（デバウンス）とは？
  // ユーザーが文字を入力するたびに検索するとサーバー負荷などの問題があるため、
  // 入力が一区切りついたタイミング（ここでは500ミリ秒後）に一度だけ検索を実行する仕組みです。
  const debouncedSearch = useCallback(
    debounce(async (query, platformId, page = 1, append = false) => {
      console.log('debouncedSearch called with:', { query, platformId, queryLength: query.length, page, append });

      // 2文字未満の場合は検索しない（結果が多すぎて意味がないため）
      if (query.length < 2) {
        console.log('検索文字数が少なすぎます。結果をクリアします。');
        setSearchResults([]);
        setSearchLoading(false);
        setCurrentPage(1);
        setHasMoreResults(false);
        return;
      }

      // APIキーがない場合は警告
      if (!RAWG_API_KEY) {
        console.warn('RAWG_API_KEY is not set');
        setError('RAWG APIキーが設定されていません。ゲーム検索機能を使用するには、環境変数REACT_APP_RAWG_API_KEYを設定してください。フロントエンドのルートディレクトリに.envファイルを作成し、REACT_APP_RAWG_API_KEY=あなたのAPIキー を追加してください。');
        setSearchLoading(false);
        setLoadingMore(false);
        return;
      }

      // 最初のページなら検索中ローディングを表示、2ページ目以降なら追加読み込みローディングを表示
      if (page === 1) {
        console.log('検索を開始します...');
        setSearchLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');

      try {
        // 日本語→英語へ変換（例: "ポケモン" → "Pokemon"）
        const translatedQuery = translateJapaneseKeyword(query);
        console.log('Original query:', query, 'Translated query:', translatedQuery);

        // 翻訳できた場合は、翻訳後の英語名と、元の日本語名の両方で検索を試みます
        // これにより、ヒットする確率を上げます
        const searchQueries = translatedQuery !== query
          ? [translatedQuery, query]
          : [query];

        let allResults = [];
        let lastError = null;

        // 複数のクエリ（英語・日本語）で順番に検索を実行
        for (const searchQuery of searchQueries) {
          try {
            // RAWG APIのURLを作成
            // page_size=20: 1回に20件取得
            // ordering=-rating: 評価が高い順に取得（人気順）
            let url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=20&page=${page}&ordering=-rating`;

            console.log('ゲームを取得中:', url, 'プラットフォームフィルターはクライアント側で適用されます:', platformId || 'なし');

            const response = await fetch(url);
            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('API Error:', errorData);
              lastError = new Error(errorData.error || `HTTP error! status: ${response.status}`);
              continue; // エラーが出ても、次のクエリ（日本語など）を試す
            }

            const data = await response.json();
            console.log('クエリに対するRAWG APIの生の結果:', searchQuery, data.results);
            console.log('Number of results:', data.results ? data.results.length : 0);

            if (data.results && data.results.length > 0) {
              // 取得した結果をリストに追加（重複は除外）
              const newGames = data.results
                .filter(game => !allResults.some(existing => existing.id === game.id))
                .map(game => ({
                  ...game,
                  japaneseName: translateToJapanese(game.name) // 日本語名も付与しておく
                }));
              allResults = [...allResults, ...newGames];

              // 次のページがあるかどうかの判定 (20件取れていれば次がある可能性が高い)
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
            continue;
          }
        }

        console.log('クライアント側の絞り込み前の結果数:', allResults.length, allResults.map(g => g.name));

        // --- プラットフォームによるフィルタリング（絞り込み） ---
        // API側で絞り込むより、取得後にクライアント側で絞り込む方が確実な場合があるため
        if (platformId && platformId !== '') {
          console.log('クライアント側でプラットフォームによる絞り込み:', platformId);
          allResults = allResults.filter(game => {
            const gamePlatforms = game.platforms || [];
            // 各ゲームのプラットフォーム一覧の中に、選択されたplatformIdが含まれているか確認
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
          console.log('After client-side platform filtering, results count:', allResults.length, allResults.map(g => g.name));
        }

        // --- 関連性スコアによる並び替え（重要） ---
        // 単純なキーワードマッチだけでなく、よりユーザーが求めているであろうゲームを上に表示するための計算
        allResults = allResults.map(game => {
          const gameName = game.name.toLowerCase();
          const searchLower = translatedQuery.toLowerCase();
          const originalLower = query.toLowerCase();

          let relevanceScore = 0;

          // 1. 完全一致（最高スコア）: ユーザーが入力したタイトルそのもの
          if (gameName === searchLower || gameName === originalLower) {
            relevanceScore = 1000;
          }
          // 2. 先頭一致: 「スーパーマリオ」で「スーパーマリオブラザーズ」など
          else if (gameName.startsWith(searchLower) || gameName.startsWith(originalLower)) {
            relevanceScore = 500;
          }
          // 3. フレーズ全体が含まれる: 途中に出てくる場合
          else if (gameName.includes(searchLower) || gameName.includes(originalLower)) {
            relevanceScore = 400;
          }
          // 4. 単語単位での先頭一致
          else if (gameName.split(' ').some(word => word.startsWith(searchLower) || word.startsWith(originalLower))) {
            relevanceScore = 300;
          }
          // 5. 複数単語の検索（例: "Zelda Breath"）
          else {
            const searchWords = searchLower.split(' ').filter(w => w.length > 0);
            const gameWords = gameName.split(' ');

            // 入力した全ての単語がゲーム名に含まれているかチェック
            if (searchWords.length > 1) {
              const allWordsMatch = searchWords.every(searchWord =>
                gameWords.some(gameWord => gameWord.includes(searchWord))
              );

              if (allWordsMatch) {
                // 全単語が含まれている場合はスコア付与
                relevanceScore = 150;
              }
            } else {
              // 単一単語の部分一致（スコア低め）
              if (gameWords.some(word => word.includes(searchLower))) {
                relevanceScore = 100;
              }
            }
          }

          // ゲームの評価点（最大5点）をスコアに加算（最大50点）
          // これにより、名前の一致度が同じなら、人気のあるゲームが上に来ます
          relevanceScore += (game.rating || 0) * 10;

          return { ...game, relevanceScore };
        });

        // 計算したスコアが高い順に並び替え
        allResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        // --- 関連性が低い結果の除外 ---
        // スコアが特定の値（ここでは100）未満のものは表示しないようにします
        // これにより、全く関係のないゲームが表示されるのを防ぎます
        const minRelevanceThreshold = 100;
        const beforeFilterCount = allResults.length;
        allResults = allResults.filter(game => {
          const score = game.relevanceScore || 0;
          if (score < minRelevanceThreshold) return false;
          return true;
        });

        console.log(`Relevance filtering: ${beforeFilterCount} -> ${allResults.length} results`);

        // --- 結果のセット ---
        if (allResults.length > 0) {
          // Switch対応ゲームがあるかログ出力（デバッグ用）
          const nintendoGames = allResults.filter(game =>
            game.platforms?.some(p => {
              const platformName = (p.platform?.name || p.name || '').toLowerCase();
              return platformName.includes('nintendo') || platformName.includes('switch');
            })
          );
          console.log(`Nintendo games found: ${nintendoGames.length}`, nintendoGames.map(g => g.name));

          // 画面に表示するリストを更新
          if (append) {
            // 「もっと見る」の場合は、今のリストの後ろに追加
            setSearchResults(prev => {
              const combined = [...prev];
              allResults.forEach(game => {
                // 重複していない場合のみ追加
                if (!combined.some(existing => existing.id === game.id)) {
                  combined.push(game);
                }
              });
              return combined;
            });
          } else {
            // 新規検索の場合はリストを置き換え
            setSearchResults(allResults);
          }

          setCurrentPage(page);
          setError('');
          console.log('Search results set:', allResults.length, 'games');
        } else {
          // 結果が0件の場合
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
        // 処理終了（ローディング表示を消す）
        setSearchLoading(false);
        setLoadingMore(false);
        console.log('Search completed');
      }
    }, 500), // 500ミリ秒待機
    [RAWG_API_KEY, translateToJapanese]
  );

  // 検索結果をスクロールした時の処理（「無限スクロール」）
  // 下までスクロールしたら自動的に次のページを読み込みます
  const handleScroll = useCallback((e) => {
    const element = e.target;
    // スクロール位置の計算: 全体の高さ - スクロールした量 - 画面の高さ
    const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    // 下から100px以内に近づいたら次のページを読み込む
    if (scrollBottom < 100 && hasMoreResults && !loadingMore && !searchLoading && searchTerm.length >= 2) {
      console.log('Loading more results, current page:', currentPage);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      // 次のページを検索（append=trueでリストに追加）
      debouncedSearch(searchTerm, selectedPlatform, nextPage, true);
    }
  }, [hasMoreResults, loadingMore, searchLoading, searchTerm, currentPage, selectedPlatform, debouncedSearch]);

  // 検索条件が変わった時の副作用（検索実行）
  useEffect(() => {
    console.log('useEffect triggered - searchTerm:', searchTerm, 'selectedPlatform:', selectedPlatform);
    if (searchTerm) {
      // 新しい検索ワードなら1ページ目から検索
      setCurrentPage(1);
      setHasMoreResults(false);
      debouncedSearch(searchTerm, selectedPlatform, 1, false);
    } else {
      // 検索ワードが空なら結果をクリア
      setSearchResults([]);
      setSearchLoading(false);
      setCurrentPage(1);
      setHasMoreResults(false);
    }
  }, [searchTerm, selectedPlatform, debouncedSearch]);

  // --- ゲーム追加・更新・削除の処理 ---

  // 1. 検索結果からライブラリに追加
  const handleAddGame = async (game) => {
    try {
      // APIに送信するデータを準備
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
          platforms: game.platforms, // RAWG APIのデータをそのまま保存
          genres: game.genres,       // ジャンル情報も保存
          series: selectedSeriesForAdd.trim() !== '' ? selectedSeriesForAdd.trim() : null, // シリーズ（フォルダ）情報
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchMyGames(); // 成功したらリストを最新の状態に更新
      } else {
        setError(data.error || 'ゲームの追加に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  // 2. ローカルの画像ファイルを選択した時の処理（手動追加用）
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setManualImageFile(null);
      setManualImageUrl('');
      return;
    }

    // 画像ファイルかどうかのチェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      setManualImageFile(null);
      setManualImageUrl('');
      return;
    }

    // サイズチェック（10MBまで）
    if (file.size > 10 * 1024 * 1024) {
      setError('画像ファイルのサイズは10MB以下にしてください。');
      setManualImageFile(null);
      setManualImageUrl('');
      return;
    }

    setManualImageFile(file);
    setError('');

    // ブラウザでプレビュー表示するために、ファイルをBase64形式のURLに変換
    const reader = new FileReader();
    reader.onloadend = () => {
      setManualImageUrl(reader.result); // 読み込み完了後にURLをセット
    };
    reader.onerror = () => {
      setError('画像の読み込みに失敗しました。');
      setManualImageFile(null);
      setManualImageUrl('');
    };
    reader.readAsDataURL(file);
  };

  // 3. 手動でゲーム情報を入力して追加
  const handleManualAddGame = async () => {
    if (!manualTitle.trim()) {
      setError('タイトルを入力してください。');
      return;
    }

    // Base64画像のサイズチェック（送信前に確認）
    if (manualImageUrl && manualImageUrl.startsWith('data:')) {
      const base64Data = manualImageUrl.split(',')[1] || '';
      // Base64文字数からバイト数を概算
      const estimatedBytes = (base64Data.length * 3) / 4;
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (estimatedBytes > maxSize) {
        setError(`画像ファイルが大きすぎます（約${(estimatedBytes / 1024 / 1024).toFixed(2)}MB）。10MB以下の画像を選択してください。`);
        return;
      }
    }

    try {
      // 他のゲームと被らない一時的なIDを作成（"manual-" + 時間 + 乱数）
      const manualGameId = `manual-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      const response = await fetch('http://localhost:5000/api/played-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          game_api_id: manualGameId,
          title: manualTitle.trim(),
          image_url: manualImageUrl.trim() || null,
          platforms: null,
          genres: null,
          series: manualSeries.trim() !== '' ? manualSeries.trim() : null,
        })
      });
      const data = await response.json();
      if (data.success) {
        // 入力フォームを初期化
        setManualTitle('');
        setManualImageUrl('');
        setManualSeries('');
        setManualImageFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setShowManualAdd(false); // フォームを閉じる
        setError('');
        fetchMyGames(); // リスト更新
      } else {
        setError(data.error || 'ゲームの追加に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  // 4. ゲームを削除
  const handleRemoveGame = async (playedGameId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/played-games/${playedGameId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        fetchMyGames(); // 削除後にリストを更新
      } else {
        setError(data.error || 'ゲームの削除に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  // 5. ゲーム情報の更新（評価、コメントなど）
  // ユーザー体験のために「楽観的更新」を行っています
  // （サーバーからの返事を待たずに、画面上だけ先に書き換えてしまう手法）
  const handleUpdateGame = async (playedGameId, updateData) => {
    console.log('[DEBUG] handleUpdateGame called with:', playedGameId, updateData);

    // 画面（State）を先に更新
    setMyGames(prevGames => {
      console.log('[DEBUG] 楽観的更新を実行中...');
      const newGames = prevGames.map(game =>
        game.id === playedGameId ? { ...game, ...updateData } : game
      );
      return newGames;
    });

    try {
      // 裏でサーバーに送信
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
        // 成功時にはエラーを消すだけ（画面はすでに変わっている）
        setError('');
        console.log('[DEBUG] API update successful. Response data:', data);
      } else {
        // 失敗したらエラーを表示し、サーバーの正しいデータを読み込み直して元に戻す
        setError(data.error || 'ゲーム情報の更新に失敗しました。');
        fetchMyGames();
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('サーバーとの通信に失敗しました。');
      fetchMyGames(); // ロールバック
    }
  };

  // --- 表示用データの加工 ---

  let filteredMyGames = myGames;

  // プラットフォーム（機種）での絞り込み
  if (selectedLibraryPlatform) {
    filteredMyGames = filteredMyGames.filter(game => {
      const gamePlatforms = game.platforms || [];
      return gamePlatforms.some(p => String(p.platform?.id || p.id) === selectedLibraryPlatform);
    });
  }

  // ジャンルでの絞り込み
  if (selectedLibraryGenre) {
    filteredMyGames = filteredMyGames.filter(game => {
      const gameGenres = game.genres || [];
      return gameGenres.some(g => g.name === selectedLibraryGenre);
    });
  }

  // 並び順の適用
  filteredMyGames = getSortedGames(filteredMyGames, sortOrder);

  // 一方向の確認用セット（最適化のため）
  const myGameApiIds = new Set(myGames.map(g => g.game_api_id));

  // シリーズごとにグループ化（フォルダ分け）する処理
  // 即時関数 (() => { ... })() を使って計算しています
  const groupedMyGames = (() => {
    const groups = {};
    filteredMyGames.forEach(game => {
      // シリーズ名がない場合は「未分類」に入れます
      const seriesName = game.series && game.series.trim() !== '' ? game.series.trim() : '未分類';
      if (!groups[seriesName]) {
        groups[seriesName] = [];
      }
      groups[seriesName].push(game);
    });

    // シリーズ名をあいうえお順（ロケール順）にソート
    const sortedSeriesNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ja'));

    // ソート順に新しいオブジェクトを作成
    const sortedGroups = {};
    sortedSeriesNames.forEach(name => {
      sortedGroups[name] = groups[name];
    });
    return sortedGroups;
  })();

  // シリーズフォルダの開閉を切り替える関数
  const toggleSeriesExpansion = useCallback((seriesName) => {
    setExpandedSeries(prev => {
      const newState = {
        ...prev,
        [seriesName]: !prev[seriesName] // true <-> false を反転
      };
      // 次回のためにlocalStorageに保存
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
  // レンダリング（画面表示）
  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* モーダルの中身。背景クリックで閉じないように stopPropagation する */}
      <div className="modal-content game-library-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ゲームライブラリを管理</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          {/* エラーメッセージがあれば表示 */}
          {error && <p className="error-message">{error}</p>}

          {/* --- ゲーム追加セクション（検索または手動追加） --- */}
          <div className="game-search-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0 }}>ゲームを追加</h4>
              {/* 「検索」と「手動追加」の切り替えタブ */}
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => setShowManualAdd(false)}
                  className={`tab-button ${!showManualAdd ? 'active' : ''}`}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px 0 0 4px',
                    background: showManualAdd ? 'white' : '#007bff',
                    color: showManualAdd ? '#333' : 'white',
                    cursor: 'pointer',
                    borderRight: 'none'
                  }}
                >
                  検索
                </button>
                <button
                  onClick={() => setShowManualAdd(true)}
                  className={`tab-button ${showManualAdd ? 'active' : ''}`}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '0 4px 4px 0',
                    background: showManualAdd ? '#007bff' : 'white',
                    color: showManualAdd ? 'white' : '#333',
                    cursor: 'pointer'
                  }}
                >
                  手動追加
                </button>
              </div>
            </div>

            {/* --- 検索モードの表示 --- */}
            {!showManualAdd ? (
              <>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  💡 検索のヒント: 日本語名（例: ゼルダ、マリオ）や英語名（例: Zelda, Mario, Pokemon）で検索できます
                </p>
                <div className="search-controls">
                  {/* キーワード入力 */}
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
                        // Enterキーが押された時の処理（今は自動検索なのでログのみ）
                        console.log('Enter key pressed, current searchTerm:', searchTerm);
                      }
                    }}
                  />

                  {/* プラットフォーム選択（絞り込み用） */}
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

                {/* 検索中のローディング表示 */}
                {searchLoading && (
                  <div className="search-loading-container">
                    <div className="spinner-centered"></div>
                    <p style={{ marginTop: '10px', color: '#666' }}>検索中...</p>
                  </div>
                )}

                {/* 結果が見つからない場合 */}
                {!searchLoading && searchTerm.length >= 2 && searchResults.length === 0 && (
                  <p style={{ padding: '10px', color: '#666', textAlign: 'center' }}>
                    検索結果がありません
                  </p>
                )}

                {/* 検索結果リスト */}
                {!searchLoading && searchResults.length > 0 && (
                  <div
                    className="search-results"
                    onScroll={handleScroll} // 無限スクロール用
                    ref={setSearchResultsRef}
                    style={{ maxHeight: '400px', overflowY: 'auto' }}
                  >
                    {searchResults.map(game => (
                      <GameResult
                        key={game.id}
                        game={game}
                        onAdd={handleAddGame}
                        isAdded={myGameApiIds.has(String(game.id))} // 既に追加済みかチェック
                        translateToJapanese={translateToJapanese}
                      />
                    ))}
                    {/* 追加読み込み中の表示 */}
                    {loadingMore && (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner"></div>
                        <p style={{ marginTop: '10px', color: '#666' }}>さらに読み込み中...</p>
                      </div>
                    )}
                    {/* 全て読み込み終わった場合 */}
                    {!hasMoreResults && searchResults.length > 0 && (
                      <p style={{ textAlign: 'center', padding: '10px', color: '#999', fontSize: '0.9rem' }}>
                        すべての結果を表示しました
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* --- 手動追加モードの表示 --- */
              <div className="manual-add-form">
                {/* タイトル入力 */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666', fontWeight: '500' }}>
                    タイトル <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="例: ゼルダの伝説 トワイライトプリンセス"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* 画像選択（ファイルアップロードまたはURL） */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666', fontWeight: '500' }}>
                    画像（任意）
                  </label>
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    />
                    <small style={{ display: 'block', marginTop: '5px', color: '#999', fontSize: '0.85rem' }}>
                      ローカルファイルから画像を選択（10MB以下、JPG/PNG/GIF等）
                    </small>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666', fontWeight: '500' }}>
                      または画像URLを入力
                    </label>
                    <input
                      type="url"
                      value={manualImageFile ? '' : manualImageUrl}
                      onChange={(e) => {
                        if (!manualImageFile) {
                          setManualImageUrl(e.target.value);
                        }
                      }}
                      disabled={!!manualImageFile} // ファイルが選択されている時は無効化
                      placeholder="例: https://example.com/image.jpg"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                        backgroundColor: manualImageFile ? '#f5f5f5' : 'white',
                        cursor: manualImageFile ? 'not-allowed' : 'text'
                      }}
                    />
                    {manualImageFile && (
                      <button
                        type="button"
                        onClick={() => {
                          // ファイル選択を解除するボタン
                          setManualImageFile(null);
                          setManualImageUrl('');
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        style={{
                          marginTop: '5px',
                          padding: '5px 10px',
                          fontSize: '0.85rem',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ファイル選択を解除
                      </button>
                    )}
                  </div>
                  {/* 画像プレビュー */}
                  {(manualImageUrl || manualImageFile) && (
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px' }}>プレビュー:</p>
                      <img
                        src={manualImageUrl}
                        alt="プレビュー"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '150px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'; // 読み込みエラー時は非表示
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* シリーズ名入力 */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666', fontWeight: '500' }}>
                    シリーズ名（任意）
                  </label>
                  <input
                    type="text"
                    value={manualSeries}
                    onChange={(e) => setManualSeries(e.target.value)}
                    placeholder="例: ゼルダの伝説"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* ボタン類（キャンセル・追加） */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      // キャンセル処理
                      setShowManualAdd(false);
                      setManualTitle('');
                      setManualImageUrl('');
                      setManualSeries('');
                      setManualImageFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                      setError('');
                    }}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: 'white',
                      color: '#333',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleManualAddGame}
                    disabled={!manualTitle.trim()} // タイトルがないと押せない
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '4px',
                      background: manualTitle.trim() ? '#28a745' : '#ccc',
                      color: 'white',
                      cursor: manualTitle.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    追加
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr />

          {/* --- マイライブラリ表示セクション --- */}
          <div className="my-library-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0 }}>マイライブラリ ({filteredMyGames.length})</h4>

              {/* 表示オプション（並び替え・絞り込み・表示切替） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* 並び替え順序 */}
                <label htmlFor="sort-order" style={{ fontSize: '0.9rem', color: '#666' }}>並び替え:</label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(e) => {
                    const newSortOrder = e.target.value;
                    setSortOrder(newSortOrder);
                    localStorage.setItem('sortOrderState', JSON.stringify(newSortOrder));
                    // 並び替え順を変えたらカスタム順序モード（ドラッグ＆ドロップ）は解除
                    setIsCustomOrder(newSortOrder === 'custom');
                  }}
                  style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                >
                  <option value="added">追加日順（新しい順）</option>
                  <option value="rating">評価順（高い順）</option>
                  <option value="playtime">プレイ時間順（多い順）</option>
                  <option value="title">タイトル順（あいうえお順）</option>
                  {/* <option value="custom">カスタム（ドラッグで並び替え）</option> これが必要なら有効化 */}
                </select>

                {/* 機種フィルター */}
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

                {/* ジャンルフィルター */}
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

                {/* 表示モード切替（グリッド/リスト） */}
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

            {/* ゲームリストの表示 */}
            {loading ? (
              <p>読み込み中...</p>
            ) : (
              Object.keys(groupedMyGames).length > 0 ? (
                // ドラッグ＆ドロップ用コンテキスト
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="series-list">
                    {/* シリーズごとにグループ化して表示 */}
                    {Object.entries(groupedMyGames).map(([seriesName, games]) => (
                      <div key={seriesName} className="series-folder">
                        {/* シリーズ名ヘッダー（クリックで開閉） */}
                        <div className="series-header" onClick={() => toggleSeriesExpansion(seriesName)}>
                          <h3>
                            {seriesName} ({games.length})
                            <i className="material-icons" style={{ marginLeft: '10px' }}>
                              {expandedSeries[seriesName] ? 'expand_less' : 'expand_more'}
                            </i>
                          </h3>
                        </div>

                        {/* 開いている場合のみゲームリストを表示 */}
                        {expandedSeries[seriesName] && (
                          sortOrder === 'custom' ? (
                            /* カスタム順序の場合はドラッグ可能にする */
                            /* 注意: シリーズ内でのドラッグを想定する場合、DroppableIDを工夫する必要があります */
                            /* ここでは全体を1つのDroppableにするか、シリーズごとにするか検討が必要ですが、既存コードの構造を維持します */
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
                                          isDraggable={true}
                                          dndProvided={provided}
                                          dndSnapshot={snapshot}
                                          isOwner={isOwner}
                                          layoutMode={layoutMode}
                                          allUserSongs={allUserSongs}
                                        />
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          ) : (
                            /* 通常表示（ドラッグ不可） */
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
                                  allUserSongs={allUserSongs}
                                />
                              ))}
                            </div>
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