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
- Cloudinary pour les images d'articles

## Routes

| Route | Description |
| --- | --- |
| `/` | Accueil |
| `/blog` | Liste des articles |
| `/search` | Recherche dédiée |
| `/blog/:slug` | Lecture d'un article |
| `/about` | À propos |
| `/contact` | Contact |
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
npm run generate:sitemap
```

Régénère `sitemap.xml` à la racine et dans `public/sitemap.xml`.

```bash
npm run clean:artifacts
```

Supprime les artefacts générés ou publics inutiles comme `dist` et `public/mockups`.

```bash
npm run sync:all
```

Synchronise la base locale puis régénère le sitemap.

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
SYNC_API_TOKEN=...
```

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

Cette copie locale ne contient pas de dossier `.git`, donc l'historique Git ne peut pas être audité depuis ce dossier.

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

Le sitemap est généré par `scripts/generate-sitemap.mjs` et déduplique les URLs avant écriture.

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
5. Lancer `npm run generate:sitemap`.

## Dernières vérifications recommandées

- Tester le formulaire de contact en production.
- Tester l'inscription newsletter en production.
- Tester les commentaires et les likes sur un article.
- Ouvrir le site sur mobile.
- Vérifier `robots.txt` et `sitemap.xml`.
