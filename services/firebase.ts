import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'; 
import { AppData, BackupEntry } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || undefined);
export const auth = getAuth(app);

const DOC_PATH = 'portal/data';

let isOffline = false;

// 2. Auth state tracking
let resolveAuth: (value: any) => void;
let authPromise = new Promise((resolve) => {
  resolveAuth = resolve;
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Firebase Authenticated as:", user.uid);
    resolveAuth(user);
    isOffline = false;
  } else {
    // Attempt sign in if not logged in
    signInAnonymously(auth).catch((error) => {
      console.error("Anonymous Auth Failed:", error);
      isOffline = true;
      // We don't resolve here because we want sequential attempts or manual intervention
    });
  }
});

export const ensureAuth = () => authPromise;

async function testConnection() {
  try {
    // Try to reach the database
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection verified.");
  } catch (error) {
    if(error instanceof Error) {
      console.warn("Firebase status check:", error.message);
      if (error.message.includes('offline') || error.message.includes('permission-denied')) {
        // Permission denied on test/connection is OK if rules are strict, 
        // but offline is a real problem.
      }
    }
  }
}
testConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. Real-time Subscription logic needed by App.tsx
export const subscribeToData = (
  onData: (data: AppData) => void,
  onError: (error: any) => void
) => {
  let unsubscribe = () => {};

  ensureAuth().then(() => {
    const metaRef = doc(db, 'portal', 'data_meta');
    
    unsubscribe = onSnapshot(metaRef, async (docSnap) => {
      if (docSnap.exists()) {
        const meta = docSnap.data();
        const numChunks = meta.chunks || 1;
        
        try {
          let fullJson = '';
          for (let i = 0; i < numChunks; i++) {
            const chunkSnap = await getDoc(doc(db, 'portal', `data_chunk_${i}`));
            if (chunkSnap.exists()) {
              fullJson += chunkSnap.data().data;
            }
          }
          const data = JSON.parse(fullJson) as AppData;
          onData({
            ...data,
            students: data.students || [],
            attendance: data.attendance || {},
            systemLocked: data.systemLocked || false
          });
        } catch (err) {
          console.error("Error reading chunks:", err);
          onError(err);
        }
      } else {
        // Fallback to legacy single document
        try {
          const legacySnap = await getDoc(doc(db, DOC_PATH));
          if (legacySnap.exists()) {
            const data = legacySnap.data() as AppData;
            onData({
              ...data,
              students: data.students || [],
              attendance: data.attendance || {},
              systemLocked: data.systemLocked || false
            });
            // Migrate legacy payload to chunks
            console.log("Migrating legacy data to chunked format...");
            saveData(data).catch(console.error);
          } else {
            // Initialize fresh payload
            const initialData: AppData = { students: [], attendance: {}, systemLocked: false, settings: { fontSize: 12, fontFamily: "'Inter', sans-serif" } };
            saveData(initialData).catch(err => handleFirestoreError(err, OperationType.WRITE, 'portal'));
            // Call onData with initial state proactively
            onData(initialData);
          }
        } catch (err) {
          console.error("Error checking legacy data:", err);
          onError(err);
        }
      }
    }, (error) => {
      isOffline = true;
      onError(error);
    });
  }).catch(err => {
    console.error("Auth failed during subscribe:", err);
    onError(err);
  });

  return () => {
    unsubscribe();
  };
};

export const saveData = async (data: AppData) => {
  await ensureAuth();

  const json = JSON.stringify(data);
  const CHUNK_SIZE = 900000; // 900KB chunks
  const chunks = [];
  
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.substring(i, i + CHUNK_SIZE));
  }

  try {
    // Save chunks first
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(doc(db, 'portal', `data_chunk_${i}`), { data: chunks[i] });
    }
    // Update meta to trigger subscribers
    await setDoc(doc(db, 'portal', 'data_meta'), { 
      chunks: chunks.length,
      updatedAt: new Date().getTime() // Force trigger across clients
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'portal');
  }
};

export const createCloudBackup = async (data: AppData, type: 'Auto' | 'Manual' = 'Manual') => {
  console.log(`Local backup created (${type})`);
  const historyKey = 'dps_backups_local';
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  history.unshift({
    timestamp: new Date().toISOString(),
    data: data,
    type: type,
    id: Math.random().toString(36).substr(2, 9)
  });
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 10)));
};

export const getCloudBackups = async (): Promise<Partial<BackupEntry>[]> => {
  const historyKey = 'dps_backups_local';
  return JSON.parse(localStorage.getItem(historyKey) || '[]');
};

export const getSyncStatus = () => !isOffline;
