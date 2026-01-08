import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import '../PortfolioBuilder.css';
import modernTemplate from '../assets/modern-template.svg';
import classicTemplate from '../assets/classic-template.svg';
import minimalistTemplate from '../assets/minimalist-template.svg';

export default function PortfolioBuilder({ theme }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // if (!token) {
    //   navigate('/login');
    //   return; // Stop execution if not logged in
    // }

    const checkForExistingPortfolio = async () => {
      // Token should be checked here for this specific action
      if (token) {
        try {
          const response = await fetch('http://localhost:5000/api/user/portfolio', {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              // Portfolio exists, redirect to it
              navigate(`/portfolio/${data.portfolioId}`);
            }
            // If !data.success or response is 404, do nothing and show the builder.
          }
        } catch (error) {
          console.error('Error checking for existing portfolio:', error);
          // If there's an error, just proceed to show the builder page.
        }
      }
    };

    checkForExistingPortfolio();
  }, [navigate]);

  const handleCreatePortfolio = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      // Redirect to login page if not logged in, passing current location
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!portfolioTitle) {
      alert(t('portfolio_title_required'));
      return;
    }
    if (!selectedTemplate) {
      alert(t('template_selection_required'));
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: portfolioTitle, template: selectedTemplate }),
      });

      const data = await response.json();

      if (data.success) {
        alert(t('portfolio_creation_success', { title: portfolioTitle, template: selectedTemplate }));
        navigate(`/portfolio/${data.portfolio.id}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      alert('Failed to create portfolio. Please try again later.');
    }
  };

  return (
    <div className={`portfolio-builder-container ${theme}-theme ${selectedTemplate ? `template-${selectedTemplate}` : ''}`}>
      <div className="portfolio-builder-content">
        <h1 className="portfolio-builder-title">{t('portfolio_builder_title')}</h1>
        <p className="portfolio-builder-subtitle">{t('portfolio_builder_subtitle')}</p>

        <div className="portfolio-form">
          <div className="form-group">
            <label htmlFor="portfolio-title">{t('portfolio_title_label')}</label>
            <input
              type="text"
              id="portfolio-title"
              placeholder={t('portfolio_title_placeholder')}
              value={portfolioTitle}
              onChange={(e) => setPortfolioTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('template_selection_label')}</label>
            <div className="template-options">
              <div
                className={`template-card ${selectedTemplate === 'modern' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('modern')}
              >
                <img src={modernTemplate} alt={t('template_modern_title')} className="template-preview" />
                <h3>{t('template_modern_title')}</h3>
                <p>{t('template_modern_desc')}</p>
              </div>
              <div
                className={`template-card ${selectedTemplate === 'classic' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('classic')}
              >
                <img src={classicTemplate} alt={t('template_classic_title')} className="template-preview" />
                <h3>{t('template_classic_title')}</h3>
                <p>{t('template_classic_desc')}</p>
              </div>
              <div
                className={`template-card ${selectedTemplate === 'minimalist' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('minimalist')}
              >
                <img src={minimalistTemplate} alt={t('template_minimalist_title')} className="template-preview" />
                <h3>{t('template_minimalist_title')}</h3>
                <p>{t('template_minimalist_desc')}</p>
              </div>
            </div>
          </div>

          <button className="create-portfolio-btn" onClick={handleCreatePortfolio}>
            {t('create_portfolio_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}