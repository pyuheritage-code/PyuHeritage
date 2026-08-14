const db = require('../../config/config');

const createConversation = (userId, callback) => {
    const sql = 'INSERT INTO conversations (user_id) VALUES (?)';
    db.query(sql, [userId], callback);
};

const listByUser = (userId, callback) => {
    const sql = 'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC';
    db.query(sql, [userId], callback);
};

const findOwnedConversation = (userId, conversationId, callback) => {
    const sql = 'SELECT * FROM conversations WHERE id = ? AND user_id = ?';
    db.query(sql, [conversationId, userId], callback);
};

const getMessages = (conversationId, callback) => {
    const sql = 'SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC';
    db.query(sql, [conversationId], callback);
};

const createMessage = (conversationId, role, content, callback) => {
    const sql = 'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)';
    db.query(sql, [conversationId, role, content], callback);
};

const updateTitle = (conversationId, title, callback) => {
    const sql = 'UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?';
    db.query(sql, [title, conversationId], callback);
};

const touchConversation = (conversationId, callback) => {
    const sql = 'UPDATE conversations SET updated_at = NOW() WHERE id = ?';
    db.query(sql, [conversationId], callback);
};

const deleteConversation = (conversationId, callback) => {
    const sql = 'DELETE FROM conversations WHERE id = ?';
    db.query(sql, [conversationId], callback);
};

module.exports = {
    createConversation,
    listByUser,
    findOwnedConversation,
    getMessages,
    createMessage,
    updateTitle,
    touchConversation,
    deleteConversation
};