
// Base User type

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: {
    dataScope: 'own' | 'team' | 'all';
    pages: Record<string, Record<string, string[]>>;
    aiAccess?: Record<User['role'], boolean>;
    actionPermissions?: Record<User['role'], Record<string, boolean>>;
  };
}


export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  phone?: string;
  roleId: string;
  teamId?: string;
  isActive: boolean;
  companyId?: string;
  signature?: string;
  fullName?: string;
  nickname?: string;
  birthday?: string; // ISO date string YYYY-MM-DD
  interests?: string;
  country?: string;
  permissions?: Role['permissions'];
  // For convenience at runtime
  roleName?: string;
  // For backwards compatibility during transition
  role?: 'Owner' | 'Admin' | 'Ventas' | 'Logística';
  // Tracks if the user has finished the initial setup (password reset + profile)
  hasCompletedOnboarding?: boolean;
}

export interface Invitation {
    id: string;
    email: string;
    name: string;
    roleId: string;
    teamId?: string;
    companyId?: string;
    permissions: Role['permissions'];
    createdAt: string;
    status: 'pending' | 'used';
}

export interface Birthday {
  id: string;
  userId: string;
  name: string;
  date: string; // YYYY-MM-DD
}

export interface SignatureTemplate {
  id: string;
  name: string;
  htmlContent: string;
}

export interface ConnectedEmailAccount {
  id: string;
  userId: string;
  email: string;
  status: 'Conectado' | 'Error de autenticación' | 'Desconectado';
  signatureTemplate?: string;
}

export interface Team {
    id: string;
    name: string;
    description: string;
    members: string[]; // array of user IDs
}

// --- NEW CANDIDATE MANAGEMENT TYPES ---

export type ProspectingGoal = 'Puredef' | 'Trade Aitirik' | 'Santzer' | 'General';
export type MainCategory = 'Puredef: Transporte y Logística' | 'Trade Aitirik: Insumos Agrícolas' | 'Industrial Revenue: Industria y Manufactura' | 'Commerce and resale for distributors';

export enum CandidateStatus {
  Pendiente = 'Pendiente',
  EnRevision = 'En Revisión',
  Aprobado = 'Aprobado', // Becomes a Prospect
  Rechazado = 'Rechazado',
  ListaNegra = 'Lista Negra',
}

export enum RejectionReason {
    NoInteresado = 'No interesado',
    NoCalifica = 'No califica (fuera de perfil)',
    InformacionIncorrecta = 'Información de contacto incorrecta',
    Otro = 'Otro',
}

export enum BlacklistReason {
    Competencia = 'Competencia',
    MalasPracticas = 'Malas prácticas comerciales',
    RiesgoCrediticio = 'Alto riesgo crediticio',
    NoContactar = 'Solicitud de no contactar',
    Otro = 'Otro',
}

export interface Review {
  text: string;
  rating: number;
  author: string;
  publishedAt: string;
  authorPhotoUrl?: string;
  likes?: number;
}

export interface CandidateAiAnalysis {
  suggestedCategory: string;
  suggestedSubCategory: string;
  relevantProducts: string[];
  profileSummary: string;
  confidenceScore: number; // 0-100
  nextActionSuggestion: string;
  communicationScripts: {
    whatsapp: string;
    phone: string;
    email: string;
  };
  socialMediaLinks?: string[];
  additionalEmails?: string[];
  additionalPhones?: string[];
}

export interface WebResult {
  title: string;
  url: string;
  description: string;
}

export interface ReviewsTag {
  title: string;
  count: number;
}

export interface PeopleAlsoSearch {
  title: string;
  reviewsCount: number;
  totalScore: number;
}

export interface ReviewsDistribution {
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
}

export interface Candidate {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  phones?: string[];
  email?: string;
  emails?: string[];
  website?: string;
  description?: string;
  price?: string;
  linkedIns?: string[];
  facebooks?: string[];
  instagrams?: string[];
  twitters?: string[];
  imageUrl?: string;
  images?: { url: string }[];
  googleMapsUrl?: string;
  googlePlaceId?: string;
  location?: { lat: number; lng: number };
  rawCategories?: string[]; // Categories from the data source
  status: CandidateStatus;
  assignedCompanyId?: 'Puredef' | 'Trade Aitirik' | 'Santzer' | null;
  manuallyAssignedProductId?: string | null;
  brandId?: string | null;
  tags: string[];
  notes: Note[];
  activityLog: ActivityLog[];
  aiAnalysis?: CandidateAiAnalysis;
  reviews?: Review[];
  averageRating?: number;
  reviewCount?: number;
  openingHours?: { day: string, hours: string }[];
  importedAt: string; // ISO Date string
  importedBy: string; // userId
  importHistoryId?: string; // Link to the import history record
  city?: string;
  state?: string;
  webResults?: WebResult[];
  reviewsTags?: ReviewsTag[];
  placesTags?: { title: string; count: number }[];
  peopleAlsoSearch?: PeopleAlsoSearch[];
  questionsAndAnswers?: any[];
  reviewsDistribution?: ReviewsDistribution;
}

export interface ImportHistory {
    id: string;
    searchCriteria: {
        searchTerms: string[];
        profiledCompany?: 'Puredef' | 'Trade Aitirik' | 'Santzer';
        profiledProductId?: string;
        location: string;
        resultsCount: number;
        language: 'es' | 'en';
        includeWebResults: boolean;
        enrichContacts: boolean;
        associatedBrandId?: string;
    };
    importedAt: string; // ISO Date string
    importedById: string; // userId
    totalProcessed: number;
    newCandidates: number;
    duplicatesSkipped: number;
    status: 'Completed' | 'Failed' | 'In Progress' | 'Cancelled';
}

export interface ImportSource {
    id: string;
    name: string;
    description: string;
    tags: string[];
    createdById: string;
    createdAt: string;
}


// Enums
export enum ProspectStage {
  // CUALIFICACIÓN (LEADS)
  Nueva = 'Nuevo Lead',
  Contactado = 'Contactado',
  Calificado = 'Calificado',
  
  // OPORTUNIDADES (DEALS)
  Propuesta = 'Propuesta',
  Negociacion = 'Negociación',
  
  // RESULTADOS
  Ganado = 'Ganado',
  Perdido = 'Perdido',
  Pausado = 'Pausado'
}

export enum SupplierRating {
  Excelente = 'Excelente',
  Bueno = 'Bueno',
  Regular = 'Regular',
  ListaNegra = 'Lista Negra',
}

export enum QuoteStatus {
  Borrador = 'Borrador',
  EnAprobacionInterna = 'En Aprobación Interna',
  AjustesRequeridos = 'Ajustes Requeridos',
  ListaParaEnviar = 'Lista para Enviar',
  EnviadaAlCliente = 'Enviada al Cliente',
  EnNegociacion = 'En Negociación',
  AprobadaPorCliente = 'Aprobada por Cliente',
  Rechazada = 'Rechazada',
}

export { QuoteStatus as QuotePipelineStage };


export enum SampleStatus {
  Solicitada = 'Solicitada',
  EnPreparacion = 'En Preparación',
  Enviada = 'Enviada',
  Recibida = 'Recibida',
  ConFeedback = 'Con Feedback',
  Cerrada = 'Cerrada',
  Archivada = 'Archivada',
}

export enum SalesOrderStatus {
  Pendiente = 'Pendiente',
  EnPreparacion = 'En Preparación',
  EnTransito = 'En Transito',
  Entregada = 'Entregada',
  Facturada = 'Facturada',
  Cancelada = 'Cancelada',
}

export enum CompanyPipelineStage {
  Investigacion = 'Investigación',
  PrimerContacto = 'Primer Contacto',
  Calificada = 'Calificada',
  ClienteActivo = 'Cliente Activo',
  ClienteInactivo = 'Cliente Inactivo',
  AlianzaEstrategica = 'Alianza Estratégica',
}

export enum LotStatus {
  RecepcionPendiente = 'Recepción Pendiente',
  Disponible = 'Disponible',
  EnCuarentena = 'En Cuarentena',
  Bloqueado = 'Bloqueado',
  Agotado = 'Agotado',
}

export enum Priority {
    Alta = 'Alta',
    Media = 'Media',
    Baja = 'Baja'
}

export enum TaskStatus {
  PorHacer = 'Por Hacer',
  EnProgreso = 'En Progreso',
  Hecho = 'Hecho',
}

export enum DeliveryStatus {
  Programada = 'Programada',
  EnTransito = 'En Transito',
  Entregada = 'Entregada',
  Incidencia = 'Incidencia',
  Cancelada = 'Cancelada',
}


// Detailed Profile Enums
export type CommunicationChannel = 'WhatsApp' | 'Teléfono' | 'Email' | 'Teams' | 'Zoom' | 'Telegram' | 'Otro';
export type PreferredDays = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
export type Tone = 'Amigable' | 'Formal' | 'Directo' | 'Técnico';
export type Formality = 'Casual' | 'Profesional' | 'Estricto';
export type SLA = 'Mismo día hábil' | '24 horas' | '48 horas' | 'Sin compromiso';
export type QuoteFormat = 'PDF' | 'Link' | 'Email' | 'WhatsApp';
export type PaymentTerm = 'Contado' | '7 días' | '15 días' | '30 días' | '60 días';
export type PurchaseType = 'Puntual' | 'Recurrente' | 'Proyecto';
export type PurchaseFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Anual';
export type Presentation = 'Granel' | 'Sacos' | 'Totes' | 'Porrones';
export type Incoterm = 'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP';


export type Unit = "ton" | "kg" | "L" | "unidad";
export type Currency = "USD" | "MXN";

export interface Stakeholder {
    id: string;
    name: string;
    role: string;
    power: string;
    contact: string;
}

export interface Address {
    id: string;
    isPrincipal: boolean;
    street: string;
    city: string;
    state: string;
    zip: string;
}

export interface CompanyProfile {
    communication: {
        channel: CommunicationChannel;
        days: PreferredDays[];
        time: string; // e.g. "10-13"
        isAvailable: boolean;
        tone: Tone;
        formality: Formality;
        sla: SLA;
        quoteFormat: QuoteFormat;
    };
    decisionMap: Stakeholder[];
    purchaseProcess: {
        requiresOC: boolean;
        requiresSupplierRegistry: boolean;
        isTender: boolean;
        requiredDocs: string[];
        approvalCriteria: string[];
        paymentTerm: PaymentTerm;
        budget: number;
        purchaseType: PurchaseType;
    };
    useCase: {
        application: string;
        productsOfInterest: string[];
        presentation: Presentation;
        frequency: PurchaseFrequency;
        monthlyConsumption: number;
    };
    logistics: {
        deliveryPoints: string;
        downloadWindow: string; // e.g. "L-V 9:00-17:00"
        equipmentOnSite: string[];
        accessRestrictions: string[];
        incoterm: Incoterm;
        freightResponsible: 'Nosotros' | 'Cliente';
    };
    triggers: {
        restockPoint: string;
        maxDeliveryTime: number; // in days
    };
}


// Firestore Collection Schemas
export interface Category {
  id: string;
  name: string;
  description?: string;
  code?: string; // For SKU generation e.g., "FERT"
  parentId?: string; // For hierarchy
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string; // Razón Social
  shortName?: string; // Nombre Corto (alias)
  rfc?: string;
  isActive: boolean;
  stage: CompanyPipelineStage;
  ownerId: string;
  createdById: string;
  createdAt: string; // ISO Date string
  priority: Priority;
  industry?: string;
  website?: string;
  productsOfInterest: string[];
  primaryContact?: {
      name: string;
      email: string;
      phone: string;
  };
  deliveryAddresses: Address[];
  profile?: Partial<CompanyProfile>; // All new detailed fields
  healthScore?: {
    score: number; // 0-100
    label: 'Saludable' | 'Estable' | 'En Riesgo';
  };
}


export interface Product {
  id: string;
  sku: string;
  name: string;
  unitDefault: Unit;
  currency: Currency;
  isActive: boolean;
  categoryId: string;
  pricing: {
    min: number; // Price is per unitDefault
  };
  reorderPoint?: number;
  createdAt?: string;
}

export interface ProductLot {
  id: string;
  productId: string;
  code: string;
  unitCost: number;
  supplierId?: string;
  receptionDate: string; // ISO date
  initialQty: number;
  status: LotStatus;
  pricing: {
    min: number; // This is the minSellPrice
  };
  stock: { locationId: string; qty: number }[];
}

export interface Prospect {
  id: string;
  name: string;
  stage: ProspectStage;
  ownerId: string;
  createdById: string;
  estValue: number;
  notes?: string;
  // Transferred from Candidate
  candidateId?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  // New detailed fields
  origin?: string;
  createdAt: string; // ISO Date string
  lastInteraction?: {
    type: string;
    date: string; // ISO Date string
  };
  priority?: 'Alta' | 'Media' | 'Baja';
  industry?: string;
  productsOfInterest?: string[];
  nextAction?: {
    description: string;
    dueDate: string; // ISO Date string
  };
  pausedInfo?: {
    reason: string;
    reviewDate: string; // ISO Date string
  };
  lostInfo?: {
    reason: string;
    stageLost: ProspectStage;
  };
}

export interface Contact {
  id: string;
  companyId?: string;
  prospectId?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  ownerId: string;
}

export interface Supplier {
  id: string;
  name: string;
  rating?: SupplierRating;
  industry?: string;
  website?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  contactPerson?: {
    name: string;
    email?: string;
    phone?: string;
  };
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    clabe: string;
  };
}

export interface QuoteItem {
  id: string;
  productId: string;
  lotId: string;
  qty: number;
  unit: Unit;
  unitPrice: number;
  subtotal: number;
}

export interface QuoteDelivery {
  id: string;
  address: string;
  zip: string;
  qty: number;
  date: string;
}

export type QuoteFeeType = 'commissions' | 'handling' | 'freight' | 'insurance' | 'storage' | 'other';

export type ManeuverType = 'Carga' | 'Descarga' | 'Carga y Descarga' | 'Ninguna';
export type CommissionType = 'fijo_ton' | 'fijo_litro';

export interface QuoteCommission {
    id: string;
    salespersonId: string;
    type: CommissionType;
    value: number;
}
export interface QuoteHandling {
    id: string;
    type: ManeuverType;
    costPerTon: number;
}
export interface QuoteFreight {
    id: string;
    origin: string;
    destination: string;
    cost: number;
}
export interface QuoteOtherItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
}

export interface QuoteChangeLog {
  id: string;
  timestamp: string; // ISO
  userId: string;
  field: string;
  oldValue: any;
  newValue: any;
  comment?: string;
}

export interface Quote {
  id: string;
  folio: string;
  issuingCompanyId: string;
  prospectId?: string;
  companyId?: string;
  contactId?: string;
  salespersonId: string; // Responsable
  approverId: string;
  status: QuoteStatus;
  createdAt: string; // ISO
  validity: number; // in days
  
  currency: Currency;
  exchangeRate: {
    official: number;
    commission: number;
    final: number;
  };
  
  items: QuoteItem[];
  deliveries: QuoteDelivery[];

  commissions: QuoteCommission[];
  handling: QuoteHandling[];
  freight: QuoteFreight[];
  insurance: {
    enabled: boolean;
    costPerTon: number;
  };
  storage: {
    enabled: boolean;
    period: number;
    unit: 'Día' | 'Semana' | 'Mes';
    costPerTon: number;
  };
  otherItems: QuoteOtherItem[];

  taxRate: number; // Percentage, e.g. 16

  totals: {
    products: number;
    commissions: number;
    handling: number;
    freight: number;
    insurance: number;
    storage: number;
    other: number;
    subtotal: number;
    tax: number;
    grandTotal: number;
  };
  
  notes?: string;
  changeLog: QuoteChangeLog[];
}


export interface Sample {
  id: string;
  name: string;
  prospectId?: string;
  companyId?: string;
  productId: string;
  status: SampleStatus;
  ownerId: string;
  requestDate: string; // ISO
}

export interface SalesOrder {
  id: string;
  quoteId?: string;
  companyId: string;
  status: SalesOrderStatus;
  deliveries: any[];
  deliveryIds?: string[];
  items: QuoteItem[];
  total: number;
  createdAt: string; // ISO
}

export interface PurchaseOrderItem {
  productId?: string; // Optional for custom items
  productName?: string; // Name of the product (from catalog or custom)
  qty: number;
  unit: Unit;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: 'Borrador' | 'Enviada' | 'Confirmada' | 'Recibida Parcial' | 'Recibida Completa';
  total: number;
  createdAt: string; // ISO
  items?: PurchaseOrderItem[];
  responsibleId?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  subtotal?: number;
  tax?: number;
}

export interface InventoryMove {
  id: string;
  type: "in" | "out" | "transfer" | "adjust";
  productId: string;
  lotId: string;
  qty: number;
  unit: Unit;
  fromLocationId?: string;
  toLocationId?: string;
  note?: string;
  createdAt: string; // ISO Date string
  userId: string;
}

export interface LogisticsDelivery {
    id: string;
    salesOrderId: string;
    companyId: string;
    destination: string;
    carrierId: string;
    scheduledDate: string; // ISO date string
    status: 'Programada' | 'En Tránsito' | 'Entregada' | 'Retrasada' | 'Cancelada';
    note?: string;
}

export interface Delivery {
    id: string;
    salesOrderId: string;
    companyId: string;
    deliveryNumber: string; // e.g. "1 of 3"
    status: DeliveryStatus;
    destination: string;
    carrierId: string;
    trackingNumber?: string;
    trackingUrl?: string;
    scheduledDate: string; // ISO date string
    items: QuoteItem[];
    notes: {
        text: string;
        userId: string;
        createdAt: string;
    }[];
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  createdAt: string; // ISO Date string
}

export interface Attachment {
  id: string;
  name: string;
  size: number; // in bytes
  url: string;
}

export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
  notes?: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    dueAt?: string;
    createdAt?: string;
    createdById?: string;
    assignees: string[];
    watchers: string[];
    links?: {
        companyId?: string;
        quoteId?: string;
        salesOrderId?: string;
        prospectId?: string;
    };
    projectId?: string;
    priority?: Priority;
    comments?: Comment[];
    subtasks?: Subtask[];
    tags?: string[];
    startDate?: string;
    teamId?: string;
    estimationHours?: number;
    attachments?: Attachment[];
}

export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'Activo' | 'En Pausa' | 'Completado';
    members: string[]; // array of user IDs
    dueDate: string; // ISO date string
}

export interface AuditLog {
    id: string;
    entity: string;
    entityId: string;
    action: string;
    by: string; // userId
    at: any; // Firestore Timestamp
}

export interface ArchiveFile {
    id: string;
    companyId?: string;
    name: string;
    size: number; // in bytes
    lastModified: string; // ISO Date string
    url: string;
    tags: ('Contrato' | 'Cotización' | 'Ficha Técnica')[];
    uploadedById: string;
}

export interface ActivityLog {
    id: string;
    companyId?: string;
    prospectId?: string;
    contactId?: string;
    candidateId?: string; // Link to candidate
    sampleId?: string;
    quoteId?: string;
    salesOrderId?: string;
    type: 'Llamada' | 'Email' | 'Reunión' | 'Nota' | 'Vista de Perfil' | 'Análisis IA' | 'Cambio de Estado' | 'Sistema';
    description: string;
    userId: string;
    createdAt: string; // ISO Date string
}

export interface Note {
    id: string;
    companyId?: string;
    prospectId?: string;
    contactId?: string;
    productId?: string;
    supplierId?: string;
    candidateId?: string; // Link to candidate
    sampleId?: string;
    quoteId?: string;
    salesOrderId?: string;
    text: string;
    userId: string;
    createdAt: string; // ISO Date string
}

export interface SupportTicket {
    id: string;
    companyId: string;
    title: string;
    status: 'Abierto' | 'En Progreso' | 'Cerrado';
    priority: Priority;
    createdAt: string; // ISO Date string
}

export interface Carrier {
    id: string;
    name: string;
    rating: SupplierRating;
    contactName: string;
    contactPhone: string;
    serviceTypes: ('Carga Seca' | 'Refrigerado' | 'Material Peligroso')[];
    trackingUrlTemplate?: string;
}

export interface FreightPricingRule {
    id: string;
    origin: string;
    destination: string;
    minWeightKg: number;
    maxWeightKg: number;
    pricePerKg: number;
    flatRate: number;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string; // Can be a userId or groupId
    text: string;
    timestamp: string; // ISO Date string
}

export interface Group {
    id: string;
    name: string;
    members: string[]; // array of user IDs
}

export interface Email {
    id: string;
    from: { name: string; email: string; };
    to: { name: string; email: string; }[];
    cc?: { name: string; email: string; }[];
    bcc?: { name: string; email: string; }[];
    subject: string;
    body: string;
    timestamp: string; // ISO Date string
    status: 'read' | 'unread' | 'draft';
    folder: 'inbox' | 'sent' | 'drafts' | 'trash';
    attachments?: Attachment[];
}

export enum InvoiceStatus {
    Borrador = 'Borrador',
    Enviada = 'Enviada',
    Pagada = 'Pagada',
    PagadaParcialmente = 'Pagada Parcialmente',
    Vencida = 'Vencida',
    Cancelada = 'Cancelada',
}

export interface InvoiceItem {
    productId: string;
    productName: string;
    qty: number;
    unit: Unit;
    unitPrice: number;
    subtotal: number;
}

export interface Invoice {
    id: string; // e.g., 'F-2024-001'
    salesOrderId: string;
    companyId: string;
    status: InvoiceStatus;
    createdAt: string; // ISO date
    dueDate: string; // ISO date
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    notes?: string;
}

export interface Expense {
    id: string;
    description: string;
    category: 'Logística' | 'Materia Prima' | 'Oficina' | 'Nómina' | 'Marketing' | 'Otros';
    amount: number;
    date: string; // ISO date string
    notes?: string;
}

export enum CommissionStatus {
  Pendiente = 'Pendiente',
  Pagada = 'Pagada',
}

export interface Commission {
  id: string;
  salesOrderId: string;
  salespersonId: string;
  amount: number;
  status: CommissionStatus;
  createdAt: string; // ISO date string
  paidAt?: string; // ISO date string
}

export interface MotivationalQuote {
  id: string;
  text: string;
  timeOfDay: ('morning' | 'afternoon' | 'evening')[];
  roles: ('Admin' | 'Ventas' | 'Logística' | 'General')[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task' | 'message' | 'system' | 'email';
  link: string;
  isRead: boolean;
  createdAt: string; // ISO Date string
}