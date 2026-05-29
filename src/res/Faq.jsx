import ResourceLayout from './ResourceLayout';
import ContactForm from '../components/ContactForm';

const faqs = [
  {
    q: 'Quel est l’objectif principal de JC Hub ?',
    a: 'Partager des contenus clairs, utiles et actionnables pour apprendre, créer et avancer dans ses projets numériques.'
  },
  {
    q: 'À quelle fréquence les contenus sont-ils publiés ?',
    a: 'La publication suit un rythme régulier selon les priorités éditoriales: articles, guides pratiques et ressources faciles à reprendre.'
  },
  {
    q: 'Puis-je proposer un sujet d’article ?',
    a: 'Oui. Les propositions sont bienvenues, surtout lorsqu’elles partent d’un besoin concret: organisation, outils, création de contenu ou présence en ligne.'
  },
  {
    q: 'Les informations publiées constituent-elles un conseil juridique ?',
    a: 'Non. Les ressources juridiques et conformité sont fournies à titre informatif et doivent être adaptées à ton contexte.'
  },
  {
    q: 'Comment signaler une erreur ou demander une correction ?',
    a: 'Tu peux utiliser le formulaire de contact ou écrire directement à jchubassistance@gmail.com.'
  },
  {
    q: 'JC Hub est-il lié à Baruck-Online ?',
    a: 'Oui. Les deux plateformes sont pilotées par le même propriétaire, avec des objectifs complémentaires autour du web, de la création et du partage.'
  }
];

export default function Faq() {
  return (
    <ResourceLayout
      title="FAQ"
      subtitle="Réponses rapides aux questions fréquentes sur JC Hub, son contenu et son fonctionnement."
      lastUpdated="24 mai 2026"
    >
      <article className="res-card">
        <h2>Questions fréquentes</h2>
        <div className="res-card-grid">
          {faqs.map((item) => (
            <div key={item.q} className="res-faq-item">
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      </article>

      <article id="contact" className="res-card">
        <h2>Contact</h2>
        <p>
          Pour toute demande spécifique (partenariat, correction, droits, signalement), utilise ce formulaire
          ou écris à <a href="mailto:jchubassistance@gmail.com">jchubassistance@gmail.com</a>.
          Le message est enregistré pour faciliter le suivi et te répondre plus proprement.
        </p>
        <ContactForm source="faq-contact" />
      </article>
    </ResourceLayout>
  );
}
