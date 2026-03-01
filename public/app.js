const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
let isLoading = false;
function generateTime() {
    return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}
function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}
function sendExample(btn) {
    const text = btn.textContent;
    document.getElementById('messageInput').value = text;
    sendMessage();
}
function hideWelcome() {
    const welcome = document.getElementById('welcome');
    if (welcome) welcome.remove();
}
function scrollToBottom() {
    const msgs = document.getElementById('messages');
    msgs.scrollTop = msgs.scrollHeight;
}
function addMessage(text, role) {
    hideWelcome();
    const msgs = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    const avatarText = role === 'user' ? 'Вы' : 'AI';
    const formattedText = role === 'ai' ? formatMarkdown(text) : escapeHtml(text).replace(/\n/g, '<br>');
    div.innerHTML = `
    <div class="msg-avatar">${avatarText}</div>
    <div class="msg-content">
      <div class="msg-bubble">${formattedText}</div>
      <div class="msg-time">${generateTime()}</div>
    </div>
  `;
    msgs.appendChild(div);
    scrollToBottom();
    return div;
}
function showTyping() {
    const msgs = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typing';
    div.innerHTML = `
    <div class="msg-avatar" style="background: linear-gradient(135deg, #3b6fd4, #7c6deb); color: white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; flex-shrink:0; margin-top:2px;">AI</div>
    <div class="typing-dots"><span></span><span></span><span></span></div>
  `;
    msgs.appendChild(div);
    scrollToBottom();
}
function hideTyping() {
    const t = document.getElementById('typing');
    if (t) t.remove();
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function formatMarkdown(text) {
    let html = escapeHtml(text);
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code blocks
    html = html.replace(/```[\s\S]*?```/g, match => {
        const code = match.replace(/```\w*\n?/, '').replace(/```$/, '');
        return `<pre><code>${code}</code></pre>`;
    });
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ol>${match}</ol>`);
    // Unordered lists
    html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    return html;
}
async function sendMessage() {
    if (isLoading) return;
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    isLoading = true;
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    addMessage(text, 'user');
    showTyping();
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, sessionId })
        });
        const data = await response.json();
        hideTyping();
        if (response.ok) {
            addMessage(data.reply, 'ai');
        } else {
            addMessage(`⚠️ ${data.error || 'Произошла ошибка. Попробуйте ещё раз.'}`, 'ai');
        }
    } catch (err) {
        hideTyping();
        addMessage('⚠️ Не удалось подключиться к серверу. Проверьте соединение.', 'ai');
    }
    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
}
async function newChat() {
    document.getElementById('messages').innerHTML = `
    <div class="welcome-screen" id="welcome">
      <div class="welcome-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M3 17h18M3 12h18M3 7h18" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="5" y="14" width="3" height="6" rx="1" fill="white" opacity="0.7"/>
          <rect x="10.5" y="14" width="3" height="6" rx="1" fill="white" opacity="0.7"/>
          <rect x="16" y="14" width="3" height="6" rx="1" fill="white" opacity="0.7"/>
        </svg>
      </div>
      <h2 class="welcome-title">AI Советник по закупкам</h2>
      <p class="welcome-subtitle">АО «Досжан Темір Жолы»</p>
      <p class="welcome-desc">Задайте вопрос по закупкам — анализ поставщиков, составление ТЗ, оценка рисков и оптимизация затрат</p>
      <div class="example-prompts">
        <button class="example-btn" onclick="sendExample(this)">Сравни поставщиков рельсов для ремонта пути</button>
        <button class="example-btn" onclick="sendExample(this)">Составь ТЗ на закупку 20 рабочих станций</button>
        <button class="example-btn" onclick="sendExample(this)">Какие риски при закупке у нового поставщика?</button>
        <button class="example-btn" onclick="sendExample(this)">Как оптимизировать затраты на закупку топлива?</button>
      </div>
    </div>
  `;
    await fetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
    });
}
async function clearChat() {
    if (confirm('Очистить историю чата?')) {
        newChat();
    }
}
