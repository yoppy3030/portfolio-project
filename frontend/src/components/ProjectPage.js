import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../ProjectPage.css';

export default function ProjectPage() {
  const { portfolioId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/portfolios/${portfolioId}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
      } else {
        throw new Error(data.error || 'Failed to fetch project');
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!project) return <div>Project not found.</div>;

  return (
    <div className="project-detail-page">
      <div className="project-header">
        <h1>{project.title}</h1>
        <p>{project.description}</p>
      </div>

      <div className="project-content">
        {/* This is where freely arranged text and images will go */}
        {project.content && <div dangerouslySetInnerHTML={{ __html: project.content }} />}
        {/* Example of how you might add more content: */}
        {/* <img src={project.someImage} alt="Project detail" /> */}
        {/* <p>More detailed text about the project...</p> */}
      </div>
    </div>
  );
}
