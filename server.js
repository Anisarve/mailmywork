require('dotenv').config();
require("./config/cron");
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');
const ejsMate = require('ejs-mate');  
const session = require('express-session');
const mongoose = require("mongoose");

// connect to mongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected to Primary MongoDB')).catch((err) => console.error('Mongoose Connection Failed ', err));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true, maxAge: 60 * 60 * 24 }
}))


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
app.use('/upload', uploadRoutes);
app.use('/textmail', textmailRoutes);
app.use('/share', shareRoute);
app.use('/receive', receiveRoute);
app.use('/feedback', feedbackRoute);


app.get('/', (req, res) => { res.render("main"); });
app.get('/share', (req, res) => { res.render("share"); });
app.get('/feedback', (req, res) => { res.render("feedback"); });
app.get('/about', (req, res) => { res.render("about"); });


module.exports = app
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});