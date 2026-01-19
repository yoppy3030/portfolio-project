/**
 * 管理者パネルコンポーネント
 * 
 * 【役割】
 * システム管理者（test.example3030@gmail.com）専用の管理画面です。
 * メンテナンスモードの設定や、ユーザーへの通知送信を行います。
 * 
 * 【主な機能】
 * 1. メンテナンスモード管理
 *    - メンテナンスモードのオン/オフ切り替え
 *    - メンテナンスメッセージの設定
 *    - メンテナンス終了予定時刻の設定
 * 
 * 2. メンテナンス通知送信
 *    - メンテナンス情報を受け取る設定のユーザーにメール送信
 *    - 件名、メッセージ、終了予定時刻を指定可能
 * 
 * 3. 新機能通知送信
 *    - 新機能のお知らせを受け取る設定のユーザーにメール送信
 *    - 件名とメッセージを指定可能
 * 
 * 【アクセス制限】
 * - 管理者メールアドレス（test.example3030@gmail.com）のみアクセス可能
 * - 管理者以外がアクセスすると「アクセス拒否」メッセージを表示
 */

import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

// 管理者パネルコンポーネント
function AdminPanel() {
    // --- 状態管理 (State) ---
    // isAdmin: 現在のユーザーが管理者かどうかを判定するためのフラグ
    const [isAdmin, setIsAdmin] = useState(false);
    // isLoading: 管理者かどうかの確認を待っている間のフラグ
    const [isLoading, setIsLoading] = useState(true);

    // --- メンテナンスモード設定用の状態 ---
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false); // オン/オフ
    const [maintenanceMessage, setMaintenanceMessage] = useState('システムメンテナンス中です。しばらくお待ちください。'); // メッセージ
    const [scheduledEnd, setScheduledEnd] = useState(''); // 終了予定時刻

    // --- メンテナンス通知メール送信用の状態 ---
    const [maintenanceSubject, setMaintenanceSubject] = useState('メンテナンスのお知らせ');
    const [maintenanceNotificationMessage, setMaintenanceNotificationMessage] = useState('');
    const [maintenanceScheduledEnd, setMaintenanceScheduledEnd] = useState('');

    // --- 新機能通知メール送信用の状態 ---
    const [featureSubject, setFeatureSubject] = useState('新機能のお知らせ');
    const [featureMessage, setFeatureMessage] = useState('');

    // 保存成功などの結果メッセージを表示するための状態
    const [message, setMessage] = useState('');

    /**
     * 画面が表示された時に「管理者かどうか」を確認する
     */
    useEffect(() => {
        // 保存されているトークンを取得
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            console.log('AdminPanel: トークンが見つかりません');
            setIsAdmin(false);
            setIsLoading(false);
            return;
        }

        // サーバーにトークンを送り、メールアドレスが管理者(test.example3030@gmail.com)か確認する
        fetch('http://localhost:5000/api/verify-token', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                console.log('AdminPanel: verify-token response:', data);
                // メールアドレスが管理者と一致する場合のみ許可
                if (data.success && data.user.email === 'test.example3030@gmail.com') {
                    console.log('AdminPanel: 管理者として認証されました');
                    setIsAdmin(true);
                } else {
                    console.log('AdminPanel: 管理者ではありません。Email:', data.user?.email);
                    setIsAdmin(false);
                }
                setIsLoading(false); // 確認終了
            })
            .catch(error => {
                console.error('AdminPanel: 認証エラー:', error);
                setIsAdmin(false);
                setIsLoading(false);
            });
    }, []);

    /**
     * メンテナンスモード（オン/オフ、メッセージ、終了予定時刻）の設定をサーバーに保存する関数。
     * 認証トークンをヘッダーに含め、現在のメンテナンス設定をJSON形式で送信する。
     * 成功または失敗に応じてユーザーにメッセージを表示する。
     */
    const handleUpdateMaintenanceMode = async () => {
        setMessage(''); // メッセージをクリア
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setMessage('ログインが必要です');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/admin/maintenance-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    isMaintenanceMode,
                    maintenanceMessage,
                    scheduledEnd: scheduledEnd || null
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessage('✓ メンテナンスモードが更新されました');
            } else {
                setMessage('エラー: ' + data.error);
            }
        } catch (error) {
            setMessage('エラー: 更新に失敗しました');
        }
    };

    /**
     * 各プロジェクト設定のユーザーに対して、メンテナンス予告のメールを一斉送信する関数。
     * 認証トークンをヘッダーに含め、件名、メッセージ、終了予定時刻をJSON形式で送信する。
     * 成功した場合は送信件数を、失敗した場合はエラーメッセージをユーザーに表示する。
     */
    const handleSendMaintenanceNotification = async () => {
        setMessage('');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setMessage('ログインが必要です');
            return;
        }

        if (!maintenanceNotificationMessage) {
            setMessage('メッセージを入力してください');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/admin/send-maintenance-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject: maintenanceSubject,
                    message: maintenanceNotificationMessage,
                    scheduledEnd: maintenanceScheduledEnd || null
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessage(`✓ ${data.message}`);
                setMaintenanceNotificationMessage('');
                setMaintenanceScheduledEnd('');
            } else {
                setMessage('エラー: ' + data.error);
            }
        } catch (error) {
            setMessage('エラー: 送信に失敗しました');
        }
    };

    // 新機能通知を送信
    const handleSendFeatureNotification = async () => {
        setMessage('');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setMessage('ログインが必要です');
            return;
        }

        if (!featureMessage) {
            setMessage('メッセージを入力してください');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/admin/send-feature-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject: featureSubject,
                    message: featureMessage
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessage(`✓ ${data.message}`);
                setFeatureMessage('');
            } else {
                setMessage('エラー: ' + data.error);
            }
        } catch (error) {
            setMessage('エラー: 送信に失敗しました');
        }
    };

    // ローディング中
    if (isLoading) {
        return (
            <div className="admin-panel-container">
                <h1>管理者パネル</h1>
                <p>読み込み中...</p>
            </div>
        );
    }

    // 管理者権限がない場合
    if (!isAdmin) {
        return (
            <div className="admin-panel-container">
                <h1>アクセス拒否</h1>
                <div className="admin-message error">
                    管理者権限が必要です。このページにアクセスする権限がありません。
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel-container">
            <h1>管理者パネル</h1>

            {message && <div className={`admin-message ${message.includes('エラー') ? 'error' : 'success'}`}>{message}</div>}

            {/* メンテナンスモード設定 */}
            <div className="admin-section">
                <h2>メンテナンスモード設定</h2>
                <div className="form-group">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={isMaintenanceMode}
                            onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                        />
                        <span>メンテナンスモードを有効にする</span>
                    </label>
                </div>
                <div className="form-group">
                    <label>メンテナンスメッセージ</label>
                    <textarea
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        rows="3"
                        placeholder="メンテナンス中に表示するメッセージ"
                    />
                </div>
                <div className="form-group">
                    <label>メンテナンス終了予定時刻</label>
                    <input
                        type="datetime-local"
                        value={scheduledEnd}
                        onChange={(e) => setScheduledEnd(e.target.value)}
                    />
                </div>
                <button className="admin-button primary" onClick={handleUpdateMaintenanceMode}>
                    メンテナンスモードを更新
                </button>
            </div>

            {/* メンテナンス通知送信 */}
            <div className="admin-section">
                <h2>メンテナンス通知送信</h2>
                <p className="section-description">メンテナンス情報を受け取る設定のユーザーに通知を送信します</p>
                <div className="form-group">
                    <label>件名</label>
                    <input
                        type="text"
                        value={maintenanceSubject}
                        onChange={(e) => setMaintenanceSubject(e.target.value)}
                        placeholder="メンテナンスのお知らせ"
                    />
                </div>
                <div className="form-group">
                    <label>メッセージ</label>
                    <textarea
                        value={maintenanceNotificationMessage}
                        onChange={(e) => setMaintenanceNotificationMessage(e.target.value)}
                        rows="4"
                        placeholder="メンテナンスの詳細を入力してください"
                    />
                </div>
                <div className="form-group">
                    <label>メンテナンス終了予定時刻</label>
                    <input
                        type="datetime-local"
                        value={maintenanceScheduledEnd}
                        onChange={(e) => setMaintenanceScheduledEnd(e.target.value)}
                    />
                </div>
                <button className="admin-button warning" onClick={handleSendMaintenanceNotification}>
                    メンテナンス通知を送信
                </button>
            </div>

            {/* 新機能通知送信 */}
            <div className="admin-section">
                <h2>新機能通知送信</h2>
                <p className="section-description">新機能のお知らせを受け取る設定のユーザーに通知を送信します</p>
                <div className="form-group">
                    <label>件名</label>
                    <input
                        type="text"
                        value={featureSubject}
                        onChange={(e) => setFeatureSubject(e.target.value)}
                        placeholder="新機能のお知らせ"
                    />
                </div>
                <div className="form-group">
                    <label>メッセージ</label>
                    <textarea
                        value={featureMessage}
                        onChange={(e) => setFeatureMessage(e.target.value)}
                        rows="4"
                        placeholder="新機能の詳細を入力してください"
                    />
                </div>
                <button className="admin-button success" onClick={handleSendFeatureNotification}>
                    新機能通知を送信
                </button>
            </div>
        </div>
    );
}

export default AdminPanel;
