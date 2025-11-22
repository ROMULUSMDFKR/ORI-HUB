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
    createdById: string;
    stage: CompanyPipelineStage;
    priority: Priority;
    isActive: boolean;
    productsOfInterest: string[];
    deliveryAddresses: Address[];
    fiscalAddress?: Address;
    primaryContact?: Contact;
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
    costPerUnit: number