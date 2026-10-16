// auth.js
// Handles the authentication flow transitions and logic
// WhatsApp-First Registration (Direct, No OTP Required)
// Recovery flow preserved with OTP via EmailJS as fallback

let temporalEmail = '';
let temporalCountryId = null;
let temporalOTP = '';
let otpExpiry = 0;
let isRecoveryFlow = false;

// Initialize EmailJS (kept as fallback for password recovery)
if (typeof emailjs !== 'undefined') {
    const config = window.CONFIG || {};
    if (config.EMAILJS_PUBLIC_KEY) {
        emailjs.init(config.EMAILJS_PUBLIC_KEY);
    }
}

function switchView(viewId) {
    const containers = document.querySelectorAll('.view-section');
    containers.forEach(el => {
        el.classList.remove('active');
    });
    
    setTimeout(() => {
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.classList.add('active');
            hideErrors();
            
            const firstInput = activeView.querySelector('input');
            if (firstInput) firstInput.focus();
        }
    }, 50);
}

function hideErrors() {
    document.querySelectorAll('.auth-error').forEach(el => {
        el.style.display = 'none';
        el.innerText = '';
    });
    document.querySelectorAll('.auth-success').forEach(el => {
        if (el.id !== 'otp-success') el.style.display = 'none';
    });
}

function showError(viewId, message) {
    let errorId = '';
    if (viewId === 'login-view') errorId = 'login-error';
    if (viewId === 'register-view') errorId = 'register-error';
    if (viewId === 'otp-view') errorId = 'otp-error';
    if (viewId === 'create-password-view') errorId = 'create-pwd-error';
    if (viewId === 'recover-view') errorId = 'recover-error';

    if (errorId) {
        const errEl = document.getElementById(errorId);
        errEl.innerText = message;
        errEl.style.display = 'block';
        errEl.classList.add('animate__animated', 'animate__shakeX');
        setTimeout(() => errEl.classList.remove('animate__shakeX'), 1000);
    }
}

// --- Phone Number Validation & Formatting Utilities ---

/**
 * Validates a phone number (digits only, 7-15 characters)
 */
function validatePhoneInput(phone) {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^[0-9]{7,15}$/.test(cleaned);
}

/**
 * Formats phone number to international format
 * @param {string} countryCode - e.g. '+503'
 * @param {string} phone - e.g. '71234567'
 * @returns {string} e.g. '+50371234567'
 */
function formatInternationalPhone(countryCode, phone) {
    const cleanCode = (countryCode || '+503').replace(/\s/g, '');
    const cleanNumber = (phone || '').replace(/[\s\-\(\)]/g, '');
    return `${cleanCode}${cleanNumber}`;
}

/**
 * Populate phone country code selector from CONFIG
 */
function populatePhoneCountryCodes(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const config = window.CONFIG || {};
    const codes = config.PHONE_COUNTRY_CODES || [
        { code: '+503', country: 'El Salvador', flag: '🇸🇻' }
    ];
    
    select.innerHTML = '';
    codes.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.code;
        opt.textContent = `${item.flag} ${item.code}`;
        opt.title = item.country;
        select.appendChild(opt);
    });
}

// --- OTP (kept for password recovery only) ---

async function sendRealOTP(email, btn, originalText, context) {
    temporalEmail = email;
    temporalOTP = Math.floor(100000 + Math.random() * 900000).toString();
    otpExpiry = Date.now() + (30 * 60 * 1000); // 30 mins

    btn.innerText = 'Enviando...';
    btn.disabled = true;

    try {
        if (typeof emailjs === 'undefined') throw new Error("EmailJS SDK no cargado.");

        const templateParams = {
            email: temporalEmail,
            from_name: "AgroSmart System",
            time: new Date(otpExpiry).toLocaleTimeString(),
            passcode: temporalOTP,
            html_message: `
<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <img style="height: 50px; vertical-align: middle" height="50px" src="https://atahzqmsfuizsxwyikao.supabase.co/storage/v1/object/public/public_assets/logo.png" alt="AgroSmart Logo" />
  </div>
  <p style="padding-top: 14px; border-top: 1px solid #eaeaea; color: #444; line-height: 1.6;">
    Para verificar tu acceso a <strong>AgroSmart</strong>, utiliza el siguiente código de verificación (OTP):
  </p>
  <div style="font-size: 32px; font-weight: 800; color: #10b981; text-align: center; margin: 25px 0; letter-spacing: 5px;">${temporalOTP}</div>
  <p style="color: #666;">Este código será válido durante 30 minutos, hasta las <strong>${new Date(otpExpiry).toLocaleTimeString()}</strong>.</p>
  <div style="background: #f9fafb; padding: 15px; border-radius: 10px; font-size: 12px; color: #888;">
    No compartas este código con nadie. Si no solicitaste este acceso, puedes ignorar este correo de forma segura.<br><br>
    AgroSmart nunca te pedirá códigos de acceso ni enlaces por correo electrónico. Ten cuidado con posibles intentos de phishing.
  </div>
  <p style="margin-top: 25px; text-align: center; color: #333; font-weight: 600;">Gracias por usar AgroSmart para tus cultivos.</p>
</div>`
        };

        await emailjs.send(
            CONFIG.EMAILJS_SERVICE_ID,
            CONFIG.EMAILJS_TEMPLATE_ID,
            templateParams
        );

        switchView('otp-view');
        document.getElementById('display-otp-email').innerText = temporalEmail;
        document.getElementById('otp-success').innerText = `¡Código de ${context} enviado! Revisa tu bandeja.`;
        document.getElementById('otp-success').style.display = 'block';

    } catch (error) {
        console.warn('FAILED...', error);
        const viewId = isRecoveryFlow ? 'recover-view' : 'register-view';
        showError(viewId, 'Error al enviar email. Revisa tu conexión e intenta de nuevo.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Redirect if already logged in (verify with DB)
async function checkExistingSession() {
    const userId = sessionStorage.getItem('current_user_id');
    if (userId) {
        // Wait for DB to be initialized if called early
        if (!window.DB) {
            setTimeout(checkExistingSession, 100);
            return;
        }
        const user = await window.DB.getUserById(parseInt(userId, 10));
        if (user) {
            const currentPath = window.location.pathname.toLowerCase();
            const fileName = currentPath.split('/').pop();
            // Solo redirigir si estamos explícitamente en la página de inicio/login
            if (fileName === 'index.html' || fileName === '') {
                window.location.href = 'dashboard.html';
            }
        } else {
            sessionStorage.removeItem('current_user_id');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    checkExistingSession();

    // Populate countries in registration
    const countrySelect = document.getElementById('register-country');
    if (countrySelect) {
        try {
            const countries = await window.DB.getCountries();
            countries.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                countrySelect.appendChild(opt);
            });
        } catch (err) {
            console.warn("Error cargando países:", err);
        }
    }

    // Populate phone country codes in registration
    populatePhoneCountryCodes('register-phone-code');

    // === LOGIN FLOW ===
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Verificando...';
            btn.disabled = true;

            if (await AuthObj.login(email, password)) {
                window.location.href = 'dashboard.html';
            } else {
                showError('login-view', 'Credenciales inválidas. Intenta de nuevo.');
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // === REGISTER FLOW (Direct - No OTP) ===
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value.trim();
            const countryId = document.getElementById('register-country').value;
            const phoneCode = document.getElementById('register-phone-code').value;
            const phoneNumber = document.getElementById('register-phone').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-password-confirm').value;
            const whatsappOptIn = document.getElementById('register-whatsapp-optin').checked;

            // Validations
            if (!countryId) {
                showError('register-view', 'Por favor selecciona tu país.');
                return;
            }

            if (!validatePhoneInput(phoneNumber)) {
                showError('register-view', 'Número de teléfono inválido. Ingresa solo dígitos (mínimo 7).');
                return;
            }

            if (password !== confirmPassword) {
                showError('register-view', 'Las contraseñas no coinciden.');
                return;
            }

            if (password.length < 6) {
                showError('register-view', 'Por seguridad, usa al menos 6 caracteres en tu contraseña.');
                return;
            }

            // Check if email is already registered
            if (await window.DB.getUserByEmail(email)) {
                showError('register-view', 'Este correo ya pertenece a una cuenta.');
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creando cuenta...';
            btn.disabled = true;

            try {
                const fullPhone = formatInternationalPhone(phoneCode, phoneNumber);

                await window.DB.createUser({
                    email: email,
                    password: password,
                    country_id: countryId,
                    role: 'farmer',
                    phone: fullPhone,
                    phone_country_code: phoneCode,
                    whatsapp: fullPhone,
                    whatsapp_opt_in: whatsappOptIn
                });

                if (window.showSuccessModal) {
                    window.showSuccessModal(
                        '¡Cuenta Creada Exitosamente!',
                        whatsappOptIn
                            ? 'Tu cuenta ha sido creada. Recibirás recordatorios de tus cultivos por WhatsApp.'
                            : 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.'
                    );
                }

                switchView('login-view');
                document.getElementById('login-email').value = email;
            } catch (err) {
                showError('register-view', err.message || 'Error al crear la cuenta. Intenta de nuevo.');
            } finally {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        });
    }

    // === RECOVERY FLOW (preserved with OTP for password reset) ===
    const recoverForm = document.getElementById('recover-form');
    if (recoverForm) {
        recoverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('recover-email').value;

            if (!await window.DB.getUserByEmail(email)) {
                showError('recover-view', 'No encontramos una cuenta con ese correo.');
                return;
            }

            isRecoveryFlow = true;
            const btn = e.target.querySelector('button');
            await sendRealOTP(email, btn, btn.innerText, 'recuperación');
        });
    }

    // === OTP VALIDATION (for recovery only) ===
    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
        otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('otp-code').value;
            const currentTime = Date.now();

            if (currentTime > otpExpiry) {
                showError('otp-view', 'El código ha expirado (más de 30 min). Solicita uno nuevo.');
                return;
            }

            if (code === temporalOTP) {
                switchView('create-password-view');
                document.querySelector('#create-password-view h1').innerText = 'Restablecer Contraseña';
                document.querySelector('#create-password-view .auth-info').innerText = 'Ingresa tu nueva contraseña para recuperar el acceso.';
            } else {
                showError('otp-view', 'El código es incorrecto. Verifica e intenta de nuevo.');
            }
        });
    }

    // === RESET PASSWORD (for recovery only) ===
    const pwdForm = document.getElementById('create-password-form');
    if (pwdForm) {
        pwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pwd = document.getElementById('new-password').value;
            const cpwd = document.getElementById('confirm-password').value;

            if (pwd !== cpwd) {
                showError('create-password-view', 'Las contraseñas no coinciden.');
                return;
            }

            if (pwd.length < 6) {
                showError('create-password-view', 'Por seguridad, usa al menos 6 caracteres.');
                return;
            }

            try {
                const user = await window.DB.getUserByEmail(temporalEmail);
                await window.DB.updateUserPassword(user.id, pwd);
                window.showSuccessModal('¡Contraseña Restablecida!', 'Ya puedes iniciar sesión con tu nueva contraseña.');
                switchView('login-view');
                document.getElementById('login-email').value = temporalEmail;
            } catch(err) {
                showError('create-password-view', err.message);
            }
        });
    }

});
