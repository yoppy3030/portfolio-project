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
import { useTranslation } from 'react-i18next';
import '../style/AdminPanel.css';

// 管理者パネルコンポーネント
function AdminPanel() {
    const { t } = useTranslation();
    // --- 状態管理 (State) ---
    // isAdmin: 現在のユーザーが管理者かどうかを判定するためのフラグ
    const [isAdmin, setIsAdmin] = useState(false);
    // isLoading: 管理者かどうかの確認を待っている間のフラグ
    const [isLoading, setIsLoading] = useState(true);

    // --- メンテナンスモード設定用の状態 ---
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false); // オン/オフ
    const [maintenanceMessage, setMaintenanceMessage] = useState(t('admin.default_maintenance_message')); // メッセージ
    const [scheduledEnd, setScheduledEnd] = useState(''); // 終了予定時刻

    // --- メンテナンス通知メール送信用の状態 ---
    const [maintenanceSubject, setMaintenanceSubject] = useState(t('admin.default_maintenance_subject'));
    const [maintenanceNotificationMessage, setMaintenanceNotificationMessage] = useState('');
    const [maintenanceScheduledEnd, setMaintenanceScheduledEnd] = useState('');

    // --- 新機能通知メール送信用の状態 ---
    const [featureSubject, setFeatureSubject] = useState(t('admin.default_feature_subject'));
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

        // 現在のメンテナンス状態を取得
        fetch('http://localhost:5000/api/maintenance-status')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setIsMaintenanceMode(data.isMaintenanceMode);
                    if (data.maintenanceMessage) {
                        setMaintenanceMessage(data.maintenanceMessage);
                    }
                    if (data.scheduledEnd) {
                        // input[type="datetime-local"] 用にフォーマット変換 (YYYY-MM-DDThh:mm)
                        // ※簡易的にISO文字列の先頭16文字を使う（UTC扱いになる点に注意が必要だが、今回は簡易対応）
                        try {
                            const date = new Date(data.scheduledEnd);
                            // ローカルタイムでフォーマットするには工夫が必要だが、ここでは空にしない程度にする
                            // setScheduledEnd(date.toISOString().slice(0, 16)); 
                        } catch (e) {
                            console.error('Date parsing error', e);
                        }
                    }
                }
            })
            .catch(err => console.error('AdminPanel: Maintenance status fetch error:', err));
    }, []);

    /**
     * メンテナンスモード（オン/オフ、メッセージ、終了予定時刻）の設定をサーバーに保存する関数。
     */
    const handleUpdateMaintenanceMode = async () => {
        setMessage(''); // メッセージをクリア
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setMessage(t('admin.login_required'));
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
                setMessage(t('admin.maintenance_updated_success'));
            } else {
                setMessage('Error: ' + data.error);
            }
        } catch (error) {
            setMessage(t('admin.update_failed'));
        }
    };

    /**
     * メンテナンス予告のメールを一斉送信する関数。
     */
    const handleSendMaintenanceNotification = async () => {
        setMessage('');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setMessage(t('admin.login_required'));
            return;
        }

        if (!maintenanceNotificationMessage) {
            setMessage(t('admin.message_required'));
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
                setMessage('Error: ' + data.error);
            }
        } catch (error) {
            setMessage(t('admin.send_failed'));
        }
    };

    // 新機能通知を送信
    const handleSendFeatureNotification = async () => {
        setMessage('');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setMessage(t('admin.login_required'));
            return;
        }

        if (!featureMessage) {
            setMessage(t('admin.message_required'));
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
                setMessage('Error: ' + data.error);
            }
        } catch (error) {
            setMessage(t('admin.send_failed'));
        }
    };

    // ローディング中
    if (isLoading) {
        return (
            <div className="admin-panel-container">
                <h1>{t('admin.title')}</h1>
                <p>{t('admin.loading')}</p>
            </div>
        );
    }

    // 管理者権限がない場合
    if (!isAdmin) {
        return (
            <div className="admin-panel-container">
                <h1>{t('admin.access_denied_title')}</h1>
                <div className="admin-message error">
                    {t('admin.access_denied_message')}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel-container">
            <h1>{t('admin.title')}</h1>

            {message && <div className={`admin-message ${message.includes('Error') || message.includes('エラー') ? 'error' : 'success'}`}>{message}</div>}

            {/* メンテナンスモード設定 */}
            <div className="admin-section">
                <h2>{t('admin.section_maintenance_settings')}</h2>
                <div className="form-group">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={isMaintenanceMode}
                            onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                        />
                        <span>{t('admin.enable_maintenance_mode')}</span>
                    </label>
                </div>
                <div className="form-group">
                    <label>{t('admin.label_maintenance_message')}</label>
                    <textarea
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        rows="3"
                        placeholder={t('admin.placeholder_maintenance_message')}
                    />
                </div>
                <div className="form-group">
                    <label>{t('admin.label_scheduled_end')}</label>
                    <input
                        type="datetime-local"
                        value={scheduledEnd}
                        onChange={(e) => setScheduledEnd(e.target.value)}
                    />
                </div>
                <button className="admin-button primary" onClick={handleUpdateMaintenanceMode}>
                    {t('admin.button_update_maintenance')}
                </button>
            </div>

            {/* メンテナンス通知送信 */}
            <div className="admin-section">
                <h2>{t('admin.section_maintenance_notification')}</h2>
                <p className="section-description">{t('admin.desc_maintenance_notification')}</p>
                <div className="form-group">
                    <label>{t('admin.label_subject')}</label>
                    <input
                        type="text"
                        value={maintenanceSubject}
                        onChange={(e) => setMaintenanceSubject(e.target.value)}
                        placeholder={t('admin.default_maintenance_subject')}
                    />
                </div>
                <div className="form-group">
                    <label>{t('admin.label_message')}</label>
                    <textarea
                        value={maintenanceNotificationMessage}
                        onChange={(e) => setMaintenanceNotificationMessage(e.target.value)}
                        rows="4"
                        placeholder={t('admin.placeholder_maintenance_detail')}
                    />
                </div>
                <div className="form-group">
                    <label>{t('admin.label_scheduled_end')}</label>
                    <input
                        type="datetime-local"
                        value={maintenanceScheduledEnd}
                        onChange={(e) => setMaintenanceScheduledEnd(e.target.value)}
                    />
                </div>
                <button className="admin-button warning" onClick={handleSendMaintenanceNotification}>
                    {t('admin.button_send_maintenance')}
                </button>
            </div>

            {/* 新機能通知送信 */}
            <div className="admin-section">
                <h2>{t('admin.section_feature_notification')}</h2>
                <p className="section-description">{t('admin.desc_feature_notification')}</p>
                <div className="form-group">
                    <label>{t('admin.label_subject')}</label>
                    <input
                        type="text"
                        value={featureSubject}
                        onChange={(e) => setFeatureSubject(e.target.value)}
                        placeholder={t('admin.default_feature_subject')}
                    />
                </div>
                <div className="form-group">
                    <label>{t('admin.label_message')}</label>
                    <textarea
                        value={featureMessage}
                        onChange={(e) => setFeatureMessage(e.target.value)}
                        rows="4"
                        placeholder={t('admin.placeholder_feature_detail')}
                    />
                </div>
                <button className="admin-button success" onClick={handleSendFeatureNotification}>
                    {t('admin.button_send_feature')}
                </button>
            </div>
        </div>
    );
}

export default AdminPanel;
