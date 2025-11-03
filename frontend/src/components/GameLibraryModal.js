import React, { useState, useEffect, useCallback } from 'react';
import './GameLibraryModal.css';
import debounce from 'lodash.debounce';

function GameResult({ game, onAdd, isAdded, translateToJapanese }) {
  // プラットフォーム名を取得（Nintendo Switch, PlayStation, Xbox, PC など）
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

function LibraryItem({ game, onRemove, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(game.rating || null);
  const [comment, setComment] = useState(game.comment || '');
  const [playtimeHours, setPlaytimeHours] = useState(game.playtime_hours ? String(game.playtime_hours) : '');

  useEffect(() => {
    setRating(game.rating || null);
    setComment(game.comment || '');
    setPlaytimeHours(game.playtime_hours ? String(game.playtime_hours) : '');
  }, [game.rating, game.comment, game.playtime_hours]);

  const handleSave = async () => {
    const updateData = {};
    // ratingを常に送信（nullも有効な値）
    updateData.rating = rating === null || rating === 0 ? null : rating;
    // commentを常に送信（空文字列はnullに変換）
    updateData.comment = comment && comment.trim() ? comment.trim() : null;
    // playtime_hoursを常に送信（空文字列はnullに変換）
    updateData.playtime_hours = playtimeHours && playtimeHours.trim() ? parseFloat(playtimeHours) : null;
    
    console.log('Saving game update:', game.id, updateData);
    await onUpdate(game.id, updateData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setRating(game.rating || null);
    setComment(game.comment || '');
    setPlaytimeHours(game.playtime_hours ? String(game.playtime_hours) : '');
    setIsEditing(false);
  };

  const renderStars = (value, interactive = false) => {
    const ratingValue = value || 0;
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
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

  return (
    <div className="library-item">
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
                  // 数値のみ許可（小数点を含む）
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
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
                rows={3}
              />
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
            {(!rating || rating === 0) && !playtimeHours && !comment && (
              <p className="no-details">評価、プレイ時間、コメントを追加してください</p>
            )}
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
          </div>
        )}
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(''); // プラットフォーム選択の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [searchResultsRef, setSearchResultsRef] = useState(null);

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
    'COD': 'Call of Duty'
  };

  // 英語名から日本語名へのマッピング（表示用）
  const englishToJapaneseMapping = {
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
  };

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
        return englishName.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), jp);
      }
    }
    
    // 翻訳できない場合は元の英語名を返す
    return englishName;
  }, []);

  // 日本語キーワードを英語に変換（部分マッチ）
  const translateJapaneseKeyword = (keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    
    // 完全一致
    if (japaneseToEnglishMapping[keyword]) {
      return japaneseToEnglishMapping[keyword];
    }
    
    // 部分一致（キーワードに日本語ゲーム名が含まれている場合）
    for (const [jp, en] of Object.entries(japaneseToEnglishMapping)) {
      if (keyword.includes(jp) || jp.includes(keyword)) {
        return en;
      }
    }
    
    // 翻訳できない場合は元のキーワードを返す
    return keyword;
  };

  const debouncedSearch = useCallback(
    debounce(async (query, platformId, page = 1, append = false) => {
      console.log('debouncedSearch called with:', { query, platformId, queryLength: query.length, page, append });
      
      if (query.length < 2) {
        console.log('Query too short, clearing results');
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
        console.log('Starting search...');
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
            let url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=20&page=${page}&ordering=-rating`;
            
            // プラットフォームフィルターが選択されている場合のみ追加
            if (platformId && platformId !== '') {
              url += `&platforms=${platformId}`;
              console.log('Platform filter applied:', platformId);
            }
            
            console.log('Fetching games from:', url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('API Error:', errorData);
              lastError = new Error(errorData.error || `HTTP error! status: ${response.status}`);
              continue; // 次のクエリを試す
            }
            
            const data = await response.json();
            console.log('Search results received for query:', searchQuery, data);
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
        
        // 結果を評価順にソート（重複を除去後）
        allResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
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
              // 重複を避けて結合
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

  const handleUpdateGame = async (playedGameId, updateData) => {
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
        fetchMyGames(); // Refresh library
        setError(''); // Clear any previous errors
      } else {
        setError(data.error || 'ゲーム情報の更新に失敗しました。');
      }
    } catch (err) {
      console.error('Update error:', err);
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
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="spinner"></div>
                <p>検索中...</p>
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
            <h4>マイライブラリ ({myGames.length})</h4>
            {loading ? <p>読み込み中...</p> : (
              <div className="library-grid">
                {myGames.length > 0 ? (
                  myGames.map(game => (
                    <LibraryItem key={game.id} game={game} onRemove={handleRemoveGame} onUpdate={handleUpdateGame} />
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