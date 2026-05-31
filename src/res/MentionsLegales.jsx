import ResourceLayout from './ResourceLayout';

export default function MentionsLegales() {
  return (
    <ResourceLayout
      title="Mentions légales"
      subtitle="Informations légales essentielles du site JC Hub et coordonnées de contact officielles."
      lastUpdated="25 mai 2026"
    >
      <article className="res-card">
        <h2>1. Éditeur du site</h2>
        <div className="res-card-grid">
          <p>Nom du site: JC Hub</p>
          <p>Responsable: Jessy Carter Ngnambongo</p>
          <p>Statut: Propriétaire / Éditeur</p>
          <p>
            Email de contact:{' '}
            <a href="mailto:jchubassistance@gmail.com">jchubassistance@gmail.com</a>
          </p>
          <p>Adresse postale: 00242</p>
          <p>Téléphone: +242 04 479 38 00</p>
        </div>
      </article>

      <article className="res-card">
        <h2>2. Directeur de publication</h2>
        <p>
          Directeur de la publication: Jessy Carter Ngnambongo.
        </p>
      </article>

      <article className="res-card">
        <h2>3. Hébergement</h2>
        <div className="res-card-grid">
          <p>Hébergeur: Vercel Inc.</p>
          <p>Adresse: 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
          <p>
            Site web: <a href="https://vercel.com" target="_blank" rel="noreferrer">https://vercel.com</a>
          </p>
          <p>
            Support: <a href="https://vercel.com/help" target="_blank" rel="noreferrer">https://vercel.com/help</a>
          </p>
        </div>
      </article>

      <article className="res-card">
        <h2>4. Propriété intellectuelle</h2>
        <p>
          Les contenus (textes, images, visuels, code, identité de marque) publiés sur JC Hub sont protégés
          par les droits de propriété intellectuelle. Toute reproduction, diffusion ou adaptation sans
          autorisation préalable est interdite, sauf mention contraire explicite.
        </p>
      </article>

      <article className="res-card">
        <h2>5. Responsabilité</h2>
        <p>
          Les informations publiées sur JC Hub sont fournies à titre informatif. Malgré le soin apporté à la
          mise à jour des contenus, l’éditeur ne garantit pas l’exactitude, l’exhaustivité ou l’actualité de
          toutes les informations à tout moment.
        </p>
      </article>

      <article className="res-card res-card-warning">
        <h2>6. Informations importantes</h2>
        <ul className="res-list">
          <li>
            Certains contenus sont hébergés directement sur notre plateforme lorsqu’ils sont libres,
            open-source ou appartenant au domaine public.
          </li>
          <li>
            Certains livres et ressources restent hébergés sur leurs plateformes officielles et sont
            accessibles via redirection ou aperçu officiel.
          </li>
          <li>
            Toutes les marques, couvertures, noms d’auteurs et contenus restent la propriété de leurs
            propriétaires respectifs.
          </li>
        </ul>
      </article>

      <article className="res-card">
        <h2>7. Technologies utilisées</h2>
        <div className="res-card-grid">
          {['React', 'Vite', 'Firebase Firestore', 'Cloudinary', 'Vercel'].map((technology) => (
            <div className="res-faq-item" key={technology}>
              <h3>{technology}</h3>
            </div>
          ))}
        </div>
      </article>

      <article className="res-card">
        <h2>8. Remerciements</h2>
        <p>
          Merci aux communautés open-source, bibliothèques numériques et plateformes éducatives qui rendent
          le savoir plus accessible au monde entier.
        </p>
      </article>

      <article className="res-card">
        <h2>9. Coordonnées personnelles</h2>
        <p>
          Pour toute demande liée au site (partenariat, droits, correction, données personnelles), utilise
          le formulaire de contact ou écris directement à cette adresse:
          {' '}
          <a href="mailto:jchubassistance@gmail.com">jchubassistance@gmail.com</a>.
        </p>
      </article>

    </ResourceLayout>
  );
}
