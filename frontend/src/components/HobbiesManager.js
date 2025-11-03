import React, { useState, useEffect, useCallback } from 'react';
import GameLibraryModal from './GameLibraryModal'; // モーダルをインポート
import '../Settings.css'; // スタイルを共有

function HobbiesManager() {
  const [hobbies, setHobbies] = useState([]);
  const [newHobby, setNewHobby] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isGameModalOpen, setGameModalOpen] = useState(false); // モーダルの表示状態

  const fetchHobbies = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setHobbies(data.hobbies);
      } else {
        setError(data.error || '趣味の取得に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHobbies();
  }, [fetchHobbies]);

  const handleAddHobby = async () => {
    if (!newHobby.trim()) {
      setError('趣味の名前を入力してください。');
      return;
    }
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newHobby })
      });
      const data = await response.json();
      if (data.success) {
        setMessage('趣味を追加しました。');
        setNewHobby('');
        fetchHobbies(); // リストを再取得
      } else {
        setError(data.error || '趣味の追加に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  const handleDeleteHobby = async (hobbyId) => {
    if (!window.confirm('この趣味を本当に削除しますか？')) {
      return;
    }
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/hobbies/${hobbyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessage('趣味を削除しました。');
        fetchHobbies(); // リストを再取得
      } else {
        setError(data.error || '趣味の削除に失敗しました。');
      }
    } catch (err) {
      setError('サーバーとの通信に失敗しました。');
    }
  };

  return (
    <div className="settings-content">
      <h3>趣味の管理</h3>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="form-group">
        <label htmlFor="new-hobby">新しい趣味を追加</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            id="new-hobby"
            value={newHobby}
            onChange={(e) => setNewHobby(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddHobby()}
            placeholder="例: 映画鑑賞"
            disabled={loading}
          />
          <button onClick={handleAddHobby} disabled={loading}>
            {loading ? '追加中...' : '追加'}
          </button>
        </div>
      </div>

      <hr />

      <h4>現在の趣味</h4>
      {loading && <p>読み込み中...</p>}
      <div className="hobbies-list">
        {hobbies.length > 0 ? (
          hobbies.map(hobby => (
            <div key={hobby.id} className="hobby-item">
              <span>{hobby.name}</span>
              <div className="hobby-actions">
                {hobby.name.toLowerCase() === 'ゲーム' && (
                  <button className="btn-secondary" style={{ marginRight: '10px' }} onClick={() => setGameModalOpen(true)}>プレイ記録を編集</button>
                )}
                <button className="btn-danger-outline" onClick={() => handleDeleteHobby(hobby.id)}>削除</button>
              </div>
            </div>
          ))
        ) : (
          !loading && <p>まだ趣味が登録されていません。</p>
        )}
      </div>

      {isGameModalOpen && <GameLibraryModal onClose={() => setGameModalOpen(false)} />}
    </div>
  );
}

export default HobbiesManager;