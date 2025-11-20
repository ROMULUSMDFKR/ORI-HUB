
import { ProspectStage, SampleStatus, QuotePipelineStage, SalesOrderStatus, Unit, CompanyPipelineStage, CommunicationChannel, PreferredDays, Tone, Formality, SLA, QuoteFormat, PaymentTerm, PurchaseType, Presentation, PurchaseFrequency, Incoterm, Role } from './types';

export const NAV_LINKS = [
  { name: 'Hoy', path: '/today', icon: 'home' },
  
  { name: 'OPERACIONES', isSeparator: true },
  
  { 
    name: 'Prospección IA', 
    icon: 'travel_explore', 
    sublinks: [
      { name: 'Dashboard', path: '/prospecting/dashboard', icon: 'dashboard' },
      { name: 'Candidatos', path: '/prospecting/candidates', icon: 'person_search' },
      { name: 'Mapa', path: '/prospecting/map', icon: 'map' },
      { name: 'Importar Datos', path: '/prospecting/upload', icon: 'upload_file' },
      { name: 'Historial de Importación', path: '/prospecting/history', icon: 'history' },
      { name: 'Marcas', path: '/prospecting/brands', icon: 'storefront' },
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
        { name: 'Dashboard de Compras', path: '/purchase/dashboard', icon: 'dashboard' },
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
        { name: 'Dashboard de Logística', path: '/logistics/dashboard', icon: 'dashboard' },
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
      { name: 'Roles y Permisos', path: '/settings/roles', icon: 'admin_panel_settings' },
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
    // CUALIFICACIÓN (LEADS)
    { 
        stage: ProspectStage.Nueva, 
        group: 'CUALIFICACIÓN', 
        objective: 'Investigación preliminar del lead. Verificar datos de contacto, industria y tamaño. Objetivo: Realizar el primer intento de contacto en menos de 24 horas.' 
    },
    { 
        stage: ProspectStage.Contactado, 
        group: 'CUALIFICACIÓN', 
        objective: 'Establecer comunicación bidireccional. Identificar al tomador de decisiones clave y despertar interés inicial. Objetivo: Agendar una reunión de descubrimiento.' 
    },
    { 
        stage: ProspectStage.Calificado, 
        group: 'CUALIFICACIÓN', 
        objective: 'Validación BANT (Budget, Authority, Need, Timeline). Confirmar que el prospecto tiene presupuesto, la autoridad para comprar, una necesidad real y un tiempo de implementación definido.' 
    },
    
    // OPORTUNIDADES (DEALS)
    { 
        stage: ProspectStage.Propuesta, 
        group: 'OPORTUNIDADES', 
        objective: 'Presentación formal de la solución y precios. La cotización ha sido enviada y explicada al cliente. Objetivo: Obtener feedback sobre la propuesta.' 
    },
    { 
        stage: ProspectStage.Negociacion, 
        group: 'OPORTUNIDADES', 
        objective: 'Manejo de objeciones, ajustes finales de precios, términos y condiciones legales. Objetivo: Llegar a un acuerdo verbal y preparar el contrato.' 
    },
    
    // RESULTADOS
    { 
        stage: ProspectStage.Ganado, 
        group: 'RESULTADOS', 
        objective: 'Cierre exitoso. Contrato firmado y orden de compra recibida. Iniciar proceso de onboarding y entrega.' 
    },
];

export const SAMPLES_PIPELINE_COLUMNS = [
    { 
        stage: SampleStatus.Solicitada, 
        group: 'PREPARACIÓN', 
        objective: 'El cliente ha pedido una muestra. Verificar la viabilidad técnica, disponibilidad de stock y aprobar el costo del envío.' 
    },
    { 
        stage: SampleStatus.EnPreparacion, 
        group: 'PREPARACIÓN', 
        objective: 'La muestra está siendo envasada, etiquetada y empaquetada en el almacén. Generar guías de paquetería.' 
    },
    { 
        stage: SampleStatus.Enviada, 
        group: 'LOGÍSTICA', 
        objective: 'La muestra ha salido del almacén. Monitorear el número de rastreo y notificar al cliente la fecha estimada de llegada.' 
    },
    { 
        stage: SampleStatus.Recibida, 
        group: 'LOGÍSTICA', 
        objective: 'Confirmación de entrega en las instalaciones del cliente. Asegurar que el producto llegó en buenas condiciones.' 
    },
    { 
        stage: SampleStatus.ConFeedback, 
        group: 'EVALUACIÓN', 
        objective: 'Contactar al cliente para obtener resultados de sus pruebas de laboratorio o campo. ¿Cumplió con las especificaciones técnicas?' 
    },
    { 
        stage: SampleStatus.Cerrada, 
        group: 'FINALIZADO', 
        objective: 'Proceso de muestra concluido exitosamente. Proceder a cotización comercial si el feedback fue positivo.' 
    },
    { 
        stage: SampleStatus.Archivada, 
        group: 'FINALIZADO', 
        objective: 'Muestras antiguas o canceladas que se guardan para historial. No requieren seguimiento activo.' 
    },
];

export const QUOTES_PIPELINE_COLUMNS = [
    { 
        stage: QuotePipelineStage.Borrador, 
        group: 'INTERNO', 
        objective: 'El vendedor está construyendo la cotización. Selección de productos, cálculo de fletes y márgenes preliminares.' 
    },
    { 
        stage: QuotePipelineStage.EnAprobacionInterna, 
        group: 'INTERNO', 
        objective: 'Revisión por gerencia comercial o finanzas. Validar márgenes mínimos, condiciones de crédito y disponibilidad.' 
    },
    { 
        stage: QuotePipelineStage.AjustesRequeridos, 
        group: 'INTERNO', 
        objective: 'La cotización fue rechazada internamente y requiere correcciones por parte del vendedor antes de enviarse.' 
    },
    { 
        stage: QuotePipelineStage.ListaParaEnviar, 
        group: 'CLIENTE', 
        objective: 'Aprobada internamente. Lista para ser generada en PDF y enviada al cliente por el canal preferido.' 
    },
    { 
        stage: QuotePipelineStage.EnviadaAlCliente, 
        group: 'CLIENTE', 
        objective: 'Cotización en manos del cliente. Realizar seguimiento activo para confirmar recepción y aclarar dudas iniciales.' 
    },
    { 
        stage: QuotePipelineStage.EnNegociacion, 
        group: 'CLIENTE', 
        objective: 'El cliente ha solicitado cambios en precios, volúmenes o términos. Versiones iterativas de la propuesta.' 
    },
    { 
        stage: QuotePipelineStage.AprobadaPorCliente, 
        group: 'CIERRE', 
        objective: '¡Éxito! El cliente aceptó la propuesta formalmente. Proceder a convertir en Orden de Venta.' 
    },
    { 
        stage: QuotePipelineStage.Rechazada, 
        group: 'CIERRE', 
        objective: 'El cliente declinó la oferta. Registrar el motivo (Precio, Tiempo de entrega, Competencia) para análisis.' 
    },
];

export const SALES_ORDERS_PIPELINE_COLUMNS = [
    { 
        stage: SalesOrderStatus.Pendiente, 
        group: 'PROCESAMIENTO', 
        objective: 'Orden recibida. Verificar pago (si es contado) o línea de crédito disponible. Validar documentación final.' 
    },
    { 
        stage: SalesOrderStatus.EnPreparacion, 
        group: 'ALMACÉN', 
        objective: 'Orden liberada a almacén. Picking, packing y paletizado de la mercancía. Generación de documentos de embarque.' 
    },
    { 
        stage: SalesOrderStatus.EnTransito, 
        group: 'LOGÍSTICA', 
        objective: 'Mercancía cargada y en ruta. Monitoreo activo del transporte hasta el destino del cliente.' 
    },
    { 
        stage: SalesOrderStatus.Entregada, 
        group: 'LOGÍSTICA', 
        objective: 'Mercancía entregada. Recopilar POD (Proof of Delivery) o evidencias de entrega firmadas.' 
    },
    { 
        stage: SalesOrderStatus.Facturada, 
        group: 'ADMINISTRACIÓN', 
        objective: 'Factura generada y enviada. La orden se considera cerrada operativamente y pasa a cuentas por cobrar.' 
    },
    { 
        stage: SalesOrderStatus.Cancelada, 
        group: 'FINALIZADO', 
        objective: 'Orden cancelada antes de la entrega. Inventario retornado al stock disponible.' 
    },
];

export const COMPANIES_PIPELINE_COLUMNS = [
    { 
        stage: CompanyPipelineStage.Investigacion, 
        group: 'CAPTACIÓN', 
        objective: 'Cuenta objetivo identificada. Investigar estructura corporativa, sucursales y consumo potencial.' 
    },
    { 
        stage: CompanyPipelineStage.PrimerContacto, 
        group: 'CAPTACIÓN', 
        objective: 'Intentos activos de penetrar la cuenta. Lograr hablar con compras, calidad o gerencia.' 
    },
    { 
        stage: CompanyPipelineStage.Calificada, 
        group: 'CAPTACIÓN', 
        objective: 'Cuenta validada con potencial real. Se ha identificado una oportunidad clara de negocio.' 
    },
    { 
        stage: CompanyPipelineStage.ClienteActivo, 
        group: 'GESTIÓN', 
        objective: 'Cliente comprando regularmente. Objetivo: Retención, satisfacción y Cross-selling/Up-selling.' 
    },
    { 
        stage: CompanyPipelineStage.AlianzaEstrategica, 
        group: 'GESTIÓN', 
        objective: 'Partners clave o cuentas VIP con contratos a largo plazo y condiciones especiales.' 
    },
    { 
        stage: CompanyPipelineStage.ClienteInactivo, 
        group: 'RECUPERACIÓN', 
        objective: 'Clientes que dejaron de comprar hace más de 90 días. Implementar campañas de reactivación.' 
    },
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


// --- PERMISSIONS CONFIG ---
// Updated: Enabled ALL actions for ALL pages to give full control to the admin.
export const PAGE_PERMISSIONS_CONFIG: Record<string, Record<string, ('view' | 'create' | 'edit' | 'delete')[]>> = {
    'Prospección IA': { 
        'Dashboard': ['view'],
        'Candidatos': ['view', 'create', 'edit', 'delete'],
        'Mapa': ['view'],
        'Importar Datos': ['view', 'create', 'edit', 'delete'],
        'Historial de Importación': ['view', 'create', 'edit', 'delete'],
        'Marcas': ['view', 'create', 'edit', 'delete'],
    },
    'Hubs': { 
        'Prospectos': ['view', 'create', 'edit', 'delete'], 
        'Muestras': ['view', 'create', 'edit', 'delete'], 
        'Cotizaciones': ['view', 'create', 'edit', 'delete'], 
        'Órdenes de Venta': ['view', 'create', 'edit', 'delete'], 
        'Empresas': ['view', 'create', 'edit', 'delete'] 
    },
    'Productos': { 
        'Panel de Productos': ['view'],
        'Lista de Productos': ['view', 'create', 'edit', 'delete'], 
        'Categorías': ['view', 'create', 'edit', 'delete'] 
    },
    'Compras': { 
        'Dashboard de Compras': ['view'],
        'Órdenes de Compra': ['view', 'create', 'edit', 'delete'], 
        'Proveedores': ['view', 'create', 'edit', 'delete'] 
    },
    'Inventario': { 
        'Stock Actual': ['view', 'create', 'edit', 'delete'], 
        'Movimientos': ['view', 'create', 'edit', 'delete'], 
        'Alertas': ['view', 'create', 'edit', 'delete'], 
        'Ubicaciones': ['view', 'create', 'edit', 'delete'] 
    },
    'Logística': { 
        'Dashboard de Logística': ['view'],
        'Entregas': ['view', 'create', 'edit', 'delete'], 
        'Transportistas': ['view', 'create', 'edit', 'delete'], 
        'Precios de Flete': ['view', 'create', 'edit', 'delete'] 
    },
    'Productividad': { 
        'Tareas': ['view', 'create', 'edit', 'delete'], 
        'Proyectos': ['view', 'create', 'edit', 'delete'], 
        'Calendario': ['view', 'create', 'edit', 'delete'] 
    },
    'Finanzas': { 
        'Facturación': ['view', 'create', 'edit', 'delete'], 
        'Panel de Ventas': ['view'],
        'Pagos Pendientes': ['view', 'create', 'edit', 'delete'], 
        'Pagos Recibidos': ['view', 'create', 'edit', 'delete'], 
        'Gastos': ['view', 'create', 'edit', 'delete'], 
        'Comisiones': ['view', 'create', 'edit', 'delete'],
        'Flujo de Caja': ['view'],
    },
    'Sistema': { 
        'Archivos': ['view', 'create', 'edit', 'delete'], 
        'Auditoría': ['view', 'create', 'edit', 'delete'] 
    },
    'Configuración': {
        'Usuarios y Permisos': ['view', 'create', 'edit', 'delete'],
        'Roles y Permisos': ['view', 'create', 'edit', 'delete'],
        'Equipos': ['view', 'create', 'edit', 'delete'],
        'Seguridad': ['view', 'create', 'edit', 'delete'],
        'Cuentas de Correo': ['view', 'create', 'edit', 'delete'],
        'Industrias': ['view', 'create', 'edit', 'delete'],
        'Etapas de Venta': ['view', 'create', 'edit', 'delete'],
        'Acceso de IA': ['view', 'create', 'edit', 'delete'],
        'Apariencia de Email': ['view', 'create', 'edit', 'delete'],
    }
};

export const ALL_ACTIONS: ('view' | 'create' | 'edit' | 'delete')[] = ['view', 'create', 'edit', 'delete'];
export const ACTION_TRANSLATIONS: Record<string, string> = { view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar' };

export const getDefaultPermissions = (): Role['permissions'] => {
    const permissions: Role['permissions'] = {
      dataScope: 'all',
      pages: {}
    };
  
    Object.entries(PAGE_PERMISSIONS_CONFIG).forEach(([moduleName, pages]) => {
      permissions.pages[moduleName] = {};
      Object.entries(pages).forEach(([pageName, _]) => {
        // Assign ALL_ACTIONS to everything
        permissions.pages[moduleName][pageName] = [...ALL_ACTIONS];
      });
    });
  
    return permissions;
};

export const COUNTRIES = [
    { value: 'MX', name: 'México' },
    { value: 'US', name: 'Estados Unidos' },
    { value: 'CO', name: 'Colombia' },
    { value: 'ES', name: 'España' },
    { value: 'AR', name: 'Argentina' },
];
