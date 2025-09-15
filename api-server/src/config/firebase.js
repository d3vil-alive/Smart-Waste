const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
let serviceAccount;

try {
  if (process.env.FIREBASE_PRIVATE_KEY) {
    // Use environment variables (production)
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  } else {
    // Use service account file (development)
    serviceAccount = require('../../config/serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });

  logger.info('🔥 Firebase Admin SDK initialized successfully');
} catch (error) {
  logger.error('❌ Firebase initialization error:', error);
  process.exit(1);
}

// Firestore database instance
const db = admin.firestore();

// Firebase Auth instance
const auth = admin.auth();

// Firebase Storage instance
const storage = admin.storage();

// Realtime Database instance
const realtimeDb = admin.database();

module.exports = {
  admin,
  db,
  auth,
  storage,
  realtimeDb
};