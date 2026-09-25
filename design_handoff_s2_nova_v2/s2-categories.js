// BEGIN S2_TAXONOMY v1 — single source of truth. Synced verbatim into the S2 Nova DCs; edit here only.
// Node: { id, type: 'expense'|'income'|'goal', parentId, key, name, vis, color, glyph, custom }
// IDs are stable, English, dotted: '<prefix>.<parent>[.<sub>]'  prefix: exp | inc | goal.
// Display names are Spanish UI copy and may change; never store or compare them.
const CAT_VIS = {
  food: ['#E8A23D', ['M3 2v7c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2V2', 'M6 2v20', 'M17 2c-1.7 1.3-3 3.7-3 6 0 1.7.7 3 2 3h2c1.3 0 2-1.3 2-3 0-2.3-1.3-4.7-3-6z', 'M18 11v11']],
  housing: ['#D9784A', ['M3 10.5 12 3l9 7.5', 'M5 9v12h14V9', 'M10 21v-6h4v6']],
  utilities: ['#8A8A99', ['M4 2h16v20l-3-2-2 2-3-2-3 2-2-2-3 2z', 'M8 7h8', 'M8 11h8', 'M8 15h5']],
  transportation: ['#3D8BE8', ['M5 17H3v-5l2-5h14l2 5v5h-2', 'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z', 'M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z', 'M9 17h6']],
  education: ['#5D6BE8', ['M22 9 12 5 2 9l10 4 10-4z', 'M6 11v6c0 1.5 3 3 6 3s6-1.5 6-3v-6']],
  health: ['#E85D6B', ['M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-7.3a5 5 0 0 0 0-7.1z']],
  shopping: ['#3DBBA8', ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0']],
  entertainment: ['#B25DE8', ['M4 11h16l-1.2 9a2 2 0 0 1-2 1.7H7.2a2 2 0 0 1-2-1.7z', 'M4 11 8 3', 'M12 11 9.5 4', 'M16 11 14 5']],
  travel: ['#2FA7C9', ['M2 16l20-8', 'M6 14.4 4 9l3-1 4 4.4', 'M13 11.2 11 4l3-1 5 6.6', 'M3 21h18']],
  debt: ['#C2566F', ['M2 6h20v12H2z', 'M2 10h20', 'M6 14h4']],
  financial: ['#7A86A8', ['M12 3 2 8h20z', 'M4 8v9', 'M20 8v9', 'M2 21h20', 'M9 12v5', 'M15 12v5']],
  business: ['#A8963D', ['M3 7h18v13H3z', 'M8 7V4h8v3', 'M3 13h18']],
  family: ['#E85D9C', ['M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M2 21v-1a6 6 0 0 1 12 0v1', 'M16 3.1a4 4 0 0 1 0 7.8', 'M22 21v-1a6 6 0 0 0-4-5.7']],
  other: ['#9C9CAA', ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M8 11h.01', 'M12 11h.01', 'M16 11h.01']],
  work: ['#22A06B', ['M3 7h18a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12', 'M17 13h.01']],
  investments: ['#6657E8', ['M3 17 9 11l4 4 8-8', 'M15 7h6v6']],
  property: ['#9A7B5C', ['M4 21V4h10v17', 'M14 9h6v12', 'M7 8h1', 'M11 8h1', 'M7 12h1', 'M11 12h1', 'M7 16h1', 'M11 16h1', 'M17 13h1', 'M17 17h1']],
  transfers: ['#D95DB2', ['M3 8h18v4H3z', 'M5 12v9h14v-9', 'M12 8v13', 'M12 8C10 4 6 4 6 6.5S9 8 12 8z', 'M12 8c2-4 6-4 6-1.5S15 8 12 8z']],
  savings: ['#2FB38A', ['M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z', 'M9 12l2 2 4-4']],
  technology: ['#8E7CF0', ['M4 5h16v10H4z', 'M2 19h20']],
  pets: ['#6FAE3D', ['M12 20c-3 0-6-1.8-6-4.5S9 11 12 11s6 1.8 6 4.5-3 4.5-6 4.5z', 'M3.5 9.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0z', 'M7.5 5.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0z', 'M13.5 5.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0z', 'M17.5 9.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0z']],
  events: ['#E0A526', ['M4 21h16', 'M5 21V11h14v10', 'M5 15c2 1 3-1 5 0s3 1 5 0 3-1 4 0', 'M12 11V7', 'M12 4.5v.01']],
}

// Subcategory glyphs (optional). Missing → parent glyph. Color is always the parent's.
const CAT_SUB_GLYPHS = {
  'exp.food.groceries': ['M2 3h2.6l2.2 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 7H6', 'M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  'exp.food.restaurants': ['M3 11h18', 'M12 20a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9z', 'M12 4v3'],
  'exp.food.delivery': ['M5 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M8 16h8l-3-8H9', 'M13 8h4l2 4'],
  'exp.food.cafes': ['M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z', 'M17 9h2a2 2 0 1 1 0 4h-2', 'M7 2v3', 'M11 2v3'],
  'exp.transportation.public_transit': ['M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M4 11h16', 'M7 21v-2', 'M17 21v-2', 'M8 14h.01', 'M16 14h.01'],
  'exp.transportation.fuel': ['M3 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16', 'M2 21h12', 'M6 8h4', 'M16 8l3 3v7a2 2 0 0 1-4 0V6'],
  'exp.transportation.rideshare': ['M5 17H3v-5l2-5h14l2 5v5h-2', 'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z', 'M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z', 'M9 3h6v4H9z'],
  'exp.transportation.parking': ['M4 3h16v18H4z', 'M10 17V8h3a3 3 0 0 1 0 6h-3'],
  'exp.shopping.clothing': ['M6 4 3 7v3h3v11h12V10h3V7l-3-3-3 1a3 3 0 0 1-6 0z'],
  'exp.shopping.technology': ['M3 5h18v11H3z', 'M2 20h20'],
  'exp.shopping.home': ['M3 11 12 3l9 8', 'M5 10v10h14V10'],
  'exp.shopping.personal_care': ['M12 21c-4 0-8-3-8-7 4 0 8 3 8 7z', 'M12 21c4 0 8-3 8-7-4 0-8 3-8 7z', 'M12 21V10'],
  'exp.health.medication': ['M4 8h16v12H4z', 'M8 4h8v4H8z', 'M12 11v6', 'M9 14h6'],
  'exp.health.appointments': ['M6 3v6a5 5 0 0 0 10 0V3', 'M4 3h3', 'M15 3h3', 'M16 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  'exp.health.insurance': ['M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z', 'M9 12l2 2 4-4'],
  'exp.education.tuition': ['M12 3 2 8h20z', 'M4 8v9', 'M20 8v9', 'M2 21h20', 'M9 12v5', 'M15 12v5'],
  'exp.education.books': ['M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z', 'M8 7h8'],
  'exp.education.courses': ['M4 4h16v12H4z', 'M8 20h8', 'M12 16v4'],
  'exp.entertainment.streaming': ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M10 8.5 16 12l-6 3.5z'],
  'exp.entertainment.cinema': ['M4 4h16v16H4z', 'M4 9h16', 'M9 4 8 9', 'M15 4l-1 5'],
  'exp.entertainment.events': ['M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 8 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-8z', 'M12 7v2', 'M12 11v2', 'M12 15v2'],
  'exp.entertainment.games': ['M6 8h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.2 2L15 15H9l-1.8 1A3 3 0 0 1 2 14v-2a4 4 0 0 1 4-4z', 'M8 11v3', 'M6.5 12.5h3', 'M16 12h.01', 'M18 14h.01'],
  'exp.utilities.electricity': ['M13 2 4 14h7l-1 8 9-12h-7z'],
  'exp.utilities.water': ['M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z'],
  'exp.utilities.internet': ['M2 8.5a15 15 0 0 1 20 0', 'M5 12a10 10 0 0 1 14 0', 'M8.5 15.5a5 5 0 0 1 7 0', 'M12 19h.01'],
  'exp.utilities.phone': ['M7 2h10v20H7z', 'M11 18h2'],
  'exp.business.tools': ['M8 6 3 12l5 6', 'M16 6l5 6-5 6'],
  'exp.family.pets': CAT_VIS.pets[1],
  'goal.technology.computer': ['M4 5h16v10H4z', 'M2 19h20'],
  'goal.technology.phone': ['M7 2h10v20H7z', 'M11 18h2'],
}

// [type, parentKey, visKey, name, [[subKey, name], ...]]
const CAT_TREE = [
  ['income', 'work', 'work', 'Trabajo', [['salary', 'Salario'], ['overtime', 'Horas extra'], ['bonuses', 'Bonificaciones'], ['commissions', 'Comisiones'], ['freelance', 'Freelance']]],
  ['income', 'business', 'business', 'Negocio', [['sales', 'Ventas'], ['services', 'Servicios prestados'], ['commissions', 'Comisiones'], ['other', 'Otros ingresos del negocio']]],
  ['income', 'investments', 'investments', 'Inversiones', [['dividends', 'Dividendos'], ['interest', 'Intereses'], ['returns', 'Rendimientos'], ['sale', 'Venta de inversiones']]],
  ['income', 'property', 'property', 'Propiedades', [['rent', 'Arriendos recibidos'], ['sale', 'Venta de propiedad'], ['other', 'Otros ingresos de propiedad']]],
  ['income', 'transfers', 'transfers', 'Transferencias recibidas', [['gifts', 'Regalos'], ['donations', 'Donaciones'], ['assistance', 'Ayuda económica'], ['reimbursements', 'Reembolsos']]],
  ['income', 'financial', 'financial', 'Financieros', [['refunds', 'Devoluciones'], ['purchase_reimbursements', 'Reintegros de compras'], ['adjustments', 'Ajustes']]],
  ['income', 'other', 'other', 'Otros ingresos', [['prizes', 'Premios'], ['occasional', 'Ingresos ocasionales'], ['other', 'Otros']]],

  ['expense', 'food', 'food', 'Alimentación', [['groceries', 'Mercado'], ['restaurants', 'Restaurantes'], ['delivery', 'Domicilios'], ['cafes', 'Cafés']]],
  ['expense', 'housing', 'housing', 'Vivienda', [['rent', 'Arriendo'], ['mortgage', 'Hipoteca'], ['maintenance', 'Mantenimiento'], ['furniture', 'Muebles'], ['decoration', 'Decoración']]],
  ['expense', 'utilities', 'utilities', 'Servicios públicos', [['electricity', 'Electricidad'], ['water', 'Agua'], ['gas', 'Gas'], ['internet', 'Internet'], ['phone', 'Telefonía']]],
  ['expense', 'transportation', 'transportation', 'Transporte', [['public_transit', 'Transporte público'], ['fuel', 'Combustible'], ['rideshare', 'Taxi / Apps'], ['parking', 'Parqueadero'], ['maintenance', 'Mantenimiento']]],
  ['expense', 'education', 'education', 'Educación', [['tuition', 'Matrícula'], ['courses', 'Cursos'], ['books', 'Libros'], ['materials', 'Materiales']]],
  ['expense', 'health', 'health', 'Salud', [['appointments', 'Citas médicas'], ['medication', 'Medicamentos'], ['tests', 'Exámenes'], ['insurance', 'Seguros'], ['dental', 'Odontología']]],
  ['expense', 'shopping', 'shopping', 'Compras', [['clothing', 'Ropa'], ['technology', 'Tecnología'], ['home', 'Hogar'], ['personal_care', 'Cuidado personal']]],
  ['expense', 'entertainment', 'entertainment', 'Entretenimiento', [['games', 'Juegos'], ['cinema', 'Cine'], ['streaming', 'Streaming'], ['events', 'Eventos'], ['hobbies', 'Hobbies']]],
  ['expense', 'travel', 'travel', 'Viajes', [['transport', 'Transporte'], ['accommodation', 'Alojamiento'], ['food', 'Comida'], ['activities', 'Actividades']]],
  ['expense', 'debt', 'debt', 'Deudas', [['credit_card', 'Tarjeta de crédito'], ['loans', 'Préstamos'], ['interest', 'Intereses'], ['installments', 'Cuotas']]],
  ['expense', 'financial', 'financial', 'Financieros', [['bank_fees', 'Comisiones bancarias'], ['taxes', 'Impuestos'], ['insurance', 'Seguros']]],
  ['expense', 'business', 'business', 'Negocio', [['supplies', 'Insumos'], ['suppliers', 'Proveedores'], ['advertising', 'Publicidad'], ['tools', 'Herramientas'], ['transport', 'Transporte'], ['services', 'Servicios']]],
  ['expense', 'family', 'family', 'Familia', [['children', 'Hijos'], ['pets', 'Mascotas'], ['assistance', 'Apoyo familiar'], ['other', 'Otros']]],
  ['expense', 'other', 'other', 'Otros gastos', [['unexpected', 'Imprevistos'], ['misc', 'Gastos varios']]],

  // DEPRECATED (Sep 2026): goals no longer use categories; they use a plan icon (PLAN_ICONS below).
  // These goal nodes stay only so CAT_LEGACY can migrate Goal.themeIcon / Goal.categoryId → PLAN_ICON_FROM_GOAL.
  ['goal', 'savings', 'savings', 'Ahorro', [['emergency', 'Fondo de emergencia'], ['general', 'Ahorro general'], ['future', 'Ahorro a futuro']]],
  ['goal', 'housing', 'housing', 'Vivienda', [['rent', 'Arriendo'], ['down_payment', 'Cuota inicial'], ['home_purchase', 'Compra de vivienda'], ['renovation', 'Remodelación'], ['furniture', 'Muebles']]],
  ['goal', 'transportation', 'transportation', 'Transporte', [['vehicle', 'Compra de vehículo'], ['down_payment', 'Cuota inicial'], ['repairs', 'Reparaciones'], ['maintenance', 'Mantenimiento']]],
  ['goal', 'education', 'education', 'Educación', [['tuition', 'Matrícula'], ['university', 'Universidad'], ['course', 'Curso'], ['certification', 'Certificación'], ['books', 'Libros / Materiales']]],
  ['goal', 'travel', 'travel', 'Viajes', [['vacation', 'Vacaciones'], ['international', 'Viaje internacional'], ['domestic', 'Viaje nacional'], ['flights', 'Vuelos'], ['accommodation', 'Alojamiento']]],
  ['goal', 'technology', 'technology', 'Tecnología', [['computer', 'Computador'], ['phone', 'Celular'], ['tablet', 'Tablet'], ['console', 'Consola'], ['accessories', 'Accesorios']]],
  ['goal', 'entertainment', 'entertainment', 'Entretenimiento', [['video_games', 'Videojuegos'], ['console', 'Consola'], ['events', 'Eventos'], ['hobbies', 'Hobbies']]],
  ['goal', 'personal_shopping', 'shopping', 'Compras personales', [['clothing', 'Ropa'], ['accessories', 'Accesorios'], ['personal_care', 'Cuidado personal'], ['special', 'Compra especial']]],
  ['goal', 'health', 'health', 'Salud', [['treatment', 'Tratamiento'], ['surgery', 'Cirugía'], ['dental', 'Odontología'], ['medication', 'Medicamentos']]],
  ['goal', 'finance', 'financial', 'Finanzas', [['debt_repayment', 'Pago de deudas'], ['credit_card', 'Tarjeta de crédito'], ['loan', 'Préstamo'], ['investment', 'Inversión']]],
  ['goal', 'business', 'business', 'Negocio', [['initial_capital', 'Capital inicial'], ['equipment', 'Equipos'], ['inventory', 'Inventario'], ['supplies', 'Insumos'], ['expansion', 'Expansión']]],
  ['goal', 'family', 'family', 'Familia', [['gifts', 'Regalos'], ['support', 'Apoyo familiar'], ['celebrations', 'Celebraciones']]],
  ['goal', 'pets', 'pets', 'Mascotas', [['vet', 'Veterinario'], ['food', 'Comida'], ['accessories', 'Accesorios'], ['adoption', 'Adopción']]],
  ['goal', 'events', 'events', 'Eventos', [['birthday', 'Cumpleaños'], ['wedding', 'Boda'], ['graduation', 'Grado'], ['celebrations', 'Celebraciones']]],
  ['goal', 'other', 'other', 'Otros', [['custom', 'Meta personalizada'], ['other', 'Otros']]],
]

const CAT_PREFIX = { expense: 'exp', income: 'inc', goal: 'goal' }
const CAT_NODES = []
const CAT_BY_ID = {}
const catAdd = (n) => { CAT_NODES.push(n); CAT_BY_ID[n.id] = n; return n }
CAT_TREE.forEach(([type, key, vis, name, subs]) => {
  const id = CAT_PREFIX[type] + '.' + key
  const [color, glyph] = CAT_VIS[vis]
  catAdd({ id, type, parentId: null, key, name, vis, color, glyph, custom: false })
  subs.forEach(([sk, sn]) => catAdd({ id: id + '.' + sk, type, parentId: id, key: sk, name: sn, vis, color, glyph: CAT_SUB_GLYPHS[id + '.' + sk] || glyph, custom: false }))
})
// Wallet-to-wallet transfers are a transaction TYPE, not a category. Presentation only.
const CAT_TRANSFER = { id: 'transfer', type: 'transfer', parentId: null, key: 'transfer', name: 'Transferencia', vis: 'transfer', color: '#6c5ce7', glyph: ['M7 7h13', 'M16 3l4 4-4 4', 'M17 17H4', 'M8 13l-4 4 4 4'], custom: false }
CAT_BY_ID.transfer = CAT_TRANSFER

// Legacy → canonical. Covers Android CategoryId enum names, web CategoryId slugs, seed.ts subcategory slugs,
// GoalCategoryId values and the Spanish display strings the mockups stored. Keys are lower-cased.
const CAT_LEGACY = {
  'food': 'exp.food', 'alimentación': 'exp.food',
  'food-groceries': 'exp.food.groceries', 'food-restaurants': 'exp.food.restaurants', 'food-delivery': 'exp.food.delivery', 'food-coffee': 'exp.food.cafes',
  'transportation': 'exp.transportation', 'transporte': 'exp.transportation',
  'transportation-public-transit': 'exp.transportation.public_transit', 'transportation-fuel': 'exp.transportation.fuel', 'transportation-rideshare': 'exp.transportation.rideshare', 'transportation-parking': 'exp.transportation.parking',
  'shopping': 'exp.shopping', 'compras': 'exp.shopping',
  'shopping-clothing': 'exp.shopping.clothing', 'shopping-electronics': 'exp.shopping.technology', 'shopping-home': 'exp.shopping.home', 'shopping-personal-care': 'exp.shopping.personal_care',
  'health': 'exp.health', 'salud': 'exp.health',
  'health-pharmacy': 'exp.health.medication', 'health-doctor': 'exp.health.appointments', 'health-insurance': 'exp.health.insurance', 'health-fitness': 'exp.health',
  'education': 'exp.education', 'educación': 'exp.education',
  'education-tuition': 'exp.education.tuition', 'education-supplies': 'exp.education.books', 'education-courses': 'exp.education.courses',
  'entertainment': 'exp.entertainment', 'entretenimiento': 'exp.entertainment',
  'entertainment-streaming': 'exp.entertainment.streaming', 'entertainment-events': 'exp.entertainment.events', 'entertainment-hobbies': 'exp.entertainment.hobbies',
  'bills': 'exp.utilities', 'servicios': 'exp.utilities',
  'bills-electricity': 'exp.utilities.electricity', 'bills-water': 'exp.utilities.water', 'bills-internet': 'exp.utilities.internet', 'bills-rent': 'exp.housing.rent',
  'subscriptions': 'exp.entertainment.streaming', 'suscripciones': 'exp.entertainment.streaming',
  'subscriptions-streaming': 'exp.entertainment.streaming', 'subscriptions-software': 'exp.business.tools',
  'salary': 'inc.work.salary', 'salario': 'inc.work.salary',
  'freelance': 'inc.work.freelance',
  'gift': 'inc.transfers.gifts', 'obsequio': 'inc.transfers.gifts',
  'other': 'exp.other', 'otros': 'exp.other', 'transferencia': 'transfer',
  // goals (GoalCategoryId + Spanish labels)
  'goal:emergency': 'goal.savings.emergency', 'goal:emergencia': 'goal.savings.emergency',
  'goal:travel': 'goal.travel', 'goal:viaje': 'goal.travel',
  'goal:education': 'goal.education', 'goal:educación': 'goal.education',
  'goal:housing': 'goal.housing', 'goal:vivienda': 'goal.housing',
  'goal:vehicle': 'goal.transportation.vehicle', 'goal:vehículo': 'goal.transportation.vehicle',
  'goal:technology': 'goal.technology', 'goal:tecnología': 'goal.technology',
  'goal:health': 'goal.health', 'goal:salud': 'goal.health',
  'goal:debt': 'goal.finance.debt_repayment', 'goal:deuda': 'goal.finance.debt_repayment',
  'goal:retirement': 'goal.savings.future', 'goal:retiro': 'goal.savings.future',
  'goal:other': 'goal.other', 'goal:otros': 'goal.other',
}
const CAT_FALLBACK = { expense: 'exp.other', income: 'inc.other', goal: 'goal.other' }

// Resolve any id / legacy key to a node. type disambiguates 'Otros' (income vs expense) and goal keys.
const catNode = (x, type) => {
  if (!x) return null
  if (CAT_BY_ID[x]) return CAT_BY_ID[x]
  const k = String(x).toLowerCase()
  if (type === 'income' && (k === 'other' || k === 'otros')) return CAT_BY_ID['inc.other']
  const id = (type === 'goal' && CAT_LEGACY['goal:' + k]) || CAT_LEGACY[k]
  return (id && CAT_BY_ID[id]) || CAT_BY_ID[CAT_FALLBACK[type || 'expense']]
}
const catId = (x, type) => (catNode(x, type) || {}).id
const catParent = (x, type) => { const n = catNode(x, type); return n && n.parentId ? CAT_BY_ID[n.parentId] : n }
const catParents = (type) => CAT_NODES.filter((n) => n.type === type && !n.parentId)
const catChildren = (parentId) => CAT_NODES.filter((n) => n.parentId === parentId)
const catName = (x, type) => (catNode(x, type) || {}).name || ''
const catColor = (x, type) => (catNode(x, type) || CAT_BY_ID['exp.other']).color
const catGlyph = (x, type) => (catNode(x, type) || CAT_BY_ID['exp.other']).glyph
// 'Alimentación · Mercado' for a sub, 'Alimentación' for a parent.
const catLabel = (x, type) => { const n = catNode(x, type); if (!n) return ''; return n.parentId ? CAT_BY_ID[n.parentId].name + ' · ' + n.name : n.name }
// Does a transaction category fall inside a budget/filter scope (parent = "Todas")?
const catIn = (x, scopeId) => { const n = catNode(x); return !!n && (n.id === scopeId || n.parentId === scopeId) }

// Deterministic aggregation. rows: [{ cat, amount }]. level 'parent' | 'sub'. Sorted by amount desc, then id.
const catAggregate = (rows, level, type) => {
  const acc = {}
  rows.forEach((r) => {
    const n = catNode(r.cat, type); if (!n) return
    const key = level === 'sub' ? n.id : n.parentId || n.id
    acc[key] = (acc[key] || 0) + Math.abs(r.amount)
  })
  return Object.keys(acc).map((id) => ({ id, node: CAT_BY_ID[id], amount: acc[id] })).sort((a, b) => b.amount - a.amount || (a.id < b.id ? -1 : 1))
}

// Keyword suggestion → most specific id. [idSuffix, keywords]
const CAT_KEYWORDS = {
  expense: [
    ['food.groceries', ['mercado', 'supermercado', 'éxito', 'exito', 'd1', 'ara']], ['food.restaurants', ['restaurante', 'almuerzo', 'cena', 'desayuno']], ['food.delivery', ['domicilio', 'rappi']], ['food.cafes', ['café', 'cafe', 'tostao', 'juan valdez', 'snack']], ['food', ['comida', 'aliment']],
    ['housing.rent', ['arriendo']], ['housing.mortgage', ['hipoteca']], ['housing.maintenance', ['administración', 'administracion', 'reparación', 'plomero']], ['housing.furniture', ['mueble', 'sofá', 'colchón']],
    ['utilities.electricity', ['luz', 'energía', 'energia', 'epm']], ['utilities.water', ['agua', 'acueducto']], ['utilities.gas', ['gas natural', 'vanti']], ['utilities.internet', ['internet', 'fibra']], ['utilities.phone', ['celular', 'plan móvil', 'claro', 'movistar', 'tigo']],
    ['transportation.rideshare', ['taxi', 'uber', 'didi', 'cabify', 'viaje en app']], ['transportation.fuel', ['gasolina', 'combustible', 'tanqueo']], ['transportation.public_transit', ['bus', 'metro', 'transmilenio', 'sitp', 'pasaje']], ['transportation.parking', ['parqueadero', 'peaje']],
    ['education.tuition', ['matrícula', 'matricula', 'semestre', 'pensión colegio']], ['education.courses', ['curso', 'diplomado', 'platzi']], ['education.books', ['libro']],
    ['health.medication', ['farmacia', 'droguería', 'drogueria', 'medicamento']], ['health.appointments', ['médico', 'medico', 'cita', 'consulta']], ['health.tests', ['examen', 'laboratorio']], ['health.insurance', ['eps', 'prepagada']], ['health.dental', ['odont', 'dentista']],
    ['shopping.clothing', ['ropa', 'zapato', 'tenis']], ['shopping.technology', ['tecnolog', 'audífono', 'computador']], ['shopping.personal_care', ['peluquería', 'barbería', 'cosmético']],
    ['entertainment.streaming', ['netflix', 'spotify', 'disney', 'hbo', 'prime video', 'streaming', 'suscrip']], ['entertainment.cinema', ['cine']], ['entertainment.events', ['concierto', 'boleta', 'fiesta']], ['entertainment.games', ['videojuego', 'steam', 'playstation', 'xbox']],
    ['travel.transport', ['vuelo', 'tiquete', 'avianca']], ['travel.accommodation', ['hotel', 'airbnb', 'hostal']],
    ['debt.credit_card', ['tarjeta de crédito', 'pago tarjeta']], ['debt.installments', ['cuota']], ['financial.bank_fees', ['4x1000', 'cuota de manejo', 'comisión bancaria']], ['financial.taxes', ['impuesto', 'predial', 'dian']],
    ['business.tools', ['icloud', 'software', 'saas', 'hosting', 'dominio']], ['business.advertising', ['publicidad', 'pauta']],
    ['family.pets', ['veterinari', 'mascota', 'concentrado']], ['family.children', ['pañal', 'colegio', 'guardería']],
  ],
  income: [
    ['work.salary', ['salario', 'nómina', 'nomina', 'sueldo', 'quincena']], ['work.overtime', ['horas extra']], ['work.bonuses', ['bono', 'prima', 'bonificación']], ['work.freelance', ['freelance', 'honorarios', 'proyecto']], ['work.commissions', ['comisión', 'comision']],
    ['business.sales', ['venta']], ['investments.dividends', ['dividendo']], ['investments.interest', ['intereses', 'cdt']], ['investments.returns', ['rendimiento']],
    ['property.rent', ['arriendo']], ['transfers.gifts', ['regalo', 'obsequio']], ['transfers.reimbursements', ['reembolso']], ['financial.refunds', ['devolución', 'devolucion']], ['other.prizes', ['premio', 'lotería']],
  ],
  goal: [
    ['savings.emergency', ['emergencia', 'imprevisto', 'colchón', 'colchon', 'respaldo']], ['savings.future', ['retiro', 'pensión', 'pension', 'futuro', 'largo plazo']], ['savings.general', ['ahorro', 'fondo']],
    ['housing.down_payment', ['cuota inicial']], ['housing.home_purchase', ['casa', 'apartamento', 'apto', 'vivienda', 'lote']], ['housing.renovation', ['remodel']], ['housing.furniture', ['mueble']],
    ['transportation.vehicle', ['carro', 'moto', 'vehículo', 'vehiculo', 'bici']],
    ['education.university', ['universidad', 'semestre', 'maestr', 'especializa', 'posgrado']], ['education.certification', ['certifica']], ['education.course', ['curso', 'diplomado', 'inglés', 'ingles']],
    ['travel.international', ['perú', 'peru', 'europa', 'exterior', 'internacional']], ['travel.flights', ['vuelo', 'tiquete']], ['travel.vacation', ['viaje', 'vacacion', 'paseo']],
    ['technology.computer', ['portátil', 'portatil', 'laptop', 'computador']], ['technology.phone', ['celular', 'iphone']], ['technology.tablet', ['tablet', 'ipad']], ['technology.console', ['consola', 'playstation', 'xbox', 'switch']],
    ['health.dental', ['odont', 'brackets', 'ortodoncia']], ['health.surgery', ['cirug']], ['health.treatment', ['tratamiento', 'terapia']],
    ['finance.credit_card', ['tarjeta']], ['finance.debt_repayment', ['deuda', 'saldar', 'libranza']], ['finance.investment', ['inversión', 'inversion']],
    ['business.initial_capital', ['negocio', 'emprend']], ['events.wedding', ['boda', 'matrimonio']], ['events.birthday', ['cumpleaños']], ['events.graduation', ['grado', 'graduación']],
    ['pets.vet', ['veterinari']], ['pets.adoption', ['adopción', 'adoptar']], ['family.gifts', ['regalo', 'navidad']],
  ],
}
const catGuess = (text, type) => {
  const n = (text || '').toLowerCase().trim(); if (!n) return null
  const hit = (CAT_KEYWORDS[type] || []).find(([, ks]) => ks.some((k) => n.includes(k)))
  return hit ? CAT_PREFIX[type] + '.' + hit[0] : null
}

// Custom categories: same node shape, registered into the same registry. parentId null → new parent.
const catSlug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'custom'
const catRegisterCustom = ({ type, parentId, name, vis }) => {
  const parent = parentId ? CAT_BY_ID[parentId] : null
  const base = parent ? parent.id : CAT_PREFIX[type]
  let id = base + '.u_' + catSlug(name), i = 2
  while (CAT_BY_ID[id]) id = base + '.u_' + catSlug(name) + '_' + i++
  const v = parent ? [parent.color, parent.glyph] : CAT_VIS[vis] || CAT_VIS.other
  return catAdd({ id, type, parentId: parent ? parent.id : null, key: id.split('.').pop(), name: String(name).trim(), vis: parent ? parent.vis : vis, color: v[0], glyph: v[1], custom: true })
}
// END S2_TAXONOMY

// BEGIN S2_PLAN_ICONS v1 — icons for goals and custom budgets (not categories). Keys reuse CAT_VIS identities.
// [key, Spanish name, keywords used to suggest the icon from the title (Spanish + English)]
const PLAN_ICONS = [
  ['savings', 'Ahorro', ['emergencia', 'emergency', 'fondo', 'ahorro', 'respaldo', 'imprevisto', 'colchón']],
  ['travel', 'Viaje', ['viaje', 'vacacion', 'vacación', 'vacation', 'trip', 'perú', 'peru', 'playa', 'vuelo', 'paseo', 'europa']],
  ['technology', 'Tecnología', ['portátil', 'portatil', 'laptop', 'computador', 'celular', 'iphone', 'tablet', 'consola']],
  ['transportation', 'Vehículo', ['carro', 'car', 'moto', 'vehículo', 'vehiculo', 'bici']],
  ['housing', 'Vivienda', ['casa', 'house', 'apartamento', 'apto', 'cuota inicial', 'arriendo', 'remodel', 'hogar']],
  ['education', 'Estudio', ['universidad', 'curso', 'especializa', 'maestr', 'semestre', 'inglés', 'ingles', 'estudio']],
  ['health', 'Salud', ['salud', 'odont', 'cirug', 'brackets', 'médic', 'gimnasio']],
  ['events', 'Celebración', ['boda', 'cumpleaños', 'grado', 'fiesta', 'matrimonio', 'celebra']],
  ['transfers', 'Regalos', ['regalo', 'navidad', 'detalle', 'amor y amistad']],
  ['pets', 'Mascota', ['perro', 'gato', 'mascota', 'veterinari']],
  ['food', 'Comida', ['mercado', 'comida', 'restaurante', 'almuerzo', 'salidas a comer']],
  ['entertainment', 'Ocio', ['concierto', 'cine', 'ocio', 'festival', 'salidas']],
  ['shopping', 'Compras', ['ropa', 'compras', 'zapatos']],
  ['debt', 'Deudas', ['deuda', 'tarjeta', 'crédito', 'credito', 'libranza']],
  ['investments', 'Inversión', ['inversión', 'inversion', 'cdt', 'acciones']],
  ['family', 'Familia', ['familia', 'hijo', 'bebé', 'bebe']],
  ['work', 'Trabajo', ['negocio', 'trabajo', 'equipo']],
  ['other', 'Otro', []],
].map(([key, name, kw]) => ({ key, name, kw, color: CAT_VIS[key][0], glyph: CAT_VIS[key][1] }))
const planIcon = (k) => PLAN_ICONS.find((p) => p.key === k) || PLAN_ICONS[PLAN_ICONS.length - 1]
// First keyword hit wins; null when nothing matches (UI keeps the current icon).
const guessPlanIcon = (text) => { const n = (text || '').toLowerCase(); if (!n.trim()) return null; const h = PLAN_ICONS.find((p) => p.kw.some((k) => n.includes(k))); return h ? h.key : null }
// Migration: legacy goal category (parent id) → plan icon key. Parents without an entry map to their own vis key.
const PLAN_ICON_FROM_GOAL = (goalCatId) => { const n = catParent(goalCatId, 'goal'); if (!n) return 'other'; return { personal_shopping: 'shopping', finance: 'debt', business: 'work' }[n.key] || (CAT_VIS[n.vis] ? n.vis : 'other') }
// END S2_PLAN_ICONS

