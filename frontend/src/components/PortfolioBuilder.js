import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../PortfolioBuilder.css';

export default function PortfolioBuilder({ theme }) {
  const { t } = useTranslation();
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleCreatePortfolio = () => {
    if (!portfolioTitle) {
      alert(t('portfolio_title_required'));
      return;
    }
    if (!selectedTemplate) {
      alert(t('template_selection_required'));
      return;
    }
    console.log('Creating portfolio with:');
    console.log('Title:', portfolioTitle);
    console.log('Template:', selectedTemplate);
    // Here you would typically send this data to a backend API
    alert(t('portfolio_creation_success', { title: portfolioTitle, template: selectedTemplate }));
    // Redirect to the new portfolio page or dashboard
  };

  return (
    <div className={`portfolio-builder-container ${theme}-theme`}>
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
                <h3>{t('template_modern_title')}</h3>
                <p>{t('template_modern_desc')}</p>
              </div>
              <div
                className={`template-card ${selectedTemplate === 'classic' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('classic')}
              >
                <h3>{t('template_classic_title')}</h3>
                <p>{t('template_classic_desc')}</p>
              </div>
              <div
                className={`template-card ${selectedTemplate === 'minimalist' ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate('minimalist')}
              >
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
