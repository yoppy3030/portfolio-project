import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout';
import debounce from 'lodash.debounce';

import '../ProjectPage.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GridLayout = WidthProvider(RGL);

const BLOCK_STYLES = {
  p: '本文',
  h1: '見出し 1',
  h2: '見出し 2',
  h3: '見出し 3',
};

// --- Sub-components for content blocks ---

function TextBlock({ item, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(item.content);
  const [currentStyle, setCurrentStyle] = useState(item.block_style || 'p');

  const handleDoubleClick = () => setIsEditing(true);

  const handleSave = () => {
    setIsEditing(false);
    if (content !== item.content || currentStyle !== item.block_style) {
      onUpdate(item.id, { content, block_style: currentStyle });
    }
  };

  const renderContent = () => {
    const Tag = ['h1', 'h2', 'h3', 'p'].includes(currentStyle) ? currentStyle : 'p';
    if (Tag === 'p') {
      return <p dangerouslySetInnerHTML={{ __html: String(content || '').replace(/\n/g, '<br />') }} />;
    }
    return <Tag>{content}</Tag>;
  };

  return (
    <div className={`content-block text-block style-${currentStyle}`} onDoubleClick={handleDoubleClick}>
      {isEditing ? (
        <>
          <div className="text-editor-toolbar">
            <select value={currentStyle} onChange={(e) => setCurrentStyle(e.target.value)}>
              {Object.entries(BLOCK_STYLES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button onClick={handleSave}>完了</button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
        </>
      ) : (
        renderContent()
      )}
      <button className="delete-btn" onClick={() => onDelete(item.id)}>
        <i className="material-icons">delete</i>
      </button>
    </div>
  );
}

function ImageBlock({ item, onDelete }) {
  return (
    <div className="content-block image-block">
      {item.content && <img src={item.content} alt={`Content ${item.id}`} />}
      <button className="delete-btn" onClick={() => onDelete(item.id)}>
        <i className="material-icons">delete</i>
      </button>
    </div>
  );
}

// --- Table of Contents Component ---
function TableOfContents({ contents, onLinkClick }) {
  const headings = contents.filter(item => 
    item.type === 'text' && ['h1', 'h2', 'h3'].includes(item.block_style)
  );

  if (headings.length === 0) {
    return (
        <nav className="toc-sidebar">
            <h4>目次</h4>
            <p>ページに見出しがありません。</p>
        </nav>
    );
  }

  return (
    <nav className="toc-sidebar">
      <h4>目次</h4>
      <ul>
        {headings.map(heading => (
          <li key={heading.id} className={`toc-item toc-level-${heading.block_style}`}>
            <a href={`#content-block-${heading.id}`} onClick={(e) => onLinkClick(e, heading.id)}>
              {heading.content}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}


// --- Main ProjectPage Component ---

export default function ProjectPage() {
  const { portfolioId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [layout, setLayout] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const debouncedSaveLayout = useCallback(
    debounce(async (newLayout) => {
      const token = localStorage.getItem('token');
      try {
        await fetch(`http://localhost:5000/api/projects/${projectId}/contents/layout`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ layout: newLayout }),
        });
      } catch (err) {
        console.error('レイアウトの保存に失敗しました:', err);
      }
    }, 1000),
    [projectId]
  );

  const fetchProject = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('プロジェクトの取得に失敗しました');
      
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
        const rglLayout = data.project.contents.map(item => ({
          i: item.id.toString(),
          x: item.layout_x,
          y: item.layout_y,
          w: item.layout_w,
          h: item.layout_h,
        }));
        setLayout(rglLayout);
      } else {
        throw new Error(data.error || 'プロジェクトデータの処理に失敗しました');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, projectId, navigate]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    debouncedSaveLayout(newLayout);
  };

  const addNewContentToBackend = async (type, content, style = 'p') => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/contents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type, content, block_style: style }),
      });
      const data = await response.json();
      if (data.success) {
        fetchProject();
      }
      else {
        alert(`エラー: ${data.error}`);
      }
    } catch (err) {
      console.error('コンテンツの追加に失敗しました:', err);
      alert('コンテンツの追加に失敗しました。');
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      addNewContentToBackend('image', content);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleAddContent = (type) => {
    if (type === 'image') {
      fileInputRef.current.click();
    } else {
      addNewContentToBackend('text', '新しいテキスト', 'p');
    }
  };

  const handleUpdateContent = async (contentId, updatedData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/contents/${contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });
      const data = await response.json();
      if (data.success) {
        setProject(prev => ({
            ...prev,
            contents: prev.contents.map(item => 
                item.id === contentId ? { ...item, ...updatedData } : item
            )
        }));
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (err) {
      console.error('コンテンツの更新に失敗しました:', err);
      alert('コンテンツの更新に失敗しました。');
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('このコンテンツブロックを本当に削除しますか？')) return;
    
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
        alert(`エラー: ${data.error}`);
      }
    } catch (err) {
      console.error('コンテンツの削除に失敗しました:', err);
      alert('コンテンツの削除に失敗しました。');
    }
  };

  const handleTocLinkClick = (e, contentId) => {
    e.preventDefault();
    const element = document.getElementById(`content-block-${contentId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!project) return <div>Project not found.</div>;

  return (
    <div className="project-editor-container">
      <div className="project-editor-main">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          style={{ display: 'none' }}
          accept="image/*"
        />
        <div className="editor-header">
          <div className="project-title-section">
            <h1>{project.title}</h1>
            {project.description && (
              <p className="project-description">{project.description}</p>
            )}
          </div>
          <div className="project-actions">
            <button onClick={() => handleAddContent('text')} className="btn-primary">テキストを追加</button>
            <button onClick={() => handleAddContent('image')} className="btn-primary">画像を追加</button>
            <button onClick={() => navigate(`/portfolio/${portfolioId}`)} className="btn-secondary">ポートフォリオに戻る</button>
          </div>
        </div>

        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={50}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
        >
          {project.contents.map(item => (
            <div key={item.id.toString()} id={`content-block-${item.id}`} className="grid-item">
              {item.type === 'text' ? (
                <TextBlock item={item} onUpdate={handleUpdateContent} onDelete={handleDeleteContent} />
              ) : item.type === 'image' ? (
                <ImageBlock item={item} onDelete={handleDeleteContent} />
              ) : (
                <div className="content-block">Unsupported content type</div>
              )}
            </div>
          ))}
        </GridLayout>
      </div>
      <TableOfContents contents={project.contents} onLinkClick={handleTocLinkClick} />
    </div>
  );
}