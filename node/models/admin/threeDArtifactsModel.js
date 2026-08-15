const db = require('../../config/config');

const getAll = (callback) => {
    const sql = 'SELECT * FROM three_d_artifacts ORDER BY id DESC';
    db.query(sql, callback);
};

const getById = (id, callback) => {
    const sql = 'SELECT * FROM three_d_artifacts WHERE id = ?';
    db.query(sql, [id], callback);
};

const create = (data, callback) => {
    const sql = 'INSERT INTO three_d_artifacts (title, description, image_url, model_url, voice_url, category) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [
        data.title,
        data.description,
        data.image_url || null,
        data.model_url || null,
        data.voice_url || null,
        data.category || 'General'
    ];
    db.query(sql, params, callback);
};

const update = (id, data, callback) => {
    const sql = 'UPDATE three_d_artifacts SET title = ?, description = ?, image_url = ?, model_url = ?, voice_url = ?, category = ? WHERE id = ?';
    const params = [
        data.title,
        data.description,
        data.image_url,
        data.model_url,
        data.voice_url,
        data.category || 'General',
        id
    ];
    db.query(sql, params, callback);
};

const remove = (id, callback) => {
    const sql = 'DELETE FROM three_d_artifacts WHERE id = ?';
    db.query(sql, [id], callback);
};

const count = (callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM three_d_artifacts';
    db.query(sql, callback);
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    count
};
