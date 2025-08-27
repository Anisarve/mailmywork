require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');
const ejsMate = require('ejs-mate');  
const session = require('express-session');


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
app.use('/upload', uploadRoutes);
app.use('/textmail', textmailRoutes);


app.get('/', (req, res) => { res.render("main"); });


module.exports = app
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});