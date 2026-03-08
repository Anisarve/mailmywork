require('dotenv').config();
require("./config/cron");
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;
const path = require('path');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const mongoose = require("mongoose");

const http = require("http");
const server = http.createServer(app);
const { setupSocket } = require("./socket");
console.log(setupSocket);
setupSocket(server);

// connect to mongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected to Primary MongoDB')).catch((err) => console.error('Mongoose Connection Failed ', err));

const compression = require('compression');

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true, maxAge: 60 * 60 * 24 }
}))

app.use(compression()); // Gzip all responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.set('trust proxy', true);

const uploadRoutes = require('./routes/uploadfile');
const textmailRoutes = require('./routes/textmail');
const shareRoute = require('./routes/share');
const receiveRoute = require('./routes/receive');
const feedbackRoute = require('./routes/feedback');
const queryRoute = require('./routes/query');

app.use('/upload', uploadRoutes);
app.use('/textmail', textmailRoutes);
app.use('/share', shareRoute);
app.use('/receive', receiveRoute);
app.use('/feedback', feedbackRoute);
app.use('/api/query', queryRoute);

// Secure TURN Credential Proxy (Metered.ca)
// Fetches time-limited TURN tokens so the Secret Key is never sent to the browser.
const https = require('https');
app.get('/api/turn', (req, res) => {
  const domain = process.env.METERED_DOMAIN;
  const apiKey = process.env.METERED_SECRET_KEY;

  if (!domain || !apiKey) return res.json([]);

  https.get(`https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`, (apiRes) => {
    let rawData = '';
    apiRes.on('data', (chunk) => { rawData += chunk; });
    apiRes.on('end', () => {
      try { res.json(JSON.parse(rawData)); }
      catch (e) { res.json([]); }
    });
  }).on('error', () => res.json([]));
});

// PWA Native OS Share Fallback Route
// If the Service Worker fails to intercept (e.g., hard refresh, first load on certain OS devices),
// this empty POST receiver prevents a 404 crash and safely drops them back natively.
const multer = require('multer');
const uploadFallback = multer({ dest: 'uploads/' });
app.post('/share-target', uploadFallback.any(), (req, res) => {
  // Ideally caught by SW. If it reaches here, we clear and redirect back to main.
  res.redirect(303, '/?shared=fallback');
});

app.get('/', (req, res) => { res.render("main"); });
app.get('/share', (req, res) => { res.render("share"); });
app.get('/feedback', (req, res) => { res.render("feedback"); });
app.get('/about', (req, res) => { res.render("about"); });
app.get('/help', (req, res) => { res.render("help"); });
app.get('/large-file', (req, res) => { res.render("largefile"); });

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});