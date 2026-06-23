const axios = require('axios');

const index = (req, res) => {
    res.render('index');
}

const chat = (req, res) => {
    res.render('chat');
}

const chatMessage = async (req, res) => {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log(message);
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in .env');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: `You are an expert on Pyu ancient cities (Beikthano, Hanlin, Sri Ksetra) and Pyu civilization. 
Respond to the following user question in the language they used (Burmese or English). 
If the question is not related to Pyu ancient cities or civilization, politely state that you only specialize in Pyu ancient cities and cannot help with other topics.

User question: ${message}`
                            }
                        ]
                    }
                ]
            }
        );

        const geminiResponse = response.data.candidates[0].content.parts[0].text;
        res.json({ response: geminiResponse });
    } catch (error) {
        console.error('Gemini API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to get response from Gemini API' });
    }
}

const cities = (req, res) => {
    res.render('cities');
}

const religion = (req, res) => {
    res.render('religion');
}

const language = (req, res) => {
    res.render('language');
}

const culture = (req, res) => {
    res.render('culture');
}

const artifacts = (req, res) => {
    res.render('artifacts');
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