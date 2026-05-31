# JC Hub

JC Hub est un blog React/Vite pour publier des articles simples autour du numérique, de la sécurité, de l'ordinateur, de la bureautique et des projets web.

Le site utilise un design éditorial doux, une recherche dédiée, des pages légales, une newsletter, un formulaire de contact et des interactions temps réel sur les articles.

## Stack

- React 19
- Vite 8
- React Router 7
- Firebase client: Realtime Database, Firestore, Storage, Auth
- Firebase Admin côté API Vercel
- Brevo pour la newsletter et les contacts
- Cloudinary pour les images d'articles et les ebooks redistribuables

## Routes

| Route | Description |
| --- | --- |
| `/` | Accueil |
| `/blog` | Liste des articles |
| `/search` | Recherche dédiée |
| `/blog/:slug` | Lecture d'un article |
| `/about` | À propos |
| `/contact` | Contact |
| `/ebooks` | Bibliothèque numérique avec logique Cloudinary/Firestore |
| `/ebooks/:category/:slug` | Détails SEO d'un livre |
| `/500` | Page d'erreur technique |
| `/res/mentions-legales` | Mentions légales |
| `/res/confidentialite` | Politique de confidentialité |
| `/res/cookies` | Politique de cookies |
| `/res/faq` | FAQ |

La route `/create` est volontairement retirée pour le moment. Le fichier `CreateBlog.jsx` existe encore dans le code, mais il n'est plus exposé dans le routing.

## Installation

```bash
npm install
```

```bash
cp .env.example .env
```

Renseigne ensuite les variables Firebase, Brevo et Cloudinary dans `.env`.

## Scripts

```bash
npm run dev
```

Lance le serveur local.

```bash
npm run build
```

Construit la version production.

```bash
npm run preview
```

Prévisualise le build localement.

```bash
npm run content:dedupe
```

Nettoie les doublons de slugs dans `src/data/database.json`.

```bash
npm run books:schedule:dry-run
```

Prévisualise la programmation Firestore des livres sans écrire en base.

```bash
npm run books:schedule
```

Ajoute ou met à jour `publishAt`, `publishOrder`, `publishWave` et `newsletterSent` dans Firestore.

```bash
npm run env:check
```

Vérifie la présence des variables importantes sans afficher les secrets.

```bash
npm run secret:cron
```

Génère une valeur sûre pour `CRON_SECRET`.

```bash
npm run clean:artifacts
```

Supprime les artefacts générés ou publics inutiles comme `dist` et `public/mockups`.

```bash
npm run sync:all
```

Synchronise la base locale depuis Firestore.

## Variables d'environnement

Les variables publiques côté navigateur doivent commencer par `VITE_`.

Exemples publics:

```env
VITE_SITE_URL=https://jchub.vercel.app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

Les variables sensibles ne doivent jamais commencer par `VITE_`.

Exemples serveur:

```env
BREVO_API_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
FIREBASE_SERVICE_ACCOUNT_BASE64=...
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./firebase-service-account.json
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
BOOKS_IMPORT_TOKEN=...
CRON_SECRET=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=JC Hub
SYNC_API_TOKEN=...
```

## Bibliothèque numérique

La route `/ebooks` recherche dans Gutendex, Google Books, OpenLibrary et Internet Archive via `/api/books/search`. Chaque livre pointe vers une page détail SEO comme `/ebooks/developpement/react-pour-debutants`.

- Gutendex, domaine public et Creative Commons peuvent être importés vers Cloudinary côté serveur.
- Google Books, OpenLibrary et les contenus sans droits clairs restent en redirection externe.
- Les métadonnées sont cataloguées dans Firestore (`books`) avec `isHosted`, `pdfUrl`, `externalLink`, `license` et `canRedistribute`.
- Les livres libres peuvent être uploadés automatiquement vers Cloudinary pendant la recherche (`BOOKS_AUTO_HOST_ON_SEARCH=true`).
- `BOOKS_AUTO_HOST_LIMIT` limite le nombre d'uploads automatiques par recherche pour protéger Cloudinary et le temps de réponse.
- Les livres visibles sont filtrés côté API avec `publishAt <= maintenant`.
- Le script `books:schedule` programme 30 livres au lancement, puis 10 livres supplémentaires par semaine.
- `/api/books/import` est protégé par `BOOKS_IMPORT_TOKEN`; il upload seulement les livres redistribuables et catalogue les autres sans fichier.
- `BOOKS_SEARCH_AUTOSAVE=false` désactive la sauvegarde automatique des résultats de recherche.

## Newsletter livres

Vercel Cron appelle `/api/send-books-newsletter` tous les jours à `00:00 UTC`.

La Function:

- lit les livres publiés avec `newsletterSent=false`;
- récupère les abonnés actifs depuis `NEWSLETTER_COLLECTION`;
- envoie un email Brevo;
- marque les livres avec `newsletterSent=true`.

La route est protégée par `CRON_SECRET`. La même valeur doit exister dans `.env` local et dans les variables d'environnement Vercel.

## Sécurité des secrets

Les fichiers suivants sont ignorés par Git:

- `.env`
- `.env.*`
- `firebase-service-account.json`
- `firebase-service-account*.json`
- `service-account*.json`
- fichiers de clés comme `.pem`, `.key`, `.p12`, `.pfx`

Si une clé Firebase Admin, Brevo ou Cloudinary a déjà été publiée, il faut la considérer comme exposée:

1. Révoquer ou régénérer la clé dans le service concerné.
2. Mettre à jour les variables Vercel.
3. Redéployer le site.
4. Nettoyer l'historique Git si le projet est placé dans un dépôt.

Avant un commit, vérifie toujours `git status` pour confirmer que seuls les fichiers attendus sont inclus.

## Anti-spam

Le projet contient une protection légère:

- rate limit par IP sur `/api/contact`;
- rate limit par IP sur `/api/newsletter`;
- champ piège invisible sur le formulaire de contact;
- détection d'envoi trop rapide côté API;
- délai local avant de republier un commentaire;
- champ piège invisible sur les commentaires.

Pour une protection plus forte en production, ajoute ensuite un captcha léger ou une solution comme Turnstile.

## SEO

Le SEO global est défini dans `index.html`.

Un hook `usePageSeo` met à jour dynamiquement:

- `document.title`;
- meta description;
- Open Graph title, description, image, URL;
- Twitter card;
- canonical URL.

`robots.txt` et `sitemap.xml` sont générés dynamiquement par Vercel Functions:

- `/robots.txt` -> `/api/robots`;
- `/sitemap.xml` -> `/api/sitemap`.

Le sitemap lit Firestore en temps réel et inclut uniquement:

- les livres avec `publishAt <= maintenant`;
- les articles publiés;
- les pages principales du site.

Note importante: comme le projet est une SPA Vite, les balises dynamiques sont mises à jour côté navigateur. Pour des aperçus sociaux parfaits sur tous les robots, une étape future serait le prerendering ou SSR.

## Contenu

Les articles affichés viennent de `src/data/database.json`, via `src/data/blogPosts.js`.

Le script `content:dedupe` garde une seule entrée par slug et crée une sauvegarde avant modification si des doublons sont trouvés.

## Déploiement

Le projet est prêt pour Vercel.

Avant de déployer:

1. Ajouter les variables d'environnement dans Vercel.
2. Vérifier les règles Firebase Realtime Database avec `database.rules.json`.
3. Vérifier les règles Firestore avec `firestore.rules`.
4. Lancer `npm run build`.
5. Vérifier `/robots.txt` et `/sitemap.xml` après le déploiement.

## Dernières vérifications recommandées

- Tester le formulaire de contact en production.
- Tester l'inscription newsletter en production.
- Tester les commentaires et les likes sur un article.
- Ouvrir le site sur mobile.
- Vérifier `robots.txt` et `sitemap.xml`.
