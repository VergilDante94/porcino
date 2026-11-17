const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo imágenes permitidas'));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || 'porcino-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return getDefaultData();
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getDefaultData() {
  return {
    hero: {
      title: "Bienvenidos a Porcino Cubano",
      subtitle: "Producción porcina de calidad, comprometida con el desarrollo agropecuario de Cuba. Carne fresca, genética mejorada y asesoría técnica.",
      ctaText: "Contáctanos"
    },
    nosotros: {
      title: "Sobre Nosotros",
      lead: "Somos una empresa dedicada a la cría, engorde y comercialización de cerdos, con años de experiencia en el sector porcino cubano. Trabajamos con genética mejorada y buenas prácticas de bienestar animal.",
      cards: [
        { icon: "🐷", title: "Misión", text: "Producir carne porcina de alta calidad para el mercado nacional." },
        { icon: "🌱", title: "Visión", text: "Ser referente en la porcicultura cubana moderna y sostenible." },
        { icon: "🤝", title: "Valores", text: "Compromiso, calidad, trabajo en equipo y respeto al medio ambiente." }
      ]
    },
    servicios: {
      title: "Nuestros Servicios",
      lead: "Ofrecemos una gama completa de servicios para la producción porcina.",
      cards: [
        { title: "Cría y engorde", text: "Manejo integral de la piara desde el nacimiento hasta el sacrificio." },
        { title: "Venta de lechones", text: "Lechones destetados con vacunación y desparasitación al día." },
        { title: "Asesoría técnica", text: "Acompañamiento en nutrición, sanidad y manejo de la piara." },
        { title: "Carne porcina", text: "Comercialización de carne fresca y productos derivados." }
      ]
    },
    equipos: {
      title: "Nuestro Equipo",
      lead: "Profesionales comprometidos con la producción porcina.",
      members: [
        { name: "Ing. Agrónomo", role: "Director de producción", initial: "A" },
        { name: "Veterinario", role: "Sanidad animal", initial: "B" },
        { name: "Técnico", role: "Manejo de piara", initial: "C" },
        { name: "Administración", role: "Gestión y ventas", initial: "D" }
      ]
    },
    galeria: {
      title: "Galería",
      lead: "Imágenes de nuestras instalaciones y animales.",
      images: [
        "Granja", "Piara", "Instalaciones", "Alimentación", "Sanidad", "Comercialización"
      ]
    },
    contacto: {
      title: "Contacto",
      lead: "Póngase en contacto con nosotros.",
      phone: "+53 5 XXX XXXX",
      email: "contacto@porcinocubano.cu",
      address: "Provincia, Cuba",
      hours: "Lunes a Viernes, 8:00 - 17:00"
    },
    footer: {
      description: "Empresa porcina de Cuba. Calidad y compromiso con el campo.",
      phone: "+53 5 XXX XXXX",
      email: "contacto@porcinocubano.cu"
    },
    colors: {
      primary: "#FF0000",
      primaryDark: "#CC0000",
      accent: "#ff9800"
    },
    news: []
  };
}

function requireAuth(req, res, next) {
  if (req.session.isAdmin) return next();
  res.redirect('/admin.html');
}

app.get('/api/content', (req, res) => {
  res.json(readData());
});

app.post('/api/content', requireAuth, (req, res) => {
  writeData(req.body);
  res.json({ success: true });
});

// News endpoints
app.get('/api/news', (req, res) => {
  const data = readData();
  res.json(data.news || []);
});

app.post('/api/news', requireAuth, (req, res) => {
  const data = readData();
  if (!data.news) data.news = [];
  const post = {
    id: Date.now().toString(),
    title: req.body.title,
    image: req.body.image,
    content: req.body.content,
    date: new Date().toISOString()
  };
  data.news.unshift(post);
  writeData(data);
  res.json({ success: true, post });
});

app.put('/api/news/:id', requireAuth, (req, res) => {
  const data = readData();
  const idx = data.news.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'No encontrado' });
  data.news[idx] = { ...data.news[idx], ...req.body };
  writeData(data);
  res.json({ success: true });
});

app.delete('/api/news/:id', requireAuth, (req, res) => {
  const data = readData();
  data.news = (data.news || []).filter(p => p.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

app.post('/api/upload', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se subió archivo' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
  console.log(`Usuario: ${ADMIN_USER} / Contraseña: ${ADMIN_PASS}`);
});