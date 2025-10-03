import React from 'react';
function MainContent() {
    return (
      <div className="main-content">
        <h1>あなたの活動を記録できるポートフォリオ管理サービス</h1>
        <div style={{ marginTop: 28, marginBottom: 18, fontSize: "1.1em" }}>
          あなたの趣味・学習・学校活動などを記録できます
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, fontSize: "1.07em" }}>
          <span>・成果物をガントチャートや一覧で可視化</span>
          <span>・活動をシェアして交流も</span>
        </div>
        <div className="sample-area">サンプル作品/キャプチャ</div>
        </div>
    );
  }

export default MainContent;