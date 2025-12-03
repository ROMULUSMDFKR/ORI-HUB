
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Importación dinámica de node-fetch para compatibilidad
let fetch;
(async () => {
    try {
        const module = await import('node-fetch');
        fetch = module.default;
    } catch (e) {
        fetch = global.fetch;
    }
})();

// --- INICIALIZACIÓN DE FIREBASE ---
try {
    const serviceAccount = require('./serviceAccountKey.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    console.log("🔥 Servidor de Correo ORI: Conectado a Firebase.");
} catch (error) {
    console.error("❌ ERROR: No se encontró 'serviceAccountKey.json'. Asegúrate de tener este archivo en la misma carpeta.");
    process.exit(1);
}

const db = admin.firestore();

// --- CONFIGURACIÓN GLOBAL ---
let mailerSendConfig = null;
let nylasAccounts = [];

// --- 1. ESCUCHAR CONFIGURACIÓN EN TIEMPO REAL ---
function syncConfiguration() {
    // Configuración de envío (MailerSend)
    db.collection('settings').doc('mailConfig').onSnapshot(doc => {
        if (doc.exists) {
            mailerSendConfig = doc.data();
            console.log("✅ Configuración de envío (MailerSend) cargada.");
        }
    });

    // Cuentas conectadas (Nylas)
    db.collection('connectedAccounts').where('provider', '==', 'nylas').onSnapshot(snapshot => {
        nylasAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`👥 Cuentas de Nylas detectadas: ${nylasAccounts.length}`);
    });
}

// --- 2. ENVIAR CORREOS (OUTBOX) ---
async function startSender() {
    db.collection('emails').where('deliveryStatus', '==', 'pending')
        .onSnapshot(async (snapshot) => {
            if (snapshot.empty) return;

            if (!mailerSendConfig?.apiKey || !mailerSendConfig?.email) {
                console.warn("⚠️ Intento de envío detectado pero falta configuración de MailerSend.");
                return;
            }

            const transporter = nodemailer.createTransport({
                host: "smtp.mailersend.net",
                port: 587,
                secure: false,
                auth: {
                    user: mailerSendConfig.email,
                    pass: mailerSendConfig.apiKey
                }
            });

            for (const docChange of snapshot.docChanges()) {
                if (docChange.type === 'added') {
                    const emailData = docChange.doc.data();
                    const docId = docChange.doc.id;

                    console.log(`📤 Enviando correo a: ${emailData.to[0].email}`);

                    try {
                        await transporter.sendMail({
                            from: `"${emailData.from.name}" <${mailerSendConfig.email}>`,
                            to: emailData.to.map(t => t.email).join(','),
                            replyTo: emailData.from.email,
                            subject: emailData.subject,
                            html: emailData.body
                        });

                        await db.collection('emails').doc(docId).update({
                            deliveryStatus: 'sent',
                            folder: 'sent', // Mover a carpeta de enviados visualmente
                            sentAt: new Date().toISOString()
                        });
                        console.log(`✅ Correo enviado exitosamente.`);

                    } catch (error) {
                        console.error("❌ Error al enviar:", error.message);
                        await db.collection('emails').doc(docId).update({
                            deliveryStatus: 'error',
                            errorMessage: error.message
                        });
                    }
                }
            }
        });
}

// --- 3. LEER CORREOS (INBOX - NYLAS) ---
async function fetchNylasEmails() {
    if (nylasAccounts.length === 0) {
        console.log("ℹ️ No hay cuentas conectadas para sincronizar.");
        return;
    }

    console.log("🔄 Iniciando sincronización de bandeja de entrada...");

    for (const account of nylasAccounts) {
        if (!account.nylasConfig?.grantId || !account.nylasConfig?.apiKey) continue;

        const { grantId, apiKey } = account.nylasConfig;
        const userEmail = account.email;

        try {
            // Obtener mensajes (Límite 20 para rapidez)
            const url = `https://api.us.nylas.com/v3/grants/${grantId}/messages?limit=20`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const json = await response.json();
            const messages = json.data || [];

            console.log(`📥 ${userEmail}: Procesando ${messages.length} mensajes...`);

            const batch = db.batch();
            let operationCount = 0;

            for (const msg of messages) {
                // Usar el ID del mensaje como ID del documento para evitar duplicados
                const docRef = db.collection('emails').doc(msg.id);
                
                const fromObj = msg.from?.[0] || { name: 'Desconocido', email: 'unknown' };
                const isSentByMe = fromObj.email.toLowerCase() === userEmail.toLowerCase();

                const emailData = {
                    id: msg.id, // ID para React keys
                    nylasId: msg.id,
                    threadId: msg.thread_id,
                    userId: account.userId, // Dueño de la cuenta
                    
                    subject: msg.subject || '(Sin asunto)',
                    body: msg.body || msg.snippet || 'Contenido no disponible',
                    snippet: msg.snippet || '',
                    
                    from: fromObj,
                    to: msg.to || [],
                    
                    // Convertir timestamp Unix a ISO String
                    timestamp: new Date(msg.date * 1000).toISOString(),
                    
                    status: msg.unread ? 'unread' : 'read',
                    
                    // Determinar carpeta visualmente
                    folder: isSentByMe ? 'sent' : 'inbox',
                    
                    deliveryStatus: 'received'
                };

                batch.set(docRef, emailData, { merge: true });
                operationCount++;
            }

            if (operationCount > 0) {
                await batch.commit();
                console.log(`✅ ${userEmail}: ${operationCount} correos sincronizados.`);
            }

            // Actualizar estado "Conectado"
            await db.collection('connectedAccounts').doc(account.id).update({ status: 'Conectado', lastSync: new Date().toISOString() });

        } catch (error) {
            console.error(`❌ Error sincronizando ${userEmail}:`, error.message);
            await db.collection('connectedAccounts').doc(account.id).update({ status: 'Error de autenticación' });
        }
    }
}

// --- MAIN LOOP ---
(async () => {
    syncConfiguration();
    startSender();

    // Escuchar petición manual de sincronización desde el botón del frontend
    db.collection('settings').doc('mailSync').onSnapshot((doc) => {
        const data = doc.data();
        // Si la petición es reciente (menos de 1 min), ejecutar
        if (data?.lastSyncRequest && (Date.now() - new Date(data.lastSyncRequest).getTime() < 60000)) {
            console.log("⚡ Sincronización manual solicitada desde la web.");
            fetchNylasEmails();
        }
    });

    // Sincronización automática al inicio y cada 5 mins
    setTimeout(fetchNylasEmails, 2000);
    setInterval(fetchNylasEmails, 300000);
})();
