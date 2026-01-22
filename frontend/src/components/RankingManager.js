import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import '../style/RankingManager.css';

// ---------------------------
// サブコンポーネント: ランキング作成・編集モーダル
// ---------------------------
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const RankingEditor = ({ ranking, onClose, onSave, allGames, allBooks, allAnime }) => {
    const [title, setTitle] = useState(ranking ? ranking.title : '');
    const [description, setDescription] = useState(ranking ? ranking.description : '');
    const [category, setCategory] = useState(ranking ? ranking.category : 'game'); // 'game', 'reading', or 'anime'
    // items: [{ item_id, comment, ... }, ...] 
    // item_id is game_id or book_id depending on category
    const [items, setItems] = useState(ranking ? ranking.items : []);
    const [availableItems, setAvailableItems] = useState([]);
    const [showItemSelector, setShowItemSelector] = useState(false);

    // Custom item input state
    const [customTitle, setCustomTitle] = useState('');
    const [customImageUrl, setCustomImageUrl] = useState('');

    useEffect(() => {
        // 選択可能なアイテムリストを設定
        if (category === 'game') {
            setAvailableItems(allGames);
        } else if (category === 'reading') {
            // Books are nested inside authors or just a flat list? 
            // Assuming allBooks is a flat list for simplicity, or we flatten it here.
            setAvailableItems(allBooks);
        } else if (category === 'anime') {
            setAvailableItems(allAnime);
        }
    }, [category, allGames, allBooks, allAnime]);

    const handleAddItem = (item, isCustom = false) => {
        if (isCustom) {
            setItems([...items, {
                item_id: null,
                custom_title: customTitle,
                custom_image_url: customImageUrl,
                comment: '',
                data: { title: customTitle, image_url: customImageUrl }
            }]);
            setCustomTitle('');
            setCustomImageUrl('');
        } else {
            setItems([...items, {
                // ranking_items table expects game_id, book_id, or anime_id
                item_id: item.id,
                comment: '',
                // We keep a reference to full item details for display
                data: item
            }]);
        }
        setShowItemSelector(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setCustomImageUrl(data.filePath);
            } else {
                alert('アップロード失敗: ' + data.error);
            }
        } catch (err) {
            console.error('Upload Error:', err);
            alert('アップロード中にエラーが発生しました');
        }
    };

    const handleRemoveItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleCommentChange = (index, comment) => {
        const newItems = [...items];
        newItems[index].comment = comment;
        setItems(newItems);
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const newItems = Array.from(items);
        const [reorderedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, reorderedItem);
        setItems(newItems);
    };

    const handleSave = () => {
        if (!title) {
            alert('タイトルを入力してください');
            return;
        }
        // items need to be sanitized for API
        const apiItems = items.map(item => ({
            item_id: item.item_id || item.game_id || item.book_id || item.anime_id || null, // Handle both initial load and new items
            custom_title: item.custom_title,
            custom_image_url: item.custom_image_url,
            comment: item.comment,
            rank_order: 0 // Will be set by backend or implicit by array order
        }));

        onSave({
            id: ranking ? ranking.id : null,
            title,
            description,
            category,
            items: apiItems
        });
    };

    // Helper to get display title of an item
    const getItemTitle = (item) => {
        // item.data might be present if added from selector
        // otherwise item might have top-level fields if loaded from API
        const data = item.data || item;
        return data.title || 'Unknown Title';
    };

    const getItemImage = (item) => {
        const data = item.data || item;
        return data.image_url;
    };

    return (
        <div className="ranking-editor-overlay" onClick={onClose}>
            <div className="ranking-editor-modal" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        backgroundColor: '#0d47a1',
                        color: 'white',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        fontSize: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        lineHeight: 1
                    }}
                >
                    ×
                </button>
                <h3 style={{ marginTop: '10px', textAlign: 'center' }}>{ranking ? 'ランキング編集' : '新規ランキング作成'}</h3>

                <div className="form-group">
                    <label>タイトル:</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例: おすすめRPGベスト10" />
                </div>

                <div className="form-group">
                    <label>説明:</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="ランキングの説明を入力..." />
                </div>

                {!ranking && (
                    <div className="form-group">
                        <label>カテゴリ:</label>
                        <select value={category} onChange={e => { setCategory(e.target.value); setItems([]); }}>
                            <option value="game">ゲーム</option>
                            <option value="reading">読書</option>
                            <option value="anime">アニメ</option>
                        </select>
                    </div>
                )}

                <div className="items-section">
                    <h4>ランキング項目</h4>
                    <button onClick={() => setShowItemSelector(true)}>+ アイテムを追加</button>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="ranking-items">
                            {(provided) => (
                                <div className="ranking-items-list" {...provided.droppableProps} ref={provided.innerRef}>
                                    {items.map((item, index) => (
                                        <Draggable key={index} draggableId={`item-${index}`} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="ranking-item-row"
                                                >
                                                    <span className="rank-num">{index + 1}位</span>
                                                    {getItemImage(item) && (
                                                        <img
                                                            src={(() => {
                                                                const url = getItemImage(item).replace(/\\/g, '/');
                                                                if (url.startsWith('http') || url.startsWith('data:')) return url;
                                                                return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
                                                            })()}
                                                            alt=""
                                                            className="item-thumb"
                                                        />
                                                    )}
                                                    <div className="item-details">
                                                        <span className="item-title">{getItemTitle(item)}</span>
                                                        <textarea
                                                            className="item-comment-input"
                                                            placeholder="一言コメント..."
                                                            value={item.comment || ''}
                                                            onChange={e => handleCommentChange(index, e.target.value)}
                                                            rows={2}
                                                            style={{ resize: 'vertical' }}
                                                        />
                                                    </div>
                                                    <button className="remove-btn" onClick={() => handleRemoveItem(index)}>×</button>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>

                <div className="editor-actions">
                    <button onClick={handleSave} className="save-btn">保存</button>
                    <button onClick={onClose} className="cancel-btn">キャンセル</button>
                </div>

                {showItemSelector && (
                    <div className="item-selector-overlay" onClick={() => setShowItemSelector(false)}>
                        <div className="item-selector-modal" onClick={e => e.stopPropagation()}>
                            <h4>アイテムを選択</h4>

                            <div className="custom-item-input" style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                                <h5 style={{ margin: '0 0 10px 0' }}>手動入力</h5>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                    <input
                                        placeholder="タイトル"
                                        value={customTitle}
                                        onChange={e => setCustomTitle(e.target.value)}
                                        style={{ flex: 1, padding: '5px' }}
                                    />
                                    <input
                                        placeholder="画像URL (任意)"
                                        value={customImageUrl}
                                        onChange={e => setCustomImageUrl(e.target.value)}
                                        style={{ flex: 1, padding: '5px' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{ fontSize: '12px' }}
                                    />
                                </div>
                                <button
                                    onClick={() => handleAddItem(null, true)}
                                    disabled={!customTitle}
                                    style={{
                                        width: '100%',
                                        padding: '5px',
                                        background: customTitle ? '#28a745' : '#ccc',
                                        color: 'white',
                                        border: 'none',
                                        cursor: customTitle ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    この内容で追加
                                </button>
                            </div>

                            <div className="selector-list">
                                {Array.isArray(availableItems) && availableItems.map(item => (
                                    <div key={item.id} className="selector-item" onClick={() => handleAddItem(item)}>
                                        {item.image_url && (
                                            <img
                                                src={(() => {
                                                    const url = item.image_url.replace(/\\/g, '/');
                                                    if (url.startsWith('http') || url.startsWith('data:')) return url;
                                                    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
                                                })()}
                                                alt=""
                                            />
                                        )}
                                        <span>{item.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------------------------
// メインコンポーネント: ランキングマネージャー
// ---------------------------
const RankingManager = ({ onClose }) => {
    const [rankings, setRankings] = useState([]);
    // const [loading, setLoading] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [currentRanking, setCurrentRanking] = useState(null);
    const [allGames, setAllGames] = useState([]);
    const [allBooks, setAllBooks] = useState([]);
    const [allAnime, setAllAnime] = useState([]);

    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const fetchRankings = useCallback(async () => {
        // setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/rankings', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (data.success) {
                setRankings(data.rankings);
            }
        } catch (err) {
            console.error(err);
        } finally {
            // setLoading(false);
        }
    }, []);

    const fetchResources = useCallback(async () => {
        // Fetch Games
        try {
            const gameRes = await fetch('http://localhost:5000/api/played-games', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const gameData = await gameRes.json();
            if (gameData.success) setAllGames(gameData.playedGames || []);
        } catch (e) { console.error(e) }

        // Fetch Books (Flatten authors structure)
        try {
            // Reusing backup API for easy full fetch or we can use generic reading-entries
            // Actually, server.js has `/api/reading/books` which returns all books if no author_id? 
            // Checking server code... yes: `SELECT * FROM reading_books ...` 
            // Wait, standard endpoint requires author_id? Let me check server.js...
            // `app.get('/api/reading/books' ... if (author_id) ...` -> It returns ALL if no param! Perfect.
            const bookRes = await fetch('http://localhost:5000/api/reading/books', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const bookData = await bookRes.json();
            if (bookData.success) setAllBooks(bookData.books || []);
        } catch (e) { console.error(e) }

        // Fetch Anime
        try {
            const animeRes = await fetch('http://localhost:5000/api/anime', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const animeData = await animeRes.json();
            if (animeData.success) setAllAnime(animeData.anime || []);
        } catch (e) { console.error(e) }

    }, []);

    useEffect(() => {
        fetchRankings();
        fetchResources();
    }, [fetchRankings, fetchResources]);

    const handleCreate = () => {
        setCurrentRanking(null);
        setEditorOpen(true);
    };

    const handleEdit = async (rankingId) => {
        // Fetch full detail with items
        try {
            const res = await fetch(`http://localhost:5000/api/rankings/${rankingId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (data.success) {
                setCurrentRanking(data.ranking);
                setEditorOpen(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (rankingId) => {
        if (!window.confirm('本当にこのランキングを削除しますか？')) return;
        try {
            await fetch(`http://localhost:5000/api/rankings/${rankingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            fetchRankings();
            alert('ランキングを削除しました');
        } catch (err) {
            console.error(err);
            alert('削除に失敗しました');
        }
    };

    const handleSaveRanking = async (rankingData) => {
        try {
            let rankingId = rankingData.id;

            // 1. Create or Update Ranking Info
            if (!rankingId) {
                const res = await fetch('http://localhost:5000/api/rankings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                    body: JSON.stringify({
                        title: rankingData.title,
                        description: rankingData.description,
                        category: rankingData.category
                    })
                });
                const data = await res.json();
                if (data.success) {
                    rankingId = data.rankingId;
                } else {
                    alert('作成エラー: ' + data.error);
                    return;
                }
            } else {
                // Update implementation (Title/Desc/Category)
                const res = await fetch(`http://localhost:5000/api/rankings/${rankingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                    body: JSON.stringify({
                        title: rankingData.title,
                        description: rankingData.description,
                        category: rankingData.category
                    })
                });
                const data = await res.json();
                if (!data.success) {
                    alert('更新エラー: ' + data.error);
                    return;
                }
            }

            // 2. Update Items
            const resItems = await fetch(`http://localhost:5000/api/rankings/${rankingId}/items`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ items: rankingData.items })
            });
            const dataItems = await resItems.json();

            if (dataItems.success) {
                setEditorOpen(false);
                fetchRankings();
            } else {
                alert('アイテム更新エラー: ' + dataItems.error);
            }

        } catch (error) {
            console.error(error);
            alert('保存中にエラーが発生しました');
        }
    };

    return (
        <>
            <div className="ranking-manager-backdrop" onClick={onClose}>
                <div className="ranking-manager-content" onClick={e => e.stopPropagation()}>
                    <div className="manager-header">
                        <h2>マイランキング</h2>
                        <button className="close-btn" onClick={onClose}>×</button>
                    </div>

                    <div className="manager-body">
                        <button className="create-btn" onClick={handleCreate}>+ 新規ランキング作成</button>

                        <div className="rankings-list">
                            {rankings.map(ranking => (
                                <div key={ranking.id} className="ranking-card">
                                    <div className="ranking-info">
                                        <h4>{ranking.title}</h4>
                                        <span className="badge">
                                            {ranking.category === 'game' ? 'ゲーム' :
                                                ranking.category === 'reading' ? '読書' : 'アニメ'}
                                        </span>
                                        <p>{ranking.description}</p>

                                        {/* ランキング上位アイテムの表示 */}
                                        <div className="ranking-preview">
                                            {ranking.items && ranking.items.map((item, idx) => (
                                                <div key={idx} className="preview-item">
                                                    <span className="rank-badge">{idx + 1}</span>
                                                    {item.image_url && (
                                                        <img
                                                            src={(() => {
                                                                const url = item.image_url.replace(/\\/g, '/');
                                                                if (url.startsWith('http') || url.startsWith('data:')) return url;
                                                                return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
                                                            })()}
                                                            alt={item.title}
                                                            className="preview-item-img"
                                                            onError={(e) => {
                                                                console.error("Image load failed:", item.image_url);
                                                                e.target.style.display = 'none';
                                                            }}
                                                        />
                                                    )}
                                                    {/* DEBUG: Show raw URL */}
                                                    {/* <small style={{fontSize: '8px', color: 'red'}}>{item.image_url}</small> */}
                                                    <div className="preview-item-content">
                                                        <span className="preview-item-title">{item.title}</span>
                                                        {item.comment && <div className="preview-item-comment" style={{ whiteSpace: 'pre-wrap' }}>{item.comment}</div>}
                                                    </div>
                                                </div>
                                            ))}
                                            {ranking.items && ranking.items.length === 0 && <span className="no-items">アイテムなし</span>}
                                        </div>
                                    </div>
                                    <div className="ranking-actions">
                                        <button
                                            onClick={() => handleDelete(ranking.id)}
                                            style={{
                                                marginRight: '10px',
                                                backgroundColor: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'inline-block'
                                            }}
                                        >
                                            削除
                                        </button>
                                        <button onClick={() => handleEdit(ranking.id)} className="edit-btn">編集</button>
                                    </div>
                                </div>
                            ))}
                            {rankings.length === 0 && <p className="no-data">ランキングがまだありません。</p>}
                        </div>
                    </div>
                </div>
            </div>

            {editorOpen && (
                <RankingEditor
                    ranking={currentRanking}
                    onClose={() => setEditorOpen(false)}
                    onSave={handleSaveRanking}
                    allGames={allGames}
                    allBooks={allBooks}
                    allAnime={allAnime}
                />
            )}
        </>
    );
};

export default RankingManager;
