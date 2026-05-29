/**
 * Hook pour automatiser la génération du sitemap et la synchronisation de la base de données
 * 
 * Cette fonction peut être appelée après chaque création/modification d'article dans Firestore
 * Pour l'utiliser, intégrez cette logique dans votre workflow de création d'articles
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Déclenche la génération du sitemap et la synchronisation de la base de données
 * Utile après la création/modification d'articles
 */
export async function triggerContentSync() {
  console.log('🔄 Déclenchement de la synchronisation du contenu...');
  
  try {
    // Synchroniser la base de données
    console.log('📦 Synchronisation de database.json...');
    await execAsync('npm run sync:database');
    
    // Générer le sitemap
    console.log('🗺️  Génération du sitemap...');
    await execAsync('npm run generate:sitemap');
    
    console.log('✅ Synchronisation complète terminée avec succès!');
    return { success: true, message: 'Content synced successfully' };
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Option légère : met à jour uniquement le sitemap
 */
export async function triggerSitemapUpdate() {
  console.log('🗺️  Mise à jour du sitemap...');
  
  try {
    await execAsync('npm run generate:sitemap');
    console.log('✅ Sitemap mis à jour avec succès!');
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du sitemap:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Appellez cette fonction dans votre composant/page de création d'articles
 * 
 * Exemple d'utilisation en React :
 * 
 * async function handlePublishArticle(article) {
 *   // Sauvegarder l'article dans Firestore
 *   await saveArticleToFirestore(article);
 *   
 *   // Mettre à jour le sitemap et la base de données
 *   const result = await triggerContentSync();
 *   
 *   if (result.success) {
 *     console.log('✅ Article publié et contenus mis à jour!');
 *   } else {
 *     console.error('⚠️  Article publié mais erreur de synchronisation:', result.error);
 *   }
 * }
 */

export default {
  triggerContentSync,
  triggerSitemapUpdate
};
