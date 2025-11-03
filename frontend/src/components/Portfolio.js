import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout';
import HobbiesDisplay from './HobbiesDisplay';

import '../Portfolio.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GridLayout = WidthProvider(RGL);

const CATEGORIES = ["ダッシュボード", "学習", "学校", "その他"];

// A simple modal component for the form
function AddProjectModal({ on_close, on_submit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [size, setSize] = useState('medium');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagChange = (tag) => {
    setTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };

  const handleProjectSubmit = (e) => {
    e.preventDefault();
    if (!title) {
      alert('プロジェクトのタイトルは必須です。');
      return;
    }
    on_submit({ title, description, imageData, backgroundColor, textColor, size, tags });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>新しいプロジェクトを追加</h2>
        <form onSubmit={handleProjectSubmit}>
          <div className="form-group">
            <label htmlFor="project-title">タイトル</label>
            <input id="project-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="project-desc">説明</label>
            <textarea id="project-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="project-image">画像</label>
            <input id="project-image" type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="form-group">
            <label>タグ</label>
            <div className="checkbox-group">
              {CATEGORIES.map(cat => (
                <div key={cat} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`add-tag-${cat}`}
                    value={cat}
                    checked={tags.includes(cat)}
                    onChange={() => handleTagChange(cat)}
                  />
                  <label htmlFor={`add-tag-${cat}`}>{cat}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="project-color">背景色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input id="project-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="project-text-color">文字色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input id="project-text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">プロジェクトを追加</button>
            <button type="button" className="btn-secondary" onClick={on_close}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// EditProjectModal component (copied from ProjectPage.js)
function EditProjectModal({ project, on_close, on_submit }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [imageData, setImageData] = useState(project.image_data);
  const [backgroundColor, setBackgroundColor] = useState(project.background_color || '#ffffff');
  const [textColor, setTextColor] = useState(project.text_color || '#000000');
  const [size, setSize] = useState(project.size || 'medium');
  const [tags, setTags] = useState(project.tags || []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagChange = (tag) => {
    setTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!project.type === 'text' && !title) {
      alert('Project title is required.');
      return;
    }
    on_submit({ ...project, title, description, imageData, backgroundColor, textColor, size, tags });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>プロジェクトを編集</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="project-title">タイトル</label>
            <input id="project-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="project-desc">説明</label>
            <textarea id="project-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="project-image">画像</label>
            <input id="project-image" type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="form-group">
            <label>タグ</label>
            <div className="checkbox-group">
              {CATEGORIES.map(cat => (
                <div key={cat} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`tag-${cat}`}
                    value={cat}
                    checked={tags.includes(cat)}
                    onChange={() => handleTagChange(cat)}
                  />
                  <label htmlFor={`tag-${cat}`}>{cat}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="project-color">背景色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input id="project-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="project-text-color">文字色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input id="project-text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">更新</button>
            <button type="button" className="btn-secondary" onClick={on_close}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTextModal({ on_close, on_submit }) {
  const [content, setContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('テキスト内容は必須です。');
      return;
    }
    on_submit({ content, backgroundColor, textColor, type: 'text' });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>新しいテキストブロックを追加</h2>
        <form onSubmit={handleTextSubmit}>
          <div className="form-group">
            <label htmlFor="text-content">テキスト内容</label>
            <textarea id="text-content" value={content} onChange={(e) => setContent(e.target.value)} rows="5" />
          </div>
          <div className="form-group">
            <label htmlFor="text-bg-color">背景色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input id="text-bg-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="text-color">文字色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input id="text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">テキストを追加</button>
            <button type="button" className="btn-secondary" onClick={on_close}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTextModal({ project, on_close, on_submit }) {
  const [content, setContent] = useState(project.content);
  const [backgroundColor, setBackgroundColor] = useState(project.background_color || '#ffffff');
  const [textColor, setTextColor] = useState(project.text_color || '#000000');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('テキスト内容は必須です。');
      return;
    }
    on_submit({ ...project, content, backgroundColor, textColor });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>テキストブロックを編集</h2>
        <form onSubmit={handleTextSubmit}>
          <div className="form-group">
            <label htmlFor="text-content">テキスト内容</label>
            <textarea id="text-content" value={content} onChange={(e) => setContent(e.target.value)} rows="5" />
          </div>
          <div className="form-group">
            <label htmlFor="text-bg-color">背景色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input id="text-bg-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="text-color">文字色</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input id="text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">更新</button>
            <button type="button" className="btn-secondary" onClick={on_close}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const sizeToDimensions = (size) => {
  switch (size) {
    case 'small':
      return { w: 2, h: 2 };
    case 'medium':
      return { w: 4, h: 4 };
    case 'large':
      return { w: 6, h: 4 };
    default:
      return { w: 4, h: 4 };
  }
};

function TextEditBlock({ project, onContentUpdate, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentContent, setCurrentContent] = useState(project.content || '');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (currentContent !== project.content) {
      onContentUpdate({ ...project, content: currentContent });
    }
  };

  const handleChange = (e) => {
    setCurrentContent(e.target.value);
  };

  return (
    <div
      className="text-block"
      style={{
        backgroundColor: project.background_color,
        color: project.text_color,
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        wordBreak: 'break-word',
        position: 'relative',
        height: '100%',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          value={currentContent}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: project.text_color,
            resize: 'none',
            outline: 'none',
            fontSize: `${Math.min(Math.sqrt(project.layout_w * project.layout_h) * 8, 48)}px`,
            fontFamily: 'inherit',
            textAlign: 'center',
          }}
        />
      ) : (
        <p style={{ margin: 0, color: project.text_color, fontSize: `${Math.min(Math.sqrt(project.layout_w * project.layout_h) * 8, 48)}px` }}>{currentContent}</p>
      )}
      <div className="project-card-actions" style={{ top: '5px', right: '5px' }}>
        <button className="project-action-icon" onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
          <i className="material-icons">more_vert</i>
        </button>
        <button className="project-action-icon delete-button" onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}>
          <i className="material-icons">delete</i>
        </button>
      </div>
    </div>
  );
}

export default function Portfolio({ onTemplateChange, portfolio, fetchPortfolio }) {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTextBlock, setEditingTextBlock] = useState(null);

  useEffect(() => {
    if (portfolio && onTemplateChange) {
      onTemplateChange(portfolio.template);
    }
    return () => {
      if (onTemplateChange) {
        onTemplateChange(null);
      }
    };
  }, [portfolio, onTemplateChange]);

  const handleAddNewProject = async (projectData) => {
    const token = localStorage.getItem('token');
    const { w, h } = sizeToDimensions(projectData.size);
    const projectDataWithLayout = { ...projectData, layout_w: w, layout_h: h };

    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectDataWithLayout),
      });

      const data = await response.json();
      if (data.success) {
        if (projectData.type === 'text') {
          setShowAddTextModal(false);
        } else {
          setShowAddModal(false);
        }
        fetchPortfolio();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to add item.');
      console.error(err);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
  };

  const handleUpdateProject = async (updatedData) => {
    const token = localStorage.getItem('token');
    const projectId = updatedData.id;
    if (!projectId) {
      alert('更新対象のIDが見つかりません。');
      console.error("Project ID is missing in updatedData.");
      return;
    }

    const dataToSend = updatedData;

    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();
      if (data.success) {
        if (updatedData.type !== 'text') {
          setEditingProject(null);
        }
        fetchPortfolio();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('プロジェクトの更新に失敗しました。');
      console.error(err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('このプロジェクトを本当に削除しますか？この操作は元に戻せません。')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchPortfolio();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to delete project.');
      console.error(err);
    }
  };

  const handleLayoutChange = useCallback(async (layout) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ layout }),
      });
    } catch (err) {
      console.error('Failed to save layout:', err);
      alert('レイアウトの保存に失敗しました。ページをリロードしてください。');
      fetchPortfolio();
    }
  }, [portfolioId, fetchPortfolio]);

  const handleDeletePortfolio = async () => {
    if (!window.confirm('このポートフォリオを本当に削除しますか？この操作は元に戻せません。')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        alert('ポートフォリオが削除されました。');
        navigate('/portfolio-builder');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('ポートフォリオの削除に失敗しました。');
      console.error(err);
    }
  };

  if (!portfolio) return <div>Loading...</div>;

  const searchParams = new URLSearchParams(location.search);
  const categoryFilter = searchParams.get('category');

  const filteredProjects = categoryFilter
    ? portfolio.projects.filter(p => p.tags?.includes(categoryFilter))
    : portfolio.projects;

  const generateLayout = () => {
    return (filteredProjects || []).map((p, index) => {
      const { w, h } = sizeToDimensions(p.size);
      const layout_x = p.layout_x !== null && p.layout_x !== undefined ? p.layout_x : (index * 4) % 12;
      const layout_y = p.layout_y !== null && p.layout_y !== undefined ? p.layout_y : Math.floor(index / 3) * 4;
      const layout_w = p.layout_w > 1 ? p.layout_w : w;
      const layout_h = p.layout_h > 1 ? p.layout_h : h;

      return {
        i: p.id.toString(),
        x: layout_x,
        y: layout_y,
        w: layout_w,
        h: layout_h,
      };
    });
  };

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h1>{portfolio.title}</h1>
        <div className="portfolio-header-actions">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>新しいプロジェクトを追加</button>
          <button className="btn-primary" onClick={() => setShowAddTextModal(true)}>テキストを追加</button>
          <button className="btn-danger" onClick={handleDeletePortfolio}>ポートフォリオを削除</button>
        </div>
      </div>

      <HobbiesDisplay />

      {showAddModal && <AddProjectModal on_close={() => setShowAddModal(false)} on_submit={handleAddNewProject} />}
      {showAddTextModal && <AddTextModal on_close={() => setShowAddTextModal(false)} on_submit={handleAddNewProject} />}
      {editingProject && <EditProjectModal project={editingProject} on_close={() => setEditingProject(null)} on_submit={handleUpdateProject} />}
      {editingTextBlock && <EditTextModal project={editingTextBlock} on_close={() => setEditingTextBlock(null)} on_submit={(updated) => { handleUpdateProject(updated); setEditingTextBlock(null); }} />}

      {filteredProjects && filteredProjects.length > 0 ? (
        <GridLayout
          className="layout"
          layout={generateLayout()}
          cols={12}
          rowHeight={100}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          compactType={null}
          draggableCancel=".project-card-actions"
        >
          {filteredProjects.map(project => (
            <div
              key={project.id.toString()}
              data-grid={{ x: project.layout_x, y: project.layout_y, w: project.layout_w, h: project.layout_h }}
              style={{ height: '100%' }}
            >
              {project.type === 'text' ? (
                <TextEditBlock
                  project={project}
                  onContentUpdate={(updatedProject) => handleUpdateProject(updatedProject)}
                  onDelete={handleDeleteProject}
                  onEdit={(proj) => setEditingTextBlock(proj)}
                />
              ) : (
                <div
                  className={`project-card`}
                  style={{
                    backgroundColor: project.background_color,
                    backgroundImage: project.image_data ? `url(${project.image_data})` : 'none',
                    height: '100%',
                  }}
                >
                  <div className="project-card-overlay"></div>
                  <div className="project-card-content">
                    <h3 style={{ color: project.text_color, fontSize: `${Math.min(Math.sqrt((project.layout_w || 4) * (project.layout_h || 4)) * 8, 48)}px` }}>{project.title}</h3>
                    <p style={{ color: project.text_color, fontSize: `${Math.min(Math.sqrt((project.layout_w || 4) * (project.layout_h || 4)) * 4, 24)}px` }}>{project.description}</p>
                  </div>
                  
                  {project.tags && project.tags.length > 0 && (
                    <div className="project-card-tags">
                      {project.tags.map(tag => <span key={tag} className="project-tag">{tag}</span>)}
                    </div>
                  )}

                  <div className="project-card-actions">
                      <button className="project-action-icon view-button" onClick={(e) => { e.stopPropagation(); navigate(`/portfolio/${portfolioId}/project/${project.id}`); }}>
                          <i className="material-icons">open_in_new</i>
                      </button>
                      <button className="project-action-icon" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                          <i className="material-icons">more_vert</i>
                      </button>
                      <button className="project-action-icon delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                          <i className="material-icons">delete</i>
                      </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </GridLayout>
      ) : (
        <div className="no-projects-message">
          <p>まだプロジェクトがありません。 "新しいプロジェクトを追加" をクリックして始めましょう！</p>
        </div>
      )}
    </div>
  );
}
