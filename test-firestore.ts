import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAIo9Tjed8cUr_K7RPRl2QYIQD1S9JAMY4",
  authDomain: "dps-staff-portal-5e911.firebaseapp.com",
  projectId: "dps-staff-portal-5e911",
  storageBucket: "dps-staff-portal-5e911.firebasestorage.app",
  messagingSenderId: "671583941979",
  appId: "1:671583941979:web:c23c0f527cefabfe3fd67e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function check() {
  try {
    await signInAnonymously(auth);
    console.log("Signed in anonymously");
    
    const metaSnap = await getDoc(doc(db, "portal/data_meta"));
    console.log("data_meta exists:", metaSnap.exists());
    if (metaSnap.exists()) console.log(metaSnap.data());

    const legacySnap = await getDoc(doc(db, "portal/data"));
    console.log("legacy data exists:", legacySnap.exists());
    if (legacySnap.exists()) {
      const data = legacySnap.data();
      console.log("legacy data students count:", data.students?.length);
    }
  } catch (e) {
    console.error("Error reading firestore:", e.message);
  }
}

check();
