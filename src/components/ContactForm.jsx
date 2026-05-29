import { useState } from 'react';
import { getContactErrorMessage, sendContactMessage } from '../services/contactService';
import '../styles/Resources.css';

const initialState = {
  name: '',
  email: '',
  message: '',
  website: ''
};

export default function ContactForm({ source = 'faq-contact' }) {
  const [formData, setFormData] = useState(initialState);
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('');

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((current) => ({ ...current, [field]: value }));
    if (status !== 'idle') {
      setStatus('idle');
      setFeedback('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'loading') return;

    setStatus('loading');
    setFeedback('');

    try {
      await sendContactMessage({
        ...formData,
        source,
        formStartedAt
      });

      setStatus('success');
      setFeedback('Message envoye. Je te reponds tres vite.');
      setFormData(initialState);
      setFormStartedAt(Date.now());
    } catch (error) {
      setStatus('error');
      setFeedback(getContactErrorMessage(error));
    }
  };

  const feedbackClassName =
    status === 'success'
      ? 'res-contact-feedback res-contact-feedback-success'
      : status === 'error'
        ? 'res-contact-feedback res-contact-feedback-error'
        : 'res-contact-feedback';

  return (
    <form className="res-contact-form" onSubmit={handleSubmit}>
      <label style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
        Site web
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={handleChange('website')}
        />
      </label>

      <div className="res-contact-grid">
        <label className="res-contact-field">
          <span>Nom complet</span>
          <input
            type="text"
            value={formData.name}
            onChange={handleChange('name')}
            placeholder="Ex: Jessy Carter"
            autoComplete="name"
            required
          />
        </label>

        <label className="res-contact-field">
          <span>Email</span>
          <input
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="Ex: contact@domaine.com"
            autoComplete="email"
            required
          />
        </label>
      </div>

      <label className="res-contact-field">
        <span>Message</span>
        <textarea
          value={formData.message}
          onChange={handleChange('message')}
          placeholder="Dis-moi ta demande (erreur à signaler, correction, partenariat, question, etc.)."
          rows={5}
          required
        />
      </label>

      <button type="submit" disabled={status === 'loading'} className="res-contact-submit">
        {status === 'loading' ? 'Envoi en cours...' : 'Envoyer le message'}
      </button>

      {feedback ? <p className={feedbackClassName}>{feedback}</p> : null}
    </form>
  );
}
