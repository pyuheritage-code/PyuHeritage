const db = require('../../config/config');

const getAllArtifacts = (callback) => {
    const sql = 'SELECT * FROM artifacts ORDER BY id DESC';
    db.query(sql, callback);
};

const getArtifactById = (id, callback) => {
    const sql = 'SELECT * FROM artifacts WHERE id = ?';
    db.query(sql, [id], callback);
};

const createArtifact = (data, callback) => {
    const sql = 'INSERT INTO artifacts (title, description, image_url, category) VALUES (?, ?, ?, ?)';
    const params = [
        data.title,
        data.description,
        data.image_url || null,
        data.category || 'General'
    ];
    db.query(sql, params, callback);
};

const updateArtifact = (id, data, callback) => {
    const sql = 'UPDATE artifacts SET title = ?, description = ?, image_url = ?, category = ? WHERE id = ?';
    const params = [
        data.title,
        data.description,
        data.image_url,
        data.category || 'General',
        id
    ];
    db.query(sql, params, callback);
};

const deleteArtifact = (id, callback) => {
    const sql = 'DELETE FROM artifacts WHERE id = ?';
    db.query(sql, [id], callback);
};

const countArtifacts = (callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM artifacts';
    db.query(sql, callback);
};

module.exports = {
    getAllArtifacts,
    getArtifactById,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    countArtifacts
};
