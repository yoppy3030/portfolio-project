import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout';

import '../Portfolio.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// A simple modal component for the form
function AddProjectModal({ on_close, on_submit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000'); // Add textColor state

  useEffect(() => {
    // Disable body scroll when the modal is open
    document.body.style.overflow = 'hidden';
    // Re-enable body scroll when the modal is closed
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []); // Empty dependency array ensures this effect runs only once when the modal mounts

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) {
      alert('プロジェクトのタイトルは必須です。');
      return;
    }
    on_submit({ title, description, imageData, backgroundColor, textColor }); // Include textColor and size in submit
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>新しいプロジェクトを追加</h2>
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
  const [textColor, setTextColor] = useState(project.text_color || '#000000'); // Add textColor state

  useEffect(() => {
    // Disable body scroll when the modal is open
    document.body.style.overflow = 'hidden';
    // Re-enable body scroll when the modal is closed
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []); // Empty dependency array ensures this effect runs only once when the modal mounts

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) {
      alert('Project title is required.');
      return;
    }
    on_submit({ title, description, imageData, backgroundColor, textColor }); // Include textColor and size in submit
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

const GridLayout = WidthProvider(RGL);

// Helper function to convert project size to grid dimensions
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

export default function Portfolio({ onTemplateChange }) {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const fetchPortfolio = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio. You may not have access.');
      }

      const data = await response.json();
      if (data.success) {
        setPortfolio(data.portfolio);
        if (onTemplateChange) {
          onTemplateChange(data.portfolio.template);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch portfolio.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, navigate, onTemplateChange]);

  useEffect(() => {
    fetchPortfolio();

    return () => {
      if (onTemplateChange) {
        onTemplateChange(null);
      }
    };
  }, [fetchPortfolio, onTemplateChange]);

  const handleAddNewProject = async (projectData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        fetchPortfolio(); // Refresh the portfolio data
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to add project.');
      console.error(err);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
  };

  const handleUpdateProject = async (updatedData) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${editingProject.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updatedData),
        }
      );

      const data = await response.json();
      if (data.success) {
        setEditingProject(null); // Close modal
        fetchPortfolio(); // Refresh the portfolio data
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to update project.');
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
        fetchPortfolio(); // Refresh the portfolio data
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to delete project.');
      console.error(err);
    }
  };

  const handleLayoutChange = async (layout) => {
    console.log("Layout change detected:", layout); // この行を追加
    // Update local state optimistically to avoid visual lag
    const updatedProjects = portfolio.projects.map(p => {
        const layoutItem = layout.find(l => l.i === p.id.toString());
        if (layoutItem) {
            return {
                ...p,
                layout_x: layoutItem.x,
                layout_y: layoutItem.y,
                layout_w: layoutItem.w,
                layout_h: layoutItem.h,
            };
        }
        return p;
    });
    setPortfolio({ ...portfolio, projects: updatedProjects });

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
      // Optionally revert state or show error to the user
      alert('レイアウトの保存に失敗しました。ページをリロードしてください。');
      fetchPortfolio(); // Re-fetch to ensure consistency
    }
  };

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
      alert('ポートフォlioの削除に失敗しました。');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!portfolio) return <div>Portfolio not found.</div>;

  // Generate layout for the grid
  const generateLayout = () => {
    return portfolio.projects.map((p, index) => {
      const { w, h } = sizeToDimensions(p.size);
      // Ensure layout properties exist, providing defaults if not
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
          <button className="btn-danger" onClick={handleDeletePortfolio}>ポートフォリオを削除</button>
        </div>
      </div>

      {showAddModal && <AddProjectModal on_close={() => setShowAddModal(false)} on_submit={handleAddNewProject} />}
      {editingProject && <EditProjectModal project={editingProject} on_close={() => setEditingProject(null)} on_submit={handleUpdateProject} />}

      {portfolio.projects && portfolio.projects.length > 0 ? (
        <GridLayout
          className="layout"
          layout={generateLayout()}
          cols={12}
          rowHeight={100}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          draggableCancel=".project-card-actions"
        >
          {portfolio.projects.map(project => (
            <div
              key={project.id.toString()}
              className={`project-card`}
              style={{
                backgroundColor: project.background_color,
                backgroundImage: project.image_data ? `url(${project.image_data})` : 'none',
              }}
              // onClick={() => navigate(`/portfolio/${portfolioId}/project/${project.id}`)} // Navigation can interfere with drag/resize
            >
              <div className="project-card-overlay"></div>
              <h3 style={{ color: project.text_color || '#000000' }}>{project.title}</h3>
              <p style={{ color: project.text_color || '#000000' }}>{project.description}</p>
              
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