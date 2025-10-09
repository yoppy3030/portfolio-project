import React from 'react';
import '../MainContent.css'; // Import the CSS file

function MainContent({ theme }) {
    return (
      <div className={`main-content ${theme}-theme`}>
        <h1>あなたの活動を記録できるポートフォリオ管理サービス</h1>
        <div className="main-description">
          あなたの趣味・学習・学校活動などを記録できます
        </div>
        <div className="main-features">
          <span>・成果物をガントチャートや一覧で可視化</span>
          <span>・活動をシェアして交流も</span>
        </div>
        <div className="sample-area">サンプル作品/キャプチャ</div>
        </div>
    );
  }

export default MainContent;