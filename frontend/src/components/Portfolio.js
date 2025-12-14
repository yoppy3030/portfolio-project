// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RGL, { WidthProvider } from 'react-grid-layout'; // グリッドレイアウトを作成するためのライブラリ
import HobbiesDisplay from './HobbiesDisplay'; // 趣味表示用のコンポーネント

// 各種スタイルシートをインポート
import '../Portfolio.css';
import '../ShareModal.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// react-grid-layoutのコンポーネントにレスポンシブ機能を追加
const GridLayout = WidthProvider(RGL);

// プロジェクトのカテゴリ定義
const CATEGORIES = ["dashboard", "learning", "school", "other"];

// --- モーダルコンポーネント定義 ---

// 新規プロジェクト追加用モーダル
function AddProjectModal({ on_close, on_submit, t }) {
  // フォームの各入力値を管理するState
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState('');
  const [size, setSize] = useState('medium');
  const [tags, setTags] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [bgInputMethod, setBgInputMethod] = useState('url'); // 背景画像の入力方法（URLかアップロードか）
  const [bgFile, setBgFile] = useState(null); // アップロードされた背景画像ファイル
  const [uploading, setUploading] = useState(false); // アップロード中の状態
  const [error, setError] = useState(''); // エラーメッセージ

  // モーダル表示時に背景のスクロールを無効化
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // 背景画像ファイルが選択されたときの処理
  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
    setBackgroundImage(''); // URL入力をクリア
    setBackgroundColor(''); // 背景色をクリア
  };

  // タグが変更されたときの処理
  const handleTagChange = (tag) => {
    setTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag) // 既に含まれていれば削除
        : [...prevTags, tag] // 含まれていなければ追加
    );
  };

  // フォーム送信時の処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      alert(t('portfolio_alert_project_title_required'));
      return;
    }
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    // 背景画像をアップロードする場合の処理
    if (bgInputMethod === 'upload' && bgFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', bgFile);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      try {
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalBackgroundImage = `http://localhost:5000${uploadData.filePath}`;
          finalBackgroundColor = null; // 画像が設定されたら背景色はクリア
        } else {
          throw new Error(uploadData.error || t('portfolio_alert_bg_upload_failed'));
        }
      } catch (err) {
        setError(err.message);
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    } else if (backgroundImage) {
      finalBackgroundColor = null; // URLが指定されたら背景色はクリア
    } else if (backgroundColor) {
      finalBackgroundImage = null; // 背景色が指定されたら画像はクリア
    }

    // 親コンポーネントに渡すプロジェクトデータを作成
    const projectData = { title, description, textColor, font_size: fontSize, background_image: finalBackgroundImage, size, tags };
    if (finalBackgroundColor !== null) {
      projectData.backgroundColor = finalBackgroundColor;
    }

    on_submit(projectData); // 親コンポーネントの送信処理を呼び出す
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_add_new_project_modal_title')}</h2>
        <form onSubmit={handleSubmit}>
          {/* フォームの各入力欄 */}
          {/* ... */}
        </form>
      </div>
    </div>
  );
}

// プロジェクト編集用モーダル（AddProjectModalとほぼ同じ構造）
function EditProjectModal({ project, on_close, on_submit, t }) {
  // 既存のプロジェクト情報でStateを初期化
  const [title, setTitle] = useState(project.title || '');
  // ... 他のStateも同様に初期化 ...

  // ... 処理はAddProjectModalとほぼ同じ ...
  
  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_edit_project_modal_title')}</h2>
        <form>
          {/* ... */}
        </form>
      </div>
    </div>
  );
}

// テキストブロック追加用モーダル
function AddTextModal({ on_close, on_submit, t }) {
  // ...
  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_add_text_modal_title')}</h2>
        <form>
          {/* ... */}
        </form>
      </div>
    </div>
  );
}

// テキストブロック編集用モーダル
function EditTextModal({ project, on_close, on_submit, t }) {
  // ...
  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_edit_text_modal_title')}</h2>
        <form>
          {/* ... */}
        </form>
      </div>
    </div>
  );
}

// 共有用モーダル
function ShareModal({ portfolioId, on_close, t }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/portfolio/${portfolioId}`;

  // URLをクリップボードにコピーする処理
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後に表示を元に戻す
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };
  
  // ...
  return (
    <div className="share-modal-backdrop" onClick={on_close}>
      {/* ... */}
    </div>
  );
}

// テキストブロック表示・編集用コンポーネント
function TextEditBlock({ project, onContentUpdate, onDelete, onEdit, isEditMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentContent, setCurrentContent] = useState(project.content || '');

  // ダブルクリックで編集モードに切り替え
  const handleDoubleClick = () => {
    if (isEditMode) {
      setIsEditing(true);
    }
  };

  // フォーカスが外れたら編集内容を保存
  const handleBlur = () => {
    setIsEditing(false);
    if (currentContent !== project.content) {
      onContentUpdate({ ...project, content: currentContent });
    }
  };
  
  // ...
  return (
    <div onDoubleClick={handleDoubleClick}>
      {/* ... */}
    </div>
  );
}

// --- ポートフォリオ本体のコンポーネント ---
export default function Portfolio({ onTemplateChange, portfolio, setPortfolio, fetchPortfolio, user }) {
  const { portfolioId } = useParams(); // URLからポートフォリオIDを取得
  const navigate = useNavigate();
  const { t } = useTranslation();

  // モーダルの表示状態などを管理するState
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTextBlock, setEditingTextBlock] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false); // 編集モードかどうか
  const [showShareModal, setShowShareModal] = useState(false);

  // このポートフォリオの所有者かどうかを判定
  const isOwner = user && portfolio && user.id === portfolio.user_id;

  // ポートフォリオのテンプレートが変更されたら親コンポーネントに通知
  useEffect(() => {
    if (portfolio && onTemplateChange) {
      onTemplateChange(portfolio.template);
    }
    if (!isOwner) {
      setIsEditMode(false); // 所有者でなければ編集モードを強制的にOFF
    }
    return () => {
      if (onTemplateChange) {
        onTemplateChange(null); // コンポーネントがアンマウントされるときにテンプレートをリセット
      }
    };
  }, [portfolio, onTemplateChange, isOwner]);

  // 新規プロジェクト（またはテキストブロック）を追加する処理
  const handleAddNewProject = async (projectData) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // ... APIを呼び出してプロジェクトを追加 ...
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(projectData),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false); // モーダルを閉じる
        setShowAddTextModal(false);
        fetchPortfolio(); // ポートフォリオ情報を再取得して表示を更新
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      // ...
    }
  };

  // プロジェクトを更新する処理
  const handleUpdateProject = async (updatedData) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // ... APIを呼び出してプロジェクトを更新 ...
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${updatedData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedData),
      });
      const data = await response.json();
      if (data.success) {
        setEditingProject(null); // 編集モーダルを閉じる
        fetchPortfolio(); // 表示を更新
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      // ...
    }
  };

  // プロジェクトを削除する処理
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm(t('portfolio_confirm_delete_project'))) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // ... APIを呼び出してプロジェクトを削除 ...
  };

  // グリッドのレイアウト（位置やサイズ）が変更されたときに呼ばれる処理
  const handleLayoutChange = useCallback(async (layout) => {
    // フロントエンドの表示を即座に更新
    if (portfolio && setPortfolio) {
      const updatedProjects = portfolio.projects.map(p => {
        const layoutItem = layout.find(l => l.i === p.id.toString());
        return layoutItem ? { ...p, layout_x: layoutItem.x, layout_y: layoutItem.y, layout_w: layoutItem.w, layout_h: layoutItem.h } : p;
      });
      setPortfolio({ ...portfolio, projects: updatedProjects });
    }

    // バックエンドに新しいレイアウト情報を保存
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ layout }),
      });
    } catch (err) {
      console.error('Failed to save layout:', err);
      alert(t('portfolio_alert_layout_save_failed'));
      fetchPortfolio(); // エラー時はサーバー上の最新の状態に戻す
    }
  }, [portfolio, setPortfolio, portfolioId, fetchPortfolio, t]);

  // ポートフォリオ全体を削除する処理
  const handleDeletePortfolio = async () => {
    if (!window.confirm(t('portfolio_confirm_delete_portfolio'))) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // ... APIを呼び出してポートフォリオを削除 ...
  };

  // プロジェクトデータからグリッドレイアウト用のデータを生成
  const generateLayout = () => {
    if (!portfolio || !portfolio.projects) return [];
    return portfolio.projects.map(project => ({
      i: project.id.toString(),
      x: project.layout_x,
      y: project.layout_y,
      w: project.layout_w,
      h: project.layout_h,
    }));
  };

  if (!portfolio) return <div>{t('loading')}</div>;

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h1>{portfolio.title}</h1>
        {/* 所有者のみに表示されるコントロール */}
        {isOwner && (
          <div className="portfolio-controls">
            {/* 編集モード切り替えスイッチ */}
            <div className="edit-mode-toggle">
              <label htmlFor="edit-mode-switch">{t('portfolio_edit_mode')}</label>
              <input id="edit-mode-switch" type="checkbox" checked={isEditMode} onChange={() => setIsEditMode(!isEditMode)} />
            </div>
            <button onClick={() => setShowShareModal(true)}>{t('portfolio_share_button')}</button>
            {/* 編集モードのときだけ表示されるボタン */}
            {isEditMode && (
              <div className="portfolio-header-actions">
                <button onClick={() => setShowAddModal(true)}>{t('portfolio_add_new_project')}</button>
                <button onClick={() => setShowAddTextModal(true)}>{t('portfolio_add_text')}</button>
                <button className="btn-danger" onClick={handleDeletePortfolio}>{t('portfolio_delete_portfolio')}</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 趣味表示コンポーネント */}
      <HobbiesDisplay isOwner={isOwner} portfolioId={portfolioId} />

      {/* 各種モーダル（条件に応じて表示） */}
      {showAddModal && <AddProjectModal on_close={() => setShowAddModal(false)} on_submit={handleAddNewProject} t={t} />}
      {/* ... 他のモーダル ... */}

      {/* プロジェクト一覧をグリッドレイアウトで表示 */}
      {portfolio.projects && portfolio.projects.length > 0 ? (
        <GridLayout
          className="layout"
          layout={generateLayout()}
          cols={12}
          rowHeight={100}
          onResizeStop={handleLayoutChange} // リサイズ完了時に呼ばれる
          onDragStop={handleLayoutChange}   // ドラッグ完了時に呼ばれる
          isDraggable={isOwner && isEditMode} // 編集モードの所有者のみドラッグ可能
          isResizable={isOwner && isEditMode} // 編集モードの所有者のみリサイズ可能
          compactType={null}
          draggableCancel=".project-card-actions" // このクラスを持つ要素ではドラッグを開始しない
        >
          {portfolio.projects.map(project => (
            <div key={project.id.toString()}>
              {project.type === 'text' ? (
                <TextEditBlock project={project} /* ... */ />
              ) : (
                <div className="project-card" /* ... */>
                  {/* プロジェクトカードの内容 */}
                </div>
              )}
            </div>
          ))}
        </GridLayout>
      ) : (
        <div className="no-projects-message">
          {/* プロジェクトがない場合のメッセージ */}
        </div>
      )}
    </div>
  );
}