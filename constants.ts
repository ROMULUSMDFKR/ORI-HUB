
import { ProspectStage, SampleStatus, QuotePipelineStage, SalesOrderStatus, Unit, CompanyPipelineStage, CommunicationChannel, PreferredDays, Tone, Formality, SLA, QuoteFormat, PaymentTerm, PurchaseType, Presentation, PurchaseFrequency, Incoterm } from './types';

export const NAV_LINKS = [
  { name: 'Hoy', path: '/today', icon: 'home' },
  
  { name: 'OPERACIONES', isSeparator: true },
  
  { 
    name: 'Prospección IA', 
    icon: 'travel_explore', 
    sublinks: [
      { name: 'Candidatos', path: '/prospecting/candidates', icon: 'person_search' },
      { name: 'Importar Datos', path: '/prospecting/upload', icon: 'upload_file' },
    ]
  },
  { 
    name: 'Ventas', 
    icon: 'hub', 
    sublinks: [
      { name: 'Prospectos', path: '/hubs/prospects', icon: 'trending_up' },
      { name: 'Muestras', path: '/hubs/samples', icon: 'science' },
      { name: 'Cotizaciones', path: '/hubs/quotes', icon: 'request_quote' },
      { name: 'Órdenes de Venta', path: '/hubs/sales-orders', icon: 'receipt_long' },
      { name: 'Empresas', path: '/hubs/companies', icon: 'business_center' },
    ]
  },
  {
    name: 'Listas CRM',
    icon: 'list_alt',
    sublinks: [
      { name: 'Clientes', path: '/crm/clients/list', icon: 'groups' },
      { name: 'Contactos', path: '/crm/contacts/list', icon: 'contacts' },
    ]
  },
  { 
    name: 'Productos', 
    icon: 'inventory_2',
    sublinks: [
        { name: 'Panel de Productos', path: '/products/dashboard', icon: 'dashboard' },
        { name: 'Lista de Productos', path: '/products/list', icon: 'inventory' },
        { name: 'Categorías', path: '/products/categories', icon: 'category' },
    ]
  },
  { 
    name: 'Compras', 
    icon: 'shopping_cart',
    sublinks: [
        { name: 'Órdenes de Compra', path: '/purchase/orders', icon: 'shopping_basket' },
        { name: 'Proveedores', path: '/purchase/suppliers', icon: 'factory' },
    ]
  },
  { 
    name: 'Inventario', 
    icon: 'warehouse',
    sublinks: [
        { name: 'Stock Actual', path: '/inventory/stock', icon: 'inventory' },
        { name: 'Movimientos', path: '/inventory/movements', icon: 'multiple_stop' },
        { name: 'Alertas', path: '/inventory/alerts', icon: 'notification_important' },
        { name: 'Ubicaciones', path: '/inventory/locations', icon: 'pin_drop' },
    ]
  },
  { 
    name: 'Logística', 
    icon: 'local_shipping',
    sublinks: [
        { name: 'Entregas', path: '/logistics/deliveries', icon: 'local_shipping' },
        { name: 'Transportistas', path: '/logistics/providers', icon: 'group' },
        { name: 'Precios de Flete', path: '/logistics/pricing', icon: 'price_change' },
    ]
  },

  { name: 'PRODUCTIVIDAD', isSeparator: true },

  { 
    name: 'Tareas', 
    icon: 'task_alt',
    sublinks: [
      { name: 'Mis Tareas', path: '/tasks?view=mine', icon: 'person' },
      { name: 'Tablero', path: '/tasks?view=board', icon: 'view_kanban' },
      { name: 'Todas las Tareas', path: '/tasks?view=all', icon: 'list' },
      { name: 'Proyectos', path: '/tasks/projects', icon: 'workspaces' },
    ]
  },
  { name: 'Calendario', path: '/calendar', icon: 'calendar_month' },
  { 
    name: 'Comunicación', 
    icon: 'chat', 
    sublinks: [
      { name: 'Chat Interno', path: '/communication/chat', icon: 'forum' },
      { name: 'Correos', path: '/communication/emails', icon: 'mail' },
      { name: 'Asistente IA', path: '/communication/ai-assistant', icon: 'smart_toy' },
    ]
  },
  
  { name: 'FINANZAS', isSeparator: true },
  { name: 'Facturación', path: '/billing', icon: 'receipt_long' },
  {
    name: 'Finanzas',
    icon: 'monitoring',
    sublinks: [
      { name: 'Panel de Ventas', path: '/finance/sales-dashboard', icon: 'query_stats' },
      { name: 'Pagos Pendientes', path: '/finance/pending-payments', icon: 'hourglass_top' },
      { name: 'Pagos Recibidos', path: '/finance/payments-received', icon: 'price_check' },
      { name: 'Gastos', path: '/finance/expenses', icon: 'payments' },
      { name: 'Flujo de Caja', path: '/finance/cash-flow', icon: 'show_chart' },
      { name: 'Comisiones', path: '/finance/commissions', icon: 'percent' },
    ]
  },

  { name: 'SISTEMA', isSeparator: true },

  { name: 'Archivos', path: '/archives', icon: 'archive' },
  { name: 'Auditoría', path: '/insights/audit', icon: 'history' },
  { 
    name: 'Configuración', 
    icon: 'settings',
    sublinks: [
      { name: 'Usuarios y Permisos', path: '/settings/users', icon: 'manage_accounts' },
      { name: 'Equipos', path: '/settings/teams', icon: 'groups' },
      { name: 'Seguridad', path: '/settings/security', icon: 'security' },
      { name: 'Cuentas de Correo', path: '/settings/email-accounts', icon: 'alternate_email' },
      { name: 'Industrias', path: '/settings/industries', icon: 'factory' },
      { name: 'Etapas de Venta', path: '/settings/pipelines', icon: 'view_carousel' },
      { name: 'Acceso de IA', path: '/settings/ai-access', icon: 'neurology' },
      { name: 'Apariencia de Email', path: '/settings/appearance/email', icon: 'palette' },
    ] 
  },
];

export const PIPELINE_COLUMNS = [
    // Pre-Flujo
    { stage: ProspectStage.Nueva, group: 'PRE-FLUJO', objective: 'Primer toque en <24 h.' },
    { stage: ProspectStage.EnDesarrollo, group: 'PRE-FLUJO', objective: 'Investigar y preparar acercamiento.' },
    { stage: ProspectStage.Activa, group: 'PRE-FLUJO', objective: 'Seguimiento intensivo en ciclo actual.' },
    { stage: ProspectStage.RecurrenteVIP, group: 'PRE-FLUJO', objective: 'Cuentas de recompra o alto valor.' },
    { stage: ProspectStage.Pausada, group: 'PRE-FLUJO', objective: 'Detener temporalmente sin perder contexto.' },
    { stage: ProspectStage.Reactivacion, group: 'PRE-FLUJO', objective: 'Relanzar conversaciones dormidas.' },
    { stage: ProspectStage.Inactiva, group: 'PRE-FLUJO', objective: 'Archivo "vivo" sin acciones pendientes.' },
    // Flujo Principal
    { stage: ProspectStage.Prospecto, group: 'FLUJO PRINCIPAL', objective: 'Bandeja para leads pre-clasificados.' },
    { stage: ProspectStage.Contactado, group: 'FLUJO PRINCIPAL', objective: 'Confirmar interés y posibilidad real.' },
    { stage: ProspectStage.Calificado, group: 'FLUJO PRINCIPAL', objective: 'Preparar solución y términos.' },
    { stage: ProspectStage.Propuesta, group: 'FLUJO PRINCIPAL', objective: 'Conseguir feedback claro.' },
    { stage: ProspectStage.Negociacion, group: 'FLUJO PRINCIPAL', objective: 'Cerrar términos finales.' },
    // Resultados
    { stage: ProspectStage.Ganado, group: 'RESULTADOS', objective: 'Operación post-cierre.' },
    { stage: ProspectStage.Perdido, group: 'RESULTADOS', objective: 'Aprendizaje y futuras reactivaciones.' },
];

export const SAMPLES_PIPELINE_COLUMNS = [
    { stage: SampleStatus.Solicitada, group: 'FLUJO DE MUESTRAS', objective: 'Preparar y enviar muestra.' },
    { stage: SampleStatus.EnPreparacion, group: 'FLUJO DE MUESTRAS', objective: 'Muestra siendo preparada.' },
    { stage: SampleStatus.Enviada, group: 'FLUJO DE MUESTRAS', objective: 'Seguimiento de entrega.' },
    { stage: SampleStatus.Recibida, group: 'FLUJO DE MUESTRAS', objective: 'Confirmar recepción y pruebas.' },
    { stage: SampleStatus.ConFeedback, group: 'FLUJO DE MUESTRAS', objective: 'Obtener retroalimentación.' },
    { stage: SampleStatus.Cerrada, group: 'FLUJO DE MUESTRAS', objective: 'Muestra finalizada.' },
    { stage: SampleStatus.Archivada, group: 'FINALIZADO', objective: 'Muestras archivadas y fuera del flujo activo.' },
];

export const QUOTES_PIPELINE_COLUMNS = [
    { stage: QuotePipelineStage.Borrador, group: 'PREPARACIÓN', objective: 'Vendedor crea o ajusta la cotización.' },
    { stage: QuotePipelineStage.EnAprobacionInterna, group: 'PREPARACIÓN', objective: 'Esperando validación de precios y términos.' },
    { stage: QuotePipelineStage.AjustesRequeridos, group: 'PREPARACIÓN', objective: 'Regresada al vendedor para correcciones.' },
    { stage: QuotePipelineStage.ListaParaEnviar, group: 'FLUJO CON CLIENTE', objective: 'Aprobada internamente, lista para el cliente.' },
    { stage: QuotePipelineStage.EnviadaAlCliente, group: 'FLUJO CON CLIENTE', objective: 'Confirmar recepción y esperar respuesta.' },
    { stage: QuotePipelineStage.EnNegociacion, group: 'FLUJO CON CLIENTE', objective: 'Cliente solicitó cambios o está negociando.' },
    { stage: QuotePipelineStage.AprobadaPorCliente, group: 'RESULTADOS', objective: '¡Éxito! Generar orden de venta.' },
    { stage: QuotePipelineStage.Rechazada, group: 'RESULTADOS', objective: 'Archivar y registrar motivo de pérdida.' },
];

export const SALES_ORDERS_PIPELINE_COLUMNS = [
    { stage: SalesOrderStatus.Pendiente, group: 'FLUJO DE VENTAS', objective: 'Confirmar pago/crédito.' },
    { stage: SalesOrderStatus.EnPreparacion, group: 'FLUJO DE VENTAS', objective: 'Surtir producto en almacén.' },
    { stage: SalesOrderStatus.EnTransito, group: 'FLUJO DE VENTAS', objective: 'Monitorear entrega.' },
    { stage: SalesOrderStatus.Entregada, group: 'FLUJO DE VENTAS', objective: 'Confirmar recepción y satisfacción.' },
    { stage: SalesOrderStatus.Facturada, group: 'FLUJO DE VENTAS', objective: 'Seguimiento de pago.' },
    { stage: SalesOrderStatus.Cancelada, group: 'FLUJO DE VENTAS', objective: 'Proceso de cancelación.' },
];

export const COMPANIES_PIPELINE_COLUMNS = [
    { stage: CompanyPipelineStage.Investigacion, group: 'CAPTACIÓN', objective: 'Identificar potencial y contacto clave.' },
    { stage: CompanyPipelineStage.PrimerContacto, group: 'CAPTACIÓN', objective: 'Establecer comunicación inicial.' },
    { stage: CompanyPipelineStage.Calificada, group: 'CAPTACIÓN', objective: 'Validar BANT (Budget, Authority, Need, Timeline).' },
    { stage: CompanyPipelineStage.ClienteActivo, group: 'RELACIÓN', objective: 'Gestionar y crecer la cuenta.' },
    { stage: CompanyPipelineStage.ClienteInactivo, group: 'RELACIÓN', objective: 'Reactivar o archivar.' },
    { stage: CompanyPipelineStage.AlianzaEstrategica, group: 'RELACIÓN', objective: 'Colaboración y partnership.' },
];


export const UNITS: Unit[] = ["ton", "kg", "L", "unidad"];

export const TAX_RATE = 0.16; // 16% IVA

// --- NEW PROFILE OPTIONS ---

export const COMMUNICATION_CHANNELS: CommunicationChannel[] = ['Email', 'Teléfono', 'WhatsApp', 'Teams', 'Zoom', 'Telegram', 'Otro'];
export const PREFERRED_DAYS_OPTIONS: PreferredDays[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const TONE_OPTIONS: Tone[] = ['Amigable', 'Formal', 'Directo', 'Técnico'];
export const FORMALITY_OPTIONS: Formality[] = ['Casual', 'Profesional', 'Estricto'];
export const SLA_OPTIONS: SLA[] = ['Mismo día hábil', '24 horas', '48 horas', 'Sin compromiso'];
export const QUOTE_FORMAT_OPTIONS: QuoteFormat[] = ['PDF', 'Link', 'Email', 'WhatsApp'];
export const PAYMENT_TERM_OPTIONS: PaymentTerm[] = ['Contado', '7 días', '15 días', '30 días', '60 días'];
export const PURCHASE_TYPE_OPTIONS: PurchaseType[] = ['Puntual', 'Recurrente', 'Proyecto'];
export const PRESENTATION_OPTIONS: Presentation[] = ['Granel', 'Sacos', 'Totes', 'Porrones'];
export const PURCHASE_FREQUENCY_OPTIONS: PurchaseFrequency[] = ['Semanal', 'Mensual', 'Bimestral', 'Trimestral', 'Anual'];
export const INCOTERM_OPTIONS: Incoterm[] = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

export const REQUIRED_DOCS_OPTIONS = ['Constancia de Situación Fiscal', 'Acta Constitutiva', 'INE Representante Legal', 'Comprobante de Domicilio'];
export const APPROVAL_CRITERIA_OPTIONS = ['Precio', 'Calidad', 'Tiempo de Entrega', 'Condiciones de Pago', 'Servicio Post-Venta'];
export const EQUIPMENT_OPTIONS = ['Montacargas', 'Báscula', 'Grúa', 'Patín Hidráulico'];
export const ACCESS_RESTRICTIONS_OPTIONS = ['Cita Previa', 'Horario Restringido', 'Equipo de Seguridad Obligatorio (EPP)', 'Unidad no mayor a 3.5 ton'];