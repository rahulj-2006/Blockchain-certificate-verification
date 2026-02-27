import { initializeFirebase } from "@/firebase";

/**
 * Unified Firebase Instance
 * This file now proxies the standard initialization logic from the src/firebase directory.
 */
const { firebaseApp, firestore, auth } = initializeFirebase();

export { firestore as db, firebaseApp as app, auth };
