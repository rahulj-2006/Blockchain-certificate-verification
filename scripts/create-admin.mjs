/**
 * scripts/create-admin.mjs
 *
 * One-time script to create an admin user in Firebase Auth.
 * Run this ONCE to set up your admin credentials.
 *
 * Usage:
 *   node scripts/create-admin.mjs
 *
 * After running, use the email/password here to log in at /login
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// ── Your Firebase config ──────────────────────────────────────────────────
const firebaseConfig = {
    projectId: 'studio-7017482537-6b5ad',
    appId: '1:849218829166:web:4e09e3bb45ea82b7a09f7f',
    apiKey: 'AIzaSyCZbron15vzjNHAXSSd7GPZcd1g70gz3Ds',
    authDomain: 'studio-7017482537-6b5ad.firebaseapp.com',
    messagingSenderId: '849218829166',
    storageBucket: 'studio-7017482537-6b5ad.firebasestorage.app',
};

// ── Admin credentials to create ───────────────────────────────────────────
// ⚠️  CHANGE THESE before running!
const ADMIN_EMAIL = 'admin@certchain.edu';
const ADMIN_PASSWORD = 'CertChain@2024!'; // Min 6 chars

// ─────────────────────────────────────────────────────────────────────────
async function createAdmin() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    try {
        console.log(`\n Creating admin user: ${ADMIN_EMAIL} ...`);
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            ADMIN_EMAIL,
            ADMIN_PASSWORD
        );

        const user = userCredential.user;
        console.log('\n✅ Admin user created successfully!');
        console.log('─────────────────────────────────────');
        console.log(`  Email : ${user.email}`);
        console.log(`  UID   : ${user.uid}`);
        console.log('─────────────────────────────────────');
        console.log('\n📌 Save these credentials securely.');
        console.log('   Use them to log in at /login');
        console.log('\n⚠️  Delete this script after use.\n');

        process.exit(0);
    } catch (error) {
        const code = error.code ?? '';
        if (code === 'auth/email-already-in-use') {
            console.log('\n⚠️  This email is already registered.');
            console.log('   You can log in directly at /login with these credentials.');
        } else if (code === 'auth/weak-password') {
            console.log('\n❌ Password too weak. Use at least 6 characters.');
        } else {
            console.error('\n❌ Error creating admin:', error.message);
        }
        process.exit(1);
    }
}

createAdmin();
