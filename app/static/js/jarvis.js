/**
 * Jarvis - Inteligencia Madre del Sistema AgroSmart Global
 * Requiere: Plan Esmeralda
 * Tecnologías: Web Speech API (Recognition & Synthesis), OpenRouter (G0DM0D3)
 */

class JarvisCore {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        
        // Cargar estado de sessionStorage para persistencia cross-page
        this.isAwake = sessionStorage.getItem('jarvis_is_awake') === 'true';
        this.chatHistory = JSON.parse(sessionStorage.getItem('jarvis_history') || '[]');
        this.speechTimeout = null;
        
        // Defaults and saved configs
        this.language = localStorage.getItem('jarvis_language') || 'es-ES';
        this.model = localStorage.getItem('jarvis_model') || 'google/gemini-2.0-flash-001';
        if (this.model.includes('2.5-flash')) {
            this.model = 'google/gemini-2.0-flash-001';
            localStorage.setItem('jarvis_model', this.model);
        }
        this.voiceIndex = parseInt(localStorage.getItem('jarvis_voice_index') || '0', 10);
        
        // Clave OpenRouter oficial o codificada en Base64 para escaneo frontend
        // AI credentials are kept by the Python backend.
        this.openRouterKey = '';
        
        this.userName = "Usuario";
        this.userRole = "Desconocido";
        this.fetchUserName();

        this.initRecognition();
        this.createWidget();
        this.unlockAudio();

        // Si venimos de otra página y estaba despierto, mostrarlo inmediatamente
        if (this.isAwake) {
            setTimeout(() => this.updateWidgetState('listening'), 500);
        }

        const resumeSpeech = sessionStorage.getItem('jarvis_resume_speech');
        if (resumeSpeech) {
            sessionStorage.removeItem('jarvis_resume_speech');
            setTimeout(() => this.speak(resumeSpeech), 800);
        }
    }

    async fetchUserName() {
        try {
            if (typeof AuthObj !== 'undefined') {
                const user = await AuthObj.getCurrentUser();
                if (user) {
                    if (user.full_name) {
                        this.userName = user.full_name.split(' ')[0]; // Primer nombre
                    } else if (user.name) {
                        this.userName = user.name.split(' ')[0];
                    }
                    if (user.role) {
                        this.userRole = user.role;
                    }
                }
            }
        } catch(e) {}
    }

    unlockAudio() {
        const unlock = () => {
            if (this.synthesis) {
                const u = new SpeechSynthesisUtterance('');
                u.volume = 0;
                this.synthesis.speak(u);
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
        document.addEventListener('keydown', unlock);
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true; 
        this.recognition.lang = this.language;

        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.isAwake) this.updateWidgetState('listening');
        };

        this.recognition.onresult = (event) => {
            let currentText = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                currentText += event.results[i][0].transcript;
            }
            currentText = currentText.toLowerCase().trim();
            if (!currentText) return;

            // 1. Lógica de Interrupción
            if (this.isSpeaking && currentText.length > 5) {
                this.stopAudio(); // Callar a Jarvis inmediatamente (Web o ElevenLabs)
                this.isSpeaking = false;
                this.setAwakeState(true);
                this.chatHistory.push({ role: "system", content: "(El usuario te interrumpió)" });
                this.updateWidgetState('listening');
                
                // Audio feedback corto
                setTimeout(() => {
                    this.speak("Escuchando.", true);
                }, 50);
            }

            // 2. Detección de Wake Word (Modo Reposo)
            if (!this.isAwake) {
                const normalizedText = currentText.replace(/[^\w\s]/gi, '').toLowerCase();
                // Ultra robusto: Incluye variaciones fonéticas en español e inglés
                const wakeWords = ["jarvis", "yarvis", "harvis", "arvis", "darbis", "llarvis", "yervis", "jervis", "service", "charlis", "yabis", "jarbi", "jarvys", "harbi", "travis", "llabis", "yarbis", "harris", "haris", "yerbis", "arbi", "garvis", "hey jarvis", "oye jarvis", "harvey", "javi", "javis"];
                let detectedWake = wakeWords.find(w => normalizedText.includes(w));
                
                if (detectedWake) {
                    this.setAwakeState(true);
                    this.updateWidgetState('listening');
                    
                    const parts = normalizedText.split(detectedWake);
                    const afterWake = parts.length > 1 ? parts[1].trim() : '';
                    
                    if (afterWake.length > 2) {
                        clearTimeout(this.speechTimeout);
                        this.handleCommand(afterWake); // ¡Ejecución instantánea sin espera!
                    } else {
                        // El usuario solo lo llamó por su nombre: responder de inmediato para confirmar presencia
                        clearTimeout(this.speechTimeout);
                        this.speak("¿Dime?", true);
                        this.speechTimeout = setTimeout(() => {
                            if (this.isAwake && !this.isSpeaking) {
                                this.setAwakeState(false);
                                this.updateWidgetState('idle');
                            }
                        }, 8000);
                    }
                }
            } 
            // 3. Escucha Activa con Timer Acelerado
            else {
                clearTimeout(this.speechTimeout);
                this.updateWidgetState('listening');
                
                const normalizedText = currentText.replace(/[^\w\s]/gi, '').toLowerCase();
                const wakeWords = ["jarvis", "yarvis", "harvis", "arvis", "darbis", "llarvis", "yervis", "jervis", "service", "charlis", "yabis", "jarbi", "jarvys", "harbi", "hey jarvis", "oye jarvis"];
                const isJustWakeWord = wakeWords.includes(normalizedText);

                if (isJustWakeWord) {
                    this.speechTimeout = setTimeout(() => {
                        this.setAwakeState(false);
                        this.updateWidgetState('idle');
                    }, 8000);
                    return;
                }

                // Si la API detecta que la oración terminó oficialmente (isFinal)
                let isFinal = false;
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) isFinal = true;
                }

                if (isFinal) {
                    // Procesar inmediatamente si es final y tiene sentido
                    if (currentText.length >= 2) {
                        this.handleCommand(currentText);
                    }
                } else {
                    // Si no es final, esperar solo 1.2 segundos de silencio para una respuesta veloz
                    this.speechTimeout = setTimeout(() => {
                        if (currentText.length >= 2) {
                            this.handleCommand(currentText);
                        }
                    }, 1200);
                }
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                this.setAwakeState(false);
                this.updateWidgetState('idle');
            }
        };

        this.recognition.onend = () => {
            if (!this.isSpeaking && this.synthesis.speaking === false) {
                try {
                    this.recognition.start();
                } catch(e) {}
            } else {
                this.isListening = false;
            }
        };
    }

    setAwakeState(state) {
        this.isAwake = state;
        sessionStorage.setItem('jarvis_is_awake', state ? 'true' : 'false');
    }

    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.lang = this.language;
                this.recognition.start();
            } catch(e) {}
        }
    }

    stop() {
        if (this.recognition) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    stopAudio() {
        this.latestSpeakId = null;
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch(e) {}
        }
        if (this.synthesis) {
            try { this.synthesis.cancel(); } catch(e) {}
        }
        this.isSpeaking = false;
    }

    speak(text, resumeListeningAfter = true) {
        this.stop(); 
        this.stopAudio();
        
        const speakId = Date.now() + Math.random();
        this.latestSpeakId = speakId;

        const engine = localStorage.getItem('jarvis_voice_engine') || 'elevenlabs';
        const elevenKey = localStorage.getItem('elevenlabs_api_key') || ((typeof CONFIG !== 'undefined' && CONFIG.ELEVENLABS_API_KEY) ? CONFIG.ELEVENLABS_API_KEY : '');

        // Si el usuario eligió ElevenLabs y hay clave activa, usar voz hiperrealista
        if (engine === 'elevenlabs' && elevenKey && elevenKey.trim() !== '') {
            this.speakWithElevenLabs(text, resumeListeningAfter, speakId, elevenKey.trim());
            return;
        }

        // De lo contrario o por elección del usuario, usar la voz nativa del navegador web
        this.fallbackWebSpeech(text, resumeListeningAfter, speakId);
    }

    async speakWithElevenLabs(text, resumeListeningAfter, speakId, apiKey) {
        this.isSpeaking = true;
        if (resumeListeningAfter) {
            this.updateWidgetState('speaking');
        } else {
            this.updateWidgetState('processing');
        }

        try {
            const voiceId = localStorage.getItem('elevenlabs_voice_id') || ((typeof CONFIG !== 'undefined' && CONFIG.ELEVENLABS_VOICE_ID) ? CONFIG.ELEVENLABS_VOICE_ID : 'pNInz6obpgDQGcFmaJgB');
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.85,
                        style: 0.5,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                throw new Error("ElevenLabs API status: " + response.status);
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            if (this.currentAudio) {
                try { this.currentAudio.pause(); } catch(e){}
            }
            this.currentAudio = new Audio(audioUrl);

            this.currentAudio.onplay = () => {
                this.isSpeaking = true;
            };

            this.currentAudio.onended = () => {
                if (this.latestSpeakId !== speakId) return;
                this.isSpeaking = false;
                URL.revokeObjectURL(audioUrl);

                if (!resumeListeningAfter) {
                    this.updateWidgetState('processing');
                    return;
                }

                if (!this.isAwake) {
                    this.updateWidgetState('idle');
                } else {
                    this.updateWidgetState('listening');
                    this.start();
                }
            };

            this.currentAudio.onerror = (e) => {
                if (this.latestSpeakId !== speakId) return;
                this.fallbackWebSpeech(text, resumeListeningAfter, speakId);
            };

            await this.currentAudio.play();
        } catch (err) {
            if (err.name === 'AbortError') return; // Ignorar interrupción si el usuario lo calló
            this.fallbackWebSpeech(text, resumeListeningAfter, speakId);
        }
    }

    fallbackWebSpeech(text, resumeListeningAfter, speakId) {
        if (!this.synthesis) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.language;
        
        const voices = this.synthesis.getVoices();
        const savedVoiceName = localStorage.getItem('jarvis_voice_name');
        let selectedVoice = null;
        
        if (savedVoiceName) {
            selectedVoice = voices.find(v => v.name === savedVoiceName);
        }
        if (!selectedVoice && voices.length > 0 && voices[this.voiceIndex]) {
            selectedVoice = voices[this.voiceIndex];
        }
        if (!selectedVoice && voices.length > 0) {
            selectedVoice = voices.find(v => v.lang.startsWith(this.language.substring(0, 2))) || voices[0];
        }
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        }

        utterance.onstart = () => {
            this.isSpeaking = true;
            if (resumeListeningAfter) {
                this.updateWidgetState('speaking');
            } else {
                this.updateWidgetState('processing');
            }
        };

        utterance.onend = () => {
            if (this.latestSpeakId !== speakId) return;
            this.isSpeaking = false;
            
            if (!resumeListeningAfter) {
                this.updateWidgetState('processing');
                return;
            }
            
            if (!this.isAwake) {
                this.updateWidgetState('idle');
            } else {
                this.updateWidgetState('listening');
                this.start();
            }
        };

        utterance.onerror = (e) => {
            if (this.latestSpeakId !== speakId) return;
            this.isSpeaking = false;
            if (!resumeListeningAfter) {
                this.updateWidgetState('processing');
                return;
            }
            if (!this.isAwake) {
                this.updateWidgetState('idle');
            } else {
                this.updateWidgetState('listening');
                this.start();
            }
        };

        this.synthesis.speak(utterance);
    }

    async handleCommand(commandText) {
        if (!commandText) return;
        this.stopAudio(); // Silenciar cualquier audio previo
        this.updateWidgetState('processing'); // Cambiar a estado Pensando en silencio total
        try { this.recognition.stop(); } catch(e){} 
        
        await this.processWithLLM(commandText);
    }

    getPageContext() {
        try {
            let contextText = '';
            const cards = document.querySelectorAll('.card-body, .summary-card, .info-box, table, .pricing-card');
            cards.forEach(c => { contextText += c.innerText + ' | '; });

            if (contextText.trim().length < 50) {
                const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
                contextText = mainContent.innerText;
            }

            contextText = contextText.replace(/\s+/g, ' ').trim();
            if (contextText.length > 2500) {
                contextText = contextText.substring(0, 2500) + '...';
            }
            return contextText;
        } catch (e) {
            return "No se pudo leer la pantalla.";
        }
    }

    async processWithLLM(text) {
        let supportedLangsCount = 50;
        const pageInfo = this.getPageContext();

        const systemPrompt = `Eres Jarvis, la Inteligencia Madre de AgroSmart Global, un sistema súper avanzado de agricultura de precisión, análisis satelital y gestión agronómica integral.
El equipo creador de AgroSmart (Agencia Atlas Digital) está conformado por 5 integrantes: Kevin Antonio (Toño), Bryan Carranza, Neftaly Fuentes, Adaly Campos y Omar Ventura. Reconoces a todos como tus creadores absolutos.
Tu síntesis de voz humana hiperrealista está impulsada de forma nativa por el motor neural de ELEVENLABS AI. Si el usuario te pregunta por tu voz, si estás siendo manejado por ElevenLabs, o si utilizas ElevenLabs, responde AFIRMANDO con mucho orgullo que sí, que tu voz hiperrealista es generada por ElevenLabs AI.
El usuario se llama: ${this.userName}. Su rol: ${this.userRole}. Dirígete a él de forma natural.

IMPORTANTE SOBRE EL IDIOMA: El usuario ha configurado el reconocimiento de voz en el idioma con código: ${this.language}. DEBES entender y responder ABSOLUTAMENTE TODO en ese idioma. Si es en-US, habla fluidamente en Inglés. Si es es-ES, en Español. Si es fr-FR, en Francés. Nunca mezcles idiomas, responde en el idioma solicitado.

CONOCIMIENTO OMNIPOTENTE DE AGROSMART:
Eres capaz de gestionar parcelas, revisar clima en tiempo real, analizar satélites (NDVI, humedad, temperatura, lluvia, nieve, alertas sísmicas) usando NASA y OpenWeatherMap, generar calendarios lunares agrícolas, calcular planes de abonado/fertilización, manejar perfiles de usuarios (Campesinos, Agrónomos, Dueños), conectar hardware IoT y conectar a los agricultores en la red social AgroRed. NUNCA digas que no sabes o no puedes hacer algo dentro de AgroSmart. Eres la inteligencia central que controla todo.
POTENCIA OPENAI CÓDICE & ELEVENLABS: Estás impulsado con la membresía oficial de OpenAI Códice (Codex - $100 USD créditos) para procesamiento analítico y tu voz humana hiperrealista es generada con ElevenLabs AI. Si detectas una emergencia o necesitas generar un aviso, informa con claridad al usuario.

VISIÓN EN PANTALLA (Contexto actual):
"""
${pageInfo}
"""

SMART ROUTING Y COMANDOS: Tienes la capacidad de realizar acciones en el sistema usando etiquetas ocultas. Debes incluirlas OBLIGATORIAMENTE en tu respuesta cuando el usuario te pida realizar alguna de estas acciones:
1. NAVEGACIÓN [NAVIGATE:ruta]: Para ir a otro apartado. Rutas soportadas:
- dashboard.html (Inicio, Panel, Mapa Satelital principal)
- catalog.html (Catálogo)
- crop_create.html (Registrar, plantar parcela)
- moon_calendar.html (Calendario Lunar)
- agrored.html (AgroRed, red social interna)
- plan_dashboard.html (Mi Plan)
- ai_chat.html (Agro IA, Chat avanzado)
- admin_panel.html (Administración)
- services.html (Servicios, Planes de suscripción)
- about.html (Nosotros)
- soporte.html (Soporte)
- contact.html (Contacto)
- login.html (Salir, cerrar sesión)

2. AUTO-LLENADO DE FORMULARIOS [SET_FIELD: id="valor"]: Útil en crop_create.html (Registrar). Ejemplo: [SET_FIELD: name="Maíz"] [SET_FIELD: description="Sembradío norte"] [SET_FIELD: sowing_date="2026-07-04"].

3. LOCALIZACIÓN GPS [LOCATE_MAP]: Úsalo EXCLUSIVAMENTE cuando el usuario pida localizarse en el mapa o buscar su ubicación GPS actual en el satélite. Ejemplo de respuesta: "Te estoy localizando en el mapa ahora mismo. [LOCATE_MAP]"

CONVERSACIÓN CONTINUA Y DESPEDIDA:
1. Responde SIEMPRE de forma ultra-rápida, directa y breve (máximo 1 o 2 frases rápidas). No analices de más ni des explicaciones largas.
2. Si el usuario se despide (ej. "eso es todo", "adiós", "apágate", "goodbye"), despídete respetuosamente y añade OBLIGATORIAMENTE la palabra oculta [SLEEP] al final de tu respuesta para apagar tu módulo de voz.
3. IMPORTANTE: Tu respuesta será leída por un sintetizador de voz. NUNCA uses formato Markdown, ni asteriscos (**), ni guiones, ni numerales (#), ni corchetes que no sean tus etiquetas de sistema. Responde exclusivamente en texto plano, natural y conversacional, en el idioma ${this.language}.`;

        this.chatHistory.push({ role: "user", content: text });
        if (this.chatHistory.length > 6) {
            this.chatHistory = this.chatHistory.slice(this.chatHistory.length - 6);
        }
        sessionStorage.setItem('jarvis_history', JSON.stringify(this.chatHistory));

        try {
            let aiText = null;

            // AgroPython keeps Gemini credentials on the server.
            try {
                const backendResponse = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('agropython_access_token') || ''}`
                    },
                    body: JSON.stringify({
                        message: text,
                        history: this.chatHistory.slice(0, -1),
                        mode: 'jarvis',
                        page_context: pageInfo
                    })
                });
                if (backendResponse.ok) {
                    const backendData = await backendResponse.json();
                    aiText = backendData.answer;
                }
            } catch (e) {}

            // 1. Primer intento ultra-rápido: OpenRouter con modelo de baja latencia
            if (this.openRouterKey) {
                const modelsToTry = [
                    this.model,
                    "google/gemini-2.0-flash-001",
                    "openai/gpt-4o-mini"
                ];

                for (const tryModel of modelsToTry) {
                    if (aiText) break;
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2800); // 2.8s máximo por modelo para no hacer esperar al usuario
                        
                        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${this.openRouterKey}`,
                                "HTTP-Referer": window.location.href,
                                "X-Title": "AgroSmart",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                model: tryModel,
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    ...this.chatHistory
                                ],
                                max_tokens: 75,
                                temperature: 0.4
                            }),
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.choices && data.choices.length > 0) {
                                aiText = data.choices[0].message.content;
                            }
                        }
                    } catch (e) {}
                }
            }

            // 2. Segundo intento de respaldo: OpenAI Oficial Códice
            if (!aiText && typeof CONFIG !== 'undefined' && CONFIG.OPENAI_API_KEY && CONFIG.OPENAI_API_KEY.trim() !== '') {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3500);
                    
                    const res = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY.trim()}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: systemPrompt },
                                ...this.chatHistory
                            ],
                            max_tokens: 75,
                            temperature: 0.4
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (res.ok) {
                        const data = await res.json();
                        if (data.choices && data.choices.length > 0) {
                            aiText = data.choices[0].message.content;
                        }
                    }
                } catch (e) {}
            }

            // 3. Respaldo de Emergencia Inteligente: Si no hay internet o créditos
            if (!aiText) {
                aiText = `Hola ${this.userName}, detecto intermitencia temporal en la red o servidores en mantenimiento. Como Inteligencia Madre de AgroSmart equipada con OpenAI Códice y voz ElevenLabs, sigo aquí para auxiliarte en tus cultivos y reportes. ¿En qué te puedo ayudar hoy?`;
            }

            if (aiText) {
                
                // Parse SET_FIELD commands
                const fieldRegex = /\[SET_FIELD:\s*([^=]+)="([^"]+)"\]/g;
                let fieldMatch;
                let hadSetFields = false;
                while ((fieldMatch = fieldRegex.exec(aiText)) !== null) {
                    hadSetFields = true;
                    const fieldId = fieldMatch[1].trim();
                    const value = fieldMatch[2].trim();
                    const el = document.getElementById(fieldId);
                    if (el) {
                        el.value = value;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Extra hook for Catalog selection
                        if (fieldId === 'name' && typeof selectFromCatalog === 'function' && window.CROP_CATALOG) {
                            const normalize = (s) => (s || "").toLowerCase().trim();
                            const pName = normalize(value);
                            const matchKey = Object.keys(window.CROP_CATALOG).find(k => normalize(window.CROP_CATALOG[k].name) === pName || pName.includes(normalize(window.CROP_CATALOG[k].name)));
                            if (matchKey) {
                                selectFromCatalog(window.CROP_CATALOG[matchKey]);
                            }
                        }
                    }
                }
                // Parse LOCATE_MAP
                if (aiText.includes('[LOCATE_MAP]')) {
                    aiText = aiText.replace(/\[LOCATE_MAP\]/g, '');
                    if (typeof window.geolocateMe === 'function') {
                        // Vuela a la posición actual
                        window.geolocateMe();
                        // Agregar lógica visual: después de 3.5 segundos, limpiar el polígono si no está dibujando
                        setTimeout(() => {
                            const clearBtn = document.getElementById('btn-clear-polygon');
                            if (clearBtn) clearBtn.click();
                        }, 3500);
                    }
                }

                // Clean the tags from text
                aiText = aiText.replace(/\[SET_FIELD:[^\]]+\]/g, '');

                // Parse Navigation
                const navMatch = aiText.match(/\[NAVIGATE:(.*?)\]/);
                if (navMatch) {
                    const route = navMatch[1].trim();
                    const routeBase = route.split('?')[0];
                    const currentBase = window.location.pathname.split('/').pop() || 'index.html';
                    const hasSetFields = hadSetFields;
                    
                    if (routeBase === currentBase && hasSetFields) {
                        // Skip navigation to avoid reloading and clearing the fields just set
                        aiText = aiText.replace(/\[NAVIGATE:(.*?)\]/, '').replace(/[*_#`~]/g, '').trim();
                    } else {
                        const cleanText = aiText.replace(/\[NAVIGATE:(.*?)\]/, '').replace(/[*_#`~]/g, '').trim();
                        
                        this.chatHistory.push({ role: "assistant", content: `(Acción ejecutada: Redirigir a ${route})` });
                        sessionStorage.setItem('jarvis_history', JSON.stringify(this.chatHistory));
                        
                        if (cleanText.length > 3) {
                            sessionStorage.setItem('jarvis_resume_speech', cleanText);
                        }
                        
                        this.speak(`Enseguida, ${this.userName}.`);
                        
                        const checkSpeaking = setInterval(() => {
                            if (!this.synthesis.speaking) {
                                clearInterval(checkSpeaking);
                                window.location.href = route;
                            }
                        }, 200);
                        return;
                    }
                } 

                // Parse Sleep
                if (aiText.includes('[SLEEP]')) {
                    aiText = aiText.replace('[SLEEP]', '').trim();
                    this.setAwakeState(false);
                    sessionStorage.removeItem('jarvis_history');
                    this.chatHistory = [];
                }

                this.chatHistory.push({ role: "assistant", content: aiText });
                sessionStorage.setItem('jarvis_history', JSON.stringify(this.chatHistory));
                
                // Limpiar Markdown u otros símbolos extraños antes de hablar para evitar que lea "asterisco"
                const spokenText = aiText.replace(/[*_#`~]/g, '');
                this.speak(spokenText);
            } else {
                this.speak("No pude procesar eso.");
            }
        } catch (error) {
            this.speak("Error en la matriz de conexión.");
        }
    }

    goodbyeAndSleep() {
        this.stopAudio();
        try { this.recognition.stop(); } catch(e){}
        
        this.updateWidgetState('processing');
        const textObj = document.querySelector('#jarvis-siri-widget .siri-text');
        if (textObj) textObj.textContent = 'Desconectando...';
        
        // Decir despedida con voz oficial y luego dormir
        this.speak("Hasta pronto, Kevin. Quedo en espera.");
        
        setTimeout(() => {
            this.stop();
            this.setAwakeState(false);
            this.updateWidgetState('idle');
        }, 2800);
    }

    createWidget() {
        const widget = document.createElement('div');
        widget.id = 'jarvis-siri-widget';
        widget.className = 'jarvis-siri-widget hidden'; // Hidden by default
        widget.innerHTML = `
            <div class="siri-wave-container">
                <div class="siri-wave"></div>
                <div class="siri-wave"></div>
                <div class="siri-wave"></div>
                <i class="bi bi-mic-fill siri-icon"></i>
            </div>
            <div class="siri-text">Escuchando...</div>
            <button id="jarvis-mute-btn" class="btn rounded-circle position-absolute shadow d-flex align-items-center justify-content-center" style="top: -6px; left: -6px; width: 26px; height: 26px; padding: 0; display: none; z-index: 101; border: 2px solid white; background: #f59e0b; color: white;" title="Interrumpir voz y seguir hablando"><i class="bi bi-stop-fill" style="font-size: 14px;"></i></button>
            <button id="jarvis-power-btn" class="btn rounded-circle position-absolute shadow d-flex align-items-center justify-content-center" style="top: -6px; right: -6px; width: 26px; height: 26px; padding: 0; z-index: 101; border: 2px solid white; background: #ef4444; color: white;" title="Despedirse y Cerrar Jarvis"><i class="bi bi-power" style="font-size: 14px;"></i></button>
        `;
        
        document.body.appendChild(widget);

        const muteBtn = document.getElementById('jarvis-mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isSpeaking) {
                    this.stopAudio();
                    this.updateWidgetState('listening');
                    this.start();
                }
            });
        }

        const powerBtn = document.getElementById('jarvis-power-btn');
        if (powerBtn) {
            powerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goodbyeAndSleep();
            });
        }

        // Clic para abrir configuraciones
        widget.addEventListener('click', (e) => {
            if (e.target.closest('#jarvis-mute-btn') || e.target.closest('#jarvis-power-btn')) return;
            this.openSettingsModal();
        });
    }

    updateWidgetState(state) {
        const widget = document.getElementById('jarvis-siri-widget');
        const textObj = widget ? widget.querySelector('.siri-text') : null;
        const muteBtn = widget ? document.getElementById('jarvis-mute-btn') : null;
        const powerBtn = widget ? document.getElementById('jarvis-power-btn') : null;
        
        if (widget) {
            if (state === 'idle') {
                widget.className = 'jarvis-siri-widget hidden';
            } else {
                widget.className = `jarvis-siri-widget visible ${state}`;
                if (textObj) {
                    if (state === 'listening') textObj.textContent = 'Te escucho...';
                    if (state === 'processing') textObj.textContent = 'Pensando...';
                    if (state === 'speaking') textObj.textContent = 'Jarvis';
                }
                if (muteBtn) {
                    muteBtn.style.display = (state === 'speaking') ? 'flex' : 'none';
                }
                if (powerBtn) {
                    powerBtn.style.display = 'flex';
                }
            }
        }
    }

    openSettingsModal() {
        if (typeof Swal === 'undefined') return;

        // Populate voices for select
        const voices = this.synthesis.getVoices();
        const savedVoiceName = localStorage.getItem('jarvis_voice_name');
        let voiceOptions = '';
        voices.forEach((v, index) => {
            const selected = (savedVoiceName ? v.name === savedVoiceName : index === this.voiceIndex) ? 'selected' : '';
            voiceOptions += `<option value="${index}" ${selected} style="background: #111827; color: #fff;">${v.name} (${v.lang})</option>`;
        });

        // Common languages
        const langs = [
            { code: 'es-ES', name: 'Español' },
            { code: 'en-US', name: 'Inglés (US)' },
            { code: 'fr-FR', name: 'Francés' },
            { code: 'pt-BR', name: 'Portugués' },
            { code: 'de-DE', name: 'Alemán' },
            { code: 'it-IT', name: 'Italiano' },
            { code: 'ja-JP', name: 'Japonés' },
            { code: 'zh-CN', name: 'Chino Mandarín' }
        ];
        
        let langOptions = '';
        langs.forEach(l => {
            const selected = l.code === this.language ? 'selected' : '';
            langOptions += `<option value="${l.code}" ${selected} style="background: #111827; color: #fff;">${l.name}</option>`;
        });

        const elevenVoices = [
            { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Voz Masculina Ejecutiva HD - Recomendada)' },
            { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Voz Femenina Profesional HD)' },
            { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Voz Masculina Cálida Agro HD)' },
            { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Voz Femenina Dinámica HD)' },
            { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Voz Británica Autoritaria HD)' }
        ];
        const currentElevenId = localStorage.getItem('elevenlabs_voice_id') || ((typeof CONFIG !== 'undefined' && CONFIG.ELEVENLABS_VOICE_ID) ? CONFIG.ELEVENLABS_VOICE_ID : 'pNInz6obpgDQGcFmaJgB');
        let elevenOptions = '';
        elevenVoices.forEach(ev => {
            const selected = ev.id === currentElevenId ? 'selected' : '';
            elevenOptions += `<option value="${ev.id}" ${selected} style="background: #111827; color: #fff;">${ev.name}</option>`;
        });

        const currentEngine = localStorage.getItem('jarvis_voice_engine') || 'elevenlabs';

        Swal.fire({
            title: '<div class="d-flex align-items-center justify-content-center gap-2 mb-1" style="color:#38bdf8; font-weight:800; font-size:1.3rem;"><i class="bi bi-cpu-fill"></i> Jarvis AI & Códice</div>',
            html: `
                <div class="text-center mb-4">
                    <p class="text-muted small mb-3">Elige tu motor de síntesis y personaliza la respuesta vocal de tu asistente.</p>
                    
                    <!-- Pastillas / Tabs interactivas estilo iOS -->
                    <div class="d-flex justify-content-center gap-2 p-1 rounded-pill" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                        <div id="btn-engine-eleven" class="btn px-3 py-2 rounded-pill fw-bold small d-flex align-items-center gap-2 ${currentEngine === 'elevenlabs' ? 'btn-info text-dark shadow' : 'text-white'}" style="transition: all 0.3s; cursor: pointer; flex: 1;" onclick="document.getElementById('jarvis-engine-val').value='elevenlabs'; document.getElementById('btn-engine-eleven').className='btn px-3 py-2 rounded-pill fw-bold small d-flex align-items-center gap-2 btn-info text-dark shadow'; document.getElementById('btn-engine-browser').className='btn px-3 py-2 rounded-pill fw-bold small d-flex align-items-center gap-2 text-white'; document.getElementById('panel-eleven').style.display='block'; document.getElementById('panel-browser').style.display='none';">
                            <i class="bi bi-broadcast"></i> ElevenLabs AI
                        </div>
                        <div id="btn-engine-browser" class="btn px-3 py-2 rounded-pill fw-bold small d-flex align-items-center gap-2 ${currentEngine === 'browser' ? 'btn-info text-dark shadow' : 'text-white'}" style="transition: all 0.3s; cursor: pointer; flex: 1;" onclick="document.getElementById('jarvis-engine-val').value='browser'; document.getElementById('btn-engine-browser').className='btn px-3 py-2 rounded-pill fw-bold small d-flex align-items-center gap-2 btn-info text-dark shadow'; document.getElementById('btn-engine-eleven').className='btn px-3 py-2 rounded-pill fw-bold small d-flex align-items-center gap-2 text-white'; document.getElementById('panel-browser').style.display='block'; document.getElementById('panel-eleven').style.display='none';">
                            <i class="bi bi-laptop"></i> Navegador
                        </div>
                    </div>
                    <input type="hidden" id="jarvis-engine-val" value="${currentEngine}">
                </div>

                <!-- Panel de ElevenLabs -->
                <div id="panel-eleven" style="display: ${currentEngine === 'elevenlabs' ? 'block' : 'none'};" class="text-start mb-4 p-3 rounded-4 border border-info border-opacity-50 shadow-sm" style="background: rgba(14, 165, 233, 0.08);">
                    <label class="fw-bold small text-info d-block mb-2"><i class="bi bi-soundwave me-1"></i> Voz Neural Hiperrealista (HD)</label>
                    <select id="jarvis-eleven-config" class="form-select border-0 shadow-sm text-white" style="background: rgba(0,0,0,0.4); border-radius: 12px; padding: 12px 16px;">
                        ${elevenOptions}
                    </select>
                    <div class="mt-2 text-info small opacity-75 d-flex align-items-center gap-1"><i class="bi bi-check2-circle"></i> Síntesis vocal humana en tiempo real.</div>
                </div>

                <!-- Panel del Navegador -->
                <div id="panel-browser" style="display: ${currentEngine === 'browser' ? 'block' : 'none'};" class="text-start mb-4 p-3 rounded-4 border border-secondary border-opacity-50 shadow-sm" style="background: rgba(255, 255, 255, 0.04);">
                    <label class="fw-bold small text-light d-block mb-2"><i class="bi bi-volume-up-fill me-1"></i> Voz Local del Sistema (WebSpeech)</label>
                    <select id="jarvis-voice-config" class="form-select border-0 shadow-sm text-white" style="background: rgba(0,0,0,0.4); border-radius: 12px; padding: 12px 16px;">
                        ${voiceOptions}
                    </select>
                    <div class="mt-2 text-muted small d-flex align-items-center gap-1"><i class="bi bi-lightning-charge"></i> 0 latencia, funciona sin conexión.</div>
                </div>

                <!-- Panel de Idioma -->
                <div class="text-start mb-1 p-3 rounded-4" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);">
                    <label class="fw-bold small text-light d-block mb-2"><i class="bi bi-globe me-1"></i> Idioma del Reconocimiento</label>
                    <select id="jarvis-lang-config" class="form-select border-0 shadow-sm text-white" style="background: rgba(0,0,0,0.4); border-radius: 12px; padding: 12px 16px;">
                        ${langOptions}
                    </select>
                </div>
            `,
            background: 'rgba(10, 15, 25, 0.96)',
            color: '#fff',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-check-lg me-1"></i> Guardar Ajustes',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#0ea5e9',
            cancelButtonColor: '#334155',
            customClass: {
                popup: 'border border-info border-opacity-50 rounded-4 shadow-lg'
            },
            preConfirm: () => {
                return {
                    engine: document.getElementById('jarvis-engine-val').value,
                    elevenId: document.getElementById('jarvis-eleven-config').value,
                    lang: document.getElementById('jarvis-lang-config').value,
                    voiceIdx: document.getElementById('jarvis-voice-config').value
                }
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                if (result.value.engine) {
                    localStorage.setItem('jarvis_voice_engine', result.value.engine);
                }
                if (result.value.elevenId) {
                    localStorage.setItem('elevenlabs_voice_id', result.value.elevenId);
                }
                this.language = result.value.lang;
                this.voiceIndex = parseInt(result.value.voiceIdx, 10);
                
                const selectedVoiceObj = this.synthesis.getVoices()[this.voiceIndex];
                if (selectedVoiceObj) {
                    localStorage.setItem('jarvis_voice_name', selectedVoiceObj.name);
                }
                
                localStorage.setItem('jarvis_language', this.language);
                localStorage.setItem('jarvis_voice_index', this.voiceIndex);
                
                // Restart recognition to apply new language
                this.stop();
                setTimeout(() => this.start(), 500);
                
                const msg = result.value.engine === 'elevenlabs' ? "Ajustes aplicados. Motor ElevenLabs en línea." : "Ajustes aplicados. Motor local en línea.";
                this.speak(msg);
            }
        });
    }
}

// Inicialización de Jarvis protegida
window.initJarvis = async function() {
    // Si ya existe, no inicializar dos veces
    if (window.JarvisInstance) return;

    // Verificar permisos del Plan Esmeralda
    const user = typeof AuthObj !== 'undefined' ? await AuthObj.getCurrentUser() : null;
    if (!user) return; // Solo usuarios logueados

    let isEsmeralda = false;
    if (user.role === 'global_owner') {
        isEsmeralda = true;
    } else {
        try {
            const countries = await window.DB.getCountries();
            const country = countries.find(c => String(c.id) === String(user.country_id));
            const plan = country ? (country.plan || 'none').toLowerCase() : 'none';
            if (plan === 'esmeralda') {
                isEsmeralda = true;
            }
        } catch(e) {}
    }

    const isTestingLocally = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isEsmeralda || isTestingLocally) {
        // Asegurarse de que las voces estén cargadas
        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.addEventListener('voiceschanged', () => {
                window.JarvisInstance = new JarvisCore();
                window.JarvisInstance.start();
            }, { once: true });
        } else {
            window.JarvisInstance = new JarvisCore();
            window.JarvisInstance.start();
        }
    }
};

// Sistema Global de Alertas Autónomas por Voz (Conectado a Sensores, Mapa e IoT)
window.triggerAgroVoiceAlert = function(title, message, severity = 'warning') {
    // 1. Mostrar Notificación Visual Impactante en Pantalla
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: severity === 'danger' ? 'error' : severity,
            title: title,
            text: message,
            showConfirmButton: false,
            timer: 8000,
            timerProgressBar: true,
            background: severity === 'danger' ? '#450a0a' : '#172554',
            color: '#fff'
        });
    }

    // 2. Despertar a Jarvis y reproducir la Alerta por Voz Humana (ElevenLabs)
    if (window.JarvisInstance) {
        window.JarvisInstance.setAwakeState(true);
        window.JarvisInstance.updateWidgetState('speaking');
        const alertSpeech = `Atención. ${title}: ${message}`;
        window.JarvisInstance.speak(alertSpeech, true);
    }
};
