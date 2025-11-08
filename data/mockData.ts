import { 
    User, Prospect, Task, Supplier,
    Company, Product, ProductLot, Contact, Quote, QuotePipelineStage, SupplierRating, ArchiveFile,
    Sample, SampleStatus, SalesOrder, SalesOrderStatus, CompanyPipelineStage, Category, LotStatus,
    Priority, ProspectStage, PurchaseOrder, ActivityLog, Note, CompanyProfile, SupportTicket,
    Project, TaskStatus, AuditLog, Carrier, LogisticsDelivery, FreightPricingRule, InventoryMove, ChatMessage,
    Email,
    Team
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
};


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


export const MOCK_COMPANIES: Company[] = [
    { 
      id: 'comp-1', 
      name: 'Molelub, S.A. de C.V.',
      shortName: 'Molelub', 
      isActive: true, 
      stage: CompanyPipelineStage.ClienteActivo, 
      rfc: 'MOL123456XYZ',
      ownerId: 'natalia',
      createdById: 'david',
      createdAt: daysAgo(365),
      priority: Priority.Alta,
      industry: 'Química Industrial',
      website: 'https://moelub.com',
      productsOfInterest: ['UREA-AGR-4600'],
      primaryContact: {
        name: 'Roberto Ortega',
        email: 'roberto@moelub.com',
        phone: '5512345678'
      },
      deliveryAddresses: [
        { id: 'addr-1', isPrincipal: true, street: 'Av. Industrial 123', city: 'Veracruz', state: 'Veracruz', zip: '91700' },
        { id: 'addr-2', isPrincipal: false, street: 'Parque Industrial Tultitlán 500', city: 'Tultitlán', state: 'Estado de México', zip: '54948' }
      ],
      healthScore: {
          score: 85,
          label: 'Saludable'
      },
      profile: {
        communication: {
            channel: 'Email',
            days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
            time: '10-13',
            isAvailable: true,
            tone: 'Amigable',
            formality: 'Profesional',
            sla: 'Mismo día hábil',
            quoteFormat: 'PDF'
        },
        decisionMap: [
            {id: 'stake-1', name: 'Ana Méndez', role: 'Gerente de Compras', power: 'Decisor', contact: 'ana.mendez@moelub.com'},
            {id: 'stake-2', name: 'Carlos Lima', role: 'Jefe de Planta', power: 'Influenciador', contact: 'carlos.lima@moelub.com'}
        ],
        purchaseProcess: {
            requiresOC: true,
            requiresSupplierRegistry: true,
            isTender: false,
            requiredDocs: ['Constancia de Situación Fiscal', 'INE Representante Legal'],
            approvalCriteria: ['Precio', 'Tiempo de Entrega'],
            paymentTerm: '30 días',
            budget: 150000,
            purchaseType: 'Recurrente'
        },
        useCase: {
            application: 'Producción de lubricantes y aditivos para la industria automotriz.',
            productsOfInterest: ['prod-3'],
            presentation: 'Granel',
            frequency: 'Mensual',
            monthlyConsumption: 50
        },
        logistics: {
            deliveryPoints: 'Planta Veracruz y Bodega Tultitlán. Acceso para trailers de 53 pies.',
            downloadWindow: 'L-V de 9:00 a 16:00, con cita previa.',
            equipmentOnSite: ['Montacargas', 'Báscula'],
            accessRestrictions: ['Cita Previa', 'Equipo de Seguridad Obligatorio (EPP)'],
            incoterm: 'DDP',
            freightResponsible: 'Nosotros'
        },
        triggers: {
            restockPoint: 'Cuando su inventario baja de 20 toneladas.',
            maxDeliveryTime: 3
        }
      }
    },
    { id: 'comp-2', name: 'Santzer Comercializadora', shortName: 'Santzer', isActive: true, stage: CompanyPipelineStage.ClienteActivo, rfc: 'SAN789012ABC', ownerId: 'user-1', priority: Priority.Media, productsOfInterest: [], deliveryAddresses: [], createdAt: daysAgo(180), createdById: 'user-1', healthScore: { score: 60, label: 'Estable' } },
    { id: 'comp-3', name: 'Químicos del Golfo', shortName: 'Quimigolfo', isActive: true, stage: CompanyPipelineStage.Investigacion, rfc: 'QGO345678DEF', ownerId: 'user-2', priority: Priority.Baja, productsOfInterest: [], deliveryAddresses: [], createdAt: daysAgo(20), createdById: 'user-2', healthScore: { score: 30, label: 'En Riesgo' } },
    { id: 'comp-4', name: 'Transportes Rápidos del Norte', shortName: 'TRN', isActive: true, stage: CompanyPipelineStage.AlianzaEstrategica, rfc: 'TRN901234GHI', ownerId: 'user-1', priority: Priority.Media, productsOfInterest: [], deliveryAddresses: [], createdAt: daysAgo(400), createdById: 'user-1' },
    { id: 'comp-5', name: 'Agroinsumos del Pacífico', shortName: 'Agroinsumos Pac.', isActive: true, stage: CompanyPipelineStage.Calificada, rfc: 'APA567890JKL', ownerId: 'user-2', priority: Priority.Alta, productsOfInterest: [], deliveryAddresses: [], createdAt: daysAgo(50), createdById: 'user-2' },
    { id: 'comp-6', name: 'Industrias ABC (Inactiva)', shortName: 'Industrias ABC', isActive: false, stage: CompanyPipelineStage.ClienteInactivo, rfc: 'IAB112233MNO', ownerId: 'user-1', priority: Priority.Baja, productsOfInterest: [], deliveryAddresses: [], createdAt: daysAgo(600), createdById: 'user-1' },
];

export const MOCK_PRODUCTS: Product[] = [
    { id: 'prod-1', sku: 'URE-AGR', name: 'Urea Agrícola', unitDefault: 'ton', isActive: true, categoryId: 'cat-1', pricing: { min: 470 }, reorderPoint: 150 },
    { id: 'prod-2', sku: 'SUL-AMM', name: 'Sulfato de Amonio', unitDefault: 'ton', isActive: true, categoryId: 'cat-1', pricing: { min: 350 }, reorderPoint: 100 },
    { id: 'prod-3', sku: 'GLI-FOS', name: 'Glifosato 360', unitDefault: 'L', isActive: true, categoryId: 'cat-2', pricing: { min: 5.5 }, reorderPoint: 2000 },
    { id: 'prod-4', sku: 'ACE-LUB', name: 'Aceite Lubricante HD-50', unitDefault: 'L', isActive: false, categoryId: 'cat-3', pricing: { min: 4.2 }, reorderPoint: 500 },
    { id: 'prod-5', sku: 'UREA-IND', name: 'UREA-IND', unitDefault: 'ton', isActive: true, categoryId: 'cat-3', pricing: { min: 500 }, reorderPoint: 50 },
    { id: 'prod-6', sku: 'UREA-LIQ', name: 'UREA-LIQ', unitDefault: 'L', isActive: true, categoryId: 'cat-3', pricing: { min: 2.5 }, reorderPoint: 10000 },
];

export const MOCK_LOTS: { [productId: string]: ProductLot[] } = {
    'prod-1': [ // Urea Agrícola
        { 
            id: 'lot-1a', code: 'URE-241025-225', unitCost: 450, supplierId: 'sup-3', receptionDate: daysAgo(30), initialQty: 225, status: LotStatus.Disponible,
            pricing: { min: 480 }, stock: [ { locationId: 'loc-1', qty: 120 }, { locationId: 'loc-2', qty: 85 } ] 
        },
        { 
            id: 'lot-1b', code: 'URE-241115-310', unitCost: 445, supplierId: 'sup-3', receptionDate: daysAgo(15), initialQty: 310, status: LotStatus.Disponible,
            pricing: { min: 470 }, stock: [ { locationId: 'loc-1', qty: 310 } ] 
        },
    ],
    'prod-2': [ // Sulfato de Amonio
        { 
            id: 'lot-2a', code: 'SAM-240930-198', unitCost: 320, supplierId: 'sup-2', receptionDate: daysAgo(45), initialQty: 250, status: LotStatus.Disponible,
            pricing: { min: 350 }, stock: [ { locationId: 'loc-1', qty: 250 } ] 
        },
    ],
    'prod-3': [ // Glifosato
        { 
            id: 'lot-3a', code: 'GLI-250105-015', unitCost: 4.8, supplierId: 'sup-2', receptionDate: daysAgo(10), initialQty: 5000, status: LotStatus.EnCuarentena,
            pricing: { min: 5.5 }, stock: [ { locationId: 'loc-3', qty: 5000 } ] 
        },
    ],
};

export const MOCK_PROSPECTS: Prospect[] = [
  {
    id: 'prospect-1',
    name: 'AgroFertilizantes del Sur',
    ownerId: 'user-1',
    createdById: 'user-1',
    estValue: 25000,
    stage: ProspectStage.Nueva,
    createdAt: daysAgo(1),
    origin: 'Web',
    priority: 'Alta',
    industry: 'Agricultura',
    productsOfInterest: ['Urea Agrícola', 'Sulfato de Amonio'],
    lastInteraction: { type: 'Formulario Web', date: daysAgo(1) },
    nextAction: { description: 'Enviar cotización inicial para 50 ton de Urea', dueDate: daysAgo(-1) },
    notes: `Contacto inicial a través del formulario web. El cliente, Juan Hernández (Gerente de Compras), busca proveedor para sus cultivos de maíz y sorgo en la región sur de Veracruz.
    
Puntos clave de la solicitud:
- Interés principal en Urea Agrícola y Sulfato de Amonio.
- Volumen inicial: 50 toneladas de Urea.
- Necesitan la entrega en su almacén principal en Coatzacoalcos.
- Preguntó por nuestra capacidad de suministro recurrente y posibles descuentos por volumen.

Se percibe como una oportunidad seria y de alto potencial. Es crucial responder con una cotización competitiva y clara en las próximas 24 horas para causar una buena primera impresión.`
  },
  { id: 'prospect-2', name: 'Químicos Industriales MX', ownerId: 'user-1', createdById: 'user-2', estValue: 75000, stage: ProspectStage.Contactado, createdAt: daysAgo(5), industry: 'Química', priority: 'Media', nextAction: { description: 'Enviar brochure', dueDate: daysAgo(-2) } },
  { id: 'prospect-3', name: 'Plásticos del Sureste', ownerId: 'user-1', createdById: 'user-1', estValue: 12000, stage: ProspectStage.Calificado, createdAt: daysAgo(10), productsOfInterest: ['Aceite Lubricante HD-50'] },
  { id: 'prospect-4', name: 'LogiTrans', ownerId: 'user-1', createdById: 'user-2', estValue: 50000, stage: ProspectStage.Propuesta, createdAt: daysAgo(15), lastInteraction: { type: 'Email Enviado', date: daysAgo(2) } },
  { id: 'prospect-5', name: 'Constructora Rápida', ownerId: 'user-1', createdById: 'user-1', estValue: 150000, stage: ProspectStage.Negociacion, createdAt: daysAgo(20), priority: 'Alta' },
  { id: 'prospect-6', name: 'NutriAlimentos SA', ownerId: 'user-1', createdById: 'user-1', estValue: 35000, stage: ProspectStage.Calificado, createdAt: daysAgo(8), industry: 'Alimentos' },
  { id: 'prospect-7', name: 'Transportes Veloz', ownerId: 'user-2', createdById: 'user-2', estValue: 42000, stage: ProspectStage.Activa, createdAt: daysAgo(3), priority: 'Media', nextAction: { description: 'Llamada seguimiento', dueDate: daysAgo(0)} },
  { id: 'prospect-8', name: 'Aceros del Norte', ownerId: 'user-1', createdById: 'user-2', estValue: 95000, stage: ProspectStage.Pausada, createdAt: daysAgo(45), pausedInfo: { reason: 'Esperando presupuesto Q3', reviewDate: daysAgo(-30) } },
  { id: 'prospect-9', name: 'Maquinaria Pesada Corp', ownerId: 'user-2', createdById: 'user-2', estValue: 60000, stage: ProspectStage.EnDesarrollo, createdAt: daysAgo(2) },
  { id: 'prospect-10', name: 'Cliente Frecuente A', ownerId: 'user-1', createdById: 'user-1', estValue: 15000, stage: ProspectStage.RecurrenteVIP, createdAt: daysAgo(100) },
  { id: 'prospect-11', name: 'Prospecto Olvidado', ownerId: 'user-1', createdById: 'user-1', estValue: 20000, stage: ProspectStage.Reactivacion, createdAt: daysAgo(90) },
  { id: 'prospect-12', name: 'Proyecto Fallido Inc.', ownerId: 'user-2', createdById: 'user-2', estValue: 80000, stage: ProspectStage.Perdido, createdAt: daysAgo(60), lostInfo: { reason: 'Competencia ofreció mejor precio', stageLost: ProspectStage.Negociacion } },
];

export const MOCK_CONTACTS: Contact[] = [
    { id: 'contact-1', companyId: 'comp-1', name: 'Roberto Ortega', role: 'Gerente de Compras', email: 'roberto.o@moelub.com', phone: '55-1234-5678', ownerId: 'user-1' },
    { id: 'contact-2', companyId: 'comp-1', name: 'Ana Méndez', role: 'Gerente de Compras Sr.', email: 'ana.mendez@moelub.com', phone: '55-8765-4321', ownerId: 'user-1' },
    { id: 'contact-3', companyId: 'comp-1', name: 'Carlos Lima', role: 'Jefe de Planta', email: 'carlos.lima@moelub.com', phone: '55-1122-3344', ownerId: 'user-1' },
    { id: 'contact-4', companyId: 'comp-2', name: 'Pedro Ramirez', role: 'Jefe de Logística', email: 'pedro.r@logitrans.com', phone: '81-1234-5678', ownerId: 'user-1' },
    { id: 'contact-5', name: 'Ana Solis', role: 'Gerente General', email: 'ana.s@quimicosmx.com', phone: '33-8765-4321', ownerId: 'user-1' },
    { id: 'contact-6', prospectId: 'prospect-2', name: 'Laura Gómez', role: 'Gerente de Proyectos', email: 'laura.g@quimicosmx.com', phone: '33-1122-3344', ownerId: 'user-1' },
];

export const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'sup-1', name: 'Transportes Rápidos del Norte', rating: SupplierRating.Excelente, industry: 'Logística' },
    { id: 'sup-2', name: 'Químicos del Golfo', rating: SupplierRating.Bueno, industry: 'Química' },
    { id: 'sup-3', name: 'Fertilizantes del Bajío', rating: SupplierRating.Regular, industry: 'Agricultura' },
    { id: 'sup-4', name: 'Almacenes Seguros S.A.', rating: SupplierRating.Bueno, industry: 'Almacenaje' },
];

export const MOCK_SAMPLES: Sample[] = [
    { id: 'sample-1', name: 'Muestra Urea para AgroFert', companyId: 'comp-1', productId: 'prod-1', status: SampleStatus.Solicitada, ownerId: 'user-1', requestDate: daysAgo(2) },
    { id: 'sample-2', name: 'Muestra Glifosato para Prospecto Nuevo', prospectId: 'prospect-2', productId: 'prod-3', status: SampleStatus.Enviada, ownerId: 'user-1', requestDate: daysAgo(10) },
    { id: 'sample-3', name: 'Muestra Sulfato para LogiTrans', companyId: 'comp-4', productId: 'prod-2', status: SampleStatus.Recibida, ownerId: 'user-2', requestDate: daysAgo(20) },
];

export const MOCK_QUOTES: Quote[] = [
    { id: 'QT-1001', companyId: 'comp-1', status: QuotePipelineStage.Enviada, currency: 'USD', items: [], fees: {}, commissions: {}, deliveries: [], totals: { base: 25000, extras: 500, tax: 4080, grandTotal: 29580 } },
    { id: 'QT-1002', prospectId: 'prospect-5', status: QuotePipelineStage.Negociacion, currency: 'USD', items: [], fees: {}, commissions: {}, deliveries: [], totals: { base: 150000, extras: 2000, tax: 24320, grandTotal: 176320 } },
    { id: 'QT-1003', companyId: 'comp-2', status: QuotePipelineStage.Borrador, currency: 'MXN', items: [], fees: {}, commissions: {}, deliveries: [], totals: { base: 850000, extras: 0, tax: 136000, grandTotal: 986000 } },
];

export const MOCK_SALES_ORDERS: SalesOrder[] = [
    { id: 'SO-2024-001', quoteId: 'quote-1', companyId: 'comp-1', status: SalesOrderStatus.Facturada, deliveries: [], total: 29580, createdAt: daysAgo(120), items: [{productId: 'prod-1', productName: 'Urea Agrícola', lotId: 'lot-1a', qty: 50, unit: 'ton', unitPrice: 591.6, subtotal: 29580}] },
    { id: 'SO-2024-002', companyId: 'comp-3', status: SalesOrderStatus.Pendiente, deliveries: [], total: 50000, createdAt: daysAgo(1), items: [] },
    { id: 'SO-2024-003', companyId: 'comp-2', status: SalesOrderStatus.Entregada, deliveries: [], total: 75000, createdAt: daysAgo(30), items: [] },
    { id: 'SO-2024-004', companyId: 'comp-1', status: SalesOrderStatus.Facturada, deliveries: [], total: 35000, createdAt: daysAgo(65), items: [{productId: 'prod-2', productName: 'Sulfato de Amonio', lotId: 'lot-2a', qty: 100, unit: 'ton', unitPrice: 350, subtotal: 35000}] },
    { id: 'SO-2024-005', companyId: 'comp-1', status: SalesOrderStatus.Entregada, deliveries: [], total: 42000, createdAt: daysAgo(15), items: [{productId: 'prod-1', productName: 'Urea Agrícola', lotId: 'lot-1b', qty: 70, unit: 'ton', unitPrice: 600, subtotal: 42000}] },
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
    { id: 'OC-2024-001', supplierId: 'sup-2', status: 'Recibida Parcial', total: 45000, createdAt: daysAgo(10) },
    { id: 'OC-2024-002', supplierId: 'sup-3', status: 'Confirmada', total: 120000, createdAt: daysAgo(3) },
    { id: 'OC-2024-003', supplierId: 'sup-1', status: 'Enviada', total: 8500, createdAt: daysAgo(1) },
];

export const MOCK_PROJECTS: Project[] = [
    {
        id: 'proj-1',
        name: 'Lanzamiento Q4 Nuevos Productos',
        description: 'Coordinar el lanzamiento de la nueva línea de fertilizantes para el último trimestre.',
        status: 'Activo',
        members: ['natalia', 'david'],
        dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString(),
    },
    {
        id: 'proj-2',
        name: 'Implementación de Portal de Clientes',
        description: 'Desarrollar y lanzar un portal de autoservicio para clientes recurrentes.',
        status: 'Activo',
        members: ['david'],
        dueDate: new Date(new Date().getFullYear(), 9, 30).toISOString(),
    },
    {
        id: 'proj-3',
        name: 'Campaña de Reactivación de Cuentas Inactivas',
        description: 'Contactar y ofrecer promociones a clientes que no han comprado en los últimos 6 meses.',
        status: 'Completado',
        members: ['natalia'],
        dueDate: daysAgo(30),
    },
];

export const MOCK_TASKS: Task[] = [
    { id: 'task-1', title: 'Revisar contrato de LogiTrans', dueAt: daysAgo(-2), status: TaskStatus.EnProgreso, assignees: ['natalia'], watchers:[], links: { companyId: 'comp-2' }, projectId: 'proj-1', priority: Priority.Alta },
    { id: 'task-2', title: 'Llamar a Roberto Ortega para seguimiento de OC', dueAt: daysAgo(0), status: TaskStatus.PorHacer, assignees: ['natalia'], watchers:[], links: { companyId: 'comp-1' }, priority: Priority.Alta },
    { id: 'task-3', title: 'Enviar cotización a Constructora Rápida', dueAt: daysAgo(1), status: TaskStatus.PorHacer, assignees: ['natalia'], watchers:[], links: { companyId: 'comp-5' }, projectId: 'proj-1' },
    { id: 'task-4', title: 'Confirmar especificaciones técnicas con Carlos Lima', dueAt: daysAgo(-5), status: TaskStatus.Hecho, assignees: ['david'], watchers:[], links: { companyId: 'comp-1' }, projectId: 'proj-2', priority: Priority.Media },
    { id: 'task-5', title: 'Definir KPIs para el portal de clientes', dueAt: daysAgo(-1), status: TaskStatus.EnProgreso, assignees: ['david'], watchers:[], projectId: 'proj-2', priority: Priority.Media },
    { id: 'task-6', title: 'Preparar lista de clientes para campaña de reactivación', dueAt: daysAgo(40), status: TaskStatus.Hecho, assignees: ['natalia'], watchers:[], projectId: 'proj-3', priority: Priority.Baja },
    { id: 'task-7', title: 'Agendar reunión de QBR con Molelub', dueAt: daysAgo(-3), status: TaskStatus.PorHacer, assignees: ['natalia'], watchers:[], links: { companyId: 'comp-1' }, priority: Priority.Alta },
    { id: 'task-8', title: 'Validar stock de Glifosato para cotización', dueAt: daysAgo(0), status: TaskStatus.PorHacer, assignees: ['david'], watchers:[], links: { prospectId: 'prospect-1' }, priority: Priority.Alta },
    { id: 'task-9', title: 'Investigar nuevo proveedor de transporte para el Bajío', dueAt: daysAgo(-15), status: TaskStatus.EnProgreso, assignees: ['david'], watchers:[], projectId: 'proj-1', priority: Priority.Media },
    { id: 'task-10', title: 'Preparar reporte de ventas mensual', status: TaskStatus.EnProgreso, assignees: ['natalia'], watchers:[], priority: Priority.Media, dueAt: daysAgo(-1) },
    { id: 'task-11', title: 'Diseñar borrador de email para campaña de reactivación', status: TaskStatus.Hecho, assignees: ['natalia'], watchers:[], projectId: 'proj-3', priority: Priority.Baja, dueAt: daysAgo(35) },
];

export const MOCK_ACTIVITIES: ActivityLog[] = [
    { id: 'act-1', companyId: 'comp-1', type: 'Llamada', description: 'Llamada de seguimiento sobre OC-2024-001', userId: 'natalia', createdAt: daysAgo(2) },
    { id: 'act-2', companyId: 'comp-1', type: 'Email', description: 'Enviada cotización QT-1001', userId: 'natalia', createdAt: daysAgo(5) },
    { id: 'act-3', prospectId: 'prospect-2', type: 'Reunión', description: 'Reunión inicial de presentación', userId: 'david', createdAt: daysAgo(7) },
    { id: 'act-4', contactId: 'contact-1', companyId: 'comp-1', type: 'Nota', description: 'Roberto Ortega pregunta por nuevo producto', userId: 'natalia', createdAt: daysAgo(1) },
];

export const MOCK_NOTES: Note[] = [
    { id: 'note-1', companyId: 'comp-1', text: 'El cliente está muy interesado en expandir su línea de productos con nosotros. Preguntar sobre la nueva fórmula en la próxima llamada.', userId: 'natalia', createdAt: daysAgo(1) },
    { id: 'note-2', prospectId: 'prospect-1', text: 'Parece que el presupuesto es su principal preocupación. Ofrecer opciones de financiamiento si es posible.', userId: 'david', createdAt: daysAgo(3) },
    { id: 'note-3', contactId: 'contact-1', text: 'Prefiere que lo contacten por la mañana.', userId: 'natalia', createdAt: daysAgo(10) },
    { id: 'note-4', supplierId: 'sup-1', text: 'Confirmar siempre la disponibilidad de unidades con 48h de antelación.', userId: 'david', createdAt: daysAgo(5) },
];

export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [
    { id: 'tkt-1', companyId: 'comp-1', title: 'Factura SO-2024-001 incorrecta', status: 'Abierto', priority: Priority.Alta, createdAt: daysAgo(1) },
];

export const MOCK_ARCHIVE_FILES: ArchiveFile[] = [
    { id: 'file-1', companyId: 'comp-1', name: 'Contrato_Molelub_2024.pdf', size: 1200000, lastModified: daysAgo(180), url: '#', tags: ['Contrato'] },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', entity: 'Prospecto', entityId: 'prospect-1', action: 'Creación de prospecto', by: 'david', at: daysAgo(1) },
  { id: 'log-2', entity: 'Prospecto', entityId: 'prospect-4', action: 'Cambio de etapa a Propuesta', by: 'natalia', at: daysAgo(2) },
  { id: 'log-3', entity: 'Cliente', entityId: 'comp-1', action: 'Edición de perfil de cliente', by: 'natalia', at: daysAgo(3) },
  { id: 'log-4', entity: 'Producto', entityId: 'prod-3', action: 'Ajuste de precio mínimo', by: 'admin', at: daysAgo(5) },
];

export const MOCK_CARRIERS: Carrier[] = [
    { id: 'car-1', name: 'Transportes Rápidos del Norte', rating: SupplierRating.Excelente, contactName: 'Juan Perez', contactPhone: '81-1234-5678', serviceTypes: ['Carga Seca', 'Material Peligroso'] },
    { id: 'car-2', name: 'Logística del Golfo', rating: SupplierRating.Bueno, contactName: 'Maria Rodriguez', contactPhone: '22-9876-5432', serviceTypes: ['Carga Seca'] },
];

export const MOCK_DELIVERIES: LogisticsDelivery[] = [
    { id: 'del-1', salesOrderId: 'SO-2024-005', companyId: 'comp-1', destination: 'Planta Veracruz', carrierId: 'car-1', scheduledDate: daysAgo(-2), status: 'Programada' },
    { id: 'del-2', salesOrderId: 'SO-2024-003', companyId: 'comp-2', destination: 'Bodega CDMX', carrierId: 'car-2', scheduledDate: daysAgo(28), status: 'Entregada' },
];

export const MOCK_FREIGHT_PRICING: FreightPricingRule[] = [
    { id: 'fp-1', zone: 'Norte', minWeightKg: 1000, maxWeightKg: 5000, pricePerKg: 1.5, flatRate: 0 },
    { id: 'fp-2', zone: 'Norte', minWeightKg: 5001, maxWeightKg: 25000, pricePerKg: 1.2, flatRate: 0 },
    { id: 'fp-3', zone: 'Bajío', minWeightKg: 1000, maxWeightKg: 25000, pricePerKg: 0, flatRate: 15000 },
];

export const MOCK_INVENTORY_MOVES: InventoryMove[] = [
    { id: 'im-1', type: 'in', productId: 'prod-5', lotId: 'lot-5a', qty: 100, unit: 'ton', fromLocationId: undefined, toLocationId: 'loc-1', note: 'OC-12345', createdAt: new Date('2024-11-08T10:00:00Z').toISOString(), userId: 'user-1' },
    { id: 'im-2', type: 'out', productId: 'prod-6', lotId: 'lot-6a', qty: 5000, unit: 'L', fromLocationId: 'loc-3', toLocationId: undefined, note: 'Venta-5678', createdAt: new Date('2024-11-08T09:00:00Z').toISOString(), userId: 'user-2' },
    { id: 'im-3', type: 'transfer', productId: 'prod-1', lotId: 'lot-1a', qty: 50, unit: 'ton', fromLocationId: 'loc-2', toLocationId: 'loc-1', note: 'Rebalanceo', createdAt: new Date('2024-11-08T08:00:00Z').toISOString(), userId: 'user-3' },
    { id: 'im-4', type: 'adjust', productId: 'prod-5', lotId: 'lot-5a', qty: -5, unit: 'ton', fromLocationId: 'loc-1', toLocationId: undefined, note: 'Merma', createdAt: new Date('2024-11-07T15:00:00Z').toISOString(), userId: 'user-1' },
];

export const MOCK_MESSAGES: ChatMessage[] = [
    { id: 'msg-1', senderId: 'user-2', receiverId: 'user-1', text: 'Hola Natalia, ¿tienes un momento para revisar la propuesta de LogiTrans?', timestamp: daysAgo(1) },
    { id: 'msg-2', senderId: 'user-1', receiverId: 'user-2', text: '¡Hola David! Claro, la estoy viendo ahora. Te comento en 15 minutos.', timestamp: new Date(new Date(daysAgo(1)).getTime() + 5 * 60000).toISOString() },
    { id: 'msg-3', senderId: 'user-1', receiverId: 'user-2', text: 'Listo. Veo que el flete está un poco alto. ¿Podemos negociar una tarifa preferencial con TRN?', timestamp: new Date(new Date(daysAgo(1)).getTime() + 20 * 60000).toISOString() },
    { id: 'msg-4', senderId: 'user-2', receiverId: 'user-1', text: 'Buena idea. Me pongo en contacto con ellos y te aviso.', timestamp: new Date(new Date(daysAgo(1)).getTime() + 22 * 60000).toISOString() },
    { id: 'msg-5', senderId: 'user-3', receiverId: 'user-1', text: 'Natalia, favor de revisar el reporte de ventas del Q3. Hay algunas discrepancias.', timestamp: daysAgo(2) },
];

export const MOCK_EMAILS: Email[] = [
    {
        id: 'email-1',
        from: { name: 'Roberto Ortega', email: 'roberto@moelub.com' },
        to: [{ name: 'Natalia', email: 'natalia@crmstudio.com' }],
        subject: 'Seguimiento Cotización QT-1001',
        body: 'Hola Natalia,\n\nSolo para dar seguimiento a la cotización que nos enviaste la semana pasada. ¿Tuviste oportunidad de revisarla con tu equipo?\n\nQuedo al pendiente.\n\nSaludos,\nRoberto Ortega',
        timestamp: daysAgo(1),
        status: 'unread',
        folder: 'inbox',
    },
    {
        id: 'email-2',
        from: { name: 'Natalia', email: 'natalia@crmstudio.com' },
        to: [{ name: 'David', email: 'david@crmstudio.com' }],
        subject: 'RE: Revisión de contrato LogiTrans',
        body: 'Hola David,\n\nYa revisé el contrato. Tengo un par de comentarios sobre las cláusulas de entrega. ¿Podemos verlo juntos a las 3 pm?\n\nGracias,\nNatalia',
        timestamp: daysAgo(2),
        status: 'read',
        folder: 'sent',
    },
    {
        id: 'email-3',
        from: { name: 'Ana Solis', email: 'ana.s@quimicosmx.com' },
        to: [{ name: 'Natalia', email: 'natalia@crmstudio.com' }],
        subject: 'Solicitud de Muestra - Glifosato',
        body: 'Estimada Natalia,\n\nNos gustaría solicitar una muestra de su producto Glifosato 360 para realizar pruebas internas. Agradeceríamos nos indicara el procedimiento a seguir.\n\nSaludos cordiales,\nAna Solis',
        timestamp: daysAgo(3),
        status: 'read',
        folder: 'inbox',
    },
    {
        id: 'email-4',
        from: { name: 'Natalia', email: 'natalia@crmstudio.com' },
        to: [{ name: 'Roberto Ortega', email: 'roberto@moelub.com' }],
        subject: '[BORRADOR] Propuesta de volumen',
        body: 'Hola Roberto,\n\nAnalizando sus consumos mensuales, creo que podemos ofrecerles un descuento por volumen si se comprometen a...',
        timestamp: daysAgo(0),
        status: 'draft',
        folder: 'drafts',
    },
];

// --- Mock API ---

const COLLECTIONS: { [key: string]: any[] | { [key: string]: any } } = {
  prospects: MOCK_PROSPECTS,
  companies: MOCK_COMPANIES,
  products: MOCK_PRODUCTS,
  lots: MOCK_LOTS,
  contacts: MOCK_CONTACTS,
  suppliers: MOCK_SUPPLIERS,
  samples: MOCK_SAMPLES,
  quotes: MOCK_QUOTES,
  salesOrders: MOCK_SALES_ORDERS,
  purchaseOrders: MOCK_PURCHASE_ORDERS,
  tasks: MOCK_TASKS,
  projects: MOCK_PROJECTS,
  archives: MOCK_ARCHIVE_FILES,
  supportTickets: MOCK_SUPPORT_TICKETS,
  activities: MOCK_ACTIVITIES,
  notes: MOCK_NOTES,
  categories: MOCK_CATEGORIES,
  auditLogs: MOCK_AUDIT_LOGS,
  locations: MOCK_LOCATIONS,
  carriers: MOCK_CARRIERS,
  deliveries: MOCK_DELIVERIES,
  freightPricing: MOCK_FREIGHT_PRICING,
  inventoryMoves: MOCK_INVENTORY_MOVES,
  messages: MOCK_MESSAGES,
  emails: MOCK_EMAILS,
  users: Object.values(MOCK_USERS),
  teams: MOCK_TEAMS,
};

export const api = {
  getCollection: (name: string): Promise<any[]> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const collection = COLLECTIONS[name];
        if (Array.isArray(collection)) {
            resolve(collection);
        } else if (typeof collection === 'object' && collection !== null) {
            // This is for collections like 'lots' which are objects
            resolve([collection]);
        } else {
            resolve([]);
        }
      }, 500);
    });
  },
  getDoc: (collection: string, id: string): Promise<any | null> => {
      return new Promise(resolve => {
          setTimeout(() => {
              const coll = COLLECTIONS[collection];
              if(Array.isArray(coll)) {
                const doc = coll.find(item => item.id === id);
                resolve(doc || null);
              }
              resolve(null);
          }, 300);
      });
  },
  getLotsForProduct: (productId: string): Promise<any[]> => {
      return new Promise(resolve => {
          setTimeout(() => {
              const lotsByProduct = COLLECTIONS.lots as { [key: string]: any[] };
              resolve(lotsByProduct[productId] || []);
          }, 400);
      })
  }
};