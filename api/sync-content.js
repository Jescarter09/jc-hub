/**
 * Endpoint API pour synchroniser le contenu depuis Firestore
 * 
 * Options de déploiement :
 * 1. Vercel Serverless Function
 * 2. Firebase Cloud Function
 * 3. Backend Node.js classique
 * 
 * Ce fichier est un exemple pour utiliser avec Vercel.
 * Placez ce fichier dans : api/sync-content.js
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * POST /api/sync-content
 * 
 * Déclenche la synchronisation du sitemap et de la base de données
 * Nécessite une authentification pour la sécurité
 */
export default async function handler(req, res) {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier le token d'authentification (obligatoire en production)
  const authToken = req.headers.authorization?.split(' ')[1];
  const expectedToken = String(process.env.SYNC_API_TOKEN || '').trim();

  if (!expectedToken) {
    return res.status(500).json({ error: 'SYNC_API_TOKEN is not configured' });
  }

  if (authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Début de la synchronisation...');

    // Exécuter les commandes de synchronisation
    const startTime = Date.now();

    // Synchroniser la base de données
    console.log('📦 Synchronisation de database.json...');
    const { stdout: dbOutput } = await execAsync('npm run sync:database', {
      cwd: process.cwd(),
      timeout: 60000, // 60 secondes timeout
    });

    // Générer le sitemap
    console.log('🗺️  Génération du sitemap...');
    const { stdout: sitemapOutput } = await execAsync('npm run generate:sitemap', {
      cwd: process.cwd(),
      timeout: 60000, // 60 secondes timeout
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Synchronisation terminée');

    return res.status(200).json({
      success: true,
      message: 'Content synced successfully',
      duration: `${duration}s`,
      database: {
        status: 'synced',
        output: dbOutput,
      },
      sitemap: {
        status: 'generated',
        output: sitemapOutput,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erreur de synchronisation:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to sync content',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Configuration pour utiliser dans votre app React
 * 
 * const syncContent = async () => {
 *   try {
 *     const response = await fetch('/api/sync-content', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Authorization': `Bearer ${process.env.REACT_APP_SYNC_TOKEN}`,
 *       },
 *     });
 *     
 *     const data = await response.json();
 *     
 *     if (data.success) {
 *       console.log('✅ Content synced!');
 *       console.log(`Database: ${data.database.status}`);
 *       console.log(`Sitemap: ${data.sitemap.status}`);
 *       console.log(`Durée: ${data.duration}`);
 *     } else {
 *       console.error('❌ Error:', data.error);
 *     }
 *   } catch (error) {
 *     console.error('Network error:', error);
 *   }
 * };
 */

/**
 * Variables d'environnement à configurer
 * 
 * SYNC_API_TOKEN=votre-token-secret
 * FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./firebase-service-account.json
 * VITE_SITE_URL=https://votresite.com
 */
