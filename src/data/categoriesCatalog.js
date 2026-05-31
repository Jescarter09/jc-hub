const categoryGroups = [
  {
    name: 'Intelligence artificielle & data',
    items: [
      ['Intelligence Artificielle', 'fas fa-brain', "Articles, ebooks et ressources pour comprendre l'IA, ses usages et ses limites.", ['ia', 'ai', 'algorithmes'], true],
      ['IA Générative', 'fas fa-wand-magic-sparkles', 'Création de textes, images, code et assistants avec les modèles génératifs.', ['chatgpt', 'llm', 'génération'], false],
      ['Machine Learning', 'fas fa-diagram-project', 'Modèles prédictifs, apprentissage supervisé, classification et régression.', ['ml', 'modèles', 'prédiction'], false],
      ['Deep Learning', 'fas fa-network-wired', 'Réseaux neuronaux, vision, NLP et architectures avancées.', ['réseaux neuronaux', 'nlp', 'vision'], false],
      ['Prompt Engineering', 'fas fa-terminal', 'Méthodes pour mieux dialoguer avec les IA et structurer les prompts.', ['prompt', 'llm', 'assistant'], false],
      ['Data Science', 'fas fa-chart-column', 'Analyse de données, statistiques, Python et modèles d’aide à la décision.', ['data', 'python', 'statistiques'], true],
      ['Data Analytics', 'fas fa-chart-line', 'Tableaux de bord, KPI, analyse métier et visualisation des données.', ['analytics', 'kpi', 'dashboard'], false],
      ['Business Intelligence', 'fas fa-chart-pie', 'Outils BI, reporting, indicateurs et pilotage de performance.', ['bi', 'reporting', 'power bi'], false],
      ['Big Data', 'fas fa-database', 'Volumes massifs de données, pipelines, stockage et traitement distribué.', ['hadoop', 'spark', 'données'], false],
      ['Bases de données', 'fas fa-server', 'SQL, NoSQL, modélisation, requêtes et gestion de données.', ['sql', 'nosql', 'database'], false],
      ['Visualisation de données', 'fas fa-chart-simple', 'Graphiques, storytelling data et représentation claire des informations.', ['dataviz', 'graphiques', 'visualisation'], false],
      ["Éthique de l'IA", 'fas fa-scale-balanced', 'Biais, transparence, responsabilité et usages sûrs de l’intelligence artificielle.', ['éthique', 'biais', 'responsabilité'], false]
    ]
  },
  {
    name: 'Développement & programmation',
    items: [
      ['Développement Web', 'fas fa-code', 'Frontend, backend, frameworks web et bonnes pratiques de création de sites.', ['web', 'frontend', 'backend'], true],
      ['Frontend', 'fas fa-window-maximize', 'Interfaces web, HTML, CSS, JavaScript et expérience utilisateur côté client.', ['html', 'css', 'javascript'], false],
      ['Backend', 'fas fa-gears', 'APIs, serveurs, bases de données, sécurité et architecture côté serveur.', ['node', 'api', 'serveur'], false],
      ['JavaScript', 'fab fa-js', 'Langage JavaScript, DOM, frameworks, outils modernes et bonnes pratiques.', ['js', 'ecmascript', 'frontend'], false],
      ['TypeScript', 'fas fa-code-branch', 'Typage JavaScript, qualité de code et applications plus robustes.', ['typescript', 'types', 'javascript'], false],
      ['Python', 'fab fa-python', 'Automatisation, data, scripts, backend et apprentissage de Python.', ['python', 'script', 'data'], false],
      ['PHP', 'fab fa-php', 'Applications PHP, CMS, backend et maintenance de projets existants.', ['php', 'wordpress', 'backend'], false],
      ['Java', 'fab fa-java', 'Programmation Java, POO, backend, Android et applications entreprise.', ['java', 'poo', 'spring'], false],
      ['C# & .NET', 'fas fa-code', 'Développement C#, .NET, applications desktop, web et APIs.', ['csharp', '.net', 'asp.net'], false],
      ['APIs & Microservices', 'fas fa-plug', 'REST, webhooks, intégrations, microservices et communication entre systèmes.', ['api', 'rest', 'microservices'], false],
      ['Architecture logicielle', 'fas fa-sitemap', 'Conception d’applications, patterns, scalabilité et maintenabilité.', ['architecture', 'patterns', 'scalabilité'], false],
      ['Tests & QA', 'fas fa-vial-circle-check', 'Tests unitaires, intégration, qualité logicielle et validation produit.', ['tests', 'qa', 'qualité'], false],
      ['Git & GitHub', 'fab fa-github', 'Versioning, branches, pull requests, collaboration et workflows Git.', ['git', 'github', 'versioning'], false],
      ['Open Source', 'fas fa-code-merge', 'Contribution, licences, communautés et projets libres.', ['open source', 'licence', 'communauté'], false]
    ]
  },
  {
    name: 'Mobile, design & produit',
    items: [
      ['Développement Mobile', 'fas fa-mobile-screen-button', 'Applications mobiles, interfaces tactiles, Android, iOS et responsive.', ['mobile', 'android', 'ios'], true],
      ['Android', 'fab fa-android', 'Développement Android, Kotlin, Java mobile et bonnes pratiques.', ['android', 'kotlin', 'mobile'], false],
      ['iOS', 'fab fa-apple', 'Applications iOS, Swift, design mobile et écosystème Apple.', ['ios', 'swift', 'iphone'], false],
      ['React Native', 'fab fa-react', 'Applications mobiles multiplateformes avec React Native.', ['react native', 'mobile', 'javascript'], false],
      ['Flutter', 'fas fa-layer-group', 'Applications multiplateformes avec Flutter et Dart.', ['flutter', 'dart', 'mobile'], false],
      ['UI / UX Design', 'fas fa-palette', 'Design d’interface, expérience utilisateur, ergonomie et parcours fluides.', ['ui', 'ux', 'design'], true],
      ['Accessibilité numérique', 'fas fa-universal-access', 'Interfaces inclusives, lisibilité, navigation clavier et standards web.', ['accessibilité', 'a11y', 'inclusion'], false],
      ['Product Management', 'fas fa-clipboard-list', 'Roadmaps, discovery, priorisation et construction de produits numériques.', ['product', 'roadmap', 'discovery'], false]
    ]
  },
  {
    name: 'Cloud, DevOps & infrastructure',
    items: [
      ['Cloud Computing', 'fas fa-cloud-arrow-up', 'Hébergement, stockage, services cloud, automatisation et scalabilité.', ['cloud', 'hébergement', 'scalabilité'], true],
      ['DevOps', 'fas fa-infinity', 'Culture DevOps, automatisation, livraison continue et collaboration technique.', ['devops', 'automation', 'ops'], false],
      ['Docker & Conteneurs', 'fab fa-docker', 'Images, conteneurs, environnements reproductibles et déploiement.', ['docker', 'containers', 'images'], false],
      ['Kubernetes', 'fas fa-dharmachakra', 'Orchestration de conteneurs, clusters, services et déploiements.', ['kubernetes', 'k8s', 'clusters'], false],
      ['CI/CD', 'fas fa-rotate', 'Pipelines, intégration continue, déploiement automatisé et qualité.', ['ci cd', 'pipeline', 'déploiement'], false],
      ['Serverless', 'fas fa-bolt', 'Fonctions serverless, APIs légères, coûts et architecture événementielle.', ['serverless', 'functions', 'vercel'], false],
      ['Firebase', 'fas fa-fire', 'Firestore, Auth, Realtime Database, Storage et hébergement Firebase.', ['firebase', 'firestore', 'auth'], false],
      ['Vercel', 'fas fa-rocket', 'Déploiement frontend, fonctions serverless, preview et optimisation Vercel.', ['vercel', 'deploy', 'frontend'], false],
      ['AWS', 'fab fa-aws', 'Services Amazon Web Services, cloud, stockage, calcul et sécurité.', ['aws', 'amazon', 'cloud'], false],
      ['Réseaux & Administration système', 'fas fa-network-wired', 'Réseaux, serveurs, DNS, systèmes et supervision.', ['réseau', 'dns', 'admin système'], false]
    ]
  },
  {
    name: 'Cybersécurité & confidentialité',
    items: [
      ['Cybersécurité', 'fas fa-lock', 'Protection des systèmes, données, comptes et usages numériques.', ['sécurité', 'cyber', 'protection'], true],
      ['Sécurité Web', 'fas fa-shield-halved', 'Failles web, OWASP, sécurisation des APIs et bonnes pratiques.', ['owasp', 'web security', 'xss'], false],
      ['Sécurité Réseau', 'fas fa-ethernet', 'Pare-feu, segmentation, surveillance réseau et défense périmétrique.', ['réseau', 'firewall', 'surveillance'], false],
      ['Cryptographie', 'fas fa-key', 'Chiffrement, signatures, certificats, hash et protection des échanges.', ['crypto', 'chiffrement', 'certificat'], false],
      ['Protection des données', 'fas fa-user-shield', 'Vie privée, données personnelles, conformité et hygiène numérique.', ['privacy', 'données', 'rgpd'], false],
      ['OSINT', 'fas fa-magnifying-glass-location', 'Recherche en sources ouvertes, investigation et vérification d’information.', ['osint', 'investigation', 'veille'], false],
      ['Pentest & Ethical Hacking', 'fas fa-user-secret', 'Tests d’intrusion, audit, vulnérabilités et hacking éthique.', ['pentest', 'ethical hacking', 'audit'], false],
      ['Sécurité Cloud', 'fas fa-cloud-shield', 'Contrôles, IAM, stockage sécurisé et surveillance dans le cloud.', ['cloud security', 'iam', 'sécurité'], false],
      ['Authentification', 'fas fa-id-card', 'Connexion, MFA, OAuth, sessions et gestion des identités.', ['auth', 'oauth', 'mfa'], false],
      ['Sauvegarde & Récupération', 'fas fa-clock-rotate-left', 'Backups, restauration, continuité d’activité et résilience.', ['backup', 'restauration', 'résilience'], false]
    ]
  },
  {
    name: 'Bureautique, outils & productivité',
    items: [
      ['Outils Numériques', 'fas fa-screwdriver-wrench', 'Outils, logiciels, plateformes et ressources pratiques du quotidien.', ['outils', 'logiciels', 'numérique'], true],
      ['Productivité', 'fas fa-book-open-reader', 'Méthodes, organisation, routines et systèmes pour mieux progresser.', ['productivité', 'organisation', 'méthodes'], true],
      ['Automatisation', 'fas fa-robot', 'Scripts, workflows, no-code, tâches répétitives et gain de temps.', ['automation', 'workflow', 'scripts'], false],
      ['No-code & Low-code', 'fas fa-cubes', 'Créer des outils, sites et automatisations sans coder ou avec peu de code.', ['nocode', 'lowcode', 'outils'], false],
      ['Notion & Organisation', 'fas fa-table-list', 'Bases de connaissances, tableaux, notes et systèmes d’organisation.', ['notion', 'notes', 'organisation'], false],
      ['Microsoft Office', 'fas fa-file-word', 'Word, Excel, PowerPoint, bureautique et documents professionnels.', ['office', 'excel', 'word'], false],
      ['Google Workspace', 'fab fa-google', 'Docs, Sheets, Drive, Gmail et collaboration avec Google Workspace.', ['google docs', 'sheets', 'drive'], false],
      ['Gestion de projet', 'fas fa-list-check', 'Planification, suivi, méthodes agiles, Kanban et coordination.', ['projet', 'agile', 'kanban'], false],
      ['Collaboration en ligne', 'fas fa-people-group', 'Travail d’équipe, communication, partage et outils collaboratifs.', ['collaboration', 'remote', 'équipe'], false],
      ['Veille technologique', 'fas fa-rss', 'Surveillance des tendances, curation, sources et apprentissage continu.', ['veille', 'curation', 'tendances'], false]
    ]
  },
  {
    name: 'Marketing, business & carrière',
    items: [
      ['Marketing Digital', 'fas fa-bullhorn', 'SEO, réseaux sociaux, contenu, acquisition et communication numérique.', ['marketing', 'seo', 'acquisition'], true],
      ['SEO', 'fas fa-magnifying-glass-chart', 'Référencement naturel, mots-clés, contenu et visibilité sur Google.', ['seo', 'référencement', 'google'], false],
      ['Réseaux Sociaux', 'fas fa-share-nodes', 'Stratégies sociales, formats, communautés et gestion de présence.', ['social media', 'instagram', 'linkedin'], false],
      ['E-commerce', 'fas fa-cart-shopping', 'Boutiques en ligne, conversion, paiement, catalogue et expérience client.', ['ecommerce', 'vente', 'shop'], false],
      ['Création de contenu', 'fas fa-pen-nib', 'Articles, vidéos, newsletters, storytelling et stratégie éditoriale.', ['contenu', 'newsletter', 'storytelling'], false],
      ['Entrepreneuriat', 'fas fa-lightbulb', 'Créer, structurer et développer un projet ou une activité indépendante.', ['entrepreneur', 'business', 'projet'], false],
      ['Startups', 'fas fa-seedling', 'Produit, croissance, financement, MVP et construction d’entreprise tech.', ['startup', 'mvp', 'growth'], false],
      ['Finance personnelle', 'fas fa-wallet', 'Budget, épargne, investissement, outils et éducation financière.', ['finance', 'budget', 'épargne'], false],
      ['Freelance', 'fas fa-briefcase', 'Trouver des clients, fixer ses tarifs, livrer et gérer son activité.', ['freelance', 'clients', 'tarifs'], false],
      ['Carrière numérique', 'fas fa-user-graduate', 'Compétences, métiers du numérique, CV, portfolio et évolution.', ['carrière', 'emploi', 'compétences'], false],
      ['Leadership', 'fas fa-compass', 'Management, communication, décision et animation d’équipe.', ['leadership', 'management', 'équipe'], false]
    ]
  },
  {
    name: 'Culture numérique & éducation',
    items: [
      ['Culture Numérique', 'fas fa-globe', 'Comprendre les usages, enjeux sociaux et transformations numériques.', ['culture', 'numérique', 'société'], false],
      ['Éducation numérique', 'fas fa-graduation-cap', 'Apprentissage en ligne, pédagogie, ressources et formation.', ['éducation', 'formation', 'e-learning'], false],
      ["Méthodes d'apprentissage", 'fas fa-brain', 'Apprendre plus efficacement, mémoriser, pratiquer et progresser.', ['apprentissage', 'mémoire', 'méthode'], false],
      ['Littératie numérique', 'fas fa-book', 'Compétences de base pour comprendre et utiliser le numérique.', ['littératie', 'débutant', 'compétences'], false],
      ['Recherche documentaire', 'fas fa-book-atlas', 'Trouver, organiser, citer et vérifier des sources fiables.', ['recherche', 'sources', 'documentation'], false],
      ['Médias & Information', 'fas fa-newspaper', 'Information, fact-checking, médias numériques et esprit critique.', ['médias', 'information', 'fact checking'], false],
      ['Langues', 'fas fa-language', 'Apprentissage des langues, traduction, communication et ressources linguistiques.', ['langues', 'anglais', 'traduction'], false],
      ['Communication', 'fas fa-comments', 'Communication écrite, orale, digitale et professionnelle.', ['communication', 'présentation', 'écriture'], false],
      ['Écriture & Rédaction', 'fas fa-pen-to-square', 'Rédiger articles, documents, guides, scripts et contenus clairs.', ['rédaction', 'écriture', 'contenu'], false],
      ['Documentation technique', 'fas fa-file-lines', 'Docs produit, guides développeur, tutoriels et documentation claire.', ['documentation', 'docs', 'technique'], false]
    ]
  },
  {
    name: 'Sciences, société & savoirs',
    items: [
      ['Mathématiques', 'fas fa-square-root-variable', 'Raisonnement, calcul, statistiques, logique et fondations scientifiques.', ['maths', 'statistiques', 'logique'], false],
      ['Physique', 'fas fa-atom', 'Principes physiques, sciences, technologies et vulgarisation.', ['physique', 'science', 'énergie'], false],
      ['Sciences', 'fas fa-flask', 'Culture scientifique, méthode, découvertes et vulgarisation.', ['science', 'vulgarisation', 'recherche'], false],
      ['Histoire', 'fas fa-landmark', 'Périodes historiques, événements, civilisations et ressources éducatives.', ['histoire', 'civilisations', 'archives'], false],
      ['Géographie', 'fas fa-earth-africa', 'Territoires, cartes, environnement, populations et espaces.', ['géographie', 'cartes', 'territoires'], false],
      ['Philosophie', 'fas fa-scroll', 'Idées, auteurs, concepts, pensée critique et culture générale.', ['philosophie', 'idées', 'pensée'], false],
      ['Psychologie', 'fas fa-head-side-virus', 'Comportement, cognition, motivation, émotions et apprentissage.', ['psychologie', 'motivation', 'cognition'], false],
      ['Santé & Bien-être', 'fas fa-heart-pulse', 'Hygiène de vie, santé numérique, équilibre et prévention.', ['santé', 'bien-être', 'prévention'], false],
      ['Environnement', 'fas fa-leaf', 'Écologie, climat, numérique responsable et impact environnemental.', ['écologie', 'climat', 'durable'], false],
      ['Droit numérique', 'fas fa-gavel', 'Règles, licences, données, propriété intellectuelle et conformité.', ['droit', 'licence', 'rgpd'], false]
    ]
  },
  {
    name: 'Bibliothèque & formats',
    items: [
      ['Livres numériques', 'fas fa-book-open', 'Ebooks, formats numériques, lecture en ligne et ressources téléchargeables.', ['ebook', 'livre', 'lecture'], false],
      ['Guides pratiques', 'fas fa-map', 'Guides étape par étape, checklists et ressources directement applicables.', ['guide', 'checklist', 'pratique'], false],
      ['Tutoriels', 'fas fa-display', 'Tutoriels, pas-à-pas, exemples et apprentissage par la pratique.', ['tutoriel', 'pas à pas', 'exemple'], false],
      ['Livres blancs', 'fas fa-file-pdf', 'Documents de référence, analyses approfondies et ressources PDF.', ['livre blanc', 'pdf', 'rapport'], false],
      ['Ressources gratuites', 'fas fa-gift', 'Contenus gratuits, libre accès, fichiers et supports de formation.', ['gratuit', 'free', 'ressource'], false],
      ['Domaine public', 'fas fa-unlock', 'Œuvres libres de droits, classiques et contenus redistribuables légalement.', ['public domain', 'gutenberg', 'libre'], false],
      ['Creative Commons', 'fab fa-creative-commons', 'Œuvres sous licences Creative Commons et contenus partageables.', ['creative commons', 'cc-by', 'licence'], false],
      ['Documentation officielle', 'fas fa-circle-info', 'Docs officielles, références, guides éditeur et sources primaires.', ['docs', 'officiel', 'référence'], false]
    ]
  }
];

const slugOverrides = new Map([
  ['ui / ux design', 'ui-ux-design'],
  ['c# & .net', 'csharp-dotnet'],
  ['docker & conteneurs', 'docker-conteneurs'],
  ['pentest & ethical hacking', 'pentest-ethical-hacking'],
  ['sauvegarde & récupération', 'sauvegarde-recuperation'],
  ['no-code & low-code', 'no-code-low-code'],
  ['notion & organisation', 'notion-organisation'],
  ['réseaux & administration système', 'reseaux-administration-systeme'],
  ['réseaux sociaux', 'reseaux-sociaux'],
  ['écriture & rédaction', 'ecriture-redaction'],
  ['santé & bien-être', 'sante-bien-etre']
]);

export const FEATURED_CATEGORY_SLUGS = [
  'intelligence-artificielle',
  'developpement-web',
  'developpement-mobile',
  'cybersecurite',
  'ui-ux-design',
  'cloud-computing',
  'data-science',
  'marketing-digital',
  'outils-numeriques',
  'productivite'
];

function normalizeCategoryText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/&/g, ' et ')
    .replace(/[#.]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toCategorySlug(value) {
  const normalized = normalizeCategoryText(value);
  if (slugOverrides.has(normalized)) return slugOverrides.get(normalized);
  return normalized.replace(/\s+/g, '-');
}

export const CONTENT_CATEGORY_GROUPS = categoryGroups.map((group, groupIndex) => ({
  name: group.name,
  slug: toCategorySlug(group.name),
  order: groupIndex + 1
}));

export const CONTENT_CATEGORIES = categoryGroups.flatMap((group, groupIndex) =>
  group.items.map(([name, icon, description, keywords, isFeatured], itemIndex) => {
    const slug = toCategorySlug(name);
    const groupSlug = toCategorySlug(group.name);

    return {
      name,
      slug,
      icon,
      description,
      group: group.name,
      groupSlug,
      keywords,
      isFeatured: Boolean(isFeatured) || FEATURED_CATEGORY_SLUGS.includes(slug),
      isActive: true,
      contentTypes: ['article', 'ebook', 'guide', 'tutorial'],
      order: groupIndex * 100 + itemIndex + 1
    };
  })
);

export function getContentCategoryBySlug(slug) {
  return CONTENT_CATEGORIES.find((category) => category.slug === slug) || null;
}
