
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

        // Buscar correos no leídos (UNSEEN)
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: true };
        
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            console.log(`📥 Se encontraron ${messages.length} correos nuevos.`);
        } else {
            console.log("👍 Todo al día. No hay correos nuevos.");
        }

        for (const item of messages) {
            const all = item.parts.find(part => part.which === '');
            const id = item.attributes.uid;
            const idHeader = "Imap-Id: "+id+"\r\n";
            
            const mail = await simpleParser(idHeader + all.body);

            // Guardar en Firestore
            const newEmail = {
                from: { 
                    name: mail.from.value[0].name || mail.from.value[0].address, 
                    email: mail.from.value[0].address 
                },
                to: [{ name: 'Yo', email: EMAIL_CONFIG.user }],
                subject: mail.subject,
                body: mail.html || mail.textAsHtml || mail.text,
                timestamp: new Date().toISOString(),
                folder: 'inbox',
                status: 'unread',
                deliveryStatus: 'received',
                attachments: [] 
            };

            await db.collection('emails').add(newEmail);
            console.log(`✨ Guardado: ${mail.subject}`);
        }

        connection.end();
    } catch (error) {
        console.error("⚠️ Error de conexión IMAP:", error.message);
    }
}

// --- INICIO DEL SERVIDOR ---
console.log("🚀 Servidor de Correos ORI Iniciado [Modo Bajo Consumo]");
console.log("1. Escuchando correos salientes (Tiempo Real)");
console.log("2. Esperando señal de la App para buscar correos entrantes...");

startSender(); 

// ESCUCHAR SEÑAL DE SINCRONIZACIÓN DESDE LA APP
// Cuando le des click al botón "Recargar" en la App, este código se activará.
db.collection('settings').doc('mailSync').onSnapshot((doc) => {
    const data = doc.data();
    // Si el timestamp cambia, significa que alguien pidió actualizar
    if (data && data.lastSyncRequest) {
        // Ignoramos la primera carga para no ejecutar al iniciar el script si no es necesario
        // Opcional: ejecutar fetchEmails() una vez al inicio
        console.log(`⚡ Señal recibida desde la App: ${new Date(data.lastSyncRequest).toLocaleTimeString()}`);
        fetchEmails();
    }
});

// (Opcional) Revisión automática de seguridad cada 15 minutos por si acaso
setInterval(fetchEmails, 15 * 60 * 1000);
