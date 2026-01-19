// Reactライブラリをインポート（画面を作るための基本ライブラリ）
import React from 'react';
// このコンポーネント専用のスタイルシート（見た目を整えるファイル）
import '../style/Maintenance.css';

/**
 * メンテナンス画面コンポーネント
 * 
 * 【役割】
 * システムがメンテナンス中の時に表示される画面です。
 * 管理者がメンテナンスモードをオンにすると、この画面が全ユーザーに表示されます。
 * 
 * 【受け取るデータ（props）】
 * @param {string} maintenanceMessage - メンテナンス中に表示するメッセージ
 * @param {string} scheduledEnd - メンテナンス終了予定時刻（日時データ）
 * 
 * 【表示内容】
 * - アニメーション付きのアイコン
 * - メンテナンス中のメッセージ
 * - 終了予定時刻（設定されている場合のみ）
 * - お詫びのメッセージ
 */
function Maintenance({ maintenanceMessage, scheduledEnd }) {
    return (
        // 画面全体を覆うコンテナ（紫のグラデーション背景）
        <div className="maintenance-container">
            {/* 白いカードのコンテンツエリア */}
            <div className="maintenance-content">
                {/* メンテナンスアイコン（SVG画像） */}
                <div className="maintenance-icon">
                    {/* SVG: サーバーのような3層のアイコン */}
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 上層 */}
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {/* 下層 */}
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {/* 中層 */}
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {/* メインタイトル */}
                <h1>メンテナンス中</h1>

                {/* メンテナンスメッセージ */}
                <p className="maintenance-message">
                    {/* 
                        maintenanceMessageが渡されていればそれを表示、
                        なければデフォルトメッセージを表示 
                    */}
                    {maintenanceMessage || 'システムメンテナンス中です。しばらくお待ちください。'}
                </p>

                {/* 終了予定時刻（scheduledEndが設定されている場合のみ表示） */}
                {scheduledEnd && (
                    <p className="scheduled-end">
                        <strong>メンテナンス終了予定:</strong>
                        {/* 
                            scheduledEndを日本語形式の日時に変換して表示
                            例: 2026年1月8日 15:00:00
                        */}
                        {new Date(scheduledEnd).toLocaleString('ja-JP')}
                    </p>
                )}

                {/* フッター（お詫びメッセージ） */}
                <div className="maintenance-footer">
                    <p>ご不便をおかけして申し訳ございません。</p>
                </div>
            </div>
        </div>
    );
}

// このコンポーネントを他のファイルから使えるようにエクスポート
export default Maintenance;
