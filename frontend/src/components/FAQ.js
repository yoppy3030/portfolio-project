import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../FAQ.css';

function FAQ() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className={`faq-container expanded`}>
      <button onClick={() => navigate(-1)} className="back-button">{t('faq_back_button')}</button>
      <h1>{t('faq_main_title')}</h1>

      <section>
        <h2>{t('faq_section1_title')}</h2>
        <details>
          <summary>{t('faq_section1_q1_summary')}</summary>
          <p>{t('faq_section1_q1_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section1_q2_summary')}</summary>
          <p>
            <strong>{t('faq_register')}:</strong> {t('faq_section1_q2_p1')}<br />
            <strong>{t('faq_login')}:</strong> {t('faq_section1_q2_p2')}<br />
            <strong>{t('faq_unsubscribe')}:</strong> {t('faq_section1_q2_p3')}<br />
            <strong>{t('faq_password_reset')}:</strong> {t('faq_section1_q2_p4')}
          </p>
        </details>
        <details>
          <summary>{t('faq_section1_q3_summary')}</summary>
          <p>{t('faq_section1_q3_details')}</p>
        </details>
      </section>

      <section>
        <h2>{t('faq_section2_title')}</h2>
        <details>
          <summary>{t('faq_section2_q1_summary')}</summary>
          <p>{t('faq_section2_q1_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section2_q2_summary')}</summary>
          <p>{t('faq_section2_q2_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section2_q3_summary')}</summary>
          <p>{t('faq_section2_q3_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section2_q4_summary')}</summary>
          <p>{t('faq_section2_q4_details')}</p>
        </details>
      </section>

      <section>
        <h2>{t('faq_section3_title')}</h2>
        <details>
          <summary>{t('faq_section3_q1_summary')}</summary>
          <p>{t('faq_section3_q1_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section3_q2_summary')}</summary>
          <p>{t('faq_section3_q2_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section3_q3_summary')}</summary>
          <p>{t('faq_section3_q3_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section3_q4_summary')}</summary>
          <p>{t('faq_section3_q4_details')}</p>
        </details>
      </section>

      <section>
        <h2>{t('faq_section4_title')}</h2>
        <details>
          <summary>{t('faq_section4_q1_summary')}</summary>
          <p>{t('faq_section4_q1_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section4_q2_summary')}</summary>
          <p>{t('faq_section4_q2_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section4_q3_summary')}</summary>
          <p>{t('faq_section4_q3_details')}</p>
        </details>
      </section>

      <section>
        <h2>{t('faq_section5_title')}</h2>
        <details>
          <summary>{t('faq_section5_q1_summary')}</summary>
          <p>{t('faq_section5_q1_details', { email: 'support@example.com' })}</p>
        </details>
        <details>
          <summary>{t('faq_section5_q2_summary')}</summary>
          <p>{t('faq_section5_q2_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section5_q3_summary')}</summary>
          <p>{t('faq_section5_q3_details')}</p>
        </details>
      </section>

      <section>
        <h2>{t('faq_section6_title')}</h2>
        <details>
          <summary>{t('faq_section6_q1_summary')}</summary>
          <p>{t('faq_section6_q1_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section6_q2_summary')}</summary>
          <p>{t('faq_section6_q2_details')}</p>
        </details>
        <details>
          <summary>{t('faq_section6_q3_summary')}</summary>
          <p>{t('faq_section6_q3_details')}</p>
        </details>
      </section>
    </div>
  );
}

export default FAQ;