const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const storePath = path.join(__dirname, '..', '..', 'data', 'store.json');
const jwtSecret = process.env.JWT_SECRET;

function seedStore() {
  if (!fs.existsSync(storePath)) {
    const accounts = [
      { username: 'nova.admin', passwordHash: bcrypt.hashSync('NovaDemo#2026!', 10), role: 'ADMIN', name: 'NOVA Admin' },
      { username: 'nova.boss', passwordHash: bcrypt.hashSync('BossDemo#2026!', 10), role: 'BOS', name: 'NOVA Boss' },
      { username: 'nova.user', passwordHash: bcrypt.hashSync('UserDemo#2026!', 10), role: 'USER', name: 'NOVA User' }
    ];
    saveStore({ users: accounts, tariff: 100, templates: [], withdrawals: [] });
  }
}
function readStore() { seedStore(); return JSON.parse(fs.readFileSync(storePath, 'utf8')); }
function saveStore(store) { fs.mkdirSync(path.dirname(storePath), { recursive: true }); fs.writeFileSync(storePath, JSON.stringify(store, null, 2)); }
function publicUser(user) { return { username: user.username, role: user.role, name: user.name }; }
function auth(req, res, next) {
  if (!jwtSecret || jwtSecret.length < 32) return res.status(503).json({ error: 'JWT_SECRET belum disetel. Salin .env.example ke .env dan isi secret acak minimal 32 karakter.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try { req.user = jwt.verify(token, jwtSecret); return next(); }
  catch { return res.status(401).json({ error: 'Token tidak valid atau sesi berakhir.' }); }
}
function allow(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Akses ditolak untuk role ini.' }); }

router.get('/health', (_req, res) => res.json({ ok: true, app: 'NOVA BLAST API', mode: 'testing', timestamp: new Date().toISOString() }));
router.post('/auth/login', (req, res) => {
  if (!jwtSecret || jwtSecret.length < 32) return res.status(503).json({ error: 'Backend belum dikonfigurasi. Buat .env dan isi JWT_SECRET minimal 32 karakter.' });
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const store = readStore();
  const user = store.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Username atau password salah.' });
  const token = jwt.sign(publicUser(user), jwtSecret, { expiresIn: '8h', issuer: 'nova-blast' });
  res.json({ token, user: publicUser(user), expiresIn: 28800 });
});
router.get('/auth/me', auth, (req, res) => res.json({ user: req.user }));
router.get('/dashboard', auth, (req, res) => {
  const store = readStore();
  const ownWithdrawals = store.withdrawals.filter(w => req.user.role !== 'USER' || w.username === req.user.username);
  res.json({ user: req.user, tariff: store.tariff, withdrawalCount: ownWithdrawals.length, pendingWithdrawals: ownWithdrawals.filter(w => w.status === 'PENDING').length, note: 'Statistik pengiriman dan saldo belum terhubung ke transaksi nyata.' });
});
router.get('/settings/tariff', auth, (_req, res) => res.json({ tariff: readStore().tariff }));
router.put('/settings/tariff', auth, allow('ADMIN', 'BOS'), (req, res) => {
  const tariff = Number(req.body?.tariff);
  if (!Number.isInteger(tariff) || tariff < 0 || tariff > 1000000) return res.status(400).json({ error: 'Tarif harus bilangan bulat 0 sampai 1.000.000.' });
  const store = readStore(); store.tariff = tariff; saveStore(store); res.json({ ok: true, tariff });
});
router.get('/templates', auth, (req, res) => {
  const store = readStore(); res.json({ templates: store.templates.filter(t => req.user.role !== 'USER' || t.active) });
});
router.post('/templates', auth, allow('ADMIN', 'BOS'), (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const content = String(req.body?.content || '').trim().slice(0, 2000);
  if (!name || !content) return res.status(400).json({ error: 'Nama dan isi template wajib diisi.' });
  const store = readStore(); const item = { id: `tpl_${Date.now()}`, name, content, owner: req.user.username, active: true, createdAt: new Date().toISOString() };
  store.templates.unshift(item); saveStore(store); res.status(201).json({ template: item });
});
router.get('/withdrawals', auth, (req, res) => {
  const store = readStore(); const withdrawals = store.withdrawals.filter(w => req.user.role !== 'USER' || w.username === req.user.username); res.json({ withdrawals });
});
router.post('/withdrawals', auth, allow('USER'), (req, res) => {
  const amount = Number(req.body?.amount); const method = String(req.body?.method || '').trim().slice(0, 40); const destination = String(req.body?.destination || '').trim().slice(0, 160);
  if (!Number.isInteger(amount) || amount < 1000 || amount > 100000000 || !method || !destination) return res.status(400).json({ error: 'Nominal minimal Rp1.000 dan metode/tujuan wajib diisi.' });
  const store = readStore(); const item = { id: `wd_${Date.now()}`, username: req.user.username, amount, method, destination, status: 'PENDING', createdAt: new Date().toISOString() };
  store.withdrawals.unshift(item); saveStore(store); res.status(201).json({ withdrawal: item, note: 'Permintaan dicatat sebagai demo. Tidak ada uang yang dipindahkan.' });
});
router.patch('/withdrawals/:id/status', auth, allow('ADMIN'), (req, res) => {
  const status = String(req.body?.status || '').toUpperCase();
  if (!['PENDING', 'APPROVED', 'REJECTED', 'PAID'].includes(status)) return res.status(400).json({ error: 'Status tidak valid.' });
  const store = readStore(); const item = store.withdrawals.find(w => w.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Permintaan tidak ditemukan.' });
  item.status = status; item.updatedAt = new Date().toISOString(); saveStore(store); res.json({ withdrawal: item });
});
router.get('/users', auth, allow('ADMIN'), (_req, res) => {
  const store = readStore(); res.json({ users: store.users.map(publicUser) });
});
module.exports = router;
  
