import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RGL, { WidthProvider } from 'react-grid-layout';
import HobbiesDisplay from './HobbiesDisplay';

import '../Portfolio.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GridLayout = WidthProvider(RGL);

const CATEGORIES = ["dashboard", "learning", "school", "other"];

// A simple modal component for the form
function AddProjectModal({ on_close, on_submit, t }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState('');
  const [size, setSize] = useState('medium');
  const [tags, setTags] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [bgInputMethod, setBgInputMethod] = useState('url');
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
    setBackgroundImage(''); // Clear background image URL when a file is selected
    setBackgroundColor(''); // Clear background color when an image file is selected
  };

  const handleTagChange = (tag) => {
    setTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      alert(t('portfolio_alert_project_title_required'));
      return;
    }
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    if (bgInputMethod === 'upload' && bgFile) {
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
          finalBackgroundColor = null; // Ensure color is cleared if image is uploaded
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
      finalBackgroundColor = null; // Ensure color is cleared if image URL is provided
    } else if (backgroundColor) {
      finalBackgroundImage = null; // Ensure image is cleared if color is provided
    }

    const projectData = {
      title,
      description,
      textColor,
      font_size: fontSize,
      background_image: finalBackgroundImage,
      size,
      tags,
    };

    if (finalBackgroundColor !== null) {
      projectData.backgroundColor = finalBackgroundColor;
    }

    on_submit(projectData);
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_add_new_project_modal_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('portfolio_label_title')}</label>
            <input type="text" value={title || ''} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_description')}</label>
            <textarea value={description || ''} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_tags')}</label>
            <div className="checkbox-group">
              {CATEGORIES.map(cat => (
                <div key={cat} className="checkbox-item">
                  <input type="checkbox" id={`tag-${cat}`} value={cat} checked={tags.includes(cat)} onChange={() => handleTagChange(cat)} />
                  <label htmlFor={`tag-${cat}`}>{t(`header_category_${cat}`)}</label>
                </div>
              ))}
            </div>
          </div>
          
          <h4>{t('portfolio_label_style')}</h4>
          <div className="form-group">
            <label>{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(''); setBgFile(null); }} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_font_size')}</label>
            <input type="text" value={fontSize || ''} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 24px" />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_background_image')}</label>
            <div className="input-method-toggle">
              <button type="button" onClick={() => setBgInputMethod('url')} className={bgInputMethod === 'url' ? 'active' : ''}>{t('portfolio_label_url')}</button>
              <button type="button" onClick={() => setBgInputMethod('upload')} className={bgInputMethod === 'upload' ? 'active' : ''}>{t('portfolio_label_upload')}</button>
            </div>
            {bgInputMethod === 'upload' ? (
              <input type="file" onChange={handleBgFileChange} accept="image/*" />
            ) : (
              <input type="text" value={backgroundImage || ''} onChange={(e) => { setBackgroundImage(e.target.value); setBackgroundColor(''); }} placeholder={t('portfolio_placeholder_bg_image_url')} />
            )}
          </div>

          {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? t('portfolio_uploading') : t('portfolio_add_project_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// EditProjectModal component
function EditProjectModal({ project, on_close, on_submit, t }) {
  const [title, setTitle] = useState(project.title || '');
  const [description, setDescription] = useState(project.description || '');
  const [backgroundColor, setBackgroundColor] = useState(project.background_color || '#ffffff');
  const [textColor, setTextColor] = useState(project.text_color || '#000000');
  const [fontSize, setFontSize] = useState(project.font_size || '');
  const [size, setSize] = useState(project.size || 'medium');
  const [tags, setTags] = useState(project.tags || []);
  const [backgroundImage, setBackgroundImage] = useState(project.background_image || ''); // Add this line
  const [bgInputMethod, setBgInputMethod] = useState('url'); // Add this line
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    setTitle(project.title || '');
    setDescription(project.description || '');
    setBackgroundColor(project.background_color || '#ffffff');
    setTextColor(project.text_color || '#000000');
    setFontSize(project.font_size || '');
    setSize(project.size || 'medium');
    setTags(project.tags || []);
    setBackgroundImage(project.background_image || '');

    const isUrl = project.background_image && (project.background_image.startsWith('http') || project.background_image.startsWith('data:'));
    setBgInputMethod(isUrl ? 'url' : 'upload');
  }, [project]);

  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
    setBackgroundImage(''); // Clear background image URL when a file is selected
    setBackgroundColor(''); // Clear background color when an image file is selected
  };

  const handleTagChange = (tag) => {
    setTags(prevTags =>
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    if (bgInputMethod === 'upload' && bgFile) {
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
          finalBackgroundColor = null; // Ensure color is cleared if image is uploaded
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
      finalBackgroundColor = null; // Ensure color is cleared if image URL is provided
    } else if (backgroundColor) {
      finalBackgroundImage = null; // Ensure image is cleared if color is provided
    }

    on_submit({ 
      ...project, 
      title, 
      description, 
      backgroundColor: finalBackgroundColor, 
      textColor, 
      font_size: fontSize,
      background_image: finalBackgroundImage,
      size, 
      tags 
    });
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_edit_project_modal_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('portfolio_label_title')}</label>
            <input type="text" value={title || ''} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_description')}</label>
            <textarea value={description || ''} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_tags')}</label>
            <div className="checkbox-group">
              {CATEGORIES.map(cat => (
                <div key={cat} className="checkbox-item">
                  <input type="checkbox" id={`tag-${cat}`} value={cat} checked={tags.includes(cat)} onChange={() => handleTagChange(cat)} />
                  <label htmlFor={`tag-${cat}`}>{t(`header_category_${cat}`)}</label>
                </div>
              ))}
            </div>
          </div>
          
          <h4>{t('portfolio_label_style')}</h4>
          <div className="form-group">
            <label>{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(''); setBgFile(null); }} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_font_size')}</label>
            <input type="text" value={fontSize || ''} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 24px" />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_background_image')}</label>
            <div className="input-method-toggle">
              <button type="button" onClick={() => setBgInputMethod('url')} className={bgInputMethod === 'url' ? 'active' : ''}>{t('portfolio_label_url')}</button>
              <button type="button" onClick={() => setBgInputMethod('upload')} className={bgInputMethod === 'upload' ? 'active' : ''}>{t('portfolio_label_upload')}</button>
            </div>
            {bgInputMethod === 'upload' ? (
              <input type="file" onChange={handleBgFileChange} accept="image/*" />
            ) : (
              <input type="text" value={backgroundImage || ''} onChange={(e) => { setBackgroundImage(e.target.value); setBackgroundColor(''); }} placeholder={t('portfolio_placeholder_bg_image_url')} />
            )}
          </div>

          {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? t('portfolio_uploading') : t('portfolio_update_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTextModal({ on_close, on_submit, t }) {
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
      alert(t('portfolio_alert_text_content_required'));
      return;
    }
    on_submit({ content, backgroundColor, textColor, type: 'text' });
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_add_text_modal_title')}</h2>
        <form onSubmit={handleTextSubmit}>
          <div className="form-group">
            <label htmlFor="text-content">{t('portfolio_label_text_content')}</label>
            <textarea id="text-content" value={content} onChange={(e) => setContent(e.target.value)} rows="5" />
          </div>
          <div className="form-group">
            <label htmlFor="text-bg-color">{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input id="text-bg-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="text-color">{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input id="text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{t('portfolio_add_text_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTextModal({ project, on_close, on_submit, t }) {
  const [content, setContent] = useState(project.content || '');
  const [backgroundColor, setBackgroundColor] = useState(project.background_color || '#ffffff');
  const [textColor, setTextColor] = useState(project.text_color || '#000000');
  const [fontSize, setFontSize] = useState(project.font_size || '');
  const [backgroundImage, setBackgroundImage] = useState(project.background_image || '');

  const [bgInputMethod, setBgInputMethod] = useState('url');
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    setContent(project.content || '');
    setBackgroundColor(project.background_color || '#ffffff');
    setTextColor(project.text_color || '#000000');
    setFontSize(project.font_size || '');
    setBackgroundImage(project.background_image || '');

    const isUrl = project.background_image && (project.background_image.startsWith('http') || project.background_image.startsWith('data:'));
    setBgInputMethod(isUrl ? 'url' : 'upload');
  }, [project]);

  const handleBgFileChange = (e) => {
    setBgFile(e.target.files[0]);
    setBackgroundImage(''); // Clear background image URL when a file is selected
    setBackgroundColor(''); // Clear background color when an image file is selected
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let finalBackgroundImage = backgroundImage;
    let finalBackgroundColor = backgroundColor;

    if (bgInputMethod === 'upload' && bgFile) {
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
          finalBackgroundColor = ''; // Ensure color is cleared if image is uploaded
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
      finalBackgroundColor = ''; // Ensure color is cleared if image URL is provided
    } else if (backgroundColor) {
      finalBackgroundImage = ''; // Ensure image is cleared if color is provided
    }

    on_submit({ 
      ...project, 
      content, 
      backgroundColor: finalBackgroundColor, 
      textColor, 
      font_size: fontSize, 
      background_image: finalBackgroundImage,
    });
  };

  return (
    <div className="modal-backdrop" onClick={on_close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('portfolio_edit_text_modal_title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('portfolio_label_text_content')}</label>
            <textarea value={content || ''} onChange={(e) => setContent(e.target.value)} rows="5" />
          </div>
          
          <h4>{t('portfolio_label_style')}</h4>
          <div className="form-group">
            <label>{t('portfolio_label_background_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: backgroundColor }}>
              <input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(''); setBgFile(null); }} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_text_color')}</label>
            <div className="color-picker-wrapper" style={{ backgroundColor: textColor }}>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_font_size')}</label>
            <input type="text" value={fontSize || ''} onChange={(e) => setFontSize(e.target.value)} placeholder="例: 18px" />
          </div>
          <div className="form-group">
            <label>{t('portfolio_label_background_image')}</label>
            <div className="input-method-toggle">
              <button type="button" onClick={() => setBgInputMethod('url')} className={bgInputMethod === 'url' ? 'active' : ''}>{t('portfolio_label_url')}</button>
              <button type="button" onClick={() => setBgInputMethod('upload')} className={bgInputMethod === 'upload' ? 'active' : ''}>{t('portfolio_label_upload')}</button>
            </div>
            {bgInputMethod === 'upload' ? (
              <input type="file" onChange={handleBgFileChange} accept="image/*" />
            ) : (
              <input type="text" value={backgroundImage || ''} onChange={(e) => { setBackgroundImage(e.target.value); setBackgroundColor(''); }} placeholder={t('portfolio_placeholder_bg_image_url')} />
            )}
          </div>

          {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? t('portfolio_uploading') : t('portfolio_update_button')}</button>
            <button type="button" className="btn-secondary" onClick={on_close}>{t('portfolio_cancel_button')}</button>
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

function TextEditBlock({ project, onContentUpdate, onDelete, onEdit, isEditMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentContent, setCurrentContent] = useState(project.content || '');

  const handleDoubleClick = () => {
    if (isEditMode) {
      setIsEditing(true);
    }
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

  const blockStyles = {
    padding: '10px',
    wordBreak: 'break-word',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  if (project.background_image) {
    blockStyles.backgroundImage = `url(${project.background_image})`;
    blockStyles.backgroundSize = 'cover';
    blockStyles.backgroundPosition = 'center';
  } else if (project.background_color) {
    blockStyles.backgroundColor = project.background_color;
  }

  const textContainerStyles = {
    width: '100%',
    height: '100%',
    overflow: 'auto',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    color: project.text_color, // Inherit text color
  };

  const textStyles = {
    margin: 0, 
    fontSize: project.font_size || `${Math.min(Math.sqrt(project.layout_w * project.layout_h) * 8, 48)}px`
  };

  return (
    <div
      className="text-block"
      style={blockStyles}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing && isEditMode ? (
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
            fontSize: project.font_size || `${Math.min(Math.sqrt(project.layout_w * project.layout_h) * 8, 48)}px`,
            fontFamily: 'inherit',
            textAlign: 'left',
            overflow: 'auto', // Added for scrolling in edit mode
          }}
        />
      ) : (
        <div style={textContainerStyles}>
          <p style={textStyles}>{currentContent}</p>
        </div>
      )}
      {isEditMode && (
        <div className="project-card-actions">
          <button className="project-action-icon" onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
            <i className="material-icons">edit</i>
          </button>
          <button className="project-action-icon delete-button" onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}>
            <i className="material-icons">delete</i>
          </button>
        </div>
      )}
    </div>
  );
}

const addPxIfNeeded = (value) => {
  if (!value) return null;
  if (String(value).match(/^[0-9.]+$/)) {
    return `${value}px`;
  }
  return value;
};

export default function Portfolio({ onTemplateChange, portfolio, fetchPortfolio, user }) {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTextBlock, setEditingTextBlock] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const isOwner = user && portfolio && user.id === portfolio.user_id;

  const { t } = useTranslation(); // ここに移動

  useEffect(() => {
    if (portfolio && onTemplateChange) {
      onTemplateChange(portfolio.template);
    }
    if (!isOwner) {
      setIsEditMode(false);
    }
    return () => {
      if (onTemplateChange) {
        onTemplateChange(null);
      }
    };
  }, [portfolio, onTemplateChange, isOwner]);

  useEffect(() => {
    if (portfolio) {
      console.log("Portfolio data received by frontend:", portfolio);
      console.log("Projects with tags:", portfolio.projects?.map(p => ({ id: p.id, title: p.title, tags: p.tags })));
    }
  }, [portfolio]);

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
      alert(t('portfolio_alert_add_item_failed'));
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
      alert(t('portfolio_alert_missing_id'));
      console.error("Project ID is missing in updatedData.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
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
      alert(t('portfolio_alert_update_db_error'));
      console.error(err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm(t('portfolio_confirm_delete_project'))) {
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
      alert(t('portfolio_alert_delete_project_failed'));
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
      alert(t('portfolio_alert_layout_save_failed'));
      fetchPortfolio();
    }
  }, [portfolioId, fetchPortfolio, t]);

  const handleDeletePortfolio = async () => {
    if (!window.confirm(t('portfolio_confirm_delete_portfolio'))) {
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
        alert(t('portfolio_alert_portfolio_deleted'));
        navigate('/portfolio-builder');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(t('portfolio_alert_portfolio_delete_failed'));
      console.error(err);
    }
  };

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
        {isOwner && (
          <div className="portfolio-controls">
            <div className="edit-mode-toggle">
              <label htmlFor="edit-mode-switch">{t('portfolio_edit_mode')}</label>
              <input
                id="edit-mode-switch"
                type="checkbox"
                checked={isEditMode}
                onChange={() => setIsEditMode(!isEditMode)}
              />
            </div>
            {isEditMode && (
              <div className="portfolio-header-actions">
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>{t('portfolio_add_new_project')}</button>
                <button className="btn-primary" onClick={() => setShowAddTextModal(true)}>{t('portfolio_add_text')}</button>
                <button className="btn-danger" onClick={handleDeletePortfolio}>{t('portfolio_delete_portfolio')}</button>
              </div>
            )}
          </div>
        )}
      </div>

      <HobbiesDisplay isOwner={isOwner} portfolioId={portfolioId} />

      {showAddModal && <AddProjectModal on_close={() => setShowAddModal(false)} on_submit={handleAddNewProject} t={t} />}
      {showAddTextModal && <AddTextModal on_close={() => setShowAddTextModal(false)} on_submit={handleAddNewProject} t={t} />}
      {editingProject && <EditProjectModal project={editingProject} on_close={() => setEditingProject(null)} on_submit={handleUpdateProject} t={t} />}
      {editingTextBlock && <EditTextModal project={editingTextBlock} on_close={() => setEditingTextBlock(null)} on_submit={(updated) => { handleUpdateProject(updated); setEditingTextBlock(null); }} t={t} />}

      {portfolio.projects && portfolio.projects.length > 0 ? (
        <GridLayout
          className="layout"
          layout={generateLayout()}
          cols={12}
          rowHeight={100}
          onLayoutChange={handleLayoutChange}
          isDraggable={isOwner && isEditMode}
          isResizable={isOwner && isEditMode}
          compactType={null}
          draggableCancel=".project-card-actions"
        >
          {portfolio.projects.map(project => {
            const cardStyles = {};
            if (project.background_image) {
              cardStyles.backgroundImage = `url(${project.background_image})`;
              cardStyles.backgroundPosition = 'center';
              cardStyles.backgroundSize = 'cover'; // Changed back to 'cover'
              cardStyles.backgroundRepeat = 'no-repeat';
            } else if (project.background_color) {
              cardStyles.backgroundColor = project.background_color;
            }

            

            const processedFontSize = addPxIfNeeded(project.font_size);

            const titleStyles = { 
              color: project.text_color, 
              fontSize: processedFontSize || `${Math.min(Math.sqrt((project.layout_w || 4) * (project.layout_h || 4)) * 8, 48)}px` 
            };
            const descriptionStyles = { 
              color: project.text_color, 
              fontSize: processedFontSize ? `calc(${processedFontSize} * 0.7)` : `${Math.min(Math.sqrt((project.layout_w || 4) * (project.layout_h || 4)) * 4, 24)}px` 
            };

            return (
              <div
                key={project.id.toString()}
                data-grid={{ x: project.layout_x, y: project.layout_y, w: project.layout_w, h: project.layout_h }}
              >
                {project.type === 'text' ? (
                  <TextEditBlock
                    project={project}
                    onContentUpdate={(updatedProject) => handleUpdateProject(updatedProject)}
                    onDelete={handleDeleteProject}
                    onEdit={(proj) => setEditingTextBlock(proj)}
                    isEditMode={isOwner && isEditMode}
                  />
                ) : (
                  <div
                    className={`project-card`}
                    style={{ ...cardStyles, height: '100%', position: 'relative' }}
                    onClick={() => !isEditMode && navigate(`/portfolio/${portfolioId}/project/${project.id}`)}
                  >
                    <div className="project-card-overlay"></div>
                    <div className="project-card-content" style={{ background: 'transparent', position: 'relative', zIndex: 2 }}>
                      <h3 style={titleStyles}>{project.title}</h3>
                      <p style={descriptionStyles}>{project.description}</p>
                    </div>
                    
                    {project.tags && project.tags.length > 0 && (
                      <div className="project-card-tags">
                        {project.tags.map(tag => <span key={tag} className="project-tag">{t(`header_category_${tag}`)}</span>)}
                      </div>
                    )}

                    {isOwner && isEditMode && (
                      <div className="project-card-actions">
                          <button className="project-action-icon view-button" onClick={(e) => { e.stopPropagation(); navigate(`/portfolio/${portfolioId}/project/${project.id}`); }}>
                              <i className="material-icons">open_in_new</i>
                          </button>
                          <button className="project-action-icon" onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                              <i className="material-icons">edit</i>
                          </button>
                          <button className="project-action-icon delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                              <i className="material-icons">delete</i>
                          </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          )}
        </GridLayout>
      ) : (
        <div className="no-projects-message">
          {isOwner && isEditMode ? (
            <p>{t('portfolio_no_projects_owner')}</p>
          ) : (
            <p>{t('portfolio_no_projects_viewer')}</p>
          )}
        </div>
      )}
    </div>
  );
}
