const db = require('../../config/config');

const findByGoogleId = (googleId, callback) => {
    const sql = 'SELECT * FROM users WHERE google_id = ?';
    db.query(sql, [googleId], callback);
};

const findByEmail = (email, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], callback);
};

const createUser = (profile, callback) => {
    const sql = 'INSERT INTO users (google_id, email, name, avatar_url, last_login_at) VALUES (?, ?, ?, ?, NOW())';
    const params = [
        profile.google_id,
        profile.email,
        profile.name,
        profile.avatar_url || null
    ];
    db.query(sql, params, callback);
};

const createLocalUser = (data, callback) => {
    const sql = 'INSERT INTO users (email, username, name, password_hash, last_login_at) VALUES (?, ?, ?, ?, NOW())';
    const params = [data.email, data.username, data.name || data.username, data.password_hash];
    db.query(sql, params, callback);
};

const findByUsername = (username, callback) => {
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], callback);
};

const linkGoogleAccount = (userId, googleId, avatarUrl, callback) => {
    const sql = 'UPDATE users SET google_id = ?, avatar_url = ?, last_login_at = NOW() WHERE id = ?';
    db.query(sql, [googleId, avatarUrl || null, userId], callback);
};

const updateLastLogin = (id, callback) => {
    const sql = 'UPDATE users SET last_login_at = NOW() WHERE id = ?';
    db.query(sql, [id], callback);
};

const updateUsername = (id, username, callback) => {
    const sql = 'UPDATE users SET username = ?, name = ? WHERE id = ?';
    db.query(sql, [username, username, id], callback);
};

module.exports = {
    findByGoogleId,
    findByEmail,
    findByUsername,
    createUser,
    createLocalUser,
    linkGoogleAccount,
    updateLastLogin,
    updateUsername
};