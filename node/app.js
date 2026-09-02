const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();
const rag = require('./rag');
const { authMiddleware } = require('./middleware/auth');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
// app.set('views', path.join(__dirname, 'views/admin/'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authMiddleware);

const routers = require('./routes/routers');
const adminrouters = require('./routes/adminrouters');
const authrouters = require('./routes/authrouters');

app.use(authrouters);
app.use(routers);
app.use(adminrouters);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3003;
if (require.main === module) {
    app.listen(PORT, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Server listen at port: ' + PORT);
            rag.init().catch(e => console.error('RAG init error:', e.message));
        }
    })
}

module.exports = app;