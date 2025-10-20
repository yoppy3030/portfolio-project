import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import '../Portfolio.css'; // We will create this CSS file.

// A simple modal component for the form
function AddProjectModal({ on_close, on_submit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000'); // Add textColor state
  const [size, setSize] = useState('medium'); // Add size state

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
    on_submit({ title, description, imageData, backgroundColor, textColor, size }); // Include textColor and size in submit
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
          <div className="form-group">
            <label htmlFor="project-size">表示サイズ</label>
            <select id="project-size" value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
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
  const [size, setSize] = useState(project.size || 'medium'); // Add size state

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
    on_submit({ title, description, imageData, backgroundColor, textColor, size }); // Include textColor and size in submit
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
          <div className="form-group">
            <label htmlFor="project-size">表示サイズ</label>
            <select id="project-size" value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
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


export default function Portfolio() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // New state for editing project

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
        console.log('Fetched Portfolio:', data.portfolio);
        setPortfolio(data.portfolio);
      } else {
        throw new Error(data.error || 'Failed to fetch portfolio.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, navigate]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

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
      console.log(updatedData);
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

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

  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(portfolio.projects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for a smooth UI
    setPortfolio({ ...portfolio, projects: items });

    // Send updated order to backend
    const token = localStorage.getItem('token');
    try {
      const projectOrder = items.map(project => project.id);
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/reorder-projects`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ projectOrder }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(`Error reordering projects: ${data.error}`);
        // If backend update fails, revert to original order or re-fetch
        fetchPortfolio(); 
      }
    } catch (err) {
      alert('Failed to reorder projects.');
      console.error(err);
      fetchPortfolio(); // Re-fetch to ensure state consistency
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!portfolio) return <div>Portfolio not found.</div>;

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h1>{portfolio.title}</h1>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>新しいプロジェクトを追加</button>
      </div>

      {showAddModal && <AddProjectModal on_close={() => setShowAddModal(false)} on_submit={handleAddNewProject} />}
      {editingProject && <EditProjectModal project={editingProject} on_close={() => setEditingProject(null)} on_submit={handleUpdateProject} />}

      {portfolio.projects && portfolio.projects.length > 0 ? (
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="projects" direction="horizontal">
            {(provided) => (
              <div className="project-grid" {...provided.droppableProps} ref={provided.innerRef}>
                {portfolio.projects.map((project, index) => (
                  <Draggable key={project.id} draggableId={project.id} index={index}>
                    {(provided) => (
                      <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`project-card ${project.size || 'medium'}`}
                          style={{
                              backgroundColor: project.background_color,
                              backgroundImage: project.image_data ? `url(${project.image_data})` : 'none',
                              ...provided.draggableProps.style,
                          }}
                          onClick={() => navigate(`/portfolio/${portfolioId}/project/${project.id}`)}
                      >
                          <div className="project-card-overlay"></div>
                          <h3 style={{ color: project.text_color || '#000000' }}>{project.title}</h3>
                          <p style={{ color: project.text_color || '#000000' }}>{project.description}</p>
                          
                          <div className="project-card-actions">
                              <button className="project-action-icon" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                                  <i className="material-icons">more_vert</i>
                              </button>
                              <button className="project-action-icon delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                                  <i className="material-icons">delete</i>
                              </button>
                          </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="no-projects-message">
          <p>まだプロジェクトがありません。 "新しいプロジェクトを追加" をクリックして始めましょう！</p>
        </div>
      )}
    </div>
  );
}
