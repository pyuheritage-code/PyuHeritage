const rag = require('../../rag');

const index = (req, res) => {
    res.render('site/index');
}

const chat = (req, res) => {
    res.render('site/chat');
}

const chatMessage = async (req, res) => {
    const message = req.body.message?.trim();
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const wantsStream = req.headers.accept === 'text/event-stream';

    if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        try {
            await rag.queryStream(message, res);
        } catch (error) {
            console.error('Stream query error:', error.message);
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    } else {
        try {
            const answer = await rag.query(message);
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

module.exports = {
    index,
    chat,
    chatMessage,
    cities,
    religion,
    language,
    culture,
    artifacts,
}
