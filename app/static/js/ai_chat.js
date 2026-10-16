const SYSTEM_PROMPT = `Eres Agro IA, el asistente agrónomo oficial de la plataforma AgroSmart. 
Tu objetivo es ayudar a los agricultores y pequeños productores a mejorar sus cultivos.
El equipo creador de AgroSmart (Agencia Atlas Digital) está conformado por 5 integrantes: Kevin Antonio (Toño), Bryan Carranza, Neftaly Fuentes, Adaly Campos y Omar Ventura. Conoces a todos y si te preguntan por ellos, respondes positivamente sobre su rol como creadores del sistema.
Eres experto en:
- Tipos de cultivo, fertilización, control de plagas y enfermedades.
- Calendarios lunares agrícolas (cuándo sembrar, podar, cosechar según la fase de la luna).
- Análisis de variables climáticas básicas.
Responde de forma clara, amigable y estructurada. Usa formato Markdown para listas, negritas y tablas cuando sea necesario.
No te desvíes a temas que no tengan relación con agricultura, botánica o la plataforma AgroSmart.`;

// Clave OpenRouter desde configuración global o codificada en Base64
// AI credentials are server-side in AgroPython; never embed fallback keys in the browser.
let openRouterKey = '';
let currentModel = localStorage.getItem('agrosmart_ai_model') || 'google/gemini-2.0-flash-001';
if (currentModel.includes('2.5-flash')) {
    currentModel = 'google/gemini-2.0-flash-001';
    localStorage.setItem('agrosmart_ai_model', currentModel);
}
let chatHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const chatForm = document.getElementById('chat-form');

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
    });

    // Submit form on Enter (without shift)
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Hardcoded key is always present

        // Add User Message to UI
        addMessageToUI('user', message);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Add User Message to History
        chatHistory.push({ role: 'user', content: message });

        // Show Typing Indicator
        const typingId = showTypingIndicator();

        try {
            const response = await fetchOpenRouterAPI(chatHistory);
            removeTypingIndicator(typingId);
            
            if (response.error) {
                throw new Error(response.error.message || 'Error desconocido de la API');
            }

            const aiText = response.choices[0].message.content;
            chatHistory.push({ role: 'assistant', content: aiText });
            addMessageToUI('ai', aiText);

        } catch (error) {
            removeTypingIndicator(typingId);
            console.warn("AI chat warning:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Conexión',
                text: error.message || 'No se pudo contactar con la IA. Verifica tu API Key o conexión.',
                confirmButtonColor: '#10b981'
            });
            // Remove the failed message from history
            chatHistory.pop();
        }
    });

    // Populate modal values
    if (currentModel) {
        document.getElementById('model-select').value = currentModel;
    }
    // Si el valor de localStorage ya no existe (ej. modelos antiguos), el select tomará el default
    // Actualizamos currentModel al valor real y válido del select:
    currentModel = document.getElementById('model-select').value;
    
    // Update the UI immediately with the loaded model name
    updateAllAIBubbles();

    // Load voices for Jarvis
    function populateVoiceList() {
        const voiceSelect = document.getElementById('jarvis-voice-select');
        if (!voiceSelect || !window.speechSynthesis) return;

        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) return;

        voiceSelect.innerHTML = '';
        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.textContent = voice.name + ' (' + voice.lang + ')';
            if (voice.default) option.textContent += ' [Default]';
            option.value = index;
            voiceSelect.appendChild(option);
        });

        // Restore saved voice index
        const savedIndex = localStorage.getItem('jarvis_voice_index');
        if (savedIndex !== null && savedIndex < voices.length) {
            voiceSelect.value = savedIndex;
        }
    }

    populateVoiceList();
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
});

function getSelectedModelName() {
    const select = document.getElementById('model-select');
    if (select && select.options.length > 0) {
        return select.options[select.selectedIndex].text;
    }
    return 'G0DM0D3 Engine';
}

function addMessageToUI(sender, text) {
    const messagesContainer = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    
    if (sender === 'user') {
        bubble.className = 'chat-bubble chat-bubble-user';
        bubble.innerHTML = `
            <div class="d-flex gap-2 mb-2 align-items-center justify-content-end">
                <strong class="small">Tú</strong>
                <i class="bi bi-person-fill text-white"></i>
            </div>
            <div class="text-start" style="white-space: pre-wrap;">${escapeHTML(text)}</div>
        `;
    } else {
        const modelName = getSelectedModelName();
        bubble.className = 'chat-bubble chat-bubble-ai';
        // Parse markdown for AI responses
        const parsedHTML = marked.parse(text);
        bubble.innerHTML = `
            <div class="d-flex gap-2 mb-2 align-items-center">
                <i class="bi bi-robot text-success"></i>
                <strong class="small">Agro IA (${modelName})</strong>
            </div>
            <div class="markdown-body text-start">${parsedHTML}</div>
        `;
    }
    
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    const id = 'typing-' + Date.now();
    bubble.id = id;
    bubble.className = 'chat-bubble chat-bubble-ai';
    bubble.innerHTML = `
        <div class="d-flex gap-2 align-items-center">
            <i class="bi bi-robot text-success"></i>
            <div>
                <div class="ai-typing-indicator"></div>
                <div class="ai-typing-indicator"></div>
                <div class="ai-typing-indicator"></div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const bubble = document.getElementById(id);
    if (bubble) bubble.remove();
}

async function fetchOpenRouterAPI(messages) {
    const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem('agropython_access_token') || ''}`
        },
        body: JSON.stringify({
            message: messages[messages.length - 1].content,
            history: messages.slice(0, -1),
            mode: "agriculture"
        })
    });
    const data = await response.json();
    if (!response.ok) return { error: { message: data.detail || 'No se pudo contactar con Agro IA' } };
    return { choices: [{ message: { content: data.answer } }] };
}

function openSettingsModal() {
    const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
    modal.show();
}

function updateAllAIBubbles() {
    const modelName = getSelectedModelName();
    document.querySelectorAll('.chat-bubble-ai strong').forEach(el => {
        el.textContent = `Agro IA (${modelName})`;
    });
    
    // Si es el primer mensaje por defecto, actualizar el texto para que se presente
    const welcomeBubble = document.querySelector('.chat-messages .chat-bubble-ai .markdown-body');
    if (welcomeBubble && chatHistory.length === 0 && welcomeBubble.textContent.includes('¡Hola! Soy')) {
        welcomeBubble.innerHTML = `¡Hola! Soy tu asistente agrícola inteligente impulsado por <strong>${modelName}</strong>. Estoy aquí para ayudarte con recomendaciones sobre cultivos, control de plagas, calendarios lunares y fertilización. ¿En qué puedo apoyarte hoy en tu parcela?`;
    }
}

window.saveSettings = function() {
    const newModel = document.getElementById('model-select').value;
    const jarvisVoice = document.getElementById('jarvis-voice-select').value;
    
    currentModel = newModel;
    
    localStorage.setItem('agrosmart_ai_model', currentModel);
    localStorage.setItem('jarvis_model', currentModel);
    if (jarvisVoice !== undefined) {
        localStorage.setItem('jarvis_voice_index', jarvisVoice);
        // Actualizar la voz en vivo si Jarvis está instanciado
        if (window.JarvisInstance) {
            window.JarvisInstance.voiceIndex = parseInt(jarvisVoice, 10);
            window.JarvisInstance.model = currentModel;
        }
    }

    updateAllAIBubbles();

    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
    
    Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Configuración de IA actualizada correctamente. El modelo ahora es ' + getSelectedModelName() + '.',
        timer: 2000,
        showConfirmButton: false
    });
}

// Utility to prevent XSS in user input
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}
