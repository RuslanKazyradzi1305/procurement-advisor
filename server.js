require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store conversation threads per session
const sessions = {};

const SYSTEM_PROMPT = `Ты — AI советник по закупкам компании "Досжан темир жолы" (АО "Досжан Темір Жолы").

Твои задачи:
1. Анализировать запросы на закупку от сотрудников
2. Сравнивать поставщиков и рекомендовать оптимальные варианты
3. Выявлять риски в закупочных процессах
4. Помогать составлять техническое задание и спецификации
5. Давать рекомендации по оптимизации затрат

Важные правила:
- Все решения требуют подтверждения уполномоченного сотрудника
- Ты выступаешь только в роли советника, не утверждаешь закупки самостоятельно
- Отвечай структурированно: цифры, таблицы, списки
- Используй казахстанское законодательство о закупках как основу
- Отвечай на русском языке если не указано иное`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    try {
        // Initialize session history
        if (!sessions[sessionId]) {
            sessions[sessionId] = [];
        }

        sessions[sessionId].push({ role: 'user', content: message });

        // Keep last 20 messages for context
        const recentMessages = sessions[sessionId].slice(-20);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...recentMessages
            ],
            temperature: 0.7,
            max_tokens: 1500,
        });

        const reply = response.choices[0].message.content;
        sessions[sessionId].push({ role: 'assistant', content: reply });

        res.json({ reply });

    } catch (error) {
        console.error('OpenAI error:', error.message);
        if (error.status === 401) {
            res.status(401).json({ error: 'Неверный API ключ OpenAI. Проверьте переменную OPENAI_API_KEY.' });
        } else {
            res.status(500).json({ error: 'Ошибка сервера. Попробуйте позже.' });
        }
    }
});

// Clear session
app.post('/api/clear', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
    }
    res.json({ success: true });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Procurement Advisor running on port ${PORT}`);
});
