// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MusicAppreciationManager from './MusicAppreciationManager'; // 音楽鑑賞用のコンポーネント
import GameLibraryModal from './GameLibraryModal'; // ゲームライブラリ用のモーダル
import ReadingHobbyModal from './ReadingHobbyModal'; // 読書記録用のモーダル
import './HobbiesDisplay.css'; // スタイルシート

// 趣味管理のメインコンポーネント
function HobbiesManager({ isOwner }) {
  const { t } = useTranslation(); // 多言語対応
  const [hobbies, setHobbies] = useState([]); // ユーザーの趣味リストを保持するState
  const [newHobby, setNewHobby] = useState(''); // 新しく追加する趣味の名前を保持するState
  const [loading, setLoading] = useState(false); // データ読み込み中の状態
  const [error, setError] = useState(''); // エラーメッセージ
  const [showGameLibrary, setShowGameLibrary] = useState(false); // ゲームライブラリモーダルの表示状態
  const [showReadingModal, setShowReadingModal] = useState(false); // 読書モーダルの表示状態

  // ユーザーの趣味リストをバックエンドから取得する関数
  const fetchHobbies = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setHobbies(data.hobbies);
      } else {
        setError(data.error || t('hobbies_alert_fetch_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // コンポーネントが表示されたとき、所有者であれば趣味リストを取得する
  useEffect(() => {
    if (isOwner) {
      fetchHobbies();
    }
  }, [isOwner, fetchHobbies]);

  // 新しい趣味を追加する処理
  const handleAddHobby = async () => {
    if (!newHobby.trim()) return; // 入力が空なら何もしない
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/hobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newHobby }),
      });
      const data = await response.json();
      if (data.success) {
        setNewHobby(''); // 入力欄をクリア
        fetchHobbies(); // 趣味リストを再取得して表示を更新
      } else {
        setError(data.error || t('hobbies_alert_add_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    }
  };

  // 趣味を削除する処理
  const handleDeleteHobby = async (hobbyId) => {
    if (!window.confirm(t('hobbies_confirm_delete'))) return; // 確認ダイアログ
    setError('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/hobbies/${hobbyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchHobbies(); // 趣味リストを再取得して表示を更新
      } else {
        setError(data.error || t('hobbies_alert_delete_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    }
  };

  // 趣味リストに「音楽鑑賞」が含まれているかチェック
  const hasMusicHobby = hobbies.some(hobby => hobby.name === '音楽鑑賞');

  // 所有者でなければ何も表示しない
  if (!isOwner) return null;

  return (
    <div className="hobbies-manager">
      <h4>{t('hobbies_title')}</h4>
      {error && <p className="error-message">{error}</p>}
      
      {/* 新しい趣味を追加するフォーム */}
      <div className="form-group">
        <label htmlFor="new-hobby">{t('hobbies_label_add_new')}</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            id="new-hobby"
            value={newHobby}
            onChange={(e) => setNewHobby(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddHobby()} // Enterキーでも追加できるように
            placeholder={t('hobbies_placeholder_example')}
          />
          <button onClick={handleAddHobby} disabled={loading}>
            {loading ? t('hobbies_adding') : t('hobbies_add_button')}
          </button>
        </div>
      </div>

      {/* 登録済みの趣味リスト */}
      <div className="hobbies-list">
        {loading ? <p>{t('loading')}</p> : (
          hobbies.length > 0 ? (
            hobbies.map(hobby => (
              <div key={hobby.id} className="hobby-item">
                <span>{hobby.name}</span>
                <div className="hobby-actions">
                  {/* 'ゲーム'という趣味の場合、プレイ記録編集ボタンを表示 */}
                  {hobby.name === 'ゲーム' && (
                    <button onClick={() => setShowGameLibrary(true)} className="btn-secondary-outline">
                      {t('hobbies_edit_play_records')}
                    </button>
                  )}
                  {/* '読書'という趣味の場合、読書記録管理ボタンを表示 */}
                  {hobby.name === '読書' && (
                    <button onClick={() => setShowReadingModal(true)} className="btn-secondary-outline">
                      {t('hobbies.manageReadingButton')}
                    </button>
                  )}
                  <button onClick={() => handleDeleteHobby(hobby.id)} className="btn-danger-outline">
                    {t('hobbies_delete_button')}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>{t('hobbies_no_hobbies_registered')}</p>
          )
        )}
      </div>

      {/* 「音楽鑑賞」の趣味がある場合にのみ、音楽設定セクションを表示 */}
      {hasMusicHobby && (
        <div className="music-appreciation-section" style={{ marginTop: '2rem' }}>
          <hr />
          <MusicAppreciationManager />
        </div>
      )}

      {/* ゲームライブラリモーダルの表示（showGameLibraryがtrueのとき） */}
      {showGameLibrary && (
        <GameLibraryModal 
          isOwner={true}
          onClose={() => setShowGameLibrary(false)} 
        />
      )}

      {/* 読書管理モーダルの表示（showReadingModalがtrueのとき） */}
      {showReadingModal && (
        <ReadingHobbyModal
          isOwner={isOwner}
          onClose={() => setShowReadingModal(false)}
        />
      )}
    </div>
  );
}

export default HobbiesManager;