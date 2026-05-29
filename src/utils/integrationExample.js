/**
 * Exemple d'intégration de la synchronisation automatique dans la page de création d'articles
 * 
 * Copiez ce code dans votre page CreateBlog.jsx ou adaptez-le selon vos besoins
 */

import { useCallback } from 'react';
import { triggerContentSync } from '../utils/syncContentHook';

/**
 * Hook personnalisé pour gérer la synchronisation du contenu après publication
 */
export function useContentSync() {
  const syncContent = useCallback(async () => {
    try {
      console.log('🔄 Synchronisation du contenu en cours...');
      const response = await fetch('/api/sync-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Erreur de synchronisation');
      }
      
      const result = await response.json();
      console.log('✅ Contenu synchronisé:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return { syncContent };
}

/**
 * Exemple de fonction à appeler lors de la publication d'un article
 */
export async function handlePublishArticle(articleData) {
  try {
    // 1. Sauvegarder l'article dans Firestore
    // const docRef = await addDoc(collection(db, 'blogs'), {
    //   ...articleData,
    //   status: 'published',
    //   created_at: new Date(),
    //   updated_at: new Date(),
    // });
    
    console.log('📝 Article en cours de publication...');
    
    // 2. Déclencher la synchronisation (côté serveur)
    // Note: Cette partie s'exécute dans un service worker ou un endpoint backend
    console.log('🔄 Synchronisation des contenus...');
    
    // Option 1 : Appel direct (si dans un Node.js script)
    // import { triggerContentSync } from '../utils/syncContentHook';
    // await triggerContentSync();
    
    // Option 2 : Via un endpoint backend (recommandé pour production)
    const syncResponse = await fetch('/api/sync-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (syncResponse.ok) {
      console.log('✅ Article publié et contenus mis à jour!');
      return { success: true, message: 'Article publié avec succès' };
    } else {
      console.warn('⚠️  Article publié mais erreur de synchronisation');
      return { success: true, warning: 'Article publié mais synchronisation échouée' };
    }
  } catch (error) {
    console.error('❌ Erreur lors de la publication:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exemple d'utilisation dans un composant React
 * 
 * function CreateBlogComponent() {
 *   const [isPublishing, setIsPublishing] = useState(false);
 *   const { syncContent } = useContentSync();
 *   
 *   async function handlePublish(formData) {
 *     setIsPublishing(true);
 *     try {
 *       // Sauvegarder dans Firestore
 *       // await saveToFirestore(formData);
 *       
 *       // Synchroniser les contenus
 *       await syncContent();
 *       
 *       // Notification de succès
 *       // showNotification('Article publié et sitemap mis à jour!');
 *     } finally {
 *       setIsPublishing(false);
 *     }
 *   }
 *   
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       handlePublish(new FormData(e.target));
 *     }}>
 *       // ... votre formulaire ...
 *       <button type="submit" disabled={isPublishing}>
 *         {isPublishing ? 'Publication...' : 'Publier l\'article'}
 *       </button>
 *     </form>
 *   );
 * }
 */

export default {
  handlePublishArticle,
  useContentSync
};
