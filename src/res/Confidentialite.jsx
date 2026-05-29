import ResourceLayout from './ResourceLayout';

export default function Confidentialite() {
  return (
    <ResourceLayout
      title="Politique de confidentialité"
      subtitle="Cette page explique comment JC Hub collecte, utilise et protège les données personnelles."
      lastUpdated="24 mai 2026"
    >
      <article className="res-card">
        <h2>1. Données collectées</h2>
        <ul className="res-list">
          <li>Adresse email fournie volontairement via les formulaires (newsletter, contact futur).</li>
          <li>Données techniques de navigation (type d’appareil, logs techniques, pages consultées).</li>
          <li>Données de mesure d’usage anonymisées pour améliorer le site.</li>
        </ul>
      </article>

      <article className="res-card">
        <h2>2. Finalités du traitement</h2>
        <ul className="res-list">
          <li>Envoyer les contenus demandés par l’utilisateur (newsletter, mises à jour).</li>
          <li>Améliorer la qualité des contenus et l’expérience utilisateur.</li>
          <li>Assurer la sécurité technique, la prévention des abus et le suivi des performances.</li>
        </ul>
      </article>

      <article className="res-card">
        <h2>3. Base légale</h2>
        <p>
          Selon les cas: consentement de l’utilisateur (ex: newsletter), intérêt légitime (amélioration et
          sécurité du site), et obligations légales applicables.
        </p>
      </article>

      <article className="res-card">
        <h2>4. Durée de conservation</h2>
        <p>
          Les données sont conservées uniquement pendant la durée nécessaire aux finalités prévues. Les durées
          exactes doivent être définies et documentées par l’éditeur selon son organisation.
        </p>
      </article>

      <article className="res-card">
        <h2>5. Partage des données</h2>
        <p>
          Les données ne sont pas vendues. Elles peuvent être traitées par des prestataires techniques
          strictement nécessaires au fonctionnement du site (hébergement, infrastructure, analytics, emailing).
        </p>
      </article>

      <article className="res-card">
        <h2>6. Tes droits</h2>
        <ul className="res-list">
          <li>Droit d’accès, de rectification et d’effacement.</li>
          <li>Droit d’opposition et de limitation du traitement.</li>
          <li>Droit à la portabilité des données, selon les cas.</li>
        </ul>
        <p>
          Pour exercer tes droits, utilise le formulaire de contact ou écris à{' '}
          <a href="mailto:jchubassistance@gmail.com">jchubassistance@gmail.com</a>.
        </p>
      </article>
    </ResourceLayout>
  );
}
