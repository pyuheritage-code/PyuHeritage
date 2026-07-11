const axios = require('axios');

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:5000';

const index = (req, res) => {
    res.render('site/index');
}

const chat = (req, res) => {
    res.render('site/chat');
}

const chatMessage = async (req, res) => {
    const message = req.body.message?.trim();
    console.log(message);
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const ragResponse = await axios.post(`${RAG_API_URL}/rag`, {
            question: message,
        }, { timeout: 60000 });

        const data = ragResponse.data;

        if (data.error) {
            console.error('RAG API error:', data.error);
            return res.status(502).json({ error: 'RAG server error', detail: data.error });
        }

        res.json({ response: data.answer, sources: data.sources || [] });
    } catch (error) {
        const detail = error.response?.data?.error
            || error.code
            || error.message
            || 'Unknown RAG API error';

        console.error('RAG API Error:', {
            status: error.response?.status,
            code: error.code,
            message: detail,
        });

        const status = error.response?.status || 502;
        res.status(status).json({
            error: 'Failed to get response from RAG service',
            detail,
        });
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
