import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout';
import '../ProjectPage.css';
import '../Portfolio.css'; // Corrected path

const GridLayout = WidthProvider(RGL);

// Table of Contents Component
function TableOfContents({ contents }) {
  const headings = contents.filter(block => 
    block.type === 'heading' || 
    (block.type === 'text' && ['h1', 'h2', 'h3'].includes(block.block_style))
  );

  if (headings.length === 0) {
    return null;
  }

  const handleLinkClick = (e, blockId) => {
    e.preventDefault();
    const element = document.getElementById(`block-${blockId}`);
    if (element) {
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
function ContentBlock({ block, isEditMode, onUpdate, onDelete, onEdit }) {
  const [currentContent, setCurrentContent] = useState(block.content);
  const [isEditing, setIsEditing] = useState(false);

  const handleDoubleClick = () => {
    if (isEditMode && block.type === 'text') {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (currentContent !== block.content) {
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

  // Background styles are now applied to the parent div in the layout mapping
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


// ContentModal Component
function ContentModal({ block, on_close, on_submit }) {
    const isNew = !block.id;
    const [type, setType] = useState(block.type || 'text');
    const [content, setContent] = useState(block.content || '');
    const [blockStyle, setBlockStyle] = useState(block.block_style || 'p');

    // Style states
    const [textColor, setTextColor] = useState(block.text_color || '');
    const [fontSize, setFontSize] = useState(block.font_size || '');
    const [backgroundColor, setBackgroundColor] = useState(block.background_color || '');
    
    const [bgFile, setBgFile] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    

    const handleFileChange = (e) => {
        setBgFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        let finalBackgroundImage = block.background_image || ''; // Keep existing image by default

        if (bgFile) { // Only check for bgFile
            setUploading(true);
            const formData = new FormData();
            formData.append('file', bgFile);
            const token = localStorage.getItem('token');
            try {
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
            } catch (err) {
                setError(err.message);
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        const finalBlockData = {
            ...block,
            type,
            content,
            block_style: type === 'text' || type === 'heading' ? blockStyle : null,
            text_color: textColor,
            font_size: fontSize,
            background_color: backgroundColor,
            background_image: finalBackgroundImage,
        };

        on_submit(finalBlockData);
    };

    return (
        <div className="modal-backdrop" onClick={on_close}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{isNew ? '新しいコンテンツを追加' : 'コンテンツを編集'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* Basic Settings */}
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
                        <label>内容 (テキスト or 画像/動画のURL)</label>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows="5" placeholder="テキスト内容、または画像/動画のURLを入力..."/>
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
                    <h4>背景スタイル</h4>
                    <div className="form-group">
                        <label>背景色</label>
                        <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
                          <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>背景画像</label>
                        <input type="file" onChange={handleFileChange} accept="image/*" />
                    </div>

                    {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}

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


// ProjectPage Component
export default function ProjectPage({ user }) {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  const isOwner = user && project && user.id === project.user_id;

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/public/projects/${projectId}`, { headers });
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
      } else {
        console.error(data.error);
        setProject(null);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (!isOwner) {
      setIsEditMode(false);
    }
  }, [isOwner]);

  const handleLayoutChange = async (layout) => {
    if (!isOwner || !isEditMode) return;
    const token = localStorage.getItem('token');
    try {
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
        fetchProject();
        setEditingBlock(null);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('コンテンツの保存に失敗しました。');
    }
  };

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
        fetchProject();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('コンテンツの削除に失敗しました。');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!project) return <div>Project not found.</div>;

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
        {isOwner && (
          <div className="project-page-controls">
            <div className="edit-mode-toggle">
              <label htmlFor="edit-mode-switch">編集モード</label>
              <input
                id="edit-mode-switch"
                type="checkbox"
                checked={isEditMode}
                onChange={() => setIsEditMode(!isEditMode)}
              />
            </div>
            {isEditMode && (
                <button className="btn-primary" onClick={() => setEditingBlock({})}>コンテンツを追加</button>
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
