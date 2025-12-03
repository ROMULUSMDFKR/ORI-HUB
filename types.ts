
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string; // 'Admin' | 'Ventas' | 'Logística' | 'Usuario' | 'Miembro'
    roleId?: string;
    roleName?: string;
    teamId?: string;
    companyId?: string;
    isActive: boolean;
    permissions?: Role['permissions'];
    hasCompletedOnboarding?: boolean;
    fullName?: string;
    nickname?: string;
    phone?: string;
    birthday?: string;
    interests?: string;
    country?: string;
    theme?: 'light' | 'dark';
    signature?: string;
    activeDashboards?: string[];
}

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: {
        dataScope: 'own' | 'team' | 'all';
        pages: Record<string, Record<string, ('view' | 'create' | 'edit' | 'delete')[]>>;
    };
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    members: string[]; // User IDs
}

export interface InternalCompany {
    id: string;
    name: string;
    rfc?: string;
    address?: string;
    website?: string;
    logoUrl?: string;
    isActive: boolean;
}

export interface Company {
    id: string;
    name: string;
    shortName?: string;
    rfc?: string;
    industry?: string;
    website?: string;
    ownerId: string;
    additionalOwnerIds?: string[];
    createdById: string;
    stage: CompanyPipelineStage;
    priority: Priority;
    isActive: boolean;
    productsOfInterest: string[];
    deliveryAddresses: Address[];
    fiscalAddress?: Address;
    primaryContact?: Contact;
    secondaryContact?: Contact;
    createdAt: string;
    healthScore?: { score: number; label: string };
    profile?: {
        communication: {
            channel: string[];
            days: string[];
            time: string;
            isAvailable: boolean;
            tone: string;
            formality: string;
            sla: string;
            quoteFormat: string;
        };
        decisionMap: any[];
        purchaseProcess: {
            requiresOC: boolean;
            requiresSupplierRegistry: boolean;
            isTender: boolean;
            requiredDocs: string[];
            approvalCriteria: string[];
            paymentTerm: string;
            budget: number;
            budgetUnit?: string;
            purchaseType: string;
        };
        useCase: {
            application: string;
            productsOfInterest: string[];
            presentation: string[];
            frequency: string;
            monthlyConsumption: number;
        };
        logistics: {
            deliveryPoints: string;
            downloadWindow: string;
            equipmentOnSite: string[];
            accessRestrictions: string[];
            incoterm: string;
            freightResponsible: string;
        };
        triggers: {
            restockPoint: string;
            maxDeliveryTime: number;
        };
    };
}

export interface Contact {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    emails?: string[];
    phones?: string[];
    companyId?: string;
    ownerId: string;
    prospectId?: string;
}

export interface Address {
    label?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
}

export enum CompanyPipelineStage {
    Onboarding = 'Onboarding',
    ClienteActivo = 'Cliente Activo',
    AlianzaEstrategica = 'Alianza Estratégica',
    EnRiesgo = 'En Riesgo',
    ClienteInactivo = 'Cliente Inactivo',
    ListaNegra = 'Lista Negra'
}

export interface Prospect {
    id: string;
    name: string;
    estValue: number;
    ownerId: string;
    createdById: string;
    stage: ProspectStage;
    priority: Priority;
    origin: string;
    industry?: string;
    notes?: string;
    createdAt: string;
    nextAction?: { description: string; dueDate: string };
    pausedInfo?: { reason: string; reviewDate: string };
    lostInfo?: { reason: string; stageLost: string };
    lastInteraction?: { date: string; type: string };
    productsOfInterest?: string[];
    candidateId?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
}

export enum ProspectStage {
    Nueva = 'Nueva',
    Contactado = 'Contactado',
    Calificado = 'Calificado',
    Propuesta = 'Propuesta',
    Negociacion = 'Negociación',
    Ganado = 'Ganado',
    Perdido = 'Perdido'
}

export enum Priority {
    Alta = 'Alta',
    Media = 'Media',
    Baja = 'Baja'
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    dueAt?: string;
    startDate?: string;
    assignees: string[];
    watchers: string[];
    subtasks?: Subtask[];
    tags?: string[];
    comments?: Comment[];
    projectId?: string;
    teamId?: string;
    estimationHours?: number;
    createdById?: string;
    createdAt: string;
    attachments?: Attachment[];
    links?: Record<string, string>; // e.g. { companyId: '123' }
}

export enum TaskStatus {
    PorHacer = 'Por Hacer',
    EnProgreso = 'En Progreso',
    Hecho = 'Hecho'
}

export interface Subtask {
    id: string;
    text: string;
    isCompleted: boolean;
    notes?: string;
}

export interface Comment {
    id: string;
    text: string;
    userId: string;
    createdAt: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'Activo' | 'En Pausa' | 'Completado';
    members: string[];
    dueDate: string;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    unitDefault: Unit;
    currency: Currency;
    isActive: boolean;
    categoryId: string;
    pricing: { min: number };
    reorderPoint?: number;
    createdAt?: string;
}

export interface ProductLot {
    id: string;
    productId: string;
    code: string;
    unitCost: number;
    supplierId: string;
    receptionDate: string;
    initialQty: number;
    status: LotStatus;
    pricing: { min: number };
    stock: { locationId: string; qty: number }[];
}

export enum LotStatus {
    Disponible = 'Disponible',
    EnCuarentena = 'En Cuarentena',
    Agotado = 'Agotado'
}

export interface Category {
    id: string;
    name: string;
    code: string;
    parentId?: string;
    description?: string;
    isActive: boolean;
}

export type Unit = 'ton' | 'kg' | 'L' | 'unidad';
export type Currency = 'USD' | 'MXN';

export interface SalesOrder {
    id: string;
    folio?: string;
    quoteId?: string;
    companyId: string;
    salespersonId?: string;
    status: SalesOrderStatus;
    deliveries: any[];
    deliveryIds?: string[];
    items: QuoteItem[];
    total: number;
    currency?: Currency;
    taxRate?: number;
    createdAt: string;
}

export enum SalesOrderStatus {
    Pendiente = 'Pendiente',
    EnPreparacion = 'En Preparación',
    EnTransito = 'En Tránsito',
    Entregada = 'Entregada',
    Facturada = 'Facturada',
    Cancelada = 'Cancelada'
}

export interface Quote {
    id: string;
    folio: string;
    issuingCompanyId: string;
    companyId?: string;
    prospectId?: string;
    contactId?: string;
    salespersonId: string;
    createdById?: string;
    approverId?: string;
    status: QuoteStatus;
    createdAt: string;
    validity: number;
    currency: Currency;
    exchangeRate: { official: number; commission: number; final: number };
    items: QuoteItem[];
    deliveries?: DeliverySchedule[];
    commissions?: QuoteCommission[];
    freight?: { id: string; rate: number }[];
    handling?: QuoteHandling[];
    insurance?: { enabled: boolean; costPerUnit: number };
    storage?: { enabled: boolean; period: number; costPerUnit: number };
    otherItems?: any[];
    purchaseOrderAttachment?: Attachment;
    taxRate: number;
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
    changeLog: any[];
}

export enum QuoteStatus {
    Borrador = 'Borrador',
    EnAprobacionInterna = 'En Aprobación Interna',
    AjustesRequeridos = 'Ajustes Requeridos',
    ListaParaEnviar = 'Lista Para Enviar',
    EnviadaAlCliente = 'Enviada Al Cliente',
    EnNegociacion = 'En Negociación',
    AprobadaPorCliente = 'Aprobada Por Cliente',
    Rechazada = 'Rechazada'
}

export enum QuotePipelineStage {
    Borrador = 'Borrador',
    EnAprobacionInterna = 'En Aprobación Interna',
    AjustesRequeridos = 'Ajustes Requeridos',
    ListaParaEnviar = 'Lista Para Enviar',
    EnviadaAlCliente = 'Enviada Al Cliente',
    EnNegociacion = 'En Negociación',
    AprobadaPorCliente = 'Aprobada Por Cliente',
    Rechazada = 'Rechazada'
}

export interface QuoteItem {
    id: string;
    productId: string;
    lotId?: string;
    qty: number;
    unit: Unit;
    unitPrice: number;
    subtotal: number;
    minPrice?: number;
    productName?: string; // Optional for display
}

export interface QuoteCommission {
    id: string;
    salespersonId: string;
    type: 'percentage' | 'fixed' | 'per_ton' | 'per_kg' | 'per_liter' | 'per_unit';
    value: number;
}

export interface QuoteHandling {
    id: string;
    description: string;
    costPerUnit: number;
    type?: string;
    costPerTon?: number;
    maneuverType?: 'Carga' | 'Descarga' | 'Carga y Descarga' | 'Maniobra Especial';
}

export interface DeliverySchedule {
    id: string | number;
    address: string;
    zip: string;
    qty: number;
    date: string;
    unit?: Unit;
}

export interface Sample {
    id: string;
    name: string;
    status: SampleStatus;
    ownerId: string;
    createdById?: string;
    requestDate: string;
    productId: string;
    prospectId?: string;
    companyId?: string;
    notes?: string;
    closureReason?: string;
    closureDate?: string;
    deliveryType?: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
}

export enum SampleStatus {
    Solicitada = 'Solicitada',
    EnPreparacion = 'En Preparación',
    Enviada = 'Enviada',
    Recibida = 'Recibida',
    ConFeedback = 'Con Feedback',
    Cerrada = 'Cerrada',
    Archivada = 'Archivada',
    Aprobada = 'Aprobada'
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    issuingCompanyId?: string;
    responsibleId: string;
    approverId?: string;
    expectedDeliveryDate: string;
    notes?: string;
    items: PurchaseOrderItem[];
    status: PurchaseOrderStatus;
    createdAt: string;
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    quoteAttachment?: Attachment;
    quoteAttachments?: Attachment[];
    invoiceAttachment?: Attachment;
    invoiceAttachments?: Attachment[]; // Added to support multiple invoices
    payments?: PurchasePayment[];
}

export enum PurchaseOrderStatus {
    Borrador = 'Borrador',
    PorAprobar = 'Por Aprobar',
    Ordenada = 'Ordenada',
    PagoPendiente = 'Pago Pendiente',
    PagoParcial = 'Pago Parcial',
    Pagada = 'Pagada',
    EnTransito = 'En Tránsito',
    Recibida = 'Recibida',
    Facturada = 'Facturada',
    Cancelada = 'Cancelada'
}

export interface PurchaseOrderItem {
    productId: string;
    productName?: string; // For custom items
    qty: number;
    unit: Unit;
    unitCost: number;
    subtotal: number;
}

export interface PurchasePayment {
    id: string;
    amount: number;
    date: string;
    method: string;
    reference: string;
    notes: string;
    registeredBy: string;
}

export interface Supplier {
    id: string;
    name: string;
    industry?: string;
    rating?: SupplierRating;
    website?: string;
    phone?: string;
    address?: Address;
    contactPerson?: { name: string; email: string; phone: string };
    bankInfo?: { bankName: string; accountNumber: string; clabe: string };
}

export enum SupplierRating {
    Excelente = 'Excelente',
    Bueno = 'Bueno',
    Regular = 'Regular',
    Malo = 'Malo'
}

export interface Delivery {
    id: string;
    salesOrderId: string;
    companyId: string;
    carrierId: string;
    destination: string;
    status: DeliveryStatus;
    scheduledDate: string;
    trackingNumber?: string;
    trackingUrl?: string;
    deliveryNumber: string;
    isSample?: boolean;
    notes: Note[];
    proofOfDelivery?: Attachment;
    qty?: number;
}

export enum DeliveryStatus {
    Programada = 'Programada',
    EnTransito = 'En Tránsito',
    Entregada = 'Entregada',
    Incidencia = 'Incidencia',
    Cancelada = 'Cancelada'
}

export interface Carrier {
    id: string;
    name: string;
    contactName?: string;
    contactPhone?: string;
    serviceTypes: string[];
    rating?: SupplierRating;
}

export interface Candidate {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    website?: string;
    email?: string;
    phones?: string[];
    emails?: string[];
    rawCategories?: string[];
    city?: string;
    state?: string;
    location?: { lat: number; lng: number };
    status: CandidateStatus;
    tags: string[];
    notes: string[];
    activityLog: ActivityLog[];
    importedAt: string;
    importedBy: string;
    importHistoryId?: string;
    aiAnalysis?: CandidateAiAnalysis | null;
    brandId?: string | null;
    assignedCompanyId?: string | null;
    manuallyAssignedProductId?: string | null;
    averageRating?: number;
    reviewCount?: number;
    price?: string;
    description?: string;
    openingHours?: { day: string; hours: string }[];
    reviewsTags?: ReviewsTag[];
    peopleAlsoSearch?: PeopleAlsoSearch[];
    images?: { url: string }[];
    linkedIns?: string[];
    facebooks?: string[];
    instagrams?: string[];
    twitters?: string[];
    googleMapsUrl?: string;
    googlePlaceId?: string;
    placeId?: string;
    title?: string;
}

export enum CandidateStatus {
    Pendiente = 'Pendiente',
    EnRevision = 'En Revisión',
    Aprobado = 'Aprobado',
    Rechazado = 'Rechazado',
    ListaNegra = 'Lista Negra'
}

export interface CandidateAiAnalysis {
    profileSummary: string;
    suggestedCategory: string;
    nextActionSuggestion: string;
    communicationScripts: {
        whatsapp: string;
        phone: string;
        email: string;
    };
    additionalEmails?: string[];
    additionalPhones?: string[];
}

export interface ReviewsTag {
    title: string;
    count: number;
}

export interface PeopleAlsoSearch {
    category: string;
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

export interface ImportHistory {
    id: string;
    searchCriteria: {
        searchTerms: string[];
        location: string;
        resultsCount: number;
        profiledCompany: string;
        profiledProductId: string;
        language: string;
        includeWebResults: boolean;
        enrichContacts: boolean;
        associatedBrandId?: string;
    };
    importedAt: string;
    importedById: string;
    totalProcessed: number;
    newCandidates: number;
    duplicatesSkipped: number;
    status: 'In Progress' | 'Completed' | 'Failed' | 'Cancelled';
}

export interface Brand {
    id: string;
    name: string;
    logoUrl: string;
    website: string;
}

export interface ImportSource {
    id: string;
    name: string;
    description: string;
    tags: string[];
    createdAt: string;
    createdById: string;
}

export interface Note {
    id: string;
    text: string;
    userId: string;
    createdAt: string;
    prospectId?: string;
    companyId?: string;
    contactId?: string;
    productId?: string;
    supplierId?: string;
    candidateId?: string;
    sampleId?: string;
    quoteId?: string;
    salesOrderId?: string;
}

export interface ActivityLog {
    id: string;
    type: 'Llamada' | 'Email' | 'Reunión' | 'Nota' | 'Vista de Perfil' | 'Análisis IA' | 'Cambio de Estado' | 'Sistema';
    description: string;
    userId: string;
    createdAt: string;
    prospectId?: string;
    companyId?: string;
    contactId?: string;
    candidateId?: string;
    sampleId?: string;
    quoteId?: string;
    salesOrderId?: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'task' | 'message' | 'email' | 'system';
    link: string;
    isRead: boolean;
    createdAt: string;
    userId: string;
}

export interface Email {
    id: string;
    threadId?: string; // Grouping identifier
    from: { name: string; email: string };
    to: { name: string; email: string }[];
    cc?: { name: string; email: string }[];
    bcc?: { name: string; email: string }[];
    subject: string;
    body: string;
    timestamp: string;
    status: 'read' | 'unread';
    folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archived';
    attachments: Attachment[];
    deliveryStatus?: 'pending' | 'sent' | 'error'; 
    snippet?: string; // For Nylas preview
    isStarred?: boolean;
    isArchived?: boolean;
    tags?: string[]; // Custom tags/labels
}

export interface Attachment {
    id: string;
    name: string;
    size: number;
    url: string;
    messageId?: string; // Optional message ID for context in API calls
}

export interface ConnectedEmailAccount {
    id: string;
    userId: string;
    email: string;
    status: 'Conectado' | 'Desconectado' | 'Error de autenticación';
    signatureTemplate?: string;
    provider?: 'gmail' | 'outlook' | 'hostgator' | 'nylas' | 'other'; 
    nylasConfig?: {
        grantId: string;
        apiKey: string;
    };
}

export interface SignatureTemplate {
    id: string;
    name: string;
    htmlContent: string;
}

export interface AuditLog {
    id: string;
    entity: string;
    entityId: string;
    action: string;
    by: string;
    at: any; // Firestore Timestamp
}

export interface Invoice {
    id: string;
    status: InvoiceStatus;
    companyId: string;
    salesOrderId: string;
    createdAt: string;
    dueDate: string;
    total: number;
    paidAmount: number;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    notes?: string;
}

export enum InvoiceStatus {
    Borrador = 'Borrador',
    Enviada = 'Enviada',
    Pagada = 'Pagada',
    PagadaParcialmente = 'Pagada Parcialmente',
    Vencida = 'Vencida',
    Cancelada = 'Cancelada'
}

export interface InvoiceItem {
    productId: string;
    productName: string;
    qty: number;
    unit: string;
    unitPrice: number;
    subtotal: number;
}

export enum CommissionStatus {
    Pendiente = 'Pendiente',
    Pagada = 'Pagada',
    Cancelada = 'Cancelada'
}

export interface Commission {
    id: string;
    amount: number;
    status: CommissionStatus;
    salespersonId: string;
    salesOrderId: string;
    createdAt: string;
    paidAt?: string;
}

export interface Expense {
    id: string;
    amount: number;
    date: string;
    description: string;
    category: 'Logística' | 'Materia Prima' | 'Oficina' | 'Nómina' | 'Marketing' | 'Otros';
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    receiverId: string; // User ID or Group ID
    timestamp: string;
}

export interface Group {
    id: string;
    name: string;
    members: string[];
}

export interface ArchiveFile {
    id: string;
    name: string;
    size: number;
    url: string;
    lastModified: string;
    uploadedById: string;
    tags: string[];
}

export interface Birthday {
    id: string;
    userId: string;
    name: string;
    date: string; // YYYY-MM-DD
}

export interface Invitation {
    id: string;
    email: string;
    name: string;
    roleId: string;
    teamId?: string | null;
    companyId?: string | null;
    permissions: Role['permissions'];
    status: 'pending' | 'used';
    createdAt: string;
}

export interface LogisticsOrigin {
    id: string;
    name: string;
    products: string[];
    status: 'Activo' | 'Inactivo';
}

export interface FreightPricingRule {
    id: string;
    origin: string;
    destination: string;
    minWeightKg: number;
    maxWeightKg: number;
    pricePerKg: number;
    flatRate: number;
    active: boolean;
}

export type RejectionReason = 'No interesado' | 'No califica' | 'Competencia' | 'Otro';
export type BlacklistReason = 'Mal historial' | 'Fraude' | 'Solicitud del cliente';
export type PreferredDays = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
export type Tone = 'Amigable' | 'Formal' | 'Directo' | 'Técnico';
export type Formality = 'Casual' | 'Profesional' | 'Estricto';
export type SLA = 'Mismo día hábil' | '24 horas' | '48 horas' | 'Sin compromiso';
export type QuoteFormat = 'PDF' | 'Link' | 'Email' | 'WhatsApp';
export type PaymentTerm = 'Contado' | '7 días' | '15 días' | '30 días' | '60 días';
export type PurchaseType = 'Puntual' | 'Recurrente' | 'Proyecto';
export type Presentation = 'Granel' | 'Sacos' | 'Totes' | 'Porrones' | 'Big Bag';
export type PurchaseFrequency = 'Semanal' | 'Mensual' | 'Bimestral' | 'Trimestral' | 'Anual';
export type Incoterm = 'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP';
export type CommunicationChannel = string;
export type CommissionType = 'percentage' | 'fixed' | 'per_ton' | 'per_kg' | 'per_liter' | 'per_unit';
export type InventoryMoveType = 'in' | 'out' | 'transfer' | 'adjust';

export interface InventoryMove {
    id: string;
    type: InventoryMoveType;
    productId: string;
    lotId?: string;
    qty: number;
    unit: string;
    fromLocationId?: string;
    toLocationId?: string;
    note?: string;
    userId: string;
    createdAt: string;
}

export interface ChatWidgetConfig {
    id: string;
    name: string;
    websiteUrl: string;
    brandColor: string;
    welcomeMessage: string;
    aiPersonality: string;
    isActive: boolean;
    position: 'bottom-right' | 'bottom-left';
    launcherIcon: string;
    ctaText?: string;
    logoUrl?: string;
    createdById: string;
    // Advanced AI Settings
    aiModel?: string;
    temperature?: number;
    maxTokens?: number;
    frequencyPenalty?: number;
}

export interface ChatSession {
    id: string;
    source: 'web' | 'whatsapp' | 'instagram' | 'facebook';
    visitorName: string;
    visitorEmail?: string;
    visitorPhone?: string;
    status: 'active' | 'pending' | 'closed';
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    isAiActive: boolean;
    prospectId?: string;
}

export interface ChatSessionMessage {
    id: string;
    sessionId: string;
    text: string;
    sender: 'user' | 'agent' | 'ai' | 'system';
    timestamp: string;
    isRead: boolean;
}

export interface SalesGoalSettings {
    id: string;
    goals: ProductGoal[];
    updatedAt: string;
}

export interface ProductGoal {
    id: string;
    productId: string;
    productName?: string;
    unit: string;
    globalMonthlyTarget: number;
    userTargets: Record<string, number>; // userId -> target
}
