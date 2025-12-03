
const admin = require('firebase-admin');
const imap = require('imap-simple');
const { simpleParser } = require('simple-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');

// --- CONFIGURACIÓN (¡EDITA ESTO!) ---
const EMAIL_CONFIG = {
    user: 'TU_CORREO@dominio.com', // Tu correo completo
    password: 'TU_CONTRASEÑA', // Tu contraseña real
    host: 'mail.tudominio.com', // Host de Hostgator/cPanel
    port: 993,
    tls: true,
    authTimeout: 10000
};

// --- INICIALIZACIÓN DE FIREBASE ---
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase conectado exitosamente.");
} catch (error) {
    console.error("❌ ERROR CRÍTICO: No se encontró el archivo 'serviceAccountKey.json'.");
    process.exit(1);
}

const db = admin.firestore();

// --- 1. FUNCIÓN PARA ENVIAR CORREOS (SALIDA) ---
async function startSender() {
    const transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.host, // Mismo host que IMAP para cPanel normalmente
        port: 465,
        secure: true,
        auth: {
            user: EMAIL_CONFIG.user,
            pass: EMAIL_CONFIG.password
        }
    });

    // Escuchar cambios en Firestore para correos pendientes
    db.collection('emails').where('deliveryStatus', '==', 'pending')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const emailDoc = change.doc.data();
                    const docId = change.doc.id;

                    console.log(`📤 Solicitud de envío detectada para: ${emailDoc.to[0].email}...`);

                    try {
                        await transporter.sendMail({
                            from: `"${emailDoc.from.name}" <${EMAIL_CONFIG.user}>`,
                            to: emailDoc.to.map(t => t.email).join(','),
                            subject: emailDoc.subject,
                            html: emailDoc.body
                        });

                        await db.collection('emails').doc(docId).update({
                            deliveryStatus: 'sent',
                            folder: 'sent'
                        });
                        console.log("✅ Correo enviado exitosamente.");

                    } catch (error) {
                        console.error("❌ Error enviando correo:", error);
                        await db.collection('emails').doc(docId).update({
                            deliveryStatus: 'error'
                        });
                    }
                }
            });
        });
}

// --- 2. FUNCIÓN PARA RECIBIR CORREOS (ENTRADA) ---
async function fetchEmails() {
    console.log("🔄 Conectando a Hostgator para buscar correos...");
    
    const config = {
        imap: {
            user: EMAIL_CONFIG.user,
            password: EMAIL_CONFIG.password,
            host: EMAIL_CONFIG.host,
            port: EMAIL_CONFIG.port,
            tls: EMAIL_CONFIG.tls,
            authTimeout: 10000
        }
    };

    try {
        const connection = await imap.connect(config);
        await connection.openBox('INBOX');

        // FIX: Usar 'ALL' para traer correos leídos y no leídos
        const searchCriteria = ['ALL'];
        
        // Fetch solo headers para ser rápido
        const fetchOptions = { 
            bodies: ['HEADER', 'TEXT', ''], 
            markSeen: false // No marcar como leído automáticamente para no afectar otros clientes
        };
        
        console.log("🔎 Buscando mensajes...");
        let messages = await connection.search(searchCriteria, fetchOptions);

        // FIX: Limitar a los últimos 10 mensajes para evitar sobrecarga
        if (messages.length > 10) {
            console.log(`⚠️ Se encontraron ${messages.length} correos. Procesando solo los últimos 10...`);
            messages = messages.slice(-10);
        } else if (messages.length > 0) {
            console.log(`📥 Se encontraron ${messages.length} correos nuevos.`);
        } else {
            console.log("👍 Todo al día. No hay correos.");
        }

        for (const item of messages) {
            const all = item.parts.find(part => part.which === '');
            const id = item.attributes.uid;
            const idHeader = "Imap-Id: "+id+"\r\n";
            
            const mail = await simpleParser(idHeader + all.body);

            // Verificar si ya existe en Firestore para no duplicar (básico)
            // Nota: En producción, usaría el UID o Message-ID como clave única.
            // Aquí simplemente lo agregamos (Firestore creará ID nuevo), 
            // en una app real deberías checar duplicados antes de add().

            const newEmail = {
                from: { 
                    name: mail.from.value[0].name || mail.from.value[0].address, 
                    email: mail.from.value[0].address 
                },
                to: [{ name: 'Yo', email: EMAIL_CONFIG.user }],
                subject: mail.subject,
                body: mail.html || mail.textAsHtml || mail.text,
                timestamp: mail.date ? new Date(mail.date).toISOString() : new Date().toISOString(),
                folder: 'inbox',
                status: 'read', // Asumimos leído si ya estaba en el server, o unread.
                deliveryStatus: 'received',
                attachments: [] 
            };

            // Simple check anti-duplicado por timestamp y subject (muy básico)
            const exists = await db.collection('emails')
                .where('timestamp', '==', newEmail.timestamp)
                .where('subject', '==', newEmail.subject)
                .get();

            if (exists.empty) {
                await db.collection('emails').add(newEmail);
                console.log(`✨ Guardado: ${mail.subject}`);
            } else {
                // console.log(`Skipping duplicate: ${mail.subject}`);
            }
        }

        connection.end();
    } catch (error) {
        console.error("⚠️ Error de conexión IMAP:", error.message);
    }
}

// --- INICIO DEL SERVIDOR ---
console.log("🚀 Servidor de Correos ORI Iniciado [Modo Mejorado]");
console.log("1. Escuchando correos salientes (Tiempo Real)");
console.log("2. Esperando señal de la App para buscar correos entrantes...");

startSender(); 

// ESCUCHAR SEÑAL DE SINCRONIZACIÓN DESDE LA APP
// Cuando le des click al botón "Recargar" en la App, este código se activará.
db.collection('settings').doc('mailSync').onSnapshot((doc) => {
    const data = doc.data();
    // Si el timestamp cambia, significa que alguien pidió actualizar
    if (data && data.lastSyncRequest) {
        console.log(`⚡ Señal recibida desde la App: ${new Date(data.lastSyncRequest).toLocaleTimeString()}`);
        fetchEmails();
    }
});

// Ejecutar una búsqueda inicial al arrancar
fetchEmails();
