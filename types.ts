// Base User type
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  role: 'Admin' | 'Ventas' | 'Logística';
  teamId?: string;
  isActive: boolean;
}

export interface Team {
    id: string;
    name: string;
    description: string;
    members: string[]; // array of user IDs
}

// Enums
export enum ProspectStage {
  // Pre-flujo
  Nueva = 'Nueva',
  EnDesarrollo = 'En Desarrollo',
  Activa = 'Activa',
  RecurrenteVIP = 'Recurrente / VIP',
  Pausada = 'Pausada',
  Reactivacion = 'Reactivación',
  Inactiva = 'Inactiva',
  // Flujo Principal
  Prospecto = 'Prospecto',
  Contactado = 'Contactado',
  Calificado = 'Calificado',
  Propuesta = 'Propuesta',
  Negociacion = 'Negociación',
  // Resultados
  Ganado = 'Ganado',
  Perdido = 'Perdido',
}

export enum SupplierRating {
  Excelente = 'Excelente',
  Bueno = 'Bueno',
  Regular = 'Regular',
}

export enum QuotePipelineStage {
  Borrador = 'Borrador',
  Enviada = 'Enviada',
  EnRevision = 'En Revisión',
  Negociacion = 'Negociación',
  Aprobada = 'Aprobada',
  Perdida = 'Perdida',
}

export enum SampleStatus {
  Solicitada = 'Solicitada',
  EnPreparacion = 'En Preparación',
  Enviada = 'Enviada',
  Recibida = 'Recibida',
  ConFeedback = 'Con Feedback',
  Cerrada = 'Cerrada',
}

export enum SalesOrderStatus {
  Pendiente = 'Pendiente',
  EnPreparacion = 'En Preparación',
  EnTransito = 'En Tránsito',
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
  isActive: boolean;
  categoryId: string;
  pricing: {
    min: number; // Price is per unitDefault
  };
  reorderPoint?: number;
}

export interface ProductLot {
  id: string;
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
}

export interface QuoteItem {
  productId: string;
  productName?: string;
  lotId: string;
  qty: number;
  unit: Unit;
  unitPrice: number;
  subtotal: number;
}

export interface QuoteDelivery {
  date: string; // ISO string
  qty: number;
  locationId: string;
}

export interface Quote {
  id: string;
  prospectId?: string;
  companyId?: string;
  status: QuotePipelineStage;
  currency: Currency;
  items: QuoteItem[];
  fees: {
    handling?: number;
    insurance?: number;
    storage?: number;
    freight?: number;
  };
  commissions: {
    type?: 'fijo' | 'porcentaje';
    value?: number;
  };
  deliveries: QuoteDelivery[];
  totals: {
    base: number;
    extras: number;
    tax: number;
    grandTotal: number;
  };
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
  items: QuoteItem[];
  total: number;
  createdAt: string; // ISO
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: 'Borrador' | 'Enviada' | 'Confirmada' | 'Recibida Parcial' | 'Recibida Completa';
  total: number;
  createdAt: string; // ISO
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

export interface Task {
    id: string;
    title: string;
    status: TaskStatus;
    dueAt?: string;
    assignees: string[];
    watchers: string[];
    links?: {
        companyId?: string;
        quoteId?: string;
        salesOrderId?: string;
        // FIX: Added `prospectId` to allow linking tasks to prospects, resolving type errors in mock data.
        prospectId?: string;
    };
    projectId?: string;
    priority?: Priority;
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
}

export interface ActivityLog {
    id: string;
    companyId?: string;
    prospectId?: string;
    // FIX: Added contactId to associate activities with a specific contact.
    contactId?: string;
    type: 'Llamada' | 'Email' | 'Reunión' | 'Cotización' | 'Nota' | 'Email Sincronizado' | 'Reunión Sincronizada';
    description: string;
    userId: string;
    createdAt: string; // ISO Date string
}

export interface Note {
    id: string;
    companyId?: string;
    prospectId?: string;
    // FIX: Added contactId to associate notes with a specific contact.
    contactId?: string;
    productId?: string;
    supplierId?: string;
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
}

export interface FreightPricingRule {
    id: string;
    zone: string;
    minWeightKg: number;
    maxWeightKg: number;
    pricePerKg: number;
    flatRate: number;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    timestamp: string; // ISO Date string
}

export interface Email {
    id: string;
    from: { name: string; email: string; };
    to: { name: string; email: string; }[];
    subject: string;
    body: string;
    timestamp: string; // ISO Date string
    status: 'read' | 'unread' | 'draft';
    folder: 'inbox' | 'sent' | 'drafts' | 'trash';
}