// notification-service.js
// Servicio unificado de notificaciones para AgroSmart
// Reemplaza EmailJS como canal principal, usando n8n webhooks
// Compatible con WhatsApp Business Cloud API y email como fallback

(function() {
    'use strict';

    const NotificationService = {
        /**
         * Envía datos a un endpoint de n8n webhook
         * @param {string} endpoint - Ruta del webhook (ej: 'ticket', 'contact', 'whatsapp-reminder')
         * @param {object} data - Payload a enviar
         * @returns {Promise<{success: boolean, data?: any, error?: string}>}
         */
        async _post(endpoint, data) {
            const config = window.CONFIG || {};
            const baseUrl = config.N8N_WEBHOOK_URL;

            if (!baseUrl) {
                console.warn('[NotificationService] N8N_WEBHOOK_URL no configurada. Notificación omitida.');
                return { success: false, error: 'N8N_WEBHOOK_URL not configured' };
            }

            const url = `${baseUrl}/${endpoint}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...data,
                        _source: 'agrosmart-frontend',
                        _timestamp: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    console.warn(`[NotificationService] Error ${response.status}:`, errorText);
                    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
                }

                const responseData = await response.json().catch(() => ({}));
                return { success: true, data: responseData };

            } catch (error) {
                console.warn('[NotificationService] Network error:', error.message);
                return { success: false, error: error.message };
            }
        },

        /**
         * Envía notificación de ticket de soporte (reemplaza notifyTicketEmail)
         * @param {object} report - Datos del ticket/ficha de soporte
         * @param {string} type - Tipo: 'new', 'escalated', 'resolved', 'call_alert'
         */
        async sendTicketNotification(report, type = 'new') {
            const result = await this._post('ticket-notification', {
                report: report,
                notification_type: type,
                caller_name: report.caller_name || 'Usuario',
                caller_email: report.caller_email || '',
                caller_phone: report.caller_phone || '',
                subject: report.subject || 'Soporte Técnico',
                description: report.description || '',
                target_role: report.target_role || 'ministry_admin',
                country: report.country || 'Global'
            });

            // Fallback a EmailJS si n8n falla y EmailJS está disponible
            if (!result.success) {
                this._emailJsFallback(report, type);
            }

            return result;
        },

        /**
         * Envía formulario de contacto via n8n
         * @param {object} data - Datos del formulario: { name, email, phone, subject, message }
         */
        async sendContactForm(data) {
            const result = await this._post('contact-form', {
                name: data.name,
                email: data.email,
                phone: data.phone || '',
                subject: data.subject || 'Contacto desde AgroSmart',
                message: data.message
            });

            // Fallback a EmailJS si n8n falla
            if (!result.success) {
                this._emailJsContactFallback(data);
            }

            return result;
        },

        /**
         * Solicita envío de recordatorio WhatsApp vía n8n
         * @param {object} data - Datos: { activity_id, user_id, phone, activity_type, crop_name, user_name }
         */
        async triggerWhatsAppReminder(data) {
            if (!window.CONFIG?.WHATSAPP_ENABLED) {
                console.warn('[NotificationService] WhatsApp deshabilitado por feature flag.');
                return { success: false, error: 'WhatsApp disabled' };
            }

            return await this._post('whatsapp-reminder', {
                activity_id: data.activity_id,
                user_id: data.user_id,
                phone_number: data.phone,
                activity_type: data.activity_type,
                crop_name: data.crop_name,
                user_name: data.user_name,
                scheduled_date: data.scheduled_date
            });
        },

        /**
         * Notifica alerta de videollamada vía n8n
         * @param {object} report - Datos del ticket con sala de video
         */
        async sendVideocallAlert(report) {
            return await this._post('videocall-alert', {
                report: report,
                room_name: report.room_name,
                caller_name: report.caller_name,
                caller_phone: report.caller_phone || '',
                subject: report.subject
            });
        },

        // --- FALLBACKS EmailJS (respaldo silencioso) ---

        /**
         * Fallback para tickets cuando n8n no está disponible
         */
        _emailJsFallback(report, type) {
            if (typeof emailjs === 'undefined' || typeof CONFIG === 'undefined') return;

            try {
                let toEmail = report.caller_email || 'soporte@agrosmart.global';
                let subject = '🚨 NUEVA FICHA DE SOPORTE - AGROSMART';
                let msg = `Se ha generado una nueva ficha de soporte técnica. Asunto: ${report.subject}. Descripción: ${report.description}. Solicitante: ${report.caller_name} (${report.caller_role}).`;

                if (type === 'call_alert') {
                    toEmail = report.caller_email || 'usuario@gmail.com';
                    subject = '🎥 ¡ADMINISTRADOR EN SALA DE VIDEOLLAMADA - AGROSMART!';
                    msg = `Hola ${report.caller_name}, el administrador ha ingresado a la sala de videollamada para atender tu caso (${report.subject}).`;
                } else if (type === 'escalated' || report.target_role === 'global_owner') {
                    toEmail = 'creadores.atlasdigital@agrosmart.global';
                    subject = '🚨 [ESCALAMIENTO GLOBAL] FICHA DIRIGIDA A CREADORES AGROSMART';
                    msg = `Un Administrador de Ministerio ha escalado una ficha. Asunto: ${report.subject}.`;
                }

                if (CONFIG.EMAILJS_SERVICE_ID && CONFIG.EMAILJS_TEMPLATE_ID && CONFIG.EMAILJS_PUBLIC_KEY) {
                    emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
                        to_email: toEmail,
                        from_name: 'AgroSmart Soporte',
                        subject: subject,
                        message: msg
                    }, CONFIG.EMAILJS_PUBLIC_KEY).catch(() => {});
                }
            } catch(e) { /* Silenciado */ }
        },

        /**
         * Fallback para contacto cuando n8n no está disponible
         */
        _emailJsContactFallback(data) {
            if (typeof emailjs === 'undefined' || typeof CONFIG === 'undefined') return;

            try {
                if (CONFIG.EMAILJS_SERVICE_ID && CONFIG.EMAILJS_TEMPLATE_ID && CONFIG.EMAILJS_PUBLIC_KEY) {
                    emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
                        to_email: 'contacto@agrosmart.global',
                        from_name: data.name || 'Visitante',
                        subject: data.subject || 'Contacto Web',
                        message: `De: ${data.name} (${data.email})\n\n${data.message}`
                    }, CONFIG.EMAILJS_PUBLIC_KEY).catch(() => {});
                }
            } catch(e) { /* Silenciado */ }
        },

        /**
         * Validar formato de número de teléfono internacional
         * @param {string} phone - Número completo con código de país, ej: '+50371234567'
         * @returns {boolean}
         */
        validatePhoneNumber(phone) {
            if (!phone) return false;
            // Formato internacional: + seguido de 7-15 dígitos
            const intlRegex = /^\+[1-9]\d{6,14}$/;
            return intlRegex.test(phone.replace(/\s/g, ''));
        },

        /**
         * Formatear número de teléfono internacional
         * @param {string} countryCode - Código de país, ej: '+503'
         * @param {string} phoneNumber - Número local, ej: '71234567'
         * @returns {string} Número formateado, ej: '+50371234567'
         */
        formatPhoneNumber(countryCode, phoneNumber) {
            const cleanCode = (countryCode || '+503').replace(/\s/g, '');
            const cleanNumber = (phoneNumber || '').replace(/[\s\-\(\)]/g, '');
            return `${cleanCode}${cleanNumber}`;
        }
    };

    // Exponer globalmente
    window.NotificationService = NotificationService;

})();
