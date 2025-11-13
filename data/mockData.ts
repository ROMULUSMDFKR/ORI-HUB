

import { 
    User, Prospect, Task, Supplier,
    Company, Product, ProductLot, Contact, Quote, QuoteStatus, SupplierRating, ArchiveFile,
    Sample, SampleStatus, SalesOrder, SalesOrderStatus, CompanyPipelineStage, Category, LotStatus,
    Priority, ProspectStage, PurchaseOrder, ActivityLog, Note, CompanyProfile, SupportTicket,
    Project, TaskStatus, AuditLog, Carrier, LogisticsDelivery, FreightPricingRule, InventoryMove, ChatMessage,
    Email,
    Team,
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
} from '../types';

export const MOCK_USERS: { [key: string]: User } = {
  'user-1': { id: 'user-1', name: 'Natalia', avatarUrl: 'https://i.pravatar.cc/150?u=natalia', email: 'natalia.v@crmstudio.com', role: 'Admin', teamId: 'team-1', isActive: true },
  'user-2': { id: 'user-2', name: 'David', avatarUrl: 'https://i.pravatar.cc/150?u=david', email: 'david.r@crmstudio.com', role: 'Ventas', teamId: 'team-1', isActive: true },
  'user-3': { id: 'user-3', name: 'Admin User', avatarUrl: 'https://i.pravatar.cc/150?u=admin', email: 'admin@crmstudio.com', role: 'Admin', teamId: 'team-2', isActive: true },
  'user-4': { id: 'user-4', name: 'Laura', avatarUrl: 'https://i.pravatar.cc/150?u=laura', email: 'laura.m@crmstudio.com', role: 'Logística', teamId: 'team-2', isActive: true },
  natalia: { id: 'user-1', name: 'Natalia', avatarUrl: 'https://i.pravatar.cc/150?u=natalia', email: 'natalia.v@crmstudio.com', role: 'Admin', teamId: 'team-1', isActive: true },
  david: { id: 'user-2', name: 'David', avatarUrl: 'https://i.pravatar.cc/150?u=david', email: 'david.r@crmstudio.com', role: 'Ventas', teamId: 'team-1', isActive: true },
  admin: { id: 'user-3', name: 'Admin User', avatarUrl: 'https://i.pravatar.cc/150?u=admin', email: 'admin@crmstudio.com', role: 'Admin', teamId: 'team-2', isActive: true },
  laura: { id: 'user-4', name: 'Laura', avatarUrl: 'https://i.pravatar.cc/150?u=laura', email: 'laura.m@crmstudio.com', role: 'Logística', teamId: 'team-2', isActive: true },
  'roberto': { id: 'roberto', name: 'Roberto', avatarUrl: 'https://i.pravatar.cc/150?u=roberto', email: 'roberto@example.com', role: 'Ventas', teamId: 'team-1', isActive: true },
  'abigail': { id: 'abigail', name: 'Abigail', avatarUrl: 'https://i.pravatar.cc/150?u=abigail', email: 'abigail@example.com', role: 'Ventas', teamId: 'team-1', isActive: true },
  'hector': { id: 'hector', name: 'Héctor', avatarUrl: 'https://i.pravatar.cc/150?u=hector', email: 'hector@example.com', role: 'Admin', teamId: 'team-1', isActive: true },
};

export const MOCK_MY_COMPANIES = [
    { id: 'puredef', name: 'Puredef' },
    { id: 'trade-aitirik', name: 'Trade Aitirik' },
    { id: 'santzer', name: 'Santzer' },
];


export const MOCK_TEAMS: Team[] = [
    { id: 'team-1', name: 'Equipo de Ventas Alpha', description: 'Enfocados en clientes industriales y de alto valor.', members: ['user-1', 'user-2'] },
    { id: 'team-2', name: 'Equipo de Operaciones', description: 'Responsables de logística, inventario y soporte.', members: ['user-3', 'user-4'] },
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
      "email": "contacto@tbcdemexico.com.mx",
      "website": "http://www.tbcdemexico.com.mx/",
      "imageUrl": "https://lh5.googleusercontent.com/p/AF1QipN5-G2h2y6-25z-2a2b-V_2d_2V_2d2E_2d2E=w408-h306-k-no",
      "googleMapsUrl": "https://www.google.com/maps/search/TBC+de+Mexico/@20.5937985,-100.373444,17z/data=!3m1!4b1?entry=ttu",
      "rawCategories": [ "Wholesaler", "Tire shop" ],
      "status": CandidateStatus.Pendiente,
      "tags": [],
      "notes": [],
      "activityLog": [{ id: 'log-cand1', type: 'Sistema', description: 'Candidato importado', userId: 'user-1', createdAt: daysAgo(1) }],
      "importedAt": "2024-07-26T18:30:00Z",
      "importedBy": "user-1",
      "reviews": [
        { "author": "Armando G", "text": "Excelente servicio, muy buen trato al cliente, buenos precios, muy recomendable.", "publishedAt": "2023-08-01T15:02:16.035Z", "rating": 5 },
        { "author": "Cliente X", "text": "Tardan un poco en atender pero el surtido es bueno.", "publishedAt": "2023-10-15T10:00:00.000Z", "rating": 4 }
      ]
    },
    {
      "id": "cand-2",
      "name": "Servicio y Llantas B.Q.",
      "address": "Blvd. Bernardo Quintana 38, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
      "phone": "+524422138382",
      "email": "ventas.bq@goodyear.com.mx",
      "website": "http://www.goodyear.com.mx/",
      "googleMapsUrl": "https://www.google.com/maps/search/Servicio+y+Llantas+B.Q./@20.5938561,-100.3725597,17z/data=!3m1!4b1?entry=ttu",
      "rawCategories": [ "Tire shop" ],
      "status": CandidateStatus.Pendiente,
      "assignedCompanyId": "Puredef",
      "tags": ['Alto Potencial'],
      "notes": [],
      "activityLog": [{ id: 'log-cand2', type: 'Sistema', description: 'Candidato importado', userId: 'user-1', createdAt: daysAgo(1) }],
      "importedAt": "2024-07-26T18:30:00Z",
      "importedBy": "user-1"
    },
    {
      "id": "cand-3",
      "name": "Llantera Pathé",
      "address": "Blvd. Bernardo Quintana 40, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
      "phone": "+524422137979",
      "email": "contacto@llanterapathe.com",
      "googleMapsUrl": "https://www.google.com/maps/search/Llantera+Path%C3%A9/@20.5939287,-100.3721305,17z/data=!3m1!4b1?entry=ttu",
      "rawCategories": [ "Tire shop" ],
      "status": CandidateStatus.Pendiente,
      "tags": [],
      "notes": [],
      "activityLog": [{ id: 'log-cand3', type: 'Sistema', description: 'Candidato importado', userId: 'user-1', createdAt: daysAgo(1) }],
      "importedAt": "2024-07-26T18:30:00Z",
      "importedBy": "user-1",
      "reviews": [
        { "author": "Cliente Anónimo", "text": "No tenían la llanta que buscaba y el servicio fue regular.", "publishedAt": "2024-01-20T12:00:00.000Z", "rating": 2 }
      ]
    },
    {
      "id": "cand-4",
      "name": "Llantera Tovar",
      "address": "Av. Prol. Luis Pasteur 101, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
      "phone": "+524422139191",
      "website": "http://www.llanteratovar.com/",
      "googleMapsUrl": "https://www.google.com/maps/search/Llantera+Tovar/@20.5924765,-100.3734057,17z/data=!3m1!4b1?entry=ttu",
      "rawCategories": [ "Tire shop" ],
      "status": CandidateStatus.Aprobado,
      "tags": [],
      "notes": [],
      "activityLog": [{ id: 'log-cand4', type: 'Sistema', description: 'Candidato importado', userId: 'user-1', createdAt: daysAgo(1) }],
      "importedAt": "2024-07-26T18:30:00Z",
      "importedBy": "user-1"
    },
    {
      "id": "cand-5",
      "name": "Alineaciones Pathé",
      "address": "Blvd. Bernardo Quintana 42, Pathé, 76020 Santiago de Querétaro, Qro., Mexico",
      "phone": "+524422137979",
      "googleMapsUrl": "https://www.google.com/maps/search/Alineaciones+Path%C3%A9/@20.594002,-100.3717013,17z/data=!3m1!4b1?entry=ttu",
      "rawCategories": [ "Auto repair shop" ],
      "status": CandidateStatus.Pendiente,
      "tags": [],
      "notes": [],
      "activityLog": [{ id: 'log-cand5', type: 'Sistema', description: 'Candidato importado', userId: 'user-1', createdAt: daysAgo(1) }],
      "importedAt": "2024-07-26T18:30:00Z",
      "importedBy": "user-1"
    }
];

export const MOCK_COMMISSIONS: Commission[] = [
    { id: 'com-1', salesOrderId: 'SO-2024-001', salespersonId: 'user-2', amount: 150.75, status: CommissionStatus.Pagada, createdAt: daysAgo(25), paidAt: daysAgo(10) },
    { id: 'com-2', salesOrderId: 'SO-2024-002', salespersonId: 'roberto', amount: 220.50, status: CommissionStatus.Pagada, createdAt: daysAgo(22), paidAt: daysAgo(10) },
    { id: 'com-3', salesOrderId: 'SO-2024-003', salespersonId: 'user-2', amount: 85.00, status: CommissionStatus.Pendiente, createdAt: daysAgo(15) },
    { id: 'com-4', salesOrderId: 'SO-2024-004', salespersonId: 'abigail', amount: 310.20, status: CommissionStatus.Pendiente, createdAt: daysAgo(5) },
    { id: 'com-5', salesOrderId: 'SO-2024-005', salespersonId: 'roberto', amount: 195.40, status: CommissionStatus.Pendiente, createdAt: daysAgo(2) },
    { id: 'com-6', salesOrderId: 'SO-2024-001', salespersonId: 'david', amount: 50.00, status: CommissionStatus.Pendiente, createdAt: daysAgo(3) },
];

export const MOCK_COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Molelub S.A. de C.V.', shortName: 'Molelub', rfc: 'MOL123456XYZ', isActive: true, stage: CompanyPipelineStage.ClienteActivo, ownerId: 'user-1', createdById: 'user-1', createdAt: daysAgo(100), priority: Priority.Alta, industry: 'Industrial', productsOfInterest: ['prod-1'], deliveryAddresses: [], healthScore: { score: 85, label: 'Saludable' } },
    { id: 'comp-2', name: 'Agroinsumos del Sureste', shortName: 'AgroSureste', rfc: 'AGS654321XYZ', isActive: true, stage: CompanyPipelineStage.ClienteActivo, ownerId: 'user-2', createdById: 'user-1', createdAt: daysAgo(50), priority: Priority.Media, industry: 'Agricultura', productsOfInterest: ['prod-2'], deliveryAddresses: [], healthScore: { score: 92, label: 'Saludable' } },
];

export const MOCK_SALES_ORDERS: SalesOrder[] = [
    { id: 'SO-2024-001', companyId: 'comp-1', status: SalesOrderStatus.Facturada, deliveries: [], items: [], total: 3015.00, createdAt: daysAgo(25) },
    { id: 'SO-2024-002', companyId: 'comp-2', status: SalesOrderStatus.Facturada, deliveries: [], items: [], total: 4410.00, createdAt: daysAgo(22) },
    { id: 'SO-2024-003', companyId: 'comp-1', status: SalesOrderStatus.Entregada, deliveries: [], items: [], total: 1700.00, createdAt: daysAgo(15) },
    { id: 'SO-2024-004', companyId: 'comp-2', status: SalesOrderStatus.EnTransito, deliveries: [], items: [], total: 6204.00, createdAt: daysAgo(5) },
    { id: 'SO-2024-005', companyId: 'comp-1', status: SalesOrderStatus.EnPreparacion, deliveries: [], items: [], total: 3908.00, createdAt: daysAgo(2) },
];

export const MOCK_PRODUCTS: Product[] = [
    { id: 'prod-1', sku: 'UR-GR-46', name: 'Urea Grado Fertilizante', unitDefault: 'ton', isActive: true, categoryId: 'cat-1', pricing: { min: 450 }, reorderPoint: 50 },
    { id: 'prod-2', sku: 'AG-SUL-21', name: 'Sulfato de Amonio', unitDefault: 'ton', isActive: true, categoryId: 'cat-1', pricing: { min: 380 }, reorderPoint: 40 },
    { id: 'prod-3', sku: 'IND-DEF-01', name: 'DEF (Diesel Exhaust Fluid)', unitDefault: 'L', isActive: true, categoryId: 'cat-3', pricing: { min: 0.8 }, reorderPoint: 10000 },
];

export const MOCK_PROJECTS: Project[] = [
    { id: 'proj-1', name: 'Lanzamiento Q3', description: 'Coordinar el lanzamiento de nuevos productos para el tercer trimestre.', status: 'Activo', members: ['user-1', 'user-2'], dueDate: daysAgo(-30) },
    { id: 'proj-2', name: 'Optimización de Logística', description: 'Reducir costos de flete en un 15% para fin de año.', status: 'En Pausa', members: ['user-4'], dueDate: daysAgo(-60) },
];

export const MOCK_TASKS: Task[] = [
    { id: 'task-1', title: 'Revisar contrato Molelub', status: TaskStatus.PorHacer, dueAt: daysAgo(-1), assignees: ['user-1'], watchers: [], projectId: 'proj-1', priority: Priority.Alta, subtasks: [], comments: [] },
    { id: 'task-2', title: 'Llamada de seguimiento a AgroSureste', status: TaskStatus.EnProgreso, dueAt: daysAgo(0), assignees: ['user-2'], watchers: ['user-1'], priority: Priority.Media, subtasks: [], comments: [] },
    { id: 'task-3', title: 'Preparar reporte de ventas semanal', status: TaskStatus.Hecho, dueAt: daysAgo(1), assignees: ['user-1'], watchers: [], priority: Priority.Media, subtasks: [], comments: [] },
];

export const MOCK_PROSPECTS: Prospect[] = [
    { id: 'prospect-1', name: 'Transportes Rápidos del Norte', stage: ProspectStage.Prospecto, ownerId: 'user-2', createdById: 'user-1', estValue: 15000, createdAt: daysAgo(5), priority: 'Alta', industry: 'Transporte', productsOfInterest: ['DEF (Diesel Exhaust Fluid)'], nextAction: { description: 'Enviar cotización inicial', dueDate: daysAgo(-2) } },
    { id: 'prospect-2', name: 'Agricultura del Valle', stage: ProspectStage.Calificado, ownerId: 'user-2', createdById: 'user-1', estValue: 25000, createdAt: daysAgo(20), lastInteraction: { type: 'Llamada', date: daysAgo(2) }, priority: 'Media', industry: 'Agricultura' },
    { id: 'prospect-3', name: 'Fletes del Centro', stage: ProspectStage.Negociacion, ownerId: 'user-2', createdById: 'user-1', estValue: 18000, createdAt: daysAgo(45), priority: 'Alta' },
    { id: 'prospect-4', name: 'Insumos del Campo S.A.', stage: ProspectStage.EnDesarrollo, ownerId: 'user-1', createdById: 'user-1', estValue: 30000, createdAt: daysAgo(2) },
    { id: 'prospect-5', name: 'Logística Total', stage: ProspectStage.Pausada, ownerId: 'user-2', createdById: 'user-1', estValue: 12000, createdAt: daysAgo(60), pausedInfo: { reason: 'Esperando presupuesto', reviewDate: daysAgo(-15) } },
];

export const MOCK_QUOTES: Quote[] = [
    {
        id: 'QT-2024-001', folio: 'F-001', issuingCompanyId: 'puredef', companyId: 'comp-1', salespersonId: 'user-2', approverId: 'user-1', status: QuoteStatus.Enviada, createdAt: daysAgo(10), validity: 30, currency: 'USD',
        exchangeRate: { official: 20.1, commission: 0.2, final: 20.3 }, items: [], deliveries: [], commissions: [], handling: [], freight: [],
        insurance: { enabled: false, costPerTon: 0 }, storage: { enabled: false, period: 0, unit: 'Mes', costPerTon: 0 }, otherItems: [], taxRate: 16,
        totals: { products: 5000, commissions: 100, handling: 50, freight: 200, insurance: 0, storage: 0, other: 0, subtotal: 5350, tax: 856, grandTotal: 6206 }, changeLog: []
    },
    {
        id: 'QT-2024-002', folio: 'F-002', issuingCompanyId: 'trade-aitirik', prospectId: 'prospect-2', salespersonId: 'user-2', approverId: 'user-1', status: QuoteStatus.Aprobada, createdAt: daysAgo(5), validity: 15, currency: 'MXN',
        exchangeRate: { official: 1, commission: 0, final: 1 }, items: [], deliveries: [], commissions: [], handling: [], freight: [],
        insurance: { enabled: true, costPerTon: 5 }, storage: { enabled: false, period: 0, unit: 'Mes', costPerTon: 0 }, otherItems: [], taxRate: 16,
        totals: { products: 12000, commissions: 240, handling: 0, freight: 800, insurance: 60, storage: 0, other: 0, subtotal: 13100, tax: 2096, grandTotal: 15196 }, changeLog: []
    }
];

export const MOCK_SAMPLES: Sample[] = [
    { id: 'sample-1', name: 'Muestra Urea Grado A', prospectId: 'prospect-2', productId: 'prod-1', status: SampleStatus.Solicitada, ownerId: 'user-2', requestDate: daysAgo(3) },
    { id: 'sample-2', name: 'Muestra DEF', companyId: 'comp-1', productId: 'prod-3', status: SampleStatus.Enviada, ownerId: 'user-2', requestDate: daysAgo(8) },
];

export const MOCK_ACTIVITIES: ActivityLog[] = [
    { id: 'act-1', companyId: 'comp-1', type: 'Llamada', description: 'Llamada de seguimiento sobre orden SO-2024-005', userId: 'user-2', createdAt: daysAgo(1) },
    { id: 'act-2', prospectId: 'prospect-2', type: 'Email', description: 'Enviado correo con brochure de productos.', userId: 'user-2', createdAt: daysAgo(2) },
];

export const MOCK_NOTES: Note[] = [
    { id: 'note-1', companyId: 'comp-1', text: 'El contacto principal, Roberto, está de vacaciones. Volver a contactar la próxima semana.', userId: 'user-2', createdAt: daysAgo(3) },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
    { id: 'audit-1', entity: 'Prospecto', entityId: 'prospect-1', action: 'Creación de prospecto', by: 'david', at: daysAgo(5) },
    { id: 'audit-2', entity: 'Cliente', entityId: 'comp-2', action: 'Actualización de perfil', by: 'david', at: daysAgo(2) },
    { id: 'audit-3', entity: 'Producto', entityId: 'prod-3', action: 'Ajuste de precio mínimo', by: 'natalia', at: daysAgo(1) },
];

export const MOCK_CONTACTS: Contact[] = [
    { id: 'contact-1', companyId: 'comp-1', name: 'Roberto Ortega', email: 'roberto@molelub.com', phone: '5512345678', role: 'Gerente de Compras', ownerId: 'user-1' },
    { id: 'contact-2', companyId: 'comp-2', name: 'Ana Méndez', email: 'ana.mendez@agrosureste.com.mx', phone: '9988765432', role: 'Jefa de Insumos', ownerId: 'user-2' },
];

export const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'sup-1', name: 'Químicos del Golfo', rating: SupplierRating.Excelente, industry: 'Química' },
    { id: 'sup-2', name: 'Fertilizantes del Norte', rating: SupplierRating.Bueno, industry: 'Agricultura' },
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
    { id: 'OC-2024-01', supplierId: 'sup-1', status: 'Recibida Completa', total: 12500, createdAt: daysAgo(20) },
    { id: 'OC-2024-02', supplierId: 'sup-2', status: 'Enviada', total: 8200, createdAt: daysAgo(3) },
];

export const MOCK_ARCHIVE_FILES: ArchiveFile[] = [
    { id: 'file-1', companyId: 'comp-1', name: 'Contrato Molelub 2024.pdf', size: 120400, lastModified: daysAgo(30), url: '#', tags: ['Contrato'] },
];

export const MOCK_DELIVERIES: Delivery[] = [
    { id: 'del-1', salesOrderId: 'SO-2024-004', companyId: 'comp-2', deliveryNumber: '1 of 1', status: DeliveryStatus.EnTransito, destination: 'Mérida, Yucatán', carrierId: 'carr-1', scheduledDate: daysAgo(-3), items: [], notes: [] },
    { id: 'del-2', salesOrderId: 'SO-2024-003', companyId: 'comp-1', deliveryNumber: '1 of 1', status: DeliveryStatus.Entregada, destination: 'Querétaro, Qro.', carrierId: 'carr-2', scheduledDate: daysAgo(16), items: [], notes: [] },
];

export const MOCK_CARRIERS: Carrier[] = [
    { id: 'carr-1', name: 'Transportes Castores', rating: SupplierRating.Bueno, contactName: 'Juan Pérez', contactPhone: '8005075500', serviceTypes: ['Carga Seca'] },
    { id: 'carr-2', name: 'Tresguerras', rating: SupplierRating.Excelente, contactName: 'Sofía López', contactPhone: '8007108352', serviceTypes: ['Carga Seca', 'Material Peligroso'] },
];

export const MOCK_FREIGHT_PRICING: FreightPricingRule[] = [
    { id: 'price-1', zone: 'Bajío', minWeightKg: 1000, maxWeightKg: 5000, pricePerKg: 1.2, flatRate: 0 },
    { id: 'price-2', zone: 'Sureste', minWeightKg: 1000, maxWeightKg: 20000, pricePerKg: 2.5, flatRate: 0 },
];

export const MOCK_INVENTORY_MOVES: InventoryMove[] = [
    { id: 'move-1', type: 'in', productId: 'prod-1', lotId: 'lot-1-id', qty: 20, unit: 'ton', toLocationId: 'loc-1', userId: 'user-4', createdAt: daysAgo(20) },
    { id: 'move-2', type: 'out', productId: 'prod-1', lotId: 'lot-1-id', qty: -5, unit: 'ton', fromLocationId: 'loc-1', userId: 'user-4', createdAt: daysAgo(15), note: 'SO-2024-003' },
];

export const MOCK_LOTS: { [key: string]: ProductLot[] } = {
    'prod-1': [
        { id: 'lot-1-id', code: 'UGR-240701', unitCost: 380, supplierId: 'sup-2', receptionDate: daysAgo(20), initialQty: 20, status: LotStatus.Disponible, pricing: { min: 450 }, stock: [{ locationId: 'loc-1', qty: 15 }] },
    ],
    'prod-3': [
        { id: 'lot-3-id', code: 'DEF-240615', unitCost: 0.6, supplierId: 'sup-1', receptionDate: daysAgo(36), initialQty: 20000, status: LotStatus.Disponible, pricing: { min: 0.8 }, stock: [{ locationId: 'loc-3', qty: 8000 }] },
    ]
};

export const MOCK_MESSAGES: ChatMessage[] = [
    { id: 'chat-1', senderId: 'user-2', receiverId: 'user-1', text: 'Hola, ¿puedes aprobar la cotización para Transportes Rápidos del Norte?', timestamp: daysAgo(0.1) },
    { id: 'chat-2', senderId: 'user-1', receiverId: 'user-2', text: 'Claro, la reviso de inmediato.', timestamp: daysAgo(0.09) },
];

export const MOCK_EMAILS: Email[] = [
    { id: 'email-1', from: { name: 'Roberto Ortega', email: 'roberto@molelub.com' }, to: [{ name: 'David', email: 'david.r@crmstudio.com' }], subject: 'RE: Cotización Aditivo', body: 'David, \n\nGracias por la cotización. La estamos revisando. \n\nSaludos.', timestamp: daysAgo(1.2), status: 'read', folder: 'inbox' },
];

export const MOCK_INVOICES: Invoice[] = [
    { id: 'F-2024-001', salesOrderId: 'SO-2024-001', companyId: 'comp-1', status: InvoiceStatus.Pagada, createdAt: daysAgo(25), dueDate: daysAgo(10), items: [], subtotal: 2599.14, tax: 415.86, total: 3015.00, paidAmount: 3015.00 },
    { id: 'F-2024-002', salesOrderId: 'SO-2024-003', companyId: 'comp-1', status: InvoiceStatus.Enviada, createdAt: daysAgo(14), dueDate: daysAgo(-1), items: [], subtotal: 1465.52, tax: 234.48, total: 1700.00, paidAmount: 0 },
    { id: 'F-2024-003', salesOrderId: 'SO-2024-004', companyId: 'comp-2', status: InvoiceStatus.Vencida, createdAt: daysAgo(5), dueDate: daysAgo(1), items: [], subtotal: 5348.28, tax: 855.72, total: 6204.00, paidAmount: 3000 },
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp-1', description: 'Flete OC-2024-01', category: 'Logística', amount: 1250, date: daysAgo(19) },
    { id: 'exp-2', description: 'Licencias de software', category: 'Oficina', amount: 450, date: daysAgo(5) },
];

export const MOCK_DETAILED_USER_ACTIVITY: ActivityLog[] = [
    { id: 'd-act-1', userId: 'user-2', type: 'Llamada', description: 'Realizó llamada de seguimiento al cliente AgroSureste.', createdAt: daysAgo(1), companyId: 'comp-2' },
    { id: 'd-act-2', userId: 'user-2', type: 'Email', description: 'Envió cotización QT-2024-002 al prospecto Agricultura del Valle.', createdAt: daysAgo(2), prospectId: 'prospect-2' },
    { id: 'd-act-3', userId: 'user-2', type: 'Reunión', description: 'Tuvo reunión de negociación con Fletes del Centro.', createdAt: daysAgo(3), prospectId: 'prospect-3' },
    { id: 'd-act-4', userId: 'user-2', type: 'Nota', description: 'Añadió nota sobre el presupuesto del cliente Molelub.', createdAt: daysAgo(4), companyId: 'comp-1' },
    { id: 'd-act-5', userId: 'user-2', type: 'Vista de Perfil', description: 'Visualizó el perfil del candidato TBC de Mexico.', createdAt: daysAgo(5), candidateId: 'cand-1' },
    { id: 'd-act-6', userId: 'user-2', type: 'Análisis IA', description: 'Ejecutó un análisis con IA para el candidato Llantera Pathé.', createdAt: daysAgo(6), candidateId: 'cand-3' },
    { id: 'd-act-7', userId: 'user-2', type: 'Cambio de Estado', description: 'Cambió el estado del prospecto "Agricultura del Valle" a "Calificado".', createdAt: daysAgo(7), prospectId: 'prospect-2' },
    { id: 'd-act-8', userId: 'user-2', type: 'Sistema', description: 'Se le asignó la tarea "Llamada de seguimiento a AgroSureste".', createdAt: daysAgo(8) },
];


const allData: { [key: string]: any[] | any } = {
    users: Object.values(MOCK_USERS),
    teams: MOCK_TEAMS,
    categories: MOCK_CATEGORIES,
    locations: MOCK_LOCATIONS,
    candidates: MOCK_CANDIDATES,
    commissions: MOCK_COMMISSIONS,
    companies: MOCK_COMPANIES,
    salesOrders: MOCK_SALES_ORDERS,
    products: MOCK_PRODUCTS,
    projects: MOCK_PROJECTS,
    tasks: MOCK_TASKS,
    prospects: MOCK_PROSPECTS,
    quotes: MOCK_QUOTES,
    samples: MOCK_SAMPLES,
    activities: MOCK_ACTIVITIES,
    detailedUserActivity: MOCK_DETAILED_USER_ACTIVITY,
    notes: MOCK_NOTES,
    auditLogs: MOCK_AUDIT_LOGS,
    contacts: MOCK_CONTACTS,
    suppliers: MOCK_SUPPLIERS,
    purchaseOrders: MOCK_PURCHASE_ORDERS,
    archives: MOCK_ARCHIVE_FILES,
    deliveries: MOCK_DELIVERIES,
    carriers: MOCK_CARRIERS,
    freightPricing: MOCK_FREIGHT_PRICING,
    inventoryMoves: MOCK_INVENTORY_MOVES,
    lots: MOCK_LOTS,
    messages: MOCK_MESSAGES,
    emails: MOCK_EMAILS,
    invoices: MOCK_INVOICES,
    expenses: MOCK_EXPENSES,
};

const findById = (collection: any[], id: string) => collection.find(item => item.id === id) || null;

export const api = {
    getCollection: async (collectionName: string): Promise<any[]> => {
        console.log(`[API STUB] Fetching collection: ${collectionName}`);
        return new Promise(resolve => {
            setTimeout(() => {
                const data = allData[collectionName];
                if (Array.isArray(data)) {
                    resolve(JSON.parse(JSON.stringify(data)));
                } else if (typeof data === 'object' && data !== null) {
                    resolve(JSON.parse(JSON.stringify(Object.values(data))));
                }
                 else {
                    console.warn(`[API STUB] No data found for collection: ${collectionName}`);
                    resolve([]);
                }
            }, 300);
        });
    },
    getDoc: async (collectionName: string, docId: string): Promise<any | null> => {
        console.log(`[API STUB] Fetching doc: ${collectionName}/${docId}`);
        return new Promise(resolve => {
            setTimeout(() => {
                const collection = allData[collectionName];
                if (Array.isArray(collection)) {
                    resolve(JSON.parse(JSON.stringify(findById(collection, docId))));
                } else {
                     console.warn(`[API STUB] No data found for collection: ${collectionName}`);
                     resolve(null);
                }
            }, 300);
        });
    },
    addDoc: async (collectionName: string, doc: any): Promise<any> => {
        console.log(`[API STUB] Adding doc to: ${collectionName}`, doc);
        return new Promise(resolve => {
            setTimeout(() => {
                const collection = allData[collectionName];
                if (Array.isArray(collection)) {
                    collection.push(doc);
                } else {
                    console.warn(`[API STUB] Cannot add to non-array collection: ${collectionName}`);
                }
                resolve(doc);
            }, 100);
        });
    },
    updateDoc: async (collectionName: string, docId: string, updates: Partial<any>): Promise<any> => {
        console.log(`[API STUB] Updating doc: ${collectionName}/${docId}`, updates);
         return new Promise((resolve, reject) => {
            setTimeout(() => {
                const collection = allData[collectionName];
                if (Array.isArray(collection)) {
                    const docIndex = collection.findIndex(item => item.id === docId);
                    if (docIndex > -1) {
                        collection[docIndex] = { ...collection[docIndex], ...updates };
                        resolve(collection[docIndex]);
                    } else {
                        reject(new Error("Document not found"));
                    }
                } else {
                     reject(new Error(`Collection not found or not an array: ${collectionName}`));
                }
            }, 100);
        });
    },
    getLotsForProduct: async (productId: string): Promise<ProductLot[]> => {
        console.log(`[API STUB] Fetching lots for product: ${productId}`);
        return new Promise(resolve => {
            setTimeout(() => {
                const lotsByProduct = allData['lots'];
                if (lotsByProduct && lotsByProduct[productId]) {
                    resolve(JSON.parse(JSON.stringify(lotsByProduct[productId])));
                } else {
                    resolve([]);
                }
            }, 200);
        });
    }
};