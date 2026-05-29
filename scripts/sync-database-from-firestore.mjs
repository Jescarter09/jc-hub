import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Firebase imports
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex < 1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Load env files
loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));

// Initialize Firebase Admin
let db;
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
  
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    console.log('⚠️  Firebase service account not configured.');
  }
  
  db = getFirestore();
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

// Configuration
const COLLECTION = 'blogs';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'database.json');
const BACKUP_PATH = path.join(__dirname, '..', 'src', 'data', `database.backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

// Ensure src/data directory exists
const dataDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Sync database.json from Firestore
 */
async function syncDatabaseFromFirestore() {
  console.log('🔄 Syncing database.json from Firestore...');
  
  try {
    // Create backup of existing database.json if it exists
    if (fs.existsSync(OUTPUT_PATH)) {
      console.log('💾 Creating backup...');
      fs.copyFileSync(OUTPUT_PATH, BACKUP_PATH);
      console.log(`✅ Backup created: ${BACKUP_PATH}`);
    }

    // Fetch all posts from Firestore
    const snapshot = await db.collection(COLLECTION).get();
    
    if (snapshot.empty) {
      console.log('⚠️  No posts found in Firestore');
      return;
    }

    console.log(`✅ Fetched ${snapshot.size} posts from Firestore`);

    // Build the database structure
    const database = {
      blog: {
        posts: {},
        metadata: {
          total: snapshot.size,
          lastUpdated: new Date().toISOString(),
          source: 'firestore'
        }
      }
    };

    // Process each document
    snapshot.forEach(doc => {
      const data = doc.data();
      const docId = doc.id;
      
      // Ensure we have all required fields
      database.blog.posts[docId] = {
        ...data,
        id: docId,
        // Ensure timestamps are properly formatted
        created_at: data.created_at instanceof Object ? data.created_at.toDate().toISOString() : data.created_at,
        updated_at: data.updated_at instanceof Object ? data.updated_at.toDate().toISOString() : data.updated_at,
      };
    });

    // Write to file with formatting
    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(database, null, 2),
      'utf8'
    );

    console.log(`✅ Database synced successfully: ${OUTPUT_PATH}`);
    console.log(`📊 Total posts: ${snapshot.size}`);
    
    // Print some stats
    const statuses = {};
    const categories = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      statuses[data.status] = (statuses[data.status] || 0) + 1;
      if (data.category) {
        categories[data.category] = (categories[data.category] || 0) + 1;
      }
    });

    console.log('\n📈 Stats:');
    console.log('  By Status:', statuses);
    console.log('  By Category:', categories);
    
  } catch (error) {
    console.error('❌ Error syncing database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the function
syncDatabaseFromFirestore().catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
