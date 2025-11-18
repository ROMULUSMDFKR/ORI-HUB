// FIX: Added 'QuoteItem' to imports to resolve 'Cannot find name' error.
import { 
    User, Prospect, Task, Supplier,
    Company, Product, ProductLot, Contact, Quote, QuoteStatus, SupplierRating, ArchiveFile, QuoteItem,
    Sample, SampleStatus, SalesOrder, SalesOrderStatus, CompanyPipelineStage, Category, LotStatus,
    Priority, ProspectStage, PurchaseOrder, ActivityLog, Note, CompanyProfile, SupportTicket,
    Project, TaskStatus, AuditLog, Carrier, LogisticsDelivery, FreightPricingRule, InventoryMove, ChatMessage,
    Email,
    Team,
    Group,
    Invoice,
    InvoiceStatus,
    InvoiceItem,
    Expense,
    Delivery,
    DeliveryStatus,
    Candidate,
    CandidateStatus,
    Commission,
    CommissionStatus,
    Attachment,
    ConnectedEmailAccount,
    MotivationalQuote,
    Birthday,
} from '../types';

export const MOCK_USERS: { [key: string]: User } = {
  'user-1': { id: 'user-1', name: 'Natalia', avatarUrl: 'https://i.pravatar.cc/150?u=natalia', email: 'natalia.v@crmstudio.com', phone: '55 1234 5678', role: 'Admin', teamId: 'team-1', isActive: true },
  'user-2': { id: 'user-2', name: 'David', avatarUrl: 'https://i.pravatar.cc/150?u=david', email: 'david.r@crmstudio.com', phone: '55 9876 5432', role: 'Ventas', teamId: 'team-1', isActive: true, signature: '\n\n--\nDavid Rodríguez\nEspecialista en Ventas\nCRM Studio' },
  'user-3': { id: 'user-3', name: 'Admin User', avatarUrl: 'https://i.pravatar.cc/150?u=admin', email: 'admin@crmstudio.com', phone: '55 5555 5555', role: 'Admin', teamId: 'team-2', isActive: true },
  'user-4': { id: 'user-4', name: 'Laura', avatarUrl: 'https://i.pravatar.cc/150?u=laura', email: 'laura.m@crmstudio.com', phone: '55 1111 2222', role: 'Logística', teamId: 'team-2', isActive: true },
  'roberto': { id: 'roberto', name: 'Roberto', avatarUrl: 'https://i.pravatar.cc/150?u=roberto', email: 'roberto@example.com', phone: '55 3333 4444', role: 'Ventas', teamId: 'team-1', isActive: true },
  'abigail': { id: 'abigail', name: 'Abigail', avatarUrl: 'https://i.pravatar.cc/150?u=abigail', email: 'abigail@example.com', phone: '55 6666 7777', role: 'Ventas', teamId: 'team-1', isActive: true },
  'hector': { id: 'hector', name: 'Héctor', avatarUrl: 'https://i.pravatar.cc/150?u=hector', email: 'hector@example.com', phone: '55 8888 9999', role: 'Admin', teamId: 'team-1', isActive: true },
};

export const MOCK_BIRTHDAYS: Birthday[] = [];

export const MOCK_MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
    // --- General ---
    { id: 'q1', text: 'Un buen día comienza con una buena actitud. ¡A conquistar el mundo!', timeOfDay: ['morning'], roles: ['General'] },
    { id: 'q2', text: 'La productividad es el resultado de un compromiso con la excelencia.', timeOfDay: ['morning', 'afternoon'], roles: ['General'] },
    { id: 'q3', text: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', timeOfDay: ['morning', 'afternoon'], roles: ['General'] },
    { id: 'q4', text: 'La tarde es perfecta para darle el último empujón a tus metas del día.', timeOfDay: ['afternoon'], roles: ['General'] },
    { id: 'q5', text: 'Revisa tus logros del día y prepárate para un mañana aún mejor.', timeOfDay: ['evening'], roles: ['General'] },
    { id: 'q6', text: 'El descanso es parte del éxito. ¡Desconecta y recarga energías!', timeOfDay: ['evening'], roles: ['General'] },

    // --- Ventas ---
    { id: 'q7', text: 'El sol salió, y tus prospectos también. ¡A por ellos!', timeOfDay: ['morning'], roles: ['Ventas'] },
    { id: 'q8', text: 'Cada "no" te acerca más a un "sí". ¡No te rindas!', timeOfDay: ['morning', 'afternoon'], roles: ['Ventas'] },
    { id: 'q10', text: 'Una llamada más puede ser la que cierre el mes con broche de oro.', timeOfDay: ['afternoon', 'evening'], roles: ['Ventas'] },
    { id: 'q11', text: 'Tus comisiones de mañana se siembran con las llamadas de hoy.', timeOfDay: ['morning'], roles: ['Ventas'] },
    { id: 'q12', text: 'Analiza tus ventas del día. Cada dato es una oportunidad para mañana.', timeOfDay: ['evening'], roles: ['Ventas'] },

    // --- Logística ---
    { id: 'q13', text: 'Que cada ruta de hoy sea eficiente y cada entrega, puntual.', timeOfDay: ['morning'], roles: ['Logística'] },
    { id: 'q14', text: 'La precisión en el inventario es la base de una logística impecable.', timeOfDay: ['morning', 'afternoon'], roles: ['Logística'] },
    { id: 'q15', text: 'Revisa el inventario, optimiza la ruta. La tarde es para perfeccionar.', timeOfDay: ['afternoon'], roles: ['Logística'] },
    { id: 'q16', text: 'Cada paquete entregado a tiempo es una promesa cumplida. ¡Buen trabajo!', timeOfDay: ['evening'], roles: ['Logística'] },
    
    // --- Admin ---
    { id: 'q17', text: 'Tu visión guía al equipo. Que hoy sea un día de decisiones acertadas.', timeOfDay: ['morning'], roles: ['Admin'] },
    { id: 'q18', text: 'Un equipo bien administrado es un equipo exitoso. ¡Sigue así!', timeOfDay: ['afternoon'], roles: ['Admin'] },
    { id: 'q19', text: 'Revisa los reportes y planifica el mañana. El éxito está en la estrategia.', timeOfDay: ['evening'], roles: ['Admin'] },
];

export const MOCK_CONNECTED_ACCOUNTS: ConnectedEmailAccount[] = [
    {
        id: 'acc-1',
        userId: 'user-2',
        email: 'david.r@crmstudio.com',
        status: 'Conectado',
        signatureTemplate: `<table style="width: 100%; max-width: 600px; font-family: Arial, Helvetica, sans-serif;" border="0" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="padding: 16px 0;">
<table style="width: 100%;" border="0" cellspacing="0" cellpadding="0">
<tbody>
<tr valign="middle">
<td style="width: 88px; padding-right: 12px;"><a style="text-decoration: none;" href="https://tradeaitirik.com.mx/" rel="noopener"> <img style="display: block; width: 80px; height: 80px; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/LOGO-TA.png" alt="Trade Aitrik" width="80" height="80" /> </a></td>
<td style="padding: 4px 0;">
<div style="font-size: 16px; line-height: 20px; color: #111; font-weight: bold;">{{name}}</div>
<div style="font-size: 13px; line-height: 18px; color: #444;">{{role}}</div>
<div style="font-size: 13px; line-height: 18px; color: #444; margin-top: 6px;">{{phone}} &nbsp;&bull;&nbsp; {{email}}</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="padding: 10px 0; text-align: left;"><a style="text-decoration: none;" href="https://tradeaitirik.com.mx/" rel="noopener"> <img style="display: block; max-width: 600px; border-radius: 8px; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/BANNER-TA.png" alt="Innovaci&oacute;n que alimenta el futuro" width="600" height="auto" /> </a></td>
</tr>
<tr>
<td style="padding: 12px; text-align: left;"><span style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; font-weight: bold; margin-right: 8px;"> S&iacute;guenos en </span> <a style="text-decoration: none; margin-right: 8px;" href="https://tradeaitirik.com.mx/" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/WEB-TA.png" alt="Sitio web" width="24" height="24" /> </a> <a style="text-decoration: none; margin-right: 8px;" href="https://facebook.com/tradeaitirik" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/FB-TA.png" alt="Facebook" width="24" height="24" /> </a> <a style="text-decoration: none; margin-right: 8px;" href="https://instagram.com/tradeaitirik" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/IG-TA.png" alt="Instagram" width="24" height="24" /> </a> <a style="text-decoration: none; margin-right: 8px;" href="https://youtube.com/tradeaitirik" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/YOUTUBE-TA.png" alt="YouTube" width="24" height="24" /> </a> <a style="text-decoration: none;" href="https://www.linkedin.com/company/108417810/" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/INKEDIN-TA.png" alt="LinkedIn" width="24" height="24" /> </a></td>
</tr>
<tr>
<td style="padding: 8px;">
<div style="font-size: 10px; line-height: 14px; color: #888;">Este mensaje y sus archivos adjuntos son confidenciales y para uso exclusivo del destinatario. Si usted no es el destinatario, por favor elim&iacute;nelo e inf&oacute;rmenos.</div>
</td>
</tr>
</tbody>
</table>`
    },
    {
        id: 'acc-2',
        userId: 'user-1',
        email: 'natalia.v@crmstudio.com',
        status: 'Conectado',
        signatureTemplate: `<table style="width: 100%; max-width: 600px; font-family: Arial, Helvetica, sans-serif;" border="0" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="padding: 16px 0;">
<table style="width: 100%;" border="0" cellspacing="0" cellpadding="0">
<tbody>
<tr valign="middle">
<td style="width: 88px; padding-right: 12px;"><a style="text-decoration: none;" href="https://tradeaitirik.com.mx/" rel="noopener"> <img style="display: block; width: 80px; height: 80px; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/LOGO-TA.png" alt="Trade Aitrik" width="80" height="80" /> </a></td>
<td style="padding: 4px 0;">
<div style="font-size: 16px; line-height: 20px; color: #111; font-weight: bold;">{{name}}</div>
<div style="font-size: 13px; line-height: 18px; color: #444;">{{role}}</div>
<div style="font-size: 13px; line-height: 18px; color: #444; margin-top: 6px;">{{phone}} &nbsp;&bull;&nbsp; {{email}}</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="padding: 10px 0; text-align: left;"><a style="text-decoration: none;" href="https://tradeaitirik.com.mx/" rel="noopener"> <img style="display: block; max-width: 600px; border-radius: 8px; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/BANNER-TA.png" alt="Innovaci&oacute;n que alimenta el futuro" width="600" height="auto" /> </a></td>
</tr>
<tr>
<td style="padding: 12px; text-align: left;"><span style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; font-weight: bold; margin-right: 8px;"> S&iacute;guenos en </span> <a style="text-decoration: none; margin-right: 8px;" href="https://tradeaitirik.com.mx/" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/WEB-TA.png" alt="Sitio web" width="24" height="24" /> </a> <a style="text-decoration: none; margin-right: 8px;" href="https://facebook.com/tradeaitirik" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/FB-TA.png" alt="Facebook" width="24" height="24" /> </a> <a style="text-decoration: none; margin-right: 8px;" href="https://instagram.com/tradeaitirik" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/IG-TA.png" alt="Instagram" width="24" height="24" /> </a> <a style="text-decoration: none; margin-right: 8px;" href="https://youtube.com/tradeaitirik" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/YOUTUBE-TA.png" alt="YouTube" width="24" height="24" /> </a> <a style="text-decoration: none;" href="https://www.linkedin.com/company/108417810/" rel="noopener"> <img style="display: inline-block; vertical-align: middle; border: 0;" src="https://tradeaitirik.com.mx/wp-content/uploads/2025/09/INKEDIN-TA.png" alt="LinkedIn" width="24" height="24" /> </a></td>
</tr>
<tr>
<td style="padding: 8px;">
<div style="font-size: 10px; line-height: 14px; color: #888;">Este mensaje y sus archivos adjuntos son confidenciales y para uso exclusivo del destinatario. Si usted no es el destinatario, por favor elim&iacute;nelo e inf&oacute;rmenos.</div>
</td>
</tr>
</tbody>
</table>`
    },
     {
        id: 'acc-3',
        userId: 'user-1',
        email: 'natalia.v@personal.com',
        status: 'Error de autenticación',
    }
];

export const MOCK_MY_COMPANIES = [
    { id: 'puredef', name: 'Puredef' },
    { id: 'trade-aitirik', name: 'Trade Aitirik' },
    { id: 'santzer', name: 'Santzer' },
];


export const MOCK_TEAMS: Team[] = [
    { id: 'team-1', name: 'Equipo de Ventas Alpha', description: 'Enfocados en clientes industriales y de alto valor.', members: ['user-1', 'user-2'] },
    { id: 'team-2', name: 'Equipo de Operaciones', description: 'Responsables de logística, inventario y soporte.', members: ['user-3', 'user-4'] },
];

export const MOCK_GROUPS: Group[] = [
    { id: 'group-1', name: 'Equipo de Ventas', members: ['user-1', 'user-2', 'roberto', 'abigail'] },
    { id: 'group-2', name: 'Proyecto Q4', members: ['user-1', 'user-4', 'hector'] },
];

export const MOCK_CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Fertilizantes' },
    { id: 'cat-2', name: 'Agroquímicos' },
    { id: 'cat-3', name: 'Industriales' },
];

export const MOCK_LOCATIONS = [
    { id: 'loc-1', name: 'Almacén Principal (Veracruz)' },
    { id: 'loc-2', name: 'Bodega CDMX (Ecatepec)' },
    { id: 'loc-3', name: 'Bodega de Líquidos (Monterrey)' },
];
const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_CANDIDATES: Candidate[] = [
    {
        "id": "cand-1",
        "name": "TBC de Mexico",
        "address": "Blvd. Bernardo Quintana 30, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422133333",
        "website": "http://www.tbcdemexico.com.mx/",
        "imageUrl": "https://lh5.googleusercontent.com/p/AF1QipOF_h5-gik_N_2p-m-y_8G_b-I_k-O_L_k",
        "images": [
            { "url": "https://lh5.googleusercontent.com/p/AF1QipOF_h5-gik_N_2p-m-y_8G_b-I_k-O_L_k" },
            { "url": "https://lh5.googleusercontent.com/p/AF1QipMWj0B0-Rz2O8Qo_Z-Z_Z-Z_Z-Z_Z-Z_Z-Z=w408-h306-k-no" },
            { "url": "https://lh5.googleusercontent.com/p/AF1QipN5-G2h2y6-25z-2a2b-V_2d_2V_2d2E_2d2E=w408-h306-k-no" }
        ],
        "googlePlaceId": "ChIJc_80tW2dloYRmQh_8g5R5P8",
        "location": { "lat": 20.5937985, "lng": -100.373444 },
        "averageRating": 4.5,
        "reviewCount": 120,
        "openingHours": [
          { "day": "Lunes", "hours": "8:30 AM - 6:30 PM" },
          { "day": "Martes", "hours": "8:30 AM - 6:30 PM" },
          { "day": "Miércoles", "hours": "8:30 AM - 6:30 PM" },
          { "day": "Jueves", "hours": "8:30 AM - 6:30 PM" },
          { "day": "Viernes", "hours": "8:30 AM - 6:30 PM" },
          { "day": "Sábado", "hours": "8:30 AM - 2:00 PM" },
          { "day": "Domingo", "hours": "Cerrado" }
        ],
        "googleMapsUrl": "https://www.google.com/maps/search/TBC+de+Mexico/@20.5937985,-100.373444,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": [ "Wholesaler", "Tire shop" ],
        "status": CandidateStatus.Pendiente,
        "tags": ['Alto Potencial'],
        "notes": [],
        "activityLog": [{ id: 'log-cand1', type: 'Sistema', description: 'Candidato importado', userId: 'user-1', createdAt: daysAgo(1) }],
        "importedAt": "2024-07-26T18:30:00Z",
        "importedBy": "user-1",
        "reviews": [
          { "author": "Armando G", "text": "Excelente servicio, muy buen trato al cliente, buenos precios, muy recomendable.", "publishedAt": "2023-08-01T15:02:16.035Z", "rating": 5, "authorPhotoUrl": "https://lh3.googleusercontent.com/a-/ALV-UjXqY-...", "likes": 2 },
          { "author": "Cliente X", "text": "Tardan un poco en atender pero el surtido es bueno.", "publishedAt": "2023-10-15T10:00:00.000Z", "rating": 4, "likes": 0 }
        ]
    },
    ...[
      {
        "id": "cand-2",
        "name": "Servicio y Llantas B.Q.",
        "address": "Blvd. Bernardo Quintana 38, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422138382",
        "website": "http://www.goodyear.com.mx/",
        "googleMapsUrl": "https://www.google.com/maps/search/Servicio+y+Llantas+B.Q./@20.5938561,-100.3725597,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop"]
      },
      {
        "id": "cand-3",
        "name": "Llantera Pathé",
        "address": "Blvd. Bernardo Quintana 40, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422137979",
        "googleMapsUrl": "https://www.google.com/maps/search/Llantera+Path%C3%A9/@20.5939287,-100.3721305,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop"]
      },
      {
        "id": "cand-4",
        "name": "Llantera Tovar",
        "address": "Av. Prol. Luis Pasteur 101, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422139191",
        "website": "http://www.llanteratovar.com/",
        "googleMapsUrl": "https://www.google.com/maps/search/Llantera+Tovar/@20.5924765,-100.3734057,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop"]
      },
      {
        "id": "cand-5",
        "name": "Alineaciones Pathé",
        "address": "Blvd. Bernardo Quintana 42, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422137979",
        "googleMapsUrl": "https://www.google.com/maps/search/Alineaciones+Path%C3%A9/@20.594002,-100.3717013,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Auto repair shop"]
      },
      {
        "id": "cand-6",
        "name": "Refaccionaria CALIFORNIA",
        "address": "AV. PROL. LUIS PASTEUR #123 SUR, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422139898",
        "website": "http://www.california.com.mx/",
        "googleMapsUrl": "https://www.google.com/maps/search/Refaccionaria+CALIFORNIA/@20.591965,-100.37303,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Auto parts store"]
      },
      {
        "id": "cand-7",
        "name": "Grupo JYR",
        "address": "C. del Fénix 120, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422139090",
        "website": "http://www.grupojyr.com.mx/",
        "googleMapsUrl": "https://www.google.com/maps/search/Grupo+JYR/@20.5929342,-100.374092,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Auto repair shop", "Truck repair shop"]
      },
      {
        "id": "cand-8",
        "name": "BODEGA DE LLANTAS",
        "address": "C. del Fénix 118, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422138989",
        "googleMapsUrl": "https://www.google.com/maps/search/BODEGA+DE+LLANTAS/@20.5930068,-100.3736628,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop"]
      },
      {
        "id": "cand-9",
        "name": "RODAJAL",
        "address": "Blvd. Bernardo Quintana 10, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422238484",
        "website": "http://www.rodajal.com/",
        "googleMapsUrl": "https://www.google.com/maps/search/RODAJAL/@20.5940762,-100.3762985,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Wheel alignment service", "Auto repair shop"]
      },
      {
        "id": "cand-10",
        "name": "VITRUM",
        "address": "C. del Fénix 108, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422138787",
        "website": "http://www.vitrum.com.mx/",
        "googleMapsUrl": "https://www.google.com/maps/search/VITRUM/@20.593256,-100.372391,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Auto glass shop"]
      },
      {
        "id": "cand-11",
        "name": "Michelin",
        "address": "Blvd. Bernardo Quintana 24, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422134545",
        "website": "http://www.michelin.com.mx/",
        "googleMapsUrl": "https://www.google.com/maps/search/Michelin/@20.593922,-100.374645,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop", "Car repair and maintenance"]
      },
      {
        "id": "cand-12",
        "name": "Bridgestone - Llantera, Centro de Servicio",
        "address": "Blvd. Bernardo Quintana 2, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422137171",
        "website": "http://www.bridgestone.com.mx/",
        "googleMapsUrl": "https://www.google.com/maps/search/Bridgestone+-+Llantera,+Centro+de+Servicio/@20.5941505,-100.3779515,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop", "Auto repair shop", "Car accessories store", "Oil change service"]
      },
      {
        "id": "cand-13",
        "name": "VULCANIZADORA Y LLANTERA “EL GERRY”",
        "address": "C. del Fénix 123, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524421868470",
        "googleMapsUrl": "https://www.google.com/maps/search/VULCANIZADORA+Y+LLANTERA+%E2%80%9CEL+GERRY%E2%80%9D/@20.5928616,-100.3745212,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop"]
      },
      {
        "id": "cand-14",
        "name": "GARAGE",
        "address": "Blvd. Bernardo Quintana 20, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524422134343",
        "googleMapsUrl": "https://www.google.com/maps/search/GARAGE/@20.5939946,-100.3752158,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Auto repair shop"]
      },
      {
        "id": "cand-15",
        "name": "LLANTERA Y VULCANIZADORA “EL PEGASO”",
        "address": "C. del Fénix 119, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
        "phone": "+524421868470",
        "googleMapsUrl": "https://www.google.com/maps/search/LLANTERA+Y+VULCANIZADORA+%E2%80%9CEL+PEGASO%E2%80%9D/@20.5929342,-100.374092,17z/data=!3m1!4b1?entry=ttu",
        "rawCategories": ["Tire shop"]
      }
    ].map(c => ({
      ...c,
      status: CandidateStatus.Pendiente,
      tags: [],
      notes: [],
      activityLog: [{ id: `log-${c.id}`, type: 'Sistema', description: 'Candidato importado', userId: 'user-1', createdAt: daysAgo(1) }],
      importedAt: "2024-07-26T18:30:00Z",
      importedBy: "user-1",
    })) as Candidate[]
];

export const MOCK_COMMISSIONS: Commission[] = [
    { id: 'com-1', salesOrderId: 'SO-2024-001', salespersonId: 'user-2', amount: 150.75, status: CommissionStatus.Pagada, createdAt: daysAgo(25), paidAt: daysAgo(10) },
    { id: 'com-2', salesOrderId: 'SO-2024-002', salespersonId: 'roberto', amount: 220.50, status: CommissionStatus.Pagada, createdAt: daysAgo(22), paidAt: daysAgo(10) },
    { id: 'com-3', salesOrderId: 'SO-2024-003', salespersonId: 'user-2', amount: 85.00, status: CommissionStatus.Pendiente, createdAt: daysAgo(15) },
    { id: 'com-4', salesOrderId: 'SO-2024-004', salespersonId: 'abigail', amount: 310.20, status: CommissionStatus.Pendiente, createdAt: daysAgo(5) },
    { id: 'com-5', salesOrderId: 'SO-2024-005', salespersonId: 'roberto', amount: 195.40, status: CommissionStatus.Pendiente, createdAt: daysAgo(2) },
    { id: 'com-6', salesOrderId: 'SO-2024-006', salespersonId: 'abigail', amount: 150.00, status: CommissionStatus.Pendiente, createdAt: daysAgo(1) },
];

export const MOCK_COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Molelub S.A. de C.V.', shortName: 'Molelub', rfc: 'MOL980101ABC', isActive: true, stage: CompanyPipelineStage.ClienteActivo, ownerId: 'user-2', createdById: 'user-1', createdAt: daysAgo(100), priority: Priority.Alta, industry: 'Industrial', productsOfInterest: [], deliveryAddresses: [] },
    { id: 'comp-2', name: 'Constructora del Sureste', shortName: 'Constructora Sur', rfc: 'CSU020202XYZ', isActive: true, stage: CompanyPipelineStage.ClienteActivo, ownerId: 'roberto', createdById: 'user-1', createdAt: daysAgo(200), priority: Priority.Media, industry: 'Construcción', productsOfInterest: [], deliveryAddresses: [] },
    { id: 'comp-3', name: 'Agroinsumos del Bajío', shortName: 'Agro Bajío', rfc: 'ABA030303DEF', isActive: true, stage: CompanyPipelineStage.ClienteInactivo, ownerId: 'abigail', createdById: 'user-1', createdAt: daysAgo(300), priority: Priority.Baja, industry: 'Agricultura', productsOfInterest: [], deliveryAddresses: [] },
];

export const MOCK_PROSPECTS: Prospect[] = [
  { id: 'prospect-1', name: 'Innovate Corp', stage: ProspectStage.Prospecto, ownerId: 'user-2', createdById: 'user-1', estValue: 50000, createdAt: daysAgo(5), industry: 'Tecnología', productsOfInterest: ['AdBlue', 'Urea'], priority: 'Alta' },
  { id: 'prospect-2', name: 'Agro Fields SA', stage: ProspectStage.Calificado, ownerId: 'roberto', createdById: 'user-1', estValue: 75000, createdAt: daysAgo(12), industry: 'Agricultura' },
  { id: 'prospect-3', name: 'Transportes Rápidos', stage: ProspectStage.Negociacion, ownerId: 'abigail', createdById: 'user-1', estValue: 120000, createdAt: daysAgo(30), nextAction: { description: 'Enviar contrato final', dueDate: daysAgo(-2) } },
];

export const MOCK_TASKS: Task[] = [
  { id: 'task-1', title: 'Seguimiento a Innovate Corp', status: TaskStatus.PorHacer, assignees: ['user-2'], watchers: ['user-1'], dueAt: daysAgo(-1), priority: Priority.Alta },
  { id: 'task-2', title: 'Preparar muestra para Agro Fields', status: TaskStatus.EnProgreso, assignees: ['user-2', 'user-4'], watchers: [], dueAt: daysAgo(-3) },
  { id: 'task-3', title: 'Revisar contrato de Transportes Rápidos', status: TaskStatus.Hecho, assignees: ['user-1'], watchers: [], dueAt: daysAgo(2) },
];

export const MOCK_SALES_ORDERS: SalesOrder[] = [
    { id: 'SO-2024-001', companyId: 'comp-1', status: SalesOrderStatus.Facturada, total: 15075, createdAt: daysAgo(25), items: [{productId: 'prod-3', qty: 1000, subtotal: 500} as QuoteItem], deliveries: [] },
    { id: 'SO-2024-002', companyId: 'comp-2', status: SalesOrderStatus.Entregada, total: 22050, createdAt: daysAgo(22), items: [{productId: 'prod-1', qty: 40, subtotal: 18000} as QuoteItem], deliveries: [] },
    { id: 'SO-2024-003', companyId: 'comp-3', status: SalesOrderStatus.EnTransito, total: 8500, createdAt: daysAgo(15), items: [{productId: 'prod-2', qty: 300, subtotal: 7500} as QuoteItem], deliveries: [] },
    { id: 'SO-2024-004', companyId: 'comp-1', status: SalesOrderStatus.EnPreparacion, total: 31020, createdAt: daysAgo(5), items: [{productId: 'prod-1', qty: 60, subtotal: 27000} as QuoteItem], deliveries: [] },
    { id: 'SO-2024-005', companyId: 'comp-2', status: SalesOrderStatus.Pendiente, total: 19540, createdAt: daysAgo(2), items: [{productId: 'prod-3', qty: 30000, subtotal: 15000} as QuoteItem], deliveries: [] },
];

export const MOCK_QUOTES: Quote[] = [
  { id: 'QT-2024-001', folio: 'QT-2024-001', issuingCompanyId: 'puredef', companyId: 'comp-1', salespersonId: 'user-2', approverId: 'user-1', status: QuoteStatus.AprobadaPorCliente, createdAt: daysAgo(10), validity: 30, currency: 'USD', exchangeRate: { official: 20, commission: 0.3, final: 20.3 }, items: [], deliveries: [], commissions: [], handling: [], freight: [], insurance: { enabled: false, costPerTon: 0 }, storage: { enabled: false, period: 0, unit: 'Día', costPerTon: 0 }, otherItems: [], taxRate: 16, totals: { products: 1000, commissions: 0, handling: 0, freight: 0, insurance: 0, storage: 0, other: 0, subtotal: 1000, tax: 160, grandTotal: 1160 }, changeLog: [] },
];

export const MOCK_SAMPLES: Sample[] = [
  { id: 'sample-1', name: 'Muestra Urea', prospectId: 'prospect-2', productId: 'prod-1', status: SampleStatus.Enviada, ownerId: 'roberto', requestDate: daysAgo(8) },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'prod-1', sku: 'FER-UREA-01', name: 'Urea Perlada', unitDefault: 'ton', isActive: true, categoryId: 'cat-1', pricing: { min: 450 }, reorderPoint: 20, createdAt: daysAgo(10) },
  { id: 'prod-2', sku: 'AGRO-GLI-05', name: 'Glifosato 5L', unitDefault: 'unidad', isActive: true, categoryId: 'cat-2', pricing: { min: 25 }, reorderPoint: 100, createdAt: daysAgo(2) },
  { id: 'prod-3', sku: 'IND-ADB-1000', name: 'AdBlue / DEF', unitDefault: 'L', isActive: true, categoryId: 'cat-3', pricing: { min: 0.5 }, reorderPoint: 5000, createdAt: daysAgo(45) },
];

export const MOCK_PROJECTS: Project[] = [
    { id: 'proj-1', name: 'Lanzamiento Q4', description: 'Campaña de marketing y ventas para el último trimestre.', status: 'Activo', members: ['user-1', 'user-2', 'abigail'], dueDate: daysAgo(-30) },
    { id: 'proj-2', name: 'Optimización de Logística', description: 'Reducir costos de envío y tiempos de entrega.', status: 'En Pausa', members: ['user-4', 'hector'], dueDate: daysAgo(-60) }
];

export const MOCK_ACTIVITIES: ActivityLog[] = [
    { id: 'act-1', companyId: 'comp-1', type: 'Llamada', description: 'Llamada de seguimiento sobre cotización QT-2024-001', userId: 'user-2', createdAt: daysAgo(2) },
    { id: 'act-2', prospectId: 'prospect-1', type: 'Email', description: 'Enviado correo de presentación', userId: 'user-2', createdAt: daysAgo(4) },
    { id: 'act-3', sampleId: 'sample-1', type: 'Cambio de Estado', description: 'Estado cambiado a Enviada', userId: 'user-4', createdAt: daysAgo(7) },
    { id: 'act-4', quoteId: 'QT-2024-001', type: 'Cambio de Estado', description: 'Estado cambiado a Aprobada', userId: 'user-1', createdAt: daysAgo(9) },
    { id: 'act-5', salesOrderId: 'SO-2024-002', type: 'Cambio de Estado', description: 'Estado cambiado a Entregada', userId: 'user-4', createdAt: daysAgo(21) },
];

export const MOCK_NOTES: Note[] = [
    { id: 'note-1', companyId: 'comp-1', text: 'El cliente prefiere contacto por WhatsApp.', userId: 'user-2', createdAt: daysAgo(5) },
    { id: 'note-2', sampleId: 'sample-1', text: 'Feedback: Cliente recibió la muestra, probará la próxima semana.', userId: 'roberto', createdAt: daysAgo(2) },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
    { id: 'audit-1', entity: 'Prospecto', entityId: 'prospect-3', action: 'Cambió etapa a Negociación', by: 'abigail', at: daysAgo(1) },
    { id: 'audit-2', entity: 'Cliente', entityId: 'comp-1', action: 'Creó nueva cotización QT-2024-001', by: 'user-2', at: daysAgo(10) },
];

export const MOCK_DETAILED_USER_ACTIVITY: ActivityLog[] = [
    { id: 'act-det-1', type: 'Sistema', description: 'Inició sesión', userId: 'user-1', createdAt: daysAgo(0)},
    { id: 'act-det-2', type: 'Cambio de Estado', description: 'Actualizó la tarea "Revisar contrato" a Hecho', userId: 'user-1', createdAt: daysAgo(1)},
    { id: 'act-det-3', type: 'Nota', description: 'Añadió una nota al cliente Molelub', userId: 'user-1', createdAt: daysAgo(2)},
    { id: 'act-det-4', type: 'Análisis IA', description: 'Ejecutó análisis IA en el candidato "TBC de Mexico"', userId: 'user-1', createdAt: daysAgo(3)},
];

export const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'sup-1', name: 'Fertilizantes del Golfo', rating: SupplierRating.Excelente, industry: 'Agricultura' },
    { id: 'sup-2', name: 'Químicos Industriales del Norte', rating: SupplierRating.Bueno, industry: 'Industrial' },
];

export const MOCK_LOTS: { [key: string]: ProductLot[] } = {
  'prod-1': [ { id: 'lot-urea-1', code: 'U2401A', unitCost: 400, supplierId: 'sup-1', receptionDate: daysAgo(30), initialQty: 100, status: LotStatus.Disponible, pricing: { min: 450 }, stock: [{ locationId: 'loc-1', qty: 80 }, { locationId: 'loc-2', qty: 20 }] } ],
  'prod-2': [ { id: 'lot-gli-1', code: 'G2403B', unitCost: 18, supplierId: 'sup-2', receptionDate: daysAgo(15), initialQty: 500, status: LotStatus.Disponible, pricing: { min: 25 }, stock: [{ locationId: 'loc-2', qty: 500 }] } ],
  'prod-3': [ { id: 'lot-adb-1', code: 'A2402C', unitCost: 0.35, supplierId: 'sup-2', receptionDate: daysAgo(20), initialQty: 20000, status: LotStatus.Disponible, pricing: { min: 0.5 }, stock: [{ locationId: 'loc-3', qty: 15000 }] }, { id: 'lot-adb-2', code: 'A2312D', unitCost: 0.33, supplierId: 'sup-2', receptionDate: daysAgo(80), initialQty: 10000, status: LotStatus.EnCuarentena, pricing: { min: 0.48 }, stock: [{ locationId: 'loc-3', qty: 10000 }] } ],
};

export const MOCK_ARCHIVE_FILES: ArchiveFile[] = [
    { id: 'file-1', name: 'Contrato Molelub 2024.pdf', size: 1200000, lastModified: daysAgo(50), url: '#', tags: ['Contrato'] },
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
    { id: 'PO-2024-001', supplierId: 'sup-1', status: 'Recibida Completa', total: 40000, createdAt: daysAgo(30) }
];

export const MOCK_INVENTORY_MOVES: InventoryMove[] = [
    { id: 'move-1', type: 'in', productId: 'prod-1', lotId: 'lot-urea-1', qty: 100, unit: 'ton', toLocationId: 'loc-1', createdAt: daysAgo(30), userId: 'user-4' }
];

export const MOCK_DELIVERIES: Delivery[] = [
    { id: 'del-1', salesOrderId: 'SO-2024-003', companyId: 'comp-3', deliveryNumber: '1 of 1', status: DeliveryStatus.EnTransito, destination: 'Querétaro', carrierId: 'car-1', scheduledDate: daysAgo(-2), items: [], notes: [] }
];

export const MOCK_CARRIERS: Carrier[] = [
    { id: 'car-1', name: 'Transportes Castores', rating: SupplierRating.Bueno, contactName: 'Juan Perez', contactPhone: '5512345678', serviceTypes: ['Carga Seca'] }
];

export const MOCK_FREIGHT_PRICING_RULES: FreightPricingRule[] = [
    // FIX: Replaced 'zone' with 'origin' and 'destination' to match the FreightPricingRule type.
    { id: 'rule-1', origin: 'Almacén Principal (Veracruz)', destination: 'Querétaro', minWeightKg: 1000, maxWeightKg: 5000, pricePerKg: 1.2, flatRate: 0 }
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
    { id: 'chat-1', senderId: 'user-2', receiverId: 'user-1', text: 'Hola Natalia, ¿puedes revisar la cotización de Molelub?', timestamp: daysAgo(1) },
    { id: 'chat-group-1', senderId: 'user-2', receiverId: 'group-1', text: 'Equipo, ¿cómo vamos con las metas de este mes?', timestamp: daysAgo(0.5) },
    { id: 'chat-group-2', senderId: 'abigail', receiverId: 'group-1', text: '¡Voy al 80%! Creo que cerramos la semana con todo.', timestamp: daysAgo(0.4) },
    { id: 'chat-group-3', senderId: 'user-1', receiverId: 'group-1', text: '¡Excelente Abigail! David, ¿necesitas apoyo con algo?', timestamp: daysAgo(0.3) },
];

export const MOCK_EMAILS: any[] = [
    // Thread 1: Inquiry and Reply with attachment
    {
        id: 'email-1',
        from: { name: 'Juan Torres', email: 'juan.t@agrobajio.com' },
        to: [{ name: 'David', email: 'david.r@crmstudio.com' }],
        subject: 'Consulta sobre Urea Perlada',
        body: 'Hola David,\n\n¿Podrías enviarme la ficha técnica actualizada de la Urea Perlada? Estamos evaluando una compra para el próximo ciclo.\n\nSaludos,\nJuan Torres',
        timestamp: daysAgo(2.5),
        status: 'read',
        folder: 'inbox',
        recipientEmail: 'david.r@crmstudio.com',
    },
    {
        id: 'email-2',
        from: { name: 'David', email: 'david.r@crmstudio.com' },
        to: [{ name: 'Juan Torres', email: 'juan.t@agrobajio.com' }],
        subject: 'Re: Consulta sobre Urea Perlada',
        body: 'Hola Juan,\n\nClaro, con gusto. Adjunto la ficha técnica que solicitaste.\n\nQuedo a tu disposición para cualquier duda o para preparar una cotización.\n\nSaludos,\nDavid Rodríguez',
        timestamp: daysAgo(2.4),
        status: 'read',
        folder: 'sent',
        attachments: [
            { id: 'att-1', name: 'Ficha_Tecnica_Urea_Perlada_2024.pdf', size: 870400, url: '#' } // 850 KB
        ],
        recipientEmail: 'david.r@crmstudio.com',
    },
    {
        id: 'email-3',
        from: { name: 'Juan Torres', email: 'juan.t@agrobajio.com' },
        to: [{ name: 'David', email: 'david.r@crmstudio.com' }],
        subject: 'Re: Consulta sobre Urea Perlada',
        body: 'Perfecto, David. Muchas gracias, la revisamos y te contacto.\n\nSaludos.',
        timestamp: daysAgo(2.2),
        status: 'read',
        folder: 'inbox',
        recipientEmail: 'david.r@crmstudio.com',
    },
    // Thread 2: Unread email
    {
        id: 'email-4',
        from: { name: 'Molelub', email: 'contacto@molelub.com.mx' },
        to: [{ name: 'David', email: 'david.r@crmstudio.com' }],
        subject: 'URGENTE: Ajuste en Orden de Compra SO-2024-004',
        body: 'Estimado David,\n\nNecesitamos hacer un ajuste en la orden de compra SO-2024-004. Por favor, contáctanos a la brevedad.\n\nAtentamente,\nEquipo de Compras Molelub',
        timestamp: daysAgo(0.1), // very recent
        status: 'unread',
        folder: 'inbox',
        recipientEmail: 'david.r@crmstudio.com',
    },
    // Emails for Roberto
    {
        id: 'email-5',
        from: { name: 'Proveedor Agroquímicos', email: 'ventas@agroproveedor.com' },
        to: [{ name: 'Roberto', email: 'roberto@tradeaitirik.com.mx' }],
        subject: 'Cotización Especial - Urea y Glifosato',
        body: 'Hola Roberto,\n\nAdjunto la cotización especial que solicitaste. Avísanos si tienes alguna duda.\n\nSaludos,\nEquipo de Ventas Agroproveedor',
        timestamp: daysAgo(0.5),
        status: 'unread',
        folder: 'inbox',
        recipientEmail: 'roberto@tradeaitirik.com.mx',
        attachments: [ { id: 'att-2', name: 'Cotizacion_Agro_RT.pdf', size: 450000, url: '#' } ]
    },
    {
        id: 'email-6',
        from: { name: 'Logística Interna', email: 'logistica@ori.com' },
        to: [{ name: 'Roberto', email: 'roberto@tradeaitirik.com.mx' }],
        subject: 'Confirmación de Entrega - Muestra Agro Fields',
        body: 'Roberto,\n\nTe confirmo que la muestra para Agro Fields ha sido enviada. El número de guía es 12345XYZ.\n\nSaludos.',
        timestamp: daysAgo(1),
        status: 'read',
        folder: 'inbox',
        recipientEmail: 'roberto@tradeaitirik.com.mx'
    }
];

export const MOCK_INVOICES: Invoice[] = [
    { id: 'F-2024-001', salesOrderId: 'SO-2024-001', companyId: 'comp-1', status: InvoiceStatus.Pagada, createdAt: daysAgo(20), dueDate: daysAgo(-10), items: [], subtotal: 13000, tax: 2080, total: 15080, paidAmount: 15080 },
    { id: 'F-2024-002', salesOrderId: 'SO-2024-002', companyId: 'comp-2', status: InvoiceStatus.Vencida, createdAt: daysAgo(15), dueDate: daysAgo(15), items: [], subtotal: 20000, tax: 3200, total: 23200, paidAmount: 10000 },
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp-1', description: 'Flete Castores OC PO-2024-001', category: 'Logística', amount: 3500, date: daysAgo(29) }
];


const mockApi = {
  getCollection: async (collectionName: string): Promise<any[]> => {
    console.log(`API: Fetching collection ${collectionName}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    switch (collectionName) {
      case 'users': return Object.values(MOCK_USERS);
      case 'teams': return MOCK_TEAMS;
      case 'groups': return MOCK_GROUPS;
      case 'companies': return MOCK_COMPANIES;
      case 'prospects': return MOCK_PROSPECTS;
      case 'tasks': return MOCK_TASKS;
      case 'suppliers': return MOCK_SUPPLIERS;
      case 'products': return MOCK_PRODUCTS;
      case 'lots': return [MOCK_LOTS]; // Wrap in array as collection hooks expect array
      case 'categories': return MOCK_CATEGORIES;
      case 'archives': return MOCK_ARCHIVE_FILES;
      case 'activities': return MOCK_ACTIVITIES;
      case 'notes': return MOCK_NOTES;
      case 'quotes': return MOCK_QUOTES;
      case 'samples': return MOCK_SAMPLES;
      case 'salesOrders': return MOCK_SALES_ORDERS;
      case 'purchaseOrders': return MOCK_PURCHASE_ORDERS;
      case 'inventoryMoves': return MOCK_INVENTORY_MOVES;
      case 'deliveries': return MOCK_DELIVERIES;
      case 'carriers': return MOCK_CARRIERS;
      case 'freightPricing': return MOCK_FREIGHT_PRICING_RULES;
      case 'messages': return MOCK_CHAT_MESSAGES;
      case 'emails': return MOCK_EMAILS;
      case 'invoices': return MOCK_INVOICES;
      case 'expenses': return MOCK_EXPENSES;
      case 'auditLogs': return MOCK_AUDIT_LOGS;
      case 'commissions': return MOCK_COMMISSIONS;
      case 'locations': return MOCK_LOCATIONS;
      case 'projects': return MOCK_PROJECTS;
      case 'candidates': return MOCK_CANDIDATES;
      case 'connectedAccounts': return MOCK_CONNECTED_ACCOUNTS;
      case 'motivationalQuotes': return MOCK_MOTIVATIONAL_QUOTES;
      case 'birthdays': return MOCK_BIRTHDAYS;
      default: return [];
    }
  },
  getDoc: async (collectionName: string, docId: string): Promise<any | null> => {
     console.log(`API: Fetching doc ${docId} from ${collectionName}`);
    const collection = await mockApi.getCollection(collectionName);
    if (collectionName === 'lots') {
      const allLots = Object.values(collection[0] || {}).flat();
      return allLots.find((doc: any) => doc.id === docId) || null;
    }
    return collection.find((doc: any) => doc.id === docId) || null;
  },
  addDoc: async (collectionName: string, newDoc: any): Promise<void> => {
     console.log(`API: Adding doc to ${collectionName}`, newDoc);
     switch (collectionName) {
        case 'birthdays':
            MOCK_BIRTHDAYS.push(newDoc as Birthday);
            break;
        case 'connectedAccounts':
            MOCK_CONNECTED_ACCOUNTS.push(newDoc as ConnectedEmailAccount);
            break;
        default:
            // This is a simulation, it doesn't actually persist the data.
            break;
     }
     await new Promise(resolve => setTimeout(resolve, 200));
  },
  updateDoc: async (collectionName: string, docId: string, updates: any): Promise<void> => {
    console.log(`API: Updating doc ${docId} in ${collectionName} with`, updates);
    switch (collectionName) {
        case 'users':
            if (MOCK_USERS[docId]) {
                MOCK_USERS[docId] = { ...MOCK_USERS[docId], ...updates };
            }
            break;
        default:
            // This is a simulation for other collections.
            break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  },
  getLotsForProduct: async (productId: string): Promise<ProductLot[]> => {
      console.log(`API: Fetching lots for product ${productId}`);
      await new Promise(resolve => setTimeout(resolve, 200));
      return (MOCK_LOTS as any)[productId] || [];
  },
};
export { mockApi as api };