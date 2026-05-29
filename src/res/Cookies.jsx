import ResourceLayout from './ResourceLayout';

export default function Cookies() {
  return (
    <ResourceLayout
      title="Politique de cookies"
      subtitle="Cette page explique les traceurs utilisés sur JC Hub et comment gérer ton consentement."
      lastUpdated="29 mai 2026"
    >
      <article className="res-card">
        <h2>1. Qu’est-ce qu’un cookie ?</h2>
        <p>
          Un cookie est un petit fichier enregistré sur ton appareil lors de la navigation. Il peut servir à
          mémoriser des préférences, mesurer l’audience ou améliorer la sécurité.
        </p>
      </article>

      <article className="res-card">
        <h2>2. Catégories de cookies utilisées</h2>
        <ul className="res-list">
          <li>Nécessaires: indispensables au fonctionnement technique du site.</li>
          <li>Préférences: conservation de certains choix de navigation utilisateur.</li>
          <li>Mesure d’audience: uniquement si un outil de statistiques est activé avec consentement.</li>
        </ul>
      </article>

      <article className="res-card">
        <h2>3. Consentement</h2>
        <p>
          Le bandeau cookies permet de choisir entre les cookies nécessaires uniquement ou l’acceptation
          des préférences utiles au confort de navigation. Les cookies non strictement nécessaires doivent
          rester désactivés tant qu’ils ne sont pas acceptés.
        </p>
        <p>
          Le choix est mémorisé dans un cookie nommé <strong>jchub_cookie_consent</strong>, afin de ne pas
          afficher le bandeau à chaque visite.
        </p>
      </article>

      <article className="res-card">
        <h2>4. Durée de conservation</h2>
        <p>
          Le cookie de consentement est conservé pendant 12 mois. La durée de vie des autres cookies doit
          rester limitée et documentée si des outils comme analytics, tags ou scripts tiers sont ajoutés.
        </p>
      </article>

      <article className="res-card">
        <h2>5. Gestion depuis le navigateur</h2>
        <p>
          Tu peux bloquer ou supprimer les cookies via les paramètres de ton navigateur. Attention: certaines
          fonctionnalités du site peuvent être dégradées après désactivation.
        </p>
      </article>
    </ResourceLayout>
  );
}
