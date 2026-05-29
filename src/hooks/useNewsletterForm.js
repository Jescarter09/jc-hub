import { useCallback, useMemo, useRef, useState } from 'react';
import { getNewsletterErrorMessage, normalizeNewsletterEmail, subscribeToNewsletter } from '../services/newsletterService';

const DEFAULT_MESSAGES = {
  subscribed: "Merci, ton abonnement est confirmé.",
  'already-subscribed': 'Cet email est déjà inscrit à la newsletter.',
  reactivated: "Ton abonnement a bien été réactivé."
};

export function useNewsletterForm(options = {}) {
  const { source = 'unknown', messages = {} } = options;
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ kind: 'idle', text: '' });
  const formStartedAtRef = useRef(Date.now());
  const mergedMessages = useMemo(() => ({ ...DEFAULT_MESSAGES, ...messages }), [messages]);

  const resetFeedback = useCallback(() => {
    setFeedback((current) => (current.kind === 'idle' ? current : { kind: 'idle', text: '' }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (isSubmitting) return;

      const normalizedEmail = normalizeNewsletterEmail(email);
      if (!normalizedEmail) {
        setFeedback({ kind: 'error', text: "Entre ton adresse email pour t'abonner." });
        return;
      }

      setIsSubmitting(true);
      setFeedback({ kind: 'idle', text: '' });

      try {
        const result = await subscribeToNewsletter(normalizedEmail, {
          source,
          formStartedAt: formStartedAtRef.current
        });
        const status = result?.status || 'subscribed';
        const kind = status === 'already-subscribed' ? 'info' : 'success';

        setFeedback({
          kind,
          text: mergedMessages[status] || mergedMessages.subscribed
        });

        if (status !== 'already-subscribed') {
          setEmail('');
          formStartedAtRef.current = Date.now();
        }
      } catch (error) {
        setFeedback({
          kind: 'error',
          text: getNewsletterErrorMessage(error)
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, isSubmitting, mergedMessages, source]
  );

  return {
    email,
    setEmail,
    isSubmitting,
    feedback,
    handleSubmit,
    resetFeedback
  };
}
