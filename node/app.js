const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config();
const rag = require('./rag');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
// app.set('views', path.join(__dirname, 'views/admin/'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routers = require('./routes/routers');
const adminrouters = require('./routes/adminrouters');

app.use(routers);
app.use(adminrouters);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT;
app.listen(PORT, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Server listen at port: ' + PORT);
        rag.init().catch(e => console.error('RAG init error:', e.message));
    }
})