import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import MusicAppreciationManager from './MusicAppreciationManager';
import GameLibraryModal from './GameLibraryModal';
import ReadingHobbyModal from './ReadingHobbyModal';
import './HobbiesDisplay.css';

/**
 * 趣味を管理するコンポーネント
 * 趣味の追加、削除、一覧表示を行います。
 * 「ゲーム」や「読書」などの特定の趣味には、専用の管理機能（モーダル）へ飛ぶボタンを表示します。
 */

function HobbiesManager({ isOwner }) {
  // 多言語対応フック（t関数で翻訳テキストを取得）
  const { t } = useTranslation();

  // --- ステート（状態変数）の定義 ---
  // 趣味のリストを保存する配列
  const [hobbies, setHobbies] = useState([]);
  // 新しく追加する趣味の名前を入力するための変数
  const [newHobby, setNewHobby] = useState('');
  // データの読み込み中かどうか（ローディング表示用）
  const [loading, setLoading] = useState(false);
  // エラーメッセージを保存する変数
  const [error, setError] = useState('');
  // ゲーム用モーダルを表示するかどうかのフラグ
  const [showGameLibrary, setShowGameLibrary] = useState(false);
  // 読書用モーダルを表示するかどうかのフラグ
  const [showReadingModal, setShowReadingModal] = useState(false);

  // 趣味リストをサーバーから取得する関数
  // useCallbackを使って関数をメモ化（再レンダリング時の無駄な再生成を防ぐ）
  const fetchHobbies = useCallback(async () => {
    setLoading(true); // 読み込み開始
    const token = localStorage.getItem('token') || sessionStorage.getItem('token'); // 認証トークンを取得
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      // サーバーのAPI (/api/hobbies) にGETリクエストを送信
      const response = await fetch('http://localhost:5000/api/hobbies', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json(); // レスポンスをJSONとして解析
      if (data.success) {
        setHobbies(data.hobbies); // 取得したデータをステートにセット
      } else {
        setError(data.error || t('hobbies_alert_fetch_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    } finally {
      setLoading(false); // 読み込み終了
    }
  }, [t]);

  // コンポーネントが表示された時（マウント時）や isOwner が変わった時に実行
  useEffect(() => {
    if (isOwner) {
      fetchHobbies(); // 趣味リストを読み込む
    }
  }, [isOwner, fetchHobbies]);

  // 新しい趣味を追加する関数
  const handleAddHobby = async () => {
    if (!newHobby.trim()) return; // 空文字の場合は何もしない
    setError('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      // APIにPOSTリクエストを送って新しい趣味を保存
      const response = await fetch('http://localhost:5000/api/hobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newHobby }), // 入力された名前を送る
      });
      const data = await response.json();
      if (data.success) {
        setNewHobby(''); // 入力欄をクリア
        fetchHobbies(); // リストを再取得して画面を更新
      } else {
        setError(data.error || t('hobbies_alert_add_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    }
  };

  // 趣味を削除する関数
  const handleDeleteHobby = async (hobbyId) => {
    if (!window.confirm(t('hobbies_confirm_delete'))) return; // 確認ダイアログを表示
    setError('');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      // APIにDELETEリクエストを送る
      const response = await fetch(`http://localhost:5000/api/hobbies/${hobbyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchHobbies(); // 削除後にリストを再取得
      } else {
        setError(data.error || t('hobbies_alert_delete_failed'));
      }
    } catch (err) {
      setError(t('hobbies_alert_server_error'));
    }
  };

  // 「音楽鑑賞」の趣味があるかどうかをチェック
  const hasMusicHobby = hobbies.some(hobby => hobby.name === '音楽鑑賞');

  if (!isOwner) return null;

  return (
    <div className="hobbies-manager">
      <h4>{t('hobbies_title')}</h4>
      {error && <p className="error-message">{error}</p>}

      <div className="form-group">
        <label htmlFor="new-hobby">{t('hobbies_label_add_new')}</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            id="new-hobby"
            value={newHobby}
            onChange={(e) => setNewHobby(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddHobby()}
            placeholder={t('hobbies_placeholder_example')}
          />
          <button onClick={handleAddHobby} disabled={loading}>
            {loading ? t('hobbies_adding') : t('hobbies_add_button')}
          </button>
        </div>
      </div>

      <div className="hobbies-list">
        {loading ? <p>{t('loading')}</p> : (
          hobbies.length > 0 ? (
            hobbies.map(hobby => (
              <div key={hobby.id} className="hobby-item">
                <span>{hobby.name}</span>
                <div className="hobby-actions">
                  {hobby.name === 'ゲーム' && (
                    <button onClick={() => setShowGameLibrary(true)} className="btn-secondary-outline">
                      {t('hobbies_edit_play_records')}
                    </button>
                  )}
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

      {/* 音楽鑑賞の趣味がある場合にのみ、音楽設定セクションを表示 */}
      {hasMusicHobby && (
        <div className="music-appreciation-section" style={{ marginTop: '2rem' }}>
          <hr />
          <MusicAppreciationManager />
        </div>
      )}

      {/* ゲームライブラリモーダルの表示 */}
      {showGameLibrary && (
        <GameLibraryModal
          isOwner={true}
          onClose={() => setShowGameLibrary(false)}
        />
      )}

      {/* 読書管理モーダルの表示 */}
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
