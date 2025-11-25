// frontend/src/components/Tutorial.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../Tutorial.css';
import tutorialStep1 from '../assets/tutorial-step1.gif';
import tutorialStep2 from '../assets/tutorial-step2.gif';
import tutorialStep3 from '../assets/tutorial-step3.gif';
import tutorialStep4 from '../assets/tutorial-step4.gif';

const Tutorial = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const openModal = (imageSrc) => {
    setSelectedImage(imageSrc);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedImage(null);
  };

  return (
    <div className="tutorial-container">
      <header className="tutorial-header">
        <h1>ポートフォリオ作成チュートリアル</h1>
        <p>簡単なステップで、あなたの素晴らしいポートフォリオを完成させましょう。</p>
      </header>

      <div className="tutorial-steps">
        {/* Step 1: Portfolio Creation */}
        <div className="tutorial-step">
          <div className="step-icon">1</div>
          <div className="step-content">
            <h2>ステップ1: ポートフォリオを作成する</h2>
            <p>まずは、あなたの作品を展示する新しいポートフォリオを作成します。「ポートフォリオビルダー」ページに移動し、好きなテンプレートを選択してください。</p>
            <img src={tutorialStep1} alt="ポートフォリオ作成のデモGIF" className="step-image" onClick={() => openModal(tutorialStep1)} />
            <Link to="/portfolio-builder" className="tutorial-button">ポートフォリオビルダーへ</Link>
          </div>
        </div>

        {/* Step 2: Add Projects */}
        <div className="tutorial-step">
          <div className="step-icon">2</div>
          <div className="step-content">
            <h2>ステップ2: プロジェクトを追加する</h2>
            <p>ポートフォリオが作成されたら、あなたのプロジェクトを追加していきましょう。プロジェクトのタイトル、説明、背景画像などを追加できます。</p>
            <img src={tutorialStep2} alt="プロジェクト追加のデモGIF" className="step-image" onClick={() => openModal(tutorialStep2)} />
          </div>
        </div>

        {/* Step 3: Customize */}
        <div className="tutorial-step">
          <div className="step-icon">3</div>
          <div className="step-content">
            <h2>ステップ3: デザインをカスタマイズする</h2>
            <p>編集から、ポートフォリオの見た目をカスタマイズできます。テーマカラーやフォントを変更して、あなただけのオリジナルデザインを作りましょう。</p>
            <img src={tutorialStep3} alt="デザインカスタマイズのデモGIF" className="step-image" onClick={() => openModal(tutorialStep3)} />
          </div>
        </div>

        {/* Step 4: Share */}
        <div className="tutorial-step">
          <div className="step-icon">4</div>
          <div className="step-content">
            <h2>ステップ4: ポートフォリオを共有する</h2>
            <p>完成したポートフォリオは、専用のURLで簡単に共有できます。SNSや履歴書にURLを貼り付けて、あなたの作品を世界に公開しましょう。</p>
            <img src={tutorialStep4} alt="ポートフォリオ共有のデモGIF" className="step-image" onClick={() => openModal(tutorialStep4)} />
          </div>
        </div>
      </div>

      <footer className="tutorial-footer">
        <p>チュートリアルは以上です。さあ、あなたのポートフォリオ作成を始めましょう！</p>
        <Link to="/portfolio-builder" className="tutorial-button primary">今すぐ始める</Link>
      </footer>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content-image" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="拡大表示" className="modal-image" />
            <button className="close-button" onClick={closeModal}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tutorial;
