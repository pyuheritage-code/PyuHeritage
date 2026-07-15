const axios = require('axios');
const pdfLoader = require('./pdfLoader');
const chunker = require('./chunker');
const embedder = require('./embedder');
const vectorStore = require('./vectorStore');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CHAT_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash';
const SITE_URL = process.env.OPENROUTER_SITE_URL || 'http://localhost:3003';
const SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'PyuHeritage';

let initialized = false;
let initPromise = null;

const SYSTEM_PROMPT = `You are a helpful assistant specialized in Pyu (ပျူ) ancient cities and heritage. 
Answer questions based ONLY on the provided context from the documents. 
If the answer is not found in the context, say "ဤအကြောင်းအရာကို ကျွန်ုပ်၏ အချက်အလက်များတွင် မတွေ့ရှိပါ။" (I don't have information about this in my documents).
Always answer in Myanmar (Burmese) language. Be concise and informative.`;

async function init(forceReindex = false) {
    if (initialized && !forceReindex) return;
    if (initPromise && !forceReindex) return initPromise;

    initPromise = (async () => {
        try {
            if (vectorStore.size() > 0 && !forceReindex) {
                console.log(`RAG ready: ${vectorStore.size()} chunks loaded from cache`);
                initialized = true;
                return;
            }

            const documents = await pdfLoader.loadPDFs();
            if (documents.length === 0) {
                initialized = true;
                return;
            }

            const chunks = chunker.chunkDocuments(documents);
            console.log(`Indexing ${chunks.length} chunks...`);
            const embeddings = await embedder.getEmbeddings(chunks.map(c => c.text));
            vectorStore.add(chunks, embeddings);

            console.log(`RAG initialized: ${documents.length} PDF(s), ${vectorStore.size()} chunks indexed`);
            initialized = true;
        } catch (err) {
            console.error('RAG init error:', err.message);
            initialized = true;
        }
    })();

    return initPromise;
}

async function query(question) {
    await init();

    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'sk-or-v1-YourKeyHere') {
        return 'OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env';
    }

    if (vectorStore.size() === 0) {
        return generateFallback(question);
    }

    const questionEmbedding = await embedder.getEmbedding(question);
    const results = vectorStore.search(questionEmbedding, 5);

    const context = results
        .filter(r => r.score > 0.3)
        .map(r => r.chunk.text)
        .join('\n\n---\n\n');

    if (!context) {
        return generateFallback(question);
    }

    return generateAnswer(question, context);
}

async function generateAnswer(question, context) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ];

    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: CHAT_MODEL,
        messages,
        stream: false,
        temperature: 0.3,
    }, {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': SITE_URL,
            'X-Title': SITE_NAME,
        },
        timeout: 60000,
    });

    return res.data.choices[0].message.content;
}

async function generateFallback(question) {
    const messages = [
        { role: 'system', content: 'You are a helpful assistant. Answer in Myanmar (Burmese) language.' },
        { role: 'user', content: question },
    ];

    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: CHAT_MODEL,
        messages,
        stream: false,
        temperature: 0.5,
    }, {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': SITE_URL,
            'X-Title': SITE_NAME,
        },
        timeout: 60000,
    });

    return res.data.choices[0].message.content;
}

async function queryStream(question, res) {
    await init();

    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'sk-or-v1-YourKeyHere') {
        res.write(`data: ${JSON.stringify({ error: 'API key not configured' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
    }

    let context = '';
    if (vectorStore.size() > 0) {
        const questionEmbedding = await embedder.getEmbedding(question);
        const results = vectorStore.search(questionEmbedding, 5);
        context = results
            .filter(r => r.score > 0.3)
            .map(r => r.chunk.text)
            .join('\n\n---\n\n');
    }

    const messages = context
        ? [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
          ]
        : [
            { role: 'system', content: 'You are a helpful assistant. Answer in Myanmar (Burmese) language.' },
            { role: 'user', content: question },
          ];

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: CHAT_MODEL,
            messages,
            stream: true,
            temperature: context ? 0.3 : 0.5,
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': SITE_URL,
                'X-Title': SITE_NAME,
            },
            responseType: 'stream',
            timeout: 60000,
        });

        let buffer = '';
        response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const parsed = JSON.parse(trimmed.slice(6));
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        if (content) {
                            res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        }
                    } catch (e) {}
                }
            }
        });

        response.data.on('end', () => {
            res.write('data: [DONE]\n\n');
            res.end();
        });

        response.data.on('error', (err) => {
            console.error('Stream error:', err.message);
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        });
    } catch (err) {
        console.error('Stream request error:', err.message);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
}

module.exports = { init, query, queryStream };
