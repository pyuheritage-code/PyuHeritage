const rag = require('../../rag');
const chatModel = require('../../models/site/chatModel');

const index = (req, res) => {
    res.render('site/index');
}

const chat = (req, res) => {
    res.render('site/chat');
}

const resolveConversation = (userId, conversationId, callback) => {
    if (conversationId) {
        chatModel.findOwnedConversation(userId, conversationId, (err, rows) => {
            if (err) return callback(err);
            if (rows && rows.length > 0) {
                return callback(null, rows[0].id, false);
            }
            chatModel.createConversation(userId, (createErr, result) => {
                if (createErr) return callback(createErr);
                callback(null, result.insertId, true);
            });
        });
    } else {
        chatModel.createConversation(userId, (createErr, result) => {
            if (createErr) return callback(createErr);
            callback(null, result.insertId, true);
        });
    }
};

const saveExchange = (conversationId, userMessage, assistantMessage, isNew, callback) => {
    chatModel.createMessage(conversationId, 'user', userMessage, (err) => {
        if (err) return callback(err);
        chatModel.createMessage(conversationId, 'assistant', assistantMessage, (err2) => {
            if (err2) return callback(err2);
            if (isNew) {
                const title = userMessage.slice(0, 60);
                return chatModel.updateTitle(conversationId, title, callback);
            }
            chatModel.touchConversation(conversationId, callback);
        });
    });
};

const chatMessage = async (req, res) => {
    const message = req.body.message?.trim();
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const wantsStream = req.headers.accept === 'text/event-stream';
    const userId = req.user ? req.user.id : null;
    const conversationId = req.user ? req.body.conversationId : null;

    if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        if (!userId) {
            try {
                await rag.queryStream(message, res);
            } catch (error) {
                console.error('Stream query error:', error.message);
                res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
            return;
        }

        resolveConversation(userId, conversationId, async (err, convId, isNew) => {
            if (err) {
                console.error('Conversation resolve error:', err.message);
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

            try {
                await rag.queryStream(message, res, {
                    onDone: (fullText) => {
                        if (fullText) {
                            saveExchange(convId, message, fullText, isNew, (saveErr) => {
                                if (saveErr) console.error('Save exchange error:', saveErr.message);
                            });
                        }
                    },
                    onError: (streamErr, partialText) => {
                        if (partialText) {
                            saveExchange(convId, message, partialText, isNew, (saveErr) => {
                                if (saveErr) console.error('Save partial error:', saveErr.message);
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Stream query error:', error.message);
                res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        });
    } else {
        try {
            const answer = await rag.query(message);
            if (userId) {
                resolveConversation(userId, conversationId, (err, convId, isNew) => {
                    if (!err) {
                        saveExchange(convId, message, answer, isNew, (saveErr) => {
                            if (saveErr) console.error('Save exchange error:', saveErr.message);
                        });
                    }
                });
            }
            res.json({ response: answer, sources: [] });
        } catch (error) {
            console.error('RAG query error:', error.message);
            res.status(502).json({
                error: 'Failed to get response',
                detail: error.message,
            });
        }
    }
}

const history = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    chatModel.listByUser(req.user.id, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
}

const conversation = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const conversationId = req.params.id;
    chatModel.findOwnedConversation(req.user.id, conversationId, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        chatModel.getMessages(conversationId, (err2, messages) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ conversation: rows[0], messages });
        });
    });
}

const deleteConversation = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const conversationId = req.params.id;
    chatModel.findOwnedConversation(req.user.id, conversationId, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        chatModel.deleteConversation(conversationId, (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true });
        });
    });
}

const cities = (req, res) => {
    res.render('site/cities');
}

const religion = (req, res) => {
    res.render('site/religion');
}

const language = (req, res) => {
    res.render('site/language');
}

const culture = (req, res) => {
    res.render('site/culture');
}

const artifacts = (req, res) => {

    res.render('site/artifacts');
}

const myazedi = (req, res) => {
    res.render('site/myazedi');
}

module.exports = {
    index,
    chat,
    chatMessage,
    history,
    conversation,
    deleteConversation,
    cities,
    religion,
    language,
    culture,
    artifacts,
    myazedi,
}
