import React, { useState, useEffect, useCallback } from 'react';
import '../style/RankingManager.css';

const RankingList = () => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);

    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const fetchRankings = useCallback(async () => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) return;

            const res = await fetch('http://localhost:5000/api/rankings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRankings(data.rankings);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRankings();
    }, [fetchRankings]);

    if (loading) return <p>読み込み中...</p>;
    if (rankings.length === 0) return <p>ランキング情報はありません。</p>;

    return (
        <div className="ranking-list-container">
            <div className="rankings-list">
                {rankings.map(ranking => (
                    <div key={ranking.id} className="ranking-card" style={{ cursor: 'default' }}>
                        <div className="ranking-info">
                            <h4>{ranking.title}</h4>
                            <span className="badge">
                                {ranking.category === 'game' ? 'ゲーム' :
                                    ranking.category === 'reading' ? '読書' : 'アニメ'}
                            </span>
                            <p>{ranking.description}</p>

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
                                        <div className="preview-item-content">
                                            <span className="preview-item-title">{item.title}</span>
                                            {item.comment && <div className="preview-item-comment" style={{ whiteSpace: 'pre-wrap' }}>{item.comment}</div>}
                                        </div>
                                    </div>
                                ))}
                                {ranking.items && ranking.items.length === 0 && <span className="no-items">アイテムなし</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RankingList;
