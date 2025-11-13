import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../FAQ.css';

function FAQ() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const faqs = [
    {
      section: t('faq.gettingStarted.title'),
      items: [
        { q: t('faq.gettingStarted.q1'), a: t('faq.gettingStarted.a1') },
        { q: t('faq.gettingStarted.q2'), a: t('faq.gettingStarted.a2') },
      ],
    },
    {
      section: t('faq.account.title'),
      items: [
        { q: t('faq.account.q1'), a: t('faq.account.a1') },
        { q: t('faq.account.q2'), a: t('faq.account.a2') },
        { q: t('faq.account.q3'), a: t('faq.account.a3') },
        { q: t('faq.account.q4'), a: t('faq.account.a4') },
        { q: t('faq.account.q5'), a: t('faq.account.a5') },
      ],
    },
    {
      section: t('faq.portfolio.title'),
      items: [
        { q: t('faq.portfolio.q1'), a: t('faq.portfolio.a1') },
        { q: t('faq.portfolio.q2'), a: t('faq.portfolio.a2') },
        { q: t('faq.portfolio.q3'), a: t('faq.portfolio.a3') },
        { q: t('faq.portfolio.q4'), a: t('faq.portfolio.a4') },
        { q: t('faq.portfolio.q5'), a: t('faq.portfolio.a5') },
        { q: t('faq.portfolio.q6'), a: t('faq.portfolio.a6') },
        { q: t('faq.portfolio.q7'), a: t('faq.portfolio.a7') },
      ],
    },
    {
      section: t('faq.projectPage.title'),
      items: [
        { q: t('faq.projectPage.q1'), a: t('faq.projectPage.a1') },
        { q: t('faq.projectPage.q2'), a: t('faq.projectPage.a2') },
        { q: t('faq.projectPage.q3'), a: t('faq.projectPage.a3') },
        { q: t('faq.projectPage.q4'), a: t('faq.projectPage.a4') },
      ],
    },
    {
      section: t('faq.hobbies.title'),
      items: [
        { q: t('faq.hobbies.q1'), a: t('faq.hobbies.a1') },
        { q: t('faq.hobbies.q2'), a: t('faq.hobbies.a2') },
        { q: t('faq.hobbies.q3'), a: t('faq.hobbies.a3') },
      ],
    },
    {
      section: t('faq.other.title'),
      items: [
        { q: t('faq.other.q1'), a: t('faq.other.a1') },
        { q: t('faq.other.q2'), a: t('faq.other.a2', { email: 'your-support-email@example.com' }) },
      ],
    },
  ];

  return (
    <div className={`faq-container expanded`}>
      <button onClick={() => navigate(-1)} className="back-button">{t('faq.backButton')}</button>
      <h1>{t('faq.mainTitle')}</h1>

      {faqs.map((section, sectionIndex) => (
        <section key={sectionIndex}>
          <h2>{section.section}</h2>
          {section.items.map((item, itemIndex) => (
            <details key={itemIndex}>
              <summary>{item.q}</summary>
              <p dangerouslySetInnerHTML={{ __html: item.a }} />
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}

export default FAQ;
