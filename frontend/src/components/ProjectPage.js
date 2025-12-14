// 必要なライブラリやコンポーネントをインポート
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout'; // グリッドレイアウト用ライブラリ
import '../ProjectPage.css';
import '../Portfolio.css'; // Portfolio.cssのスタイルも一部利用

const GridLayout = WidthProvider(RGL);

// 目次コンポーネント
function TableOfContents({ contents }) {
  // コンテンツブロックの中から見出し(heading)タイプのものを抽出
  const headings = contents.filter(block => 
    block.type === 'heading' || 
    (block.type === 'text' && ['h1', 'h2', 'h3'].includes(block.block_style))
  );

  // 見出しがなければ何も表示しない
  if (headings.length === 0) {
    return null;
  }

  // 目次リンククリック時のスクロール処理
  const handleLinkClick = (e, blockId) => {
    e.preventDefault();
    const element = document.getElementById(`block-${blockId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="toc-container">
      <h4>目次</h4>
      <ul>
        {headings.map(heading => {
          // 見出しレベルに応じてスタイルを適用
          let levelClass = 'toc-level-h2';
          if (heading.type === 'text' && ['h1', 'h2', 'h3'].includes(heading.block_style)) {
            levelClass = `toc-level-${heading.block_style}`;
          }
          return (
            <li key={heading.id} className={`toc-item ${levelClass}`}>
              <a href={`#block-${heading.id}`} onClick={(e) => handleLinkClick(e, heading.id)}>
                {heading.content}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// コンテンツブロックの表示・編集用コンポーネント
function ContentBlock({ block, isEditMode, onUpdate, onDelete, onEdit }) {
  const [currentContent, setCurrentContent] = useState(block.content);
  const [isEditing, setIsEditing] = useState(false);

  // 編集モード中にダブルクリックでテキストエリアに切り替え
  const handleDoubleClick = () => {
    if (isEditMode && block.type === 'text') {
      setIsEditing(true);
    }
  };

  // フォーカスが外れたら更新処理を呼び出す
  const handleBlur = () => {
    setIsEditing(false);
    if (currentContent !== block.content) {
      onUpdate({ ...block, content: currentContent });
    }
  };

  // ブロックのタイプに応じて表示内容を切り替える
  const renderContent = () => {
    if (isEditing) {
      return (
        <textarea
          value={currentContent}
          onChange={(e) => setCurrentContent(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          className="content-textarea"
        />
      );
    }

    const textStyles = { color: block.text_color, fontSize: block.font_size };

    switch (block.type) {
      case 'text':
        switch (block.block_style) {
          case 'h1': return <h1 style={textStyles}>{block.content}</h1>;
          case 'h2': return <h2 style={textStyles}>{block.content}</h2>;
          case 'h3': return <h3 style={textStyles}>{block.content}</h3>;
          default: return <p style={textStyles}>{block.content}</p>;
        }
      case 'image':
        return <img src={block.content} alt="Project content" style={{ maxWidth: '100%', height: 'auto' }} />;
      case 'video':
        return <video src={block.content} controls style={{ maxWidth: '100%', height: 'auto' }} />;
      case 'heading': // 古いデータ形式（heading）との互換性のためのサポート
        return <h2 style={textStyles}>{block.content}</h2>;
      default:
        return <div style={textStyles}>{block.content}</div>;
    }
  };

  return (
    <div id={`block-${block.id}`} className={`content-block ${block.type}`} onDoubleClick={handleDoubleClick}>
      {renderContent()}
      {/* 編集モードの所有者にのみ編集・削除ボタンを表示 */}
      {isEditMode && (
        <div className="project-card-actions">
          <button className="project-action-icon" onClick={() => onEdit(block)}><i className="material-icons">edit</i></button>
          <button className="project-action-icon delete-button" onClick={() => onDelete(block.id)}><i className="material-icons">delete</i></button>
        </div>
      )}
    </div>
  );
}

// コンテンツ追加・編集用モーダル
function ContentModal({ block, on_close, on_submit }) {
    const isNew = !block.id; // block.idがなければ新規作成モード
    // フォームの各入力値を管理するState
    const [type, setType] = useState(block.type || 'text');
    const [content, setContent] = useState(block.content || '');
    const [blockStyle, setBlockStyle] = useState(block.block_style || 'p');
    // ... 他のスタイル関連のState ...
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // フォーム送信時の処理
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setUploading(true);

        let finalContent = content;
        const token = localStorage.getItem('token');

        try {
            // 画像や動画をアップロードする場合の処理
            if ((type === 'image' || type === 'video') && contentInputMethod === 'upload' && contentFile) {
                // ... ファイルをアップロードしてURLを取得 ...
            }
            // 背景画像をアップロードする場合の処理
            if (bgFile) {
                // ... ファイルをアップロードしてURLを取得 ...
            }

            // 最終的なブロックデータを構築
            const finalBlockData = { /* ... */ };
    
            // 親コンポーネントの送信処理を呼び出す
            on_submit(finalBlockData);

        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={on_close}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{isNew ? '新しいコンテンツを追加' : 'コンテンツを編集'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* ... フォームの各入力欄 ... */}
                </form>
            </div>
        </div>
    );
}

// プロジェクト詳細ページのメインコンポーネント
export default function ProjectPage({ user }) {
  const { projectId } = useParams(); // URLからプロジェクトIDを取得
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null); // 編集中のブロック情報

  // このプロジェクトの所有者かどうかを判定
  const isOwner = user && project && user.id === project.user_id;

  // プロジェクトのデータをバックエンドから取得する関数
  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      // 公開プロジェクト取得APIを呼び出す
      const response = await fetch(`http://localhost:5000/api/public/projects/${projectId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
      } else {
        console.error(data.error);
        setProject(null);
      }
    } catch (error) {
      console.error("プロジェクトの取得に失敗:", error);
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // コンポーネントのマウント時にプロジェクトデータを取得
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // 所有者でなければ編集モードをOFFにする
  useEffect(() => {
    if (!isOwner) {
      setIsEditMode(false);
    }
  }, [isOwner]);

  // グリッドレイアウト変更時の処理
  const handleLayoutChange = async (layout) => {
    if (!isOwner || !isEditMode) return;
    const token = localStorage.getItem('token');
    try {
      // バックエンドに新しいレイアウト情報を保存
      await fetch(`http://localhost:5000/api/projects/${projectId}/contents/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ layout }),
      });
    } catch (err) {
      console.error('レイアウトの保存に失敗:', err);
      alert('レイアウトの保存に失敗しました。');
    }
  };

  // コンテンツブロックの追加・更新処理
  const handleBlockSubmit = async (blockData) => {
    const token = localStorage.getItem('token');
    const isNew = !blockData.id;
    const url = isNew ? `/api/projects/${projectId}/contents` : `/api/contents/${blockData.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(`http://localhost:5000${url}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(blockData),
      });
      const data = await response.json();
      if (data.success) {
        fetchProject(); // データを再取得して表示を更新
        setEditingBlock(null); // モーダルを閉じる
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('コンテンツの保存に失敗しました。');
    }
  };

  // コンテンツブロックの削除処理
  const handleDeleteBlock = async (contentId) => {
    if (!window.confirm('このコンテンツを本当に削除しますか？')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/contents/${contentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchProject(); // 表示を更新
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('コンテンツの削除に失敗しました。');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!project) return <div>Project not found.</div>;

  // コンテンツブロックのデータからグリッドレイアウト用のデータを生成
  const generateLayout = () => {
    return (project.contents || []).map((block, index) => ({
      i: block.id.toString(),
      x: block.layout_x !== null ? block.layout_x : 0,
      y: block.layout_y !== null ? block.layout_y : index,
      w: block.layout_w || 12,
      h: block.layout_h || 2,
    }));
  };

  return (
    <div className="project-page-container">
      <div className="project-page-header">
        <h1>{project.title}</h1>
        <p>{project.description}</p>
        {/* 所有者のみに表示されるコントロール */}
        {isOwner && (
          <div className="project-page-controls">
            <div className="edit-mode-toggle">
              <label htmlFor="edit-mode-switch">編集モード</label>
              <input id="edit-mode-switch" type="checkbox" checked={isEditMode} onChange={() => setIsEditMode(!isEditMode)} />
            </div>
            {isEditMode && (
                <button className="btn-primary" onClick={() => setEditingBlock({})}>コンテンツを追加</button>
            )}
          </div>
        )}
      </div>

      {/* 目次コンポーネント */}
      <TableOfContents contents={project.contents || []} />

      {/* コンテンツ編集モーダル（editingBlockが存在する場合に表示） */}
      {editingBlock && (
        <ContentModal 
            block={editingBlock}
            on_close={() => setEditingBlock(null)}
            on_submit={handleBlockSubmit} 
        />
      )}

      {/* コンテンツブロックをグリッドレイアウトで表示 */}
      <GridLayout
        className="layout"
        layout={generateLayout()}
        cols={12}
        rowHeight={50}
        onLayoutChange={handleLayoutChange}
        isDraggable={isOwner && isEditMode}
        isResizable={isOwner && isEditMode}
        compactType={null}
      >
        {(project.contents || []).map(block => {
          // ブロックの背景スタイルを設定
          const blockStyles = {};
          if (block.background_image) {
            blockStyles.backgroundImage = `url(${block.background_image})`;
            blockStyles.backgroundSize = 'cover';
            blockStyles.backgroundPosition = 'center';
          } else if (block.background_color) {
            blockStyles.backgroundColor = block.background_color;
          }

          return (
            <div key={block.id.toString()} style={blockStyles}>
              <ContentBlock 
                block={block} 
                isEditMode={isOwner && isEditMode}
                onUpdate={handleBlockSubmit}
                onDelete={handleDeleteBlock}
                onEdit={setEditingBlock}
              />
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}