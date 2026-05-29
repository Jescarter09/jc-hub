const CATEGORY_KEYWORDS = [
  {
    category: 'Maintenance Ordinateur',
    keywords: ['maintenance', 'ordinateur', 'pc', 'windows', 'virus', 'panne', 'materiel', 'nettoyage', 'reparation']
  },
  {
    category: 'Developpement Web',
    keywords: ['html', 'css', 'javascript', 'react', 'vue', 'node', 'api', 'frontend', 'backend', 'web']
  },
  {
    category: 'Bureautique',
    keywords: ['excel', 'word', 'powerpoint', 'office', 'outlook', 'tableur', 'bureautique', 'productivite']
  },
  {
    category: 'Tutoriels',
    keywords: ['tutoriel', 'guide', 'comment', 'etapes', 'pas a pas', 'astuce', 'formation']
  },
  {
    category: 'Intelligence Artificielle',
    keywords: ['ia', 'ai', 'chatgpt', 'llm', 'machine learning', 'automatisation', 'genai']
  },
  {
    category: 'Informations Globales',
    keywords: ['monde', 'global', 'geopolitique', 'societe', 'economie', 'international']
  }
];

const CATEGORY_BLUEPRINTS = {
  Technologie: {
    introFocus: 'les evolutions du secteur et leurs impacts concrets',
    keyPoints: [
      'Contexte du sujet et pourquoi il devient important maintenant',
      'Ce qui change pour les entreprises, les equipes et les utilisateurs',
      'Opportunites a court terme et limites a surveiller'
    ],
    actionPlan: [
      "Identifier les cas d'usage prioritaires dans ton contexte",
      'Tester rapidement avec un pilote mesurable',
      'Documenter les resultats puis industrialiser ce qui marche'
    ],
    pitfalls: ['Suivre la tendance sans objectif clair', 'Ignorer la securite et la gouvernance', 'Ne pas former les equipes'],
    tools: ['Veille hebdomadaire', 'Benchmark des solutions', 'Tableau de suivi des KPI'],
    tags: ['Technologie', 'Innovation', 'Veille']
  },
  'Informations Globales': {
    introFocus: 'les tendances globales qui influencent la tech et le quotidien',
    keyPoints: [
      'Lecture du contexte international autour du sujet',
      'Impacts possibles sur les entreprises et les particuliers',
      'Signaux faibles a surveiller dans les prochains mois'
    ],
    actionPlan: [
      'Comparer plusieurs sources fiables',
      'Relier la tendance globale a ton domaine local',
      'Construire des scenarios optimiste, neutre et prudent'
    ],
    pitfalls: ['Se baser sur une seule source', 'Confondre opinion et donnee factuelle', "Ignorer l'effet long terme"],
    tools: ['Tableau de veille', 'Synthese mensuelle', 'Notes comparatives'],
    tags: ['Global', 'Societe', 'Analyse']
  },
  Tutoriels: {
    introFocus: 'un apprentissage rapide avec des etapes claires',
    keyPoints: [
      'Objectif du tutoriel et prerequis minimaux',
      'Workflow complet avec bonnes pratiques',
      'Resultat attendu et methode de verification'
    ],
    actionPlan: ['Preparer l environnement de travail', 'Executer chaque etape dans l ordre', 'Valider le resultat et noter les ajustements'],
    pitfalls: ['Bruler les etapes de base', 'Ne pas tester apres chaque changement', 'Oublier de documenter les commandes'],
    tools: ['Check-list de demarrage', 'Template de notes', 'Mini plan de validation'],
    tags: ['Tutoriel', 'Guide', 'PasAPas']
  },
  'Maintenance Ordinateur': {
    introFocus: 'la prevention des pannes et la performance durable de la machine',
    keyPoints: [
      'Signes qui montrent que la maintenance est necessaire',
      'Actions logicielles et materielle a prioriser',
      'Frequence recommandee pour garder un PC stable'
    ],
    actionPlan: ['Nettoyer les fichiers inutiles et surveiller le stockage', 'Mettre a jour systeme et pilotes', 'Verifier temperature, ventilation et securite'],
    pitfalls: ['Installer des outils douteux', 'Ne pas sauvegarder avant intervention', 'Reporter les mises a jour critiques'],
    tools: ['Plan mensuel de maintenance', 'Antivirus fiable', 'Routine de sauvegarde'],
    tags: ['Maintenance', 'Ordinateur', 'Depannage']
  },
  'Developpement Web': {
    introFocus: 'la creation de projets web fiables, rapides et maintenables',
    keyPoints: [
      'Architecture et choix techniques adaptes au besoin',
      'Qualite du code, performance et accessibilite',
      'Deploiement et maintenance continue'
    ],
    actionPlan: ['Definir une structure de projet claire', 'Developper par iterations avec tests', 'Mesurer performance et corriger les points faibles'],
    pitfalls: ['Empiler trop de librairies', 'Negliger la securite cote serveur', 'Publier sans verification mobile'],
    tools: ['Linter + formatter', 'Checklist accessibilite', 'Suivi des performances'],
    tags: ['WebDev', 'Frontend', 'Backend']
  },
  Bureautique: {
    introFocus: 'les methodes pour gagner du temps et fiabiliser les taches quotidiennes',
    keyPoints: [
      'Fonctionnalites utiles a connaitre en priorite',
      'Automatisations simples qui evitent les erreurs',
      'Bonnes pratiques de collaboration de documents'
    ],
    actionPlan: ['Standardiser les modeles de documents', 'Automatiser les operations recurrentes', 'Former les utilisateurs sur les raccourcis utiles'],
    pitfalls: ['Travailler sans structure de fichier', 'Dupliquer les versions sans suivi', 'Ignorer la protection des donnees'],
    tools: ['Modeles Office', 'Raccourcis clavier', 'Tableau de procedures'],
    tags: ['Bureautique', 'Productivite', 'Office']
  },
  'Intelligence Artificielle': {
    introFocus: "les usages de l'IA qui creent une valeur mesurable",
    keyPoints: [
      "Cas d'usage a fort impact dans un contexte reel",
      "Risques a encadrer des la phase d'experimentation",
      'Indicateurs pour evaluer la pertinence du systeme'
    ],
    actionPlan: ['Demarrer avec un cas simple', 'Ajouter des garde-fous sur la qualite', "Mesurer le gain de temps et l'impact utilisateur"],
    pitfalls: ['Faire confiance aveuglement aux sorties', 'Oublier la confidentialite des donnees', 'Ne pas prevoir une revue humaine'],
    tools: ['Bibliotheque de prompts', 'Journal des tests', 'Regles de gouvernance'],
    tags: ['IA', 'Automatisation', 'Innovation']
  }
};

const CATEGORY_CODE_SNIPPETS = {
  Technologie: [
    {
      title: 'Mini script de veille des tendances',
      language: 'js',
      context: 'Exemple simple pour centraliser des sujets de veille a suivre chaque semaine.',
      code: `const topics = ["ia", "cloud", "cybersecurite"];
const sources = ["rss-tech", "newsletter", "github-trending"];

for (const topic of topics) {
  console.log("Analyser:", topic);
  for (const source of sources) {
    console.log(" - source:", source);
  }
}`
    }
  ],
  'Informations Globales': [
    {
      title: 'Template de synthese comparative',
      language: 'md',
      context: 'Tu peux remplir ce tableau pour comparer rapidement plusieurs sources.',
      code: `| Source | Position | Risque | Opportunite |
|---|---|---|---|
| Rapport A | Croissance forte | Inflation | Investissement public |
| Rapport B | Stabilite | Reglementation | Nouveaux marches |`
    }
  ],
  Tutoriels: [
    {
      title: 'Structure de tutoriel reproductible',
      language: 'bash',
      context: 'Squelette de commandes a adapter pour tes guides pas a pas.',
      code: `# 1) Installer les dependances
npm install

# 2) Lancer le projet
npm run dev

# 3) Tester et valider
npm run build`
    }
  ],
  'Maintenance Ordinateur': [
    {
      title: 'Diagnostic rapide Windows (PowerShell)',
      language: 'powershell',
      context: 'Bloc utile pour verifier espace disque et services critiques.',
      code: `Get-PSDrive -PSProvider FileSystem
Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object -First 10
Get-ComputerInfo | Select-Object WindowsVersion, OsHardwareAbstractionLayer`
    }
  ],
  'Developpement Web': [
    {
      title: 'Composant React lisible',
      language: 'jsx',
      context: 'Exemple de section article avec titre, paragraphe et call-to-action.',
      code: `export default function ArticleHero({ title, excerpt }) {
  return (
    <section className="rounded-2xl border p-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-gray-600">{excerpt}</p>
      <button className="mt-5 rounded-lg bg-black px-4 py-2 text-white">
        Lire la suite
      </button>
    </section>
  );
}`
    },
    {
      title: 'Route API minimale',
      language: 'js',
      context: 'Point de depart pour exposer un endpoint de contenu.',
      code: `export async function getArticleBySlug(req, res) {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ error: "slug requis" });
  }

  const article = await db.articles.findOne({ slug });
  if (!article) return res.status(404).json({ error: "introuvable" });

  return res.status(200).json(article);
}`
    }
  ],
  Bureautique: [
    {
      title: 'Formules Excel utiles',
      language: 'excel',
      context: 'Bloc de formules pour synthese et reporting rapide.',
      code: `=SOMME(B2:B100)
=MOYENNE(C2:C100)
=SI(D2>1000;"Objectif atteint";"A renforcer")
=RECHERCHEX(A2;TableauClients[ID];TableauClients[Nom])`
    }
  ],
  'Intelligence Artificielle': [
    {
      title: 'Prompt template de base',
      language: 'txt',
      context: 'Template simple pour obtenir une reponse structuree et actionnable.',
      code: `Role: Expert technique.
Objectif: expliquer [SUJET] pour un niveau [DEBUTANT/INTERMEDIAIRE].
Contraintes: 3 exemples concrets, 1 plan d'action, ton clair.
Format: titres + points cles + conclusion courte.`
    },
    {
      title: 'Appel API type (pseudo code JS)',
      language: 'js',
      context: "Exemple d'appel cote serveur pour generer une premiere version d'article.",
      code: `const response = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title, category })
});

const draft = await response.json();
console.log(draft.content);`
    }
  ]
};

const DEFAULT_CATEGORY = 'Technologie';

const CATEGORY_ALIASES = {
  'Développement Web': 'Developpement Web',
  'Developpement Web': 'Developpement Web'
};

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toTitleCase(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function resolveCategory(preferredCategory) {
  if (!preferredCategory) {
    return null;
  }
  return CATEGORY_ALIASES[preferredCategory] || preferredCategory;
}

function buildSection(heading, body) {
  if (!body || !String(body).trim()) {
    return '';
  }
  return `## ${heading}\n\n${String(body).trim()}`;
}

function buildNumberedSteps(actionPlan) {
  return actionPlan
    .map((step, index) => `### Etape ${index + 1}\n\n${step}.`)
    .join('\n\n');
}

function buildCodeSection(category) {
  const snippets = CATEGORY_CODE_SNIPPETS[category] || CATEGORY_CODE_SNIPPETS[DEFAULT_CATEGORY] || [];
  if (!snippets.length) {
    return '';
  }

  const blocks = snippets
    .map((snippet, index) => {
      const header = `### Partie code ${index + 1}: ${snippet.title}`;
      const codeFence = `\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``;
      return `${header}\n\n${snippet.context}\n\n${codeFence}`;
    })
    .join('\n\n');

  return buildSection('Parties de code', blocks);
}

export function inferCategoryFromTitle(title) {
  const cleaned = normalize(title);
  if (!cleaned) {
    return DEFAULT_CATEGORY;
  }

  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((keyword) => cleaned.includes(keyword))) {
      return rule.category;
    }
  }

  return DEFAULT_CATEGORY;
}

function buildDescription(title, category) {
  return `${title}: un guide clair avec paragraphes, sous-titres et exemples concrets en ${category.toLowerCase()}.`;
}

function buildContent(title, category, profile) {
  const cleanedTitle = toTitleCase(title);
  const intro = [
    `${cleanedTitle} est un sujet important parce qu'il touche directement ${profile.introFocus}.`,
    `Dans cet article, on avance etape par etape avec des points cles, un plan d'action concret et une partie code quand utile.`
  ].join('\n\n');

  const objectives = profile.keyPoints.map((item) => `- ${item}`).join('\n');
  const steps = buildNumberedSteps(profile.actionPlan);
  const pitfalls = profile.pitfalls.map((item) => `- ${item}`).join('\n');
  const tools = profile.tools.map((item) => `- ${item}`).join('\n');
  const codeSection = buildCodeSection(category);

  const sections = [
    buildSection('Introduction', intro),
    buildSection("Objectifs de l'article", objectives),
    buildSection('Plan pas a pas', steps),
    codeSection,
    buildSection('Erreurs frequentes a eviter', pitfalls),
    buildSection('Outils et ressources utiles', tools),
    buildSection(
      'Conclusion',
      `L'objectif avec ${cleanedTitle} est simple: avancer avec une methode fiable, des tests rapides et une execution reguliere.`
    )
  ].filter(Boolean);

  return `${sections.join('\n\n')}\n`;
}

function normalizeResearchItems(research) {
  const items = Array.isArray(research?.items) ? research.items : [];
  return items
    .map((item, index) => {
      const title = String(item?.title || '').trim();
      const snippet = String(item?.snippet || '').replace(/\s+/g, ' ').trim();
      const link = String(item?.link || '').trim();
      const source = String(item?.source || '').trim();

      if (!title || !snippet || !link) {
        return null;
      }

      return {
        id: index + 1,
        title,
        snippet,
        link,
        source
      };
    })
    .filter(Boolean);
}

function buildResearchSummary(items) {
  if (!items.length) {
    return '';
  }

  return items
    .map((item) => {
      const sourceLabel = item.source ? ` (${item.source})` : '';
      return `### Source ${item.id}: ${item.title}${sourceLabel}\n\n${item.snippet}`;
    })
    .join('\n\n');
}

function buildReferences(items) {
  if (!items.length) {
    return '';
  }

  return items
    .map((item) => {
      const sourceLabel = item.source ? ` - ${item.source}` : '';
      return `- [${item.title}](${item.link})${sourceLabel}`;
    })
    .join('\n');
}

function buildDescriptionFromResearch(title, category, items) {
  if (!items.length) {
    return buildDescription(title, category);
  }

  return `${title}: synthese basee sur des resultats web recents, avec paragraphes clairs, sous-titres et parties code en ${category.toLowerCase()}.`;
}

function buildTags(profile, title) {
  const titleWords = normalize(title)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4)
    .slice(0, 2)
    .map((word) => toTitleCase(word));

  const merged = [...profile.tags, ...titleWords];
  return Array.from(new Set(merged));
}

export function generateArticleDraftFromTitle(title, preferredCategory) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return null;
  }

  const resolvedPreferred = resolveCategory(preferredCategory);
  const category = resolvedPreferred || inferCategoryFromTitle(cleanTitle);
  const profile = CATEGORY_BLUEPRINTS[category] || CATEGORY_BLUEPRINTS[DEFAULT_CATEGORY];

  return {
    category,
    description: buildDescription(cleanTitle, category),
    content: buildContent(cleanTitle, category, profile),
    tags: buildTags(profile, cleanTitle)
  };
}

export function generateArticleDraftFromResearch(title, research, preferredCategory) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return null;
  }

  const resolvedPreferred = resolveCategory(preferredCategory);
  const category = resolvedPreferred || inferCategoryFromTitle(cleanTitle);
  const profile = CATEGORY_BLUEPRINTS[category] || CATEGORY_BLUEPRINTS[DEFAULT_CATEGORY];
  const researchItems = normalizeResearchItems(research);

  if (!researchItems.length) {
    return generateArticleDraftFromTitle(cleanTitle, preferredCategory);
  }

  const cleanedTitle = toTitleCase(cleanTitle);
  const intro = [
    `${cleanedTitle} est traite ici a partir d'une recherche web ciblee.`,
    `Ce brouillon compile les informations importantes, puis propose un plan concret pour passer a l'action.`
  ].join('\n\n');

  const objectives = profile.keyPoints.map((item) => `- ${item}`).join('\n');
  const researchSection = buildResearchSummary(researchItems);
  const steps = buildNumberedSteps(profile.actionPlan);
  const pitfalls = profile.pitfalls.map((item) => `- ${item}`).join('\n');
  const tools = profile.tools.map((item) => `- ${item}`).join('\n');
  const codeSection = buildCodeSection(category);
  const references = buildReferences(researchItems);

  const sections = [
    buildSection('Introduction', intro),
    buildSection("Objectifs de l'article", objectives),
    buildSection('Synthese des informations web', researchSection),
    buildSection('Plan pas a pas', steps),
    codeSection,
    buildSection('Erreurs frequentes a eviter', pitfalls),
    buildSection('Outils et ressources utiles', tools),
    buildSection('References', references),
    buildSection(
      'Conclusion',
      `L'objectif avec ${cleanedTitle} est de transformer la veille en execution concrete, avec une approche claire et repetitive.`
    )
  ].filter(Boolean);

  return {
    category,
    description: buildDescriptionFromResearch(cleanTitle, category, researchItems),
    content: `${sections.join('\n\n')}\n`,
    tags: buildTags(profile, cleanTitle),
    sources: researchItems
  };
}

export const articleCategories = [
  'Technologie',
  'Intelligence Artificielle',
  'Informations Globales',
  'Tutoriels',
  'Maintenance Ordinateur',
  'Developpement Web',
  'Bureautique',
  'Mobile',
  'DevOps',
  'Autre'
];
