import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUTPUT_DIR = path.resolve(process.cwd(), 'public/assets/articles/generated');
const LOGO_PATH = path.resolve(process.cwd(), 'public/jchub_monogram.png');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textLines(lines, x, y, size = 28, fill = '#ffffff', weight = 700, gap = 1.22) {
  return lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : size * gap * index;
      return `<text x="${x}" y="${y + dy}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`;
    })
    .join('');
}

function card(x, y, w, h, fill = '#ffffff', opacity = 1, radius = 18) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" opacity="${opacity}"/>`;
}

function dataHero() {
  return `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#0f172a"/><stop offset=".52" stop-color="#2336a8"/><stop offset="1" stop-color="#00a68a"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="400" fill="url(#g)"/>
    <circle cx="1040" cy="70" r="170" fill="#22d3ee" opacity=".16"/>
    <circle cx="940" cy="330" r="230" fill="#34d399" opacity=".13"/>
    ${textLines(['Data & IA 2026', '5 competences pour trouver un emploi'], 72, 110, 48)}
    ${textLines(['SQL', 'Python', 'Power BI', 'Machine Learning', 'Business'], 76, 250, 24, '#dbeafe', 600)}
    ${card(710, 60, 330, 250, '#ffffff', .13, 28)}
    ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${740 + i * 48}" y1="90" x2="${740 + i * 48}" y2="280" stroke="#ffffff" opacity=".16"/>`).join('')}
    ${[0, 1, 2, 3].map((i) => `<line x1="740" y1="${110 + i * 48}" x2="990" y2="${110 + i * 48}" stroke="#ffffff" opacity=".16"/>`).join('')}
    <polyline points="744,238 792,190 840,210 888,138 936,156 984,94" fill="none" stroke="#5eead4" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="744,248 792,232 840,178 888,206 936,128 984,148" fill="none" stroke="#a5b4fc" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    ${card(860, 282, 210, 74, '#ffffff', .92, 16)}
    <text x="884" y="328" font-size="30" font-weight="800" fill="#111827">+65%</text>
    <text x="968" y="327" font-size="15" font-weight="700" fill="#475467">croissance</text>
  </svg>`;
}

function dataGrowth() {
  const bars = [92, 132, 164, 214, 292];
  return `<svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="500" fill="#f8fafc"/>
    ${textLines(['Croissance du marche Data & IA'], 52, 70, 34, '#111827')}
    <text x="52" y="104" font-size="18" fill="#667085">Evolution de la demande entre 2022 et 2026</text>
    ${card(52, 135, 696, 290, '#ffffff', 1, 20)}
    ${bars.map((h, i) => `<rect x="${110 + i * 118}" y="${380 - h}" width="58" height="${h}" rx="10" fill="${i === 4 ? '#10b981' : '#4f46e5'}"/><text x="${112 + i * 118}" y="408" font-size="16" font-weight="700" fill="#475467">${2022 + i}</text>`).join('')}
    <polyline points="139,288 257,248 375,216 493,166 611,88" fill="none" stroke="#06b6d4" stroke-width="7" stroke-linecap="round"/>
    ${card(540, 105, 150, 72, '#ecfdf5', 1, 16)}
    <text x="568" y="150" font-size="34" font-weight="900" fill="#059669">+65%</text>
  </svg>`;
}

function dataRoles() {
  const roles = [
    ['Data Analyst', '3-6 mois', '38-48 K'],
    ['Data Scientist', '12-18 mois', '55-70 K'],
    ['ML Engineer', '12-18 mois', '60-80 K'],
    ['AI Engineer', '6-12 mois', '55-75 K'],
    ['Data Engineer', '9-12 mois', '50-65 K']
  ];
  return `<svg width="900" height="500" viewBox="0 0 900 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="500" fill="#101828"/>
    ${textLines(['Quel metier Data choisir ?'], 54, 72, 36)}
    <text x="54" y="104" font-size="18" fill="#c7d2fe">Comparaison rapide pour debutants</text>
    ${roles.map((role, i) => {
      const y = 142 + i * 72;
      return `${card(54, y, 792, 54, i === 3 ? '#ecfeff' : '#ffffff', i === 3 ? 1 : .9, 16)}
        <text x="78" y="${y + 35}" font-size="22" font-weight="800" fill="#111827">${esc(role[0])}</text>
        <text x="470" y="${y + 35}" font-size="18" font-weight="700" fill="#475467">${esc(role[1])}</text>
        <text x="690" y="${y + 35}" font-size="18" font-weight="900" fill="#0f766e">${esc(role[2])}</text>`;
    }).join('')}
  </svg>`;
}

function dataDashboard() {
  return `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#eef2f7"/>
    ${card(40, 38, 720, 524, '#ffffff', 1, 24)}
    ${textLines(['Dashboard Data Analyst'], 74, 92, 32, '#111827')}
    ${['CA', 'Conversion', 'Clients'].map((label, i) => `${card(74 + i * 220, 126, 180, 86, ['#eef2ff', '#ecfdf5', '#fff7ed'][i], 1, 18)}<text x="${96 + i * 220}" y="162" font-size="16" fill="#475467">${label}</text><text x="${96 + i * 220}" y="194" font-size="30" font-weight="900" fill="#111827">${['128K', '7.8%', '12.4K'][i]}</text>`).join('')}
    ${card(74, 248, 420, 240, '#f8fafc', 1, 18)}
    <polyline points="104,420 156,358 208,380 260,304 312,328 364,274 436,292" fill="none" stroke="#4f46e5" stroke-width="8" stroke-linecap="round"/>
    <polyline points="104,438 156,398 208,410 260,372 312,356 364,384 436,332" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
    ${card(528, 248, 166, 240, '#f8fafc', 1, 18)}
    <circle cx="611" cy="368" r="70" fill="none" stroke="#e5e7eb" stroke-width="22"/>
    <circle cx="611" cy="368" r="70" fill="none" stroke="#4f46e5" stroke-width="22" stroke-dasharray="300 440" transform="rotate(-90 611 368)"/>
    <text x="584" y="376" font-size="28" font-weight="900" fill="#111827">68%</text>
  </svg>`;
}

function dataChecklist() {
  const items = ['SQL', 'Python + pandas', 'Power BI', '3 projets concrets', 'Portfolio + LinkedIn'];
  return `<svg width="700" height="500" viewBox="0 0 700 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="700" height="500" fill="#f7f5ff"/>
    ${textLines(['Checklist Data Analyst'], 52, 74, 34, '#111827')}
    ${items.map((item, i) => {
      const y = 128 + i * 66;
      return `${card(52, y, 596, 48, '#ffffff', 1, 14)}<circle cx="82" cy="${y + 24}" r="13" fill="#10b981"/><path d="M75 ${y + 24}l6 6 13-16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="112" y="${y + 32}" font-size="22" font-weight="800" fill="#111827">${esc(item)}</text>`;
    }).join('')}
  </svg>`;
}

function phpHero() {
  return `<svg width="1200" height="400" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="400" fill="#111827"/>
    <circle cx="1040" cy="80" r="180" fill="#7c3aed" opacity=".22"/>
    <circle cx="930" cy="330" r="230" fill="#0ea5e9" opacity=".18"/>
    ${textLines(['PHP dans HTML', 'Guide complet 2026'], 74, 118, 54)}
    <text x="76" y="270" font-size="24" font-weight="700" fill="#c7d2fe">&lt;?php echo "Bienvenue"; ?&gt;</text>
    ${card(690, 72, 398, 250, '#ffffff', .95, 26)}
    <text x="730" y="130" font-size="22" font-weight="900" fill="#111827">&lt;main&gt;</text>
    <text x="760" y="178" font-size="20" fill="#4f46e5">&lt;?= $titre ?&gt;</text>
    <text x="760" y="226" font-size="20" fill="#0f766e">include('footer.php')</text>
    <text x="730" y="278" font-size="22" font-weight="900" fill="#111827">&lt;/main&gt;</text>
  </svg>`;
}

function phpTags() {
  return `<svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="500" fill="#f8fafc"/>
    ${textLines(['Les balises PHP'], 54, 78, 38, '#111827')}
    ${card(70, 130, 660, 260, '#111827', 1, 22)}
    <text x="104" y="185" font-size="28" font-family="Consolas,monospace" fill="#93c5fd">&lt;?php</text>
    <text x="140" y="238" font-size="26" font-family="Consolas,monospace" fill="#ffffff">echo "Bonjour depuis PHP";</text>
    <text x="104" y="294" font-size="28" font-family="Consolas,monospace" fill="#93c5fd">?&gt;</text>
    <text x="104" y="350" font-size="24" font-family="Consolas,monospace" fill="#a7f3d0">&lt;h1&gt;&lt;?= $nom ?&gt;&lt;/h1&gt;</text>
  </svg>`;
}

function phpEcho() {
  return `<svg width="700" height="400" viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="700" height="400" fill="#fff7ed"/>
    ${textLines(['echo et print'], 44, 72, 34, '#111827')}
    ${card(44, 112, 608, 220, '#111827', 1, 20)}
    <text x="74" y="164" font-size="25" font-family="Consolas,monospace" fill="#fed7aa">echo</text>
    <text x="158" y="164" font-size="25" font-family="Consolas,monospace" fill="#fff">"Bienvenue !";</text>
    <text x="74" y="224" font-size="25" font-family="Consolas,monospace" fill="#fed7aa">print</text>
    <text x="158" y="224" font-size="25" font-family="Consolas,monospace" fill="#fff">"Score : 100";</text>
    <text x="74" y="284" font-size="25" font-family="Consolas,monospace" fill="#93c5fd">&lt;?= $nom ?&gt;</text>
  </svg>`;
}

function phpInclude() {
  return `<svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="500" fill="#eef2ff"/>
    ${textLines(['Architecture include()'], 54, 74, 36, '#111827')}
    ${['header.php', 'navbar.php', 'index.php', 'footer.php'].map((label, i) => {
      const x = i === 2 ? 300 : 80;
      const y = [140, 235, 190, 330][i];
      const color = i === 2 ? '#4f46e5' : '#ffffff';
      const fill = i === 2 ? '#ffffff' : '#111827';
      return `${card(x, y, 190, 62, color, 1, 16)}<text x="${x + 28}" y="${y + 39}" font-size="21" font-weight="900" fill="${fill}">${label}</text>`;
    }).join('')}
    <path d="M270 171h82M270 266h82M270 361h82" stroke="#4f46e5" stroke-width="5" stroke-linecap="round"/>
    <text x="540" y="222" font-size="24" font-weight="800" fill="#111827">Un seul fichier modifie</text>
    <text x="540" y="260" font-size="22" fill="#475467">toutes les pages suivent</text>
  </svg>`;
}

function phpProfile() {
  return `<svg width="900" height="600" viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="600" fill="#f8fafc"/>
    ${card(70, 58, 760, 484, '#ffffff', 1, 28)}
    ${textLines(['Page profil dynamique'], 110, 112, 36, '#111827')}
    <circle cx="176" cy="220" r="58" fill="#4f46e5"/>
    <text x="146" y="234" font-size="42" font-weight="900" fill="#fff">JS</text>
    <text x="260" y="198" font-size="30" font-weight="900" fill="#111827">&lt;?= $utilisateur['nom'] ?&gt;</text>
    <text x="260" y="240" font-size="22" fill="#475467">Role : Admin</text>
    ${['email', 'ville', 'inscrit depuis'].map((label, i) => {
      const y = 320 + i * 58;
      return `${card(110, y, 680, 42, '#f1f5f9', 1, 12)}<text x="132" y="${348 + i * 58}" font-size="18" font-weight="800" fill="#475467">${label}</text><text x="430" y="${348 + i * 58}" font-size="18" fill="#111827">&lt;?= $${label.replaceAll(' ', '_')} ?&gt;</text>`;
    }).join('')}
  </svg>`;
}

const jobs = [
  ['data-ia-hero.png', dataHero()],
  ['data-ia-growth.png', dataGrowth()],
  ['data-ia-roles.png', dataRoles()],
  ['data-ia-dashboard.png', dataDashboard()],
  ['data-ia-checklist.png', dataChecklist()],
  ['php-html-hero.png', phpHero()],
  ['php-tags.png', phpTags()],
  ['php-echo.png', phpEcho()],
  ['php-include-architecture.png', phpInclude()],
  ['php-profile.png', phpProfile()]
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function buildLogoOverlay() {
  if (!fs.existsSync(LOGO_PATH)) return null;

  const logo = await sharp(LOGO_PATH)
    .resize({ width: 58, height: 58, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const badgeSvg = `<svg width="190" height="78" viewBox="0 0 190 78" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="190" height="78" rx="20" fill="#ffffff" opacity=".92"/>
    <text x="76" y="35" font-size="20" font-weight="900" font-family="Arial, sans-serif" fill="#111827">JC Hub</text>
    <text x="76" y="55" font-size="12" font-weight="700" font-family="Arial, sans-serif" fill="#667085">Article officiel</text>
  </svg>`;

  const badge = await sharp(Buffer.from(badgeSvg))
    .composite([{ input: logo, left: 16, top: 10 }])
    .png()
    .toBuffer();

  return badge;
}

const logoOverlay = await buildLogoOverlay();

await Promise.all(
  jobs.map(async ([filename, svg]) => {
    const outputPath = path.join(OUTPUT_DIR, filename);
    const webpPath = outputPath.replace(/\.png$/i, '.webp');
    const base = sharp(Buffer.from(svg));
    const metadata = await base.metadata();
    const left = Math.max(18, (metadata.width || 1200) - 214);
    const top = Math.max(18, (metadata.height || 400) - 100);

    const withLogo = logoOverlay
      ? base.clone().composite([{ input: logoOverlay, left, top }])
      : base.clone();

    await withLogo.png({ quality: 92 }).toFile(outputPath);
    await sharp(outputPath).webp({ quality: 82 }).toFile(webpPath);
  })
);

console.log(`Generated ${jobs.length} article images in ${OUTPUT_DIR}`);
