import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || origin.startsWith('http://localhost') || origin === process.env.FRONTEND_URL)
            cb(null, true);
        else cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Auth middleware ───────────────────────────────────────────────────────────
const auth = (minRole) => (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        const order = { user: 0, admin: 1, superadmin: 2 };
        if (minRole && order[req.user.role] < order[minRole])
            return res.status(403).json({ error: 'Insufficient permissions' });
        next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// ════════════════════════════════════════════════════════════════════════════
// AI DATA EXTRACTION (Gemini)
// ════════════════════════════════════════════════════════════════════════════
app.post('/extract-data', auth('admin'), upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return res.status(500).json({ error: 'Gemini API Key missing in backend .env' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Carefully analyze this certificate. Extract the student name, course title, issuing university/company, and batch year. 
        Return strictly in this JSON format: { "studentName": "...", "courseName": "...", "universityName": "...", "batch": "..." }.
        If a field is missing, set it to null. DO NOT guess or hallucinate. Only return the JSON object.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Could not parse AI response');

        res.json(JSON.parse(jsonMatch[0]));
    } catch (e) {
        console.error("AI Error:", e);
        res.status(500).json({ error: 'Failed to extract data with AI' });
    }
});

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
app.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = db.prepare(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
        ).run(name.trim(), email.trim().toLowerCase(), hash, 'user');
        const token = jwt.sign({ role: 'user', email: email.trim().toLowerCase(), userId: result.lastInsertRowid, name: name.trim() }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, role: 'user', name: name.trim() });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered. Please log in.' });
        res.status(500).json({ error: e.message });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    if (email === process.env.SUPER_ADMIN_EMAIL && password === process.env.SUPER_ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'superadmin', email, name: 'Super Admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ token, role: 'superadmin', name: 'Super Admin' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.trim().toLowerCase());
    if (!user) return res.status(401).json({ error: 'No account found. Please register first.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const payload = { role: user.role, email: user.email, userId: user.id, name: user.name, company: user.company_name, wallet: user.wallet_address };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: user.role, name: user.name, company: user.company_name });
});

app.get('/auth/me', auth('user'), (req, res) => res.json(req.user));

// ════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN — USER MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════
app.get('/users', auth('superadmin'), (req, res) => {
    const users = db.prepare('SELECT id, name, email, role, company_name, company_type, wallet_address, is_active, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
});

app.patch('/users/:id/role', auth('superadmin'), (req, res) => {
    const { role, companyName, companyType, walletAddress } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    db.prepare(
        'UPDATE users SET role = ?, company_name = COALESCE(?, company_name), company_type = COALESCE(?, company_type), wallet_address = COALESCE(?, wallet_address) WHERE id = ?'
    ).run(role, companyName || null, companyType || null, walletAddress || null, req.params.id);
    res.json({ message: 'Role updated' });
});

app.patch('/users/:id/toggle', auth('superadmin'), (req, res) => {
    const u = db.prepare('SELECT is_active FROM users WHERE id = ?').get(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(u.is_active ? 0 : 1, req.params.id);
    res.json({ is_active: !u.is_active });
});

app.delete('/users/:id', auth('superadmin'), (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
});

// ════════════════════════════════════════════════════════════════════════════
// CERTIFICATES METADATA
// ════════════════════════════════════════════════════════════════════════════
app.post('/certificates', auth('admin'), (req, res) => {
    const { hash, studentName, studentEmail, certificateType, courseName, txHash, ipfsUrl } = req.body;
    if (!hash) return res.status(400).json({ error: 'Hash required' });
    try {
        db.prepare(`INSERT OR REPLACE INTO certificates (hash, student_name, student_email, certificate_type, course_name, issued_by, issuer_wallet, ipfs_url, tx_hash) VALUES (?,?,?,?,?,?,?,?,?)`)
            .run(hash, studentName, studentEmail, certificateType, courseName, req.user.company, req.user.wallet, ipfsUrl, txHash);
        res.json({ message: 'Saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/certificates', auth('admin'), (req, res) => {
    const certs = req.user.role === 'superadmin'
        ? db.prepare('SELECT * FROM certificates ORDER BY issued_at DESC').all()
        : db.prepare('SELECT * FROM certificates WHERE issued_by = ? ORDER BY issued_at DESC').all(req.user.company);
    res.json(certs);
});

app.get('/certificates/:hash', (req, res) => {
    const cert = db.prepare('SELECT * FROM certificates WHERE hash = ?').get(req.params.hash);
    if (!cert) return res.status(404).json({ error: 'Not found' });
    res.json(cert);
});

// ════════════════════════════════════════════════════════════════════════════
// VERIFY LOGS
// ════════════════════════════════════════════════════════════════════════════
app.post('/verify-log', auth('user'), (req, res) => {
    const { hash, isValid, issuedBy } = req.body;
    db.prepare('INSERT INTO verify_logs (user_id, user_name, user_email, cert_hash, issued_by, is_valid) VALUES (?,?,?,?,?,?)')
        .run(req.user.userId, req.user.name, req.user.email, hash, issuedBy || '', isValid ? 1 : 0);
    res.json({ logged: true });
});

app.get('/verify-logs', auth('admin'), (req, res) => {
    const logs = req.user.role === 'superadmin'
        ? db.prepare('SELECT * FROM verify_logs ORDER BY verified_at DESC LIMIT 300').all()
        : db.prepare('SELECT * FROM verify_logs WHERE issued_by = ? ORDER BY verified_at DESC LIMIT 300').all(req.user.company);
    res.json(logs);
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
    console.log(`\n🚀 ChainVerify Backend → http://localhost:${PORT}`);
    console.log(`   Super Admin: ${process.env.SUPER_ADMIN_EMAIL}`);
});
