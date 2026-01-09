import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout';
import '../ProjectPage.css';
import '../Portfolio.css'; // Corrected path

const GridLayout = WidthProvider(RGL);

// Table of Contents Component
// 目次コンポーネント
// 記事内の見出し（h1, h2, h3）を抽出してリスト表示します
// 目次コンポーネント
// 記事内の見出し（h1, h2, h3）を抽出してリスト表示します
function TableOfContents({ contents }) {
  // contents配列の中から、「見出し」タイプのもの、または「テキスト」タイプで見出しスタイル（h1-h3）が適用されているものを抽出します
  const headings = contents.filter(block =>
    block.type === 'heading' ||
    (block.type === 'text' && ['h1', 'h2', 'h3'].includes(block.block_style))
  );

  // 見出しが1つもない場合は何も表示しません
  if (headings.length === 0) {
    return null;
  }

  // 目次のリンクがクリックされた時の処理
  const handleLinkClick = (e, blockId) => {
    e.preventDefault(); // デフォルトのリンク動作（ページ遷移）を防止
    const element = document.getElementById(`block-${blockId}`); // IDを使って対象の要素を取得
    if (element) {
      // 対象の要素位置までスムーズにスクロール
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="toc-container"
      style={{
        border: '2px solid #00bcd4',
        padding: '15px',
        margin: '20px 0',
        backgroundColor: '#f0f8ff'
      }}
    >
      <h4>目次</h4>
      <ul>
        {headings.map(heading => {
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

// Reusable Content Block component for viewing and editing
// コンテンツブロックを表示・編集するためのコンポーネント
// テキスト、画像、動画などの種類に応じて表示を切り替えます
// Reusable Content Block component for viewing and editing
// コンテンツブロックを表示・編集するためのコンポーネント
// テキスト、画像、動画などの種類に応じて表示を切り替えます
function ContentBlock({ block, isEditMode, onUpdate, onDelete, onEdit }) {
  // --- ステート（状態変数） ---
  const [currentContent, setCurrentContent] = useState(block.content); // 表示内容
  const [isEditing, setIsEditing] = useState(false); // 編集モード中かどうか

  // ブロックがダブルクリックされた時の処理（テキストの場合のみ直接編集モードへ）
  const handleDoubleClick = () => {
    if (isEditMode && block.type === 'text') {
      setIsEditing(true);
    }
  };

  // テキストエリアからフォーカスが外れた（Blur）時の処理
  // 編集を終了し、内容が変更されていれば親コンポーネントに更新を通知します
  const handleBlur = () => {
    setIsEditing(false);
    if (currentContent !== block.content) {
      // 変更がある場合、既存のブロックデータを新しい content で上書きして通知
      onUpdate({ ...block, content: currentContent });
    }
  };

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

    const textStyles = {
      color: block.text_color,
      fontSize: block.font_size,
    };

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
      case 'heading': // Legacy support
        return <h2 style={textStyles}>{block.content}</h2>;
      default:
        return <div style={textStyles}>{block.content}</div>;
    }
  };

  // 背景スタイルは、GridLayout内の親divに適用されるため、ここでは適用しません
  return (
    <div id={`block-${block.id}`} className={`content-block ${block.type}`} onDoubleClick={handleDoubleClick}>
      {renderContent()}
      {isEditMode && (
        <div className="project-card-actions">
          <button className="project-action-icon" onClick={() => onEdit(block)}><i className="material-icons">edit</i></button>
          <button className="project-action-icon delete-button" onClick={() => onDelete(block.id)}><i className="material-icons">delete</i></button>
        </div>
      )}
    </div>
  );
}


// コンテンツを追加・編集するためのモーダル
// コンテンツを追加・編集するためのモーダル
function ContentModal({ block, on_close, on_submit }) {
  // --- ステート（状態変数） ---
  // block.id が無い場合は新規作成モード（isNew = true）、ある場合は編集モード（isNew = false）
  const isNew = !block.id;
  // ブロックの種類（テキスト, 画像, 動画, 見出し）。デフォルトは 'text'
  const [type, setType] = useState(block.type || 'text');
  // ブロックの内容（テキスト本文や、画像・動画のURL）。
  const [content, setContent] = useState(block.content || '');
  // ブロックのスタイル（p, h1, h2 など）。テキストタイプの場合に使用。
  const [blockStyle, setBlockStyle] = useState(block.block_style || 'p');

  // スタイル設定（文字色, 文字サイズ, 背景色）
  const [textColor, setTextColor] = useState(block.text_color || '');
  const [fontSize, setFontSize] = useState(block.font_size || '');
  const [backgroundColor, setBackgroundColor] = useState(block.background_color || '');

  // ファイルアップロード関連のステート
  const [bgFile, setBgFile] = useState(null); // 背景画像ファイルオブジェクト
  const [contentFile, setContentFile] = useState(null); // コンテンツ（画像/動画）ファイルオブジェクト
  // コンテンツの入力方法が URL直接入力 か ファイルアップロード かを管理
  const [contentInputMethod, setContentInputMethod] = useState('url');

  const [uploading, setUploading] = useState(false); // サーバーへのアップロード処理中フラグ
  const [error, setError] = useState(''); // エラーメッセージ用

  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
  };

  const handleContentFileChange = (e) => {
    setContentFile(e.target.files[0]);
  };

  // フォーム送信時の処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true); // 送信開始（ローディング表示ON）

    let finalContent = content;
    let finalBackgroundImage = block.background_image || '';
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    try {
      // 1. コンテンツ（画像または動画）ファイルがアップロードされた場合の処理
      if ((type === 'image' || type === 'video') && contentInputMethod === 'upload' && contentFile) {
        const formData = new FormData();
        formData.append('file', contentFile);
        // アップロードAPIへリクエスト
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          // アップロードされたファイルのパスを content として使用
          finalContent = `http://localhost:5000${uploadData.filePath}`;
        } else {
          throw new Error(uploadData.error || 'コンテンツファイルのアップロードに失敗しました。');
        }
      }

      // 2. 背景画像ファイルがアップロードされた場合の処理
      if (bgFile) {
        const formData = new FormData();
        formData.append('file', bgFile);
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalBackgroundImage = `http://localhost:5000${uploadData.filePath}`;
        } else {
          throw new Error(uploadData.error || '背景画像のアップロードに失敗しました。');
        }
      }

      // 最終的に保存するデータオブジェクトを構築
      const finalBlockData = {
        ...block,
        type,
        content: finalContent,
        // テキスト・見出し以外の場合は block_style は不要なので null にする
        block_style: type === 'text' || type === 'heading' ? blockStyle : null,
        text_color: textColor,
        font_size: fontSize,
        background_color: backgroundColor,
        background_image: finalBackgroundImage,
      };

      // 親コンポーネントの送信関数を呼び出す
      on_submit(finalBlockData);

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false); // 送信完了（ローディング表示OFF）
    }
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isNew ? '新しいコンテンツを追加' : 'コンテンツを編集'}</h2>
        <form onSubmit={handleSubmit}>
          {/* 基本設定: コンテンツの種類を選択 */}
          <div className="form-group">
            <label>タイプ</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="text">テキスト</option>
              <option value="heading">見出し</option>
              <option value="image">画像</option>
              <option value="video">動画</option>
            </select>
          </div>

          <div className="form-group">
            <label>内容</label>
            {type === 'text' || type === 'heading' ? (
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows="5" placeholder="テキスト内容を入力..." />
            ) : (
              <>
                <div className="input-method-toggle" style={{ marginBottom: '10px' }}>
                  <button type="button" onClick={() => setContentInputMethod('url')} className={contentInputMethod === 'url' ? 'active' : ''}>URL</button>
                  <button type="button" onClick={() => setContentInputMethod('upload')} className={contentInputMethod === 'upload' ? 'active' : ''}>アップロード</button>
                </div>
                {contentInputMethod === 'upload' ? (
                  <input type="file" onChange={handleContentFileChange} accept="image/*,video/*" />
                ) : (
                  <input type="text" className="content-url-input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="画像または動画のURLを入力..." />
                )}
              </>
            )}
          </div>

          {/* Text Styling */}
          {(type === 'text' || type === 'heading') && (
            <>
              <h4>テキストスタイル</h4>
              <div className="form-group">
                <label>スタイル</label>
                <select value={blockStyle} onChange={(e) => setBlockStyle(e.target.value)}>
                  <option value="p">段落</option>
                  <option value="h1">見出し1</option>
                  <option value="h2">見出し2</option>
                  <option value="h3">見出し3</option>
                </select>
              </div>
              <div className="form-group">
                <label>文字色</label>
                <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>文字サイズ (例: 16px, 1.2em)</label>
                <input type="text" value={fontSize} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 16px" />
              </div>
            </>
          )}

          {/* Background Styling */}
          {(type === 'text' || type === 'heading') && (
            <>
              <h4>背景スタイル</h4>
              <div className="form-group">
                <label>背景色</label>
                <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
                  <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>背景画像</label>
                <input type="file" onChange={handleBgFileChange} accept="image/*" />
              </div>
            </>
          )}

          {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'アップロード中...' : (isNew ? '追加' : '更新')}
            </button>
            <button type="button" className="btn-secondary" onClick={on_close}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// メインのプロジェクト詳細ページコンポーネント
// メインのプロジェクト詳細ページコンポーネント
export default function ProjectPage({ user }) {
  // URLパラメータ (:projectId) からプロジェクトIDを取得
  const { projectId } = useParams();

  // --- ステート（状態変数） ---
  const [project, setProject] = useState(null); // プロジェクトデータ
  const [isLoading, setIsLoading] = useState(true); // データの読み込み中フラグ
  const [isEditMode, setIsEditMode] = useState(false); // 編集モードかどうか
  const [editingBlock, setEditingBlock] = useState(null); // 現在編集中・追加中のブロックデータ（nullならモーダル非表示）

  // 現在のログインユーザーがこのプロジェクトの作成者（所有者）か判定
  // 所有者のみ編集が可能
  const isOwner = user && project && user.id === project.user_id;

  // プロジェクトデータをサーバーから取得する関数
  // useCallbackでメモ化して、projectIdが変わった時だけ再生成されるようにする
  const fetchProject = useCallback(async () => {
    setIsLoading(true); // 読み込み開始（ローディング表示）
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = {};
    // ログインしている場合はAuthorizationヘッダーにトークンを追加
    // （公開/非公開設定に関わらず所有者にはデータを見せるためなど）
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/public/projects/${projectId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setProject(data.project); // 取得したデータをステートにセット
      } else {
        console.error(data.error);
        setProject(null);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
      setProject(null);
    } finally {
      setIsLoading(false); // 読み込み完了（ローディング非表示）
    }
  }, [projectId]);

  // コンポーネントのマウント時（またはfetchProjectが再生成された時）にデータを取得
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // 所有者でない場合、強制的に編集モードをOFFにする
  useEffect(() => {
    if (!isOwner) {
      setIsEditMode(false);
    }
  }, [isOwner]);

  // レイアウト変更時にサーバーに保存する処理
  // レイアウト（配置・サイズ）が変更された時にサーバーに保存する処理
  const handleLayoutChange = async (layout) => {
    if (!isOwner || !isEditMode) return; // 所有者かつ編集モードの時のみ実行
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      // 変更後のレイアウト情報をPUTリクエストで送信
      await fetch(`http://localhost:5000/api/projects/${projectId}/contents/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ layout }),
      });
    } catch (err) {
      console.error('Failed to save layout:', err);
      alert('レイアウトの保存に失敗しました。');
    }
  };

  // コンテンツブロックの追加・更新処理
  const handleBlockSubmit = async (blockData) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const isNew = !blockData.id;
    // URLとメソッドの切り替え（新規作成: POST, 更新: PUT）
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
        fetchProject(); // データを再取得して画面を更新
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
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
      // DELETEメソッドで削除APIを呼び出し
      const response = await fetch(`http://localhost:5000/api/contents/${contentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchProject(); // 削除後にデータを再取得して画面を更新
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('コンテンツの削除に失敗しました。');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!project) return <div>Project not found.</div>;

  // React-Grid-Layout 用のレイアウトオブジェクト配列を生成する関数
  // 各ブロックの座標(x, y)とサイズ(w, h)を設定
  const generateLayout = () => {
    return (project.contents || []).map((block, index) => ({
      i: block.id.toString(), // キーとなるID（文字列）
      x: block.layout_x !== null ? block.layout_x : 0,
      y: block.layout_y !== null ? block.layout_y : index, // 設定がない場合はindex順に縦に並べる
      w: block.layout_w || 12, // デフォルト幅はMAX（12）
      h: block.layout_h || 2, // デフォルト高さ
    }));
  };

  return (
    <div className="project-page-container">
      <div className="project-page-header">
        <h1>{project.title}</h1>
        <p>{project.description}</p>
        {isOwner && (
          <div className="project-page-controls">
            <div className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`} onClick={() => setIsEditMode(!isEditMode)}>
              <i className="material-icons">{isEditMode ? 'edit_off' : 'edit'}</i>
              <span>編集モード</span>
            </div>
            {isEditMode && (
              <button className="btn-primary" onClick={() => setEditingBlock({})}>
                <i className="material-icons">add</i> コンテンツを追加
              </button>
            )}
          </div>
        )}
      </div>

      <TableOfContents contents={project.contents || []} />

      {editingBlock && (
        <ContentModal
          block={editingBlock}
          on_close={() => setEditingBlock(null)}
          on_submit={handleBlockSubmit}
        />
      )}

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
