
import { GoogleGenAI } from "https://esm.run/@google/genai";

(function() {
    // 1. Configuración
    var config = window.oriConfig || {};
    
    // VALIDACIÓN CRÍTICA: Verificar si la API Key está presente
    if (!config.apiKey || config.apiKey.includes("PEGAR_TU_API_KEY")) {
        console.warn("ORI Widget: No se ha configurado la API Key de Gemini correctamente. El chat no responderá.");
    }

    var widgetId = config.widgetId;
    var brandColor = config.brandColor || '#6366f1'; 
    var position = config.position || 'bottom-right'; 
    var welcomeMessage = config.welcomeMessage || "¡Hola! 👋 ¿En qué podemos ayudarte hoy?";
    
    // Inicializar cliente de Gemini
    let aiClient = null;
    try {
        if (config.apiKey && !config.apiKey.includes("PEGAR_TU_API_KEY")) {
            aiClient = new GoogleGenAI({ apiKey: config.apiKey });
        }
    } catch (e) {
        console.error("ORI Widget: Error inicializando Gemini Client", e);
    }

    // 2. Estilos CSS Inyectados
    var styles = `
        .ori-widget-container {
            position: fixed;
            bottom: 20px;
            ${position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: ${position === 'bottom-left' ? 'flex-start' : 'flex-end'};
        }
        
        .ori-launcher {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: ${brandColor};
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .ori-launcher:hover {
            transform: scale(1.1);
        }
        .ori-launcher svg {
            width: 32px;
            height: 32px;
            fill: white;
        }

        .ori-window {
            width: 350px;
            height: 500px;
            max-height: 80vh;
            background: white;
            border-radius: 16px;
            box-shadow: 0 5px 40px rgba(0,0,0,0.16);
            display: none;
            flex-direction: column;
            overflow: hidden;
            margin-bottom: 16px;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            transition: opacity 0.2s ease-out, transform 0.2s ease-out;
            border: 1px solid #e2e8f0;
        }
        .ori-window.open {
            display: flex;
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        .ori-header {
            background-color: ${brandColor};
            color: white;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ori-header-info h3 { margin: 0; font-size: 16px; font-weight: 600; }
        .ori-header-info p { margin: 2px 0 0; font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 4px; }
        .ori-status-dot { width: 8px; height: 8px; background-color: #4ade80; border-radius: 50%; }
        .ori-close-btn { background: none; border: none; color: white; cursor: pointer; font-size: 20px; padding: 4px; line-height: 1; opacity: 0.8; }
        .ori-close-btn:hover { opacity: 1; }

        .ori-body {
            flex: 1;
            padding: 16px;
            background-color: #f8fafc;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .ori-message {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        .ori-message.bot {
            background-color: white;
            color: #1e293b;
            border-bottom-left-radius: 2px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .ori-message.user {
            background-color: ${brandColor};
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }
        .ori-typing {
            font-size: 12px; color: #94a3b8; margin-left: 4px; display: none;
        }

        .ori-footer {
            padding: 12px;
            background: white;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .ori-input {
            flex: 1;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 10px 16px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }
        .ori-input:focus { border-color: ${brandColor}; }
        .ori-send-btn {
            background: transparent;
            border: none;
            color: ${brandColor};
            cursor: pointer;
            padding: 6px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ori-send-btn:hover { background-color: #f1f5f9; }
        .ori-send-btn svg { width: 20px; height: 20px; fill: currentColor; }
    `;

    var styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 3. Estructura HTML
    var container = document.createElement('div');
    container.className = 'ori-widget-container';

    var htmlContent = `
        <div class="ori-window" id="ori-window">
            <div class="ori-header">
                <div class="ori-header-info">
                    <h3>Asistente Virtual</h3>
                    <p><span class="ori-status-dot"></span> En línea</p>
                </div>
                <button class="ori-close-btn" id="ori-close">✕</button>
            </div>
            <div class="ori-body" id="ori-body">
                <div class="ori-message bot">
                    ${welcomeMessage}
                </div>
                <div class="ori-typing" id="ori-typing">Escribiendo...</div>
            </div>
            <div class="ori-footer">
                <input type="text" class="ori-input" id="ori-input" placeholder="Escribe un mensaje..." />
                <button class="ori-send-btn" id="ori-send">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>
        <div class="ori-launcher" id="ori-launcher">
            <svg id="ori-icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            <svg id="ori-icon-close" style="display:none;" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </div>
    `;

    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // 4. Lógica
    var launcher = document.getElementById('ori-launcher');
    var windowEl = document.getElementById('ori-window');
    var closeBtn = document.getElementById('ori-close');
    var sendBtn = document.getElementById('ori-send');
    var inputEl = document.getElementById('ori-input');
    var bodyEl = document.getElementById('ori-body');
    var iconChat = document.getElementById('ori-icon-chat');
    var iconClose = document.getElementById('ori-icon-close');
    var typingIndicator = document.getElementById('ori-typing');

    var isOpen = false;
    
    // Historial de conversación simple para mantener contexto
    // Nota: Gemini SDK no maneja historial automáticamente en generateContent, 
    // pero podemos simular un contexto básico adjuntando instrucciones al prompt.
    
    function toggleWidget() {
        isOpen = !isOpen;
        if (isOpen) {
            windowEl.classList.add('open');
            iconChat.style.display = 'none';
            iconClose.style.display = 'block';
            setTimeout(function() { inputEl.focus(); }, 100);
        } else {
            windowEl.classList.remove('open');
            iconChat.style.display = 'block';
            iconClose.style.display = 'none';
        }
    }

    function appendMessage(text, type) {
        var msgDiv = document.createElement('div');
        msgDiv.className = 'ori-message ' + type;
        msgDiv.innerText = text;
        bodyEl.insertBefore(msgDiv, typingIndicator);
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    async function handleSend() {
        var text = inputEl.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        inputEl.value = '';
        
        // Mostrar "escribiendo..."
        typingIndicator.style.display = 'block';
        bodyEl.scrollTop = bodyEl.scrollHeight;

        try {
            if (!aiClient) {
                throw new Error("Cliente de IA no inicializado. Falta API Key.");
            }

            // Preparar llamada a Gemini
            const modelId = config.aiModel || 'gemini-2.5-flash';
            
            // Prompt System Instruction + User Message
            const response = await aiClient.models.generateContent({
                model: modelId,
                contents: [
                    { 
                        role: 'user', 
                        parts: [
                            { text: "Instrucciones del sistema: " + (config.aiPersonality || "Eres un asistente útil.") },
                            { text: text }
                        ] 
                    } 
                ]
            });
            
            const reply = response.text || "Lo siento, no pude procesar tu respuesta.";
            
            typingIndicator.style.display = 'none';
            appendMessage(reply, 'bot');

        } catch (error) {
            console.error("Error llamando a Gemini:", error);
            typingIndicator.style.display = 'none';
            appendMessage("Lo siento, hubo un error de conexión. Por favor verifica la configuración.", 'bot');
        }
    }

    launcher.addEventListener('click', toggleWidget);
    closeBtn.addEventListener('click', toggleWidget);
    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSend();
    });

    console.log("ORI Widget v2.0 (ESM) cargado correctamente.");
})();
