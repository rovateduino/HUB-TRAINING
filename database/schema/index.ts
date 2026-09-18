import { pgTable, serial, text, timestamp, integer, boolean, jsonb, varchar, decimal } from 'drizzle-orm/pg-core';

// ============================================
// GOVERNANÇA
// ============================================

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', 50).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', 255).notNull().unique(),
  passwordHash: varchar('password_hash', 255).notNull(),
  name: varchar('name', 255).notNull(),
  identifier: varchar('identifier', 100),
  roleId: integer('role_id').references(() => roles.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull().unique(),
  description: text('description'),
  resource: varchar('resource', 100).notNull(),
  action: varchar('action', 50).notNull(),
});

// ============================================
// INFRAESTRUTURA
// ============================================

export const equipmentTypes = pgTable('equipment_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull().unique(),
  category: varchar('category', 50), // AC, DC, CLIMATIZACAO, DISTRIBUICAO
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const technicalEquipment = pgTable('technical_equipment', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull(),
  typeId: integer('type_id').references(() => equipmentTypes.id),
  function: text('function'),
  location: varchar('location', 255),
  system: varchar('system', 50), // AC, DC, CLIMATIZACAO
  status: varchar('status', 50).default('ACTIVE'),
  version: varchar('version', 20),
  source: varchar('source', 50), // CONFIGURACAO_PROJETO, REFERENCIA_CAMPO, PENDENTE_VALIDACAO
  technicalNotes: text('technical_notes'),
  specifications: jsonb('specifications').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const equipmentRelationships = pgTable('equipment_relationships', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').references(() => technicalEquipment.id).notNull(),
  targetId: integer('target_id').references(() => technicalEquipment.id).notNull(),
  relationshipType: varchar('relationship_type', 50).notNull(), // ALIMENTA, DISTRIBUI, REDUNDANCIA
  description: text('description'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by'),
});

export const equipmentLocations = pgTable('equipment_locations', {
  id: serial('id').primaryKey(),
  equipmentId: integer('equipment_id').references(() => technicalEquipment.id).notNull(),
  location: varchar('location', 255).notNull(),
  floor: varchar('floor', 50),
  room: varchar('room', 100),
  coordinates: jsonb('coordinates').$type<{x: number, y: number}>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const equipmentAttributes = pgTable('equipment_attributes', {
  id: serial('id').primaryKey(),
  equipmentId: integer('equipment_id').references(() => technicalEquipment.id).notNull(),
  attributeName: varchar('attribute_name', 100).notNull(),
  attributeValue: text('attribute_value'),
  unit: varchar('unit', 20),
  dataType: varchar('data_type', 50),
  source: varchar('source', 50),
  createdAt: timestamp('created_at').defaultNow(),
  updatedBy: integer('updated_by'),
});

// ============================================
// ENERGIA
// ============================================

export const powerSources = pgTable('power_sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull(),
  type: varchar('type', 50).notNull(), // CONCESSIONARIA, GERADOR
  voltage: decimal('voltage', 10, 2),
  frequency: decimal('frequency', 10, 2),
  capacity: decimal('capacity', 15, 2),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const powerPaths = pgTable('power_paths', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull(),
  type: varchar('type', 50).notNull(), // AC, DC
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const distributionBoards = pgTable('distribution_boards', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull(),
  type: varchar('type', 50).notNull(), // QTA, QDGE, QDNB, QDT, QDF, QDCC, QFAC
  location: varchar('location', 255),
  specification: jsonb('specification').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const circuits = pgTable('circuits', {
  id: serial('id').primaryKey(),
  boardId: integer('board_id').references(() => distributionBoards.id),
  circuitNumber: varchar('circuit_number', 50).notNull(),
  phase: varchar('phase', 10),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const circuitLoads = pgTable('circuit_loads', {
  id: serial('id').primaryKey(),
  circuitId: integer('circuit_id').references(() => circuits.id).notNull(),
  loadType: varchar('load_type', 50),
  nominalCurrent: decimal('nominal_current', 10, 2),
  measuredCurrent: decimal('measured_current', 10, 2),
  power: decimal('power', 15, 2),
  measurementDate: timestamp('measurement_date'),
  instrument: varchar('instrument', 100),
  responsible: varchar('responsible', 255),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// UPS / FCC
// ============================================

export const upsSystems = pgTable('ups_systems', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull(),
  location: varchar('location', 255),
  model: varchar('model', 100),
  manufacturer: varchar('manufacturer', 100),
  capacity: decimal('capacity', 15, 2),
  batteryElements: integer('battery_elements'),
  batteryVoltage: decimal('battery_voltage', 10, 2),
  batteryCapacity: decimal('battery_capacity', 10, 2),
  floatVoltage: decimal('float_voltage', 10, 2),
  dischargeVoltage: decimal('discharge_voltage', 10, 2),
  specifications: jsonb('specifications').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const fccSystems = pgTable('fcc_systems', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull(),
  location: varchar('location', 255),
  model: varchar('model', 100),
  manufacturer: varchar('manufacturer', 100),
  rectifierType: varchar('rectifier_type', 50),
  outputVoltage: decimal('output_voltage', 10, 2),
  outputCurrent: decimal('output_current', 10, 2),
  specifications: jsonb('specifications').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const batteryBanks = pgTable('battery_banks', {
  id: serial('id').primaryKey(),
  systemType: varchar('system_type', 20).notNull(), // UPS, FCC
  systemId: integer('system_id').notNull(),
  name: varchar('name', 100).notNull(),
  location: varchar('location', 255),
  batteryType: varchar('battery_type', 50),
  elementVoltage: decimal('element_voltage', 10, 2),
  elementCapacity: decimal('element_capacity', 10, 2),
  elementCount: integer('element_count'),
  installationDate: timestamp('installation_date'),
  temperature: decimal('temperature', 10, 2),
  status: varchar('status', 50),
  specifications: jsonb('specifications').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const batteryElements = pgTable('battery_elements', {
  id: serial('id').primaryKey(),
  bankId: integer('bank_id').references(() => batteryBanks.id).notNull(),
  elementNumber: integer('element_number').notNull(),
  voltage: decimal('voltage', 10, 2),
  internalResistance: decimal('internal_resistance', 10, 4),
  temperature: decimal('temperature', 10, 2),
  condition: varchar('condition', 50),
  lastMeasurementDate: timestamp('last_measurement_date'),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const batteryMeasurements = pgTable('battery_measurements', {
  id: serial('id').primaryKey(),
  elementId: integer('element_id').references(() => batteryElements.id).notNull(),
  measurementType: varchar('measurement_type', 50).notNull(), // FLOAT, DISCHARGE, RESISTANCE
  voltage: decimal('voltage', 10, 2),
  current: decimal('current', 10, 2),
  internalResistance: decimal('internal_resistance', 10, 4),
  temperature: decimal('temperature', 10, 2),
  measurementDate: timestamp('measurement_date').notNull(),
  instrument: varchar('instrument', 100),
  responsible: varchar('responsible', 255),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const batteryTests = pgTable('battery_tests', {
  id: serial('id').primaryKey(),
  bankId: integer('bank_id').references(() => batteryBanks.id).notNull(),
  testType: varchar('test_type', 50).notNull(), // DISCHARGE, RESISTANCE, CAPACITY
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  results: jsonb('results').$type<Record<string, any>>(),
  conclusion: text('conclusion'),
  responsible: varchar('responsible', 255),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by'),
});

// ============================================
// MEDIÇÕES
// ============================================

export const measurementPoints = pgTable('measurement_points', {
  id: serial('id').primaryKey(),
  equipmentId: integer('equipment_id').references(() => technicalEquipment.id),
  boardId: integer('board_id').references(() => distributionBoards.id),
  pointName: varchar('point_name', 100).notNull(),
  pointType: varchar('point_type', 50).notNull(), // AC, DC
  location: varchar('location', 255),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by'),
});

export const measurementTypes = pgTable('measurement_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', 100).notNull().unique(),
  unit: varchar('unit', 20),
  category: varchar('category', 50), // AC, DC, RESISTANCE, TEMPERATURE
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const measurementRecords = pgTable('measurement_records', {
  id: serial('id').primaryKey(),
  pointId: integer('point_id').references(() => measurementPoints.id),
  typeId: integer('type_id').references(() => measurementTypes.id),
  value: decimal('value', 15, 4),
  unit: varchar('unit', 20),
  measurementDate: timestamp('measurement_date').notNull(),
  instrument: varchar('instrument', 100),
  responsible: varchar('responsible', 255),
  operationalCondition: varchar('operational_condition', 50),
  observations: text('observations'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by'),
});

export const measurementLimits = pgTable('measurement_limits', {
  id: serial('id').primaryKey(),
  typeId: integer('type_id').references(() => measurementTypes.id),
  minValue: decimal('min_value', 15, 4),
  maxValue: decimal('max_value', 15, 4),
  nominalValue: decimal('nominal_value', 15, 4),
  source: varchar('source', 50),
  procedure: varchar('procedure', 100),
  version: varchar('version', 20),
  createdAt: timestamp('created_at').defaultNow(),
  updatedBy: integer('updated_by'),
});

export const measurementReferences = pgTable('measurement_references', {
  id: serial('id').primaryKey(),
  pointId: integer('point_id').references(() => measurementPoints.id),
  referenceValue: decimal('reference_value', 15, 4),
  source: varchar('source', 50), // CONFIGURACAO_PROJETO, REFERENCIA_CAMPO, FABRICANTE
  description: text('description'),
  status: varchar('status', 50),
  createdAt: timestamp('created_at').defaultNow(),
  updatedBy: integer('updated_by'),
});

// ============================================
// PROCEDIMENTOS
// ============================================

export const technicalProcedures = pgTable('technical_procedures', {
  id: serial('id').primaryKey(),
  name: varchar('name', 255).notNull(),
  category: varchar('category', 100).notNull(),
  description: text('description'),
  classification: varchar('classification', 50), // CONCEITO_GERAL, CONFIGURACAO_AMBIENTE, PROCEDIMENTO_OPERACIONAL, REFERENCIA
  status: varchar('status', 50).default('PENDING_TECHNICAL_VALIDATION'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const procedureVersions = pgTable('procedure_versions', {
  id: serial('id').primaryKey(),
  procedureId: integer('procedure_id').references(() => technicalProcedures.id).notNull(),
  version: varchar('version', 20).notNull(),
  content: text('content').notNull(),
  changes: text('changes'),
  status: varchar('status', 50).default('DRAFT'),
  effectiveDate: timestamp('effective_date'),
  author: varchar('author', 255),
  approval: varchar('approval', 50),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by'),
});

export const procedureSteps = pgTable('procedure_steps', {
  id: serial('id').primaryKey(),
  versionId: integer('version_id').references(() => procedureVersions.id).notNull(),
  stepNumber: integer('step_number').notNull(),
  title: varchar('title', 255).notNull(),
  description: text('description'),
  prerequisites: text('prerequisites'),
  warnings: text('warnings'),
  expectedOutcome: text('expected_outcome'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const procedureReferences = pgTable('procedure_references', {
  id: serial('id').primaryKey(),
  procedureId: integer('procedure_id').references(() => technicalProcedures.id),
  referenceType: varchar('reference_type', 50),
  title: varchar('title', 255),
  url: varchar('url', 500),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// TREINAMENTO
// ============================================

export const trainingModules = pgTable('training_modules', {
  id: serial('id').primaryKey(),
  title: varchar('title', 255).notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  category: varchar('category', 100),
  estimatedDuration: integer('estimated_duration'), // em minutos
  prerequisites: jsonb('prerequisites').$type<number[]>(),
  status: varchar('status', 50).default('PENDING_TECHNICAL_VALIDATION'),
  version: varchar('version', 20),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const trainingLessons = pgTable('training_lessons', {
  id: serial('id').primaryKey(),
  moduleId: integer('module_id').references(() => trainingModules.id).notNull(),
  title: varchar('title', 255).notNull(),
  order: integer('order').notNull(),
  objective: text('objective'),
  content: text('content').notNull(),
  technicalNotes: text('technical_notes'),
  warnings: text('warnings'),
  classification: varchar('classification', 50), // CONCEITO_GERAL, CONFIGURACAO_AMBIENTE, PROCEDIMENTO_OPERACIONAL, REFERENCIA
  images: jsonb('images').$type<Array<{url: string, type: string, description: string}>>(),
  documents: jsonb('documents').$type<Array<{url: string, type: string, description: string}>>(),
  references: jsonb('references').$type<Array<{title: string, url: string}>>(),
  estimatedDuration: integer('estimated_duration'),
  status: varchar('status', 50).default('PENDING_TECHNICAL_VALIDATION'),
  version: varchar('version', 20),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const trainingVersions = pgTable('training_versions', {
  id: serial('id').primaryKey(),
  version: varchar('version', 20).notNull().unique(),
  description: text('description'),
  releaseDate: timestamp('release_date'),
  status: varchar('status', 50).default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by'),
});

export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  lessonId: integer('lesson_id').references(() => trainingLessons.id).notNull(),
  status: varchar('status', 50).default('NOT_STARTED'), // NOT_STARTED, IN_PROGRESS, COMPLETED
  progress: integer('progress').default(0), // 0-100
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  checkpointsCompleted: integer('checkpoints_completed').default(0),
  totalCheckpoints: integer('total_checkpoints').default(0),
  lastAccessedAt: timestamp('last_accessed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const checklists = pgTable('checklists', {
  id: serial('id').primaryKey(),
  name: varchar('name', 255).notNull(),
  category: varchar('category', 100), // PREVENTIVA, CORRETIVA, INSTALACAO
  description: text('description'),
  version: varchar('version', 20),
  status: varchar('status', 50).default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const checklistItems = pgTable('checklist_items', {
  id: serial('id').primaryKey(),
  checklistId: integer('checklist_id').references(() => checklists.id).notNull(),
  category: varchar('category', 50), // ANTES, DURANTE, DEPOIS
  itemText: text('item_text').notNull(),
  order: integer('order').default(0),
  isRequired: boolean('is_required').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// SIMULADO
// ============================================

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  category: varchar('category', 100).notNull(),
  question: text('question').notNull(),
  difficulty: varchar('difficulty', 20).default('MEDIUM'), // EASY, MEDIUM, HARD
  explanation: text('explanation'),
  isActive: boolean('is_active').default(true),
  moduleId: integer('module_id').references(() => trainingModules.id),
  order: integer('order').default(0),
  version: varchar('version', 20),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const questionOptions = pgTable('question_options', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  optionText: text('option_text').notNull(),
  order: integer('order').default(0),
  isCorrect: boolean('is_correct').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  score: integer('score').notNull(),
  total: integer('total').notNull(),
  passed: boolean('passed').notNull(),
  attemptNumber: integer('attempt_number').default(1),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  timeSpent: integer('time_spent'), // em segundos
  ipAddress: varchar('ip_address', 50),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const quizAnswers = pgTable('quiz_answers', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').references(() => quizAttempts.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  selectedOptionId: integer('selected_option_id').references(() => questionOptions.id),
  isCorrect: boolean('is_correct'),
  timeSpent: integer('time_spent'),
  answeredAt: timestamp('answered_at'),
});

// ============================================
// CERTIFICACAO
// ============================================

export const certificates = pgTable('certificates', {
  id: serial('id').primaryKey(),
  certificateNumber: varchar('certificate_number', 20).notNull().unique(),
  seq: integer('seq').notNull(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  trainingName: text('training_name').notNull(),
  modality: text('modality').notNull(),
  workloadHours: varchar('workload_hours', 50),
  score: integer('score').notNull(),
  total: integer('total').notNull(),
  percentage: decimal('percentage').notNull(),
  completionDate: timestamp('completion_date').notNull(),
  issueDate: timestamp('issue_date').notNull(),
  signer1Name: text('signer1_name'),
  signer1Role: text('signer1_role'),
  signer2Name: text('signer2_name'),
  signer2Role: text('signer2_role'),
  status: varchar('status', 20).default('VALID'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const certificateSettings = pgTable('certificate_settings', {
  id: integer('id').primaryKey(),
  workloadHours: varchar('workload_hours', 50),
  modality: text('modality').default('Treinamento profissional interno'),
  signer1Name: text('signer1_name'),
  signer1Role: text('signer1_role'),
  signer2Name: text('signer2_name'),
  signer2Role: text('signer2_role'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// AUDITORIA E VERSIONAMENTO
// ============================================

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', 100).notNull(),
  entityType: varchar('entity_type', 100).notNull(),
  entityId: integer('entity_id'),
  oldValue: jsonb('old_value').$type<Record<string, any>>(),
  newValue: jsonb('new_value').$type<Record<string, any>>(),
  ipAddress: varchar('ip_address', 50),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow(),
  description: text('description'),
});

export const contentVersions = pgTable('content_versions', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', 100).notNull(),
  entityId: integer('entity_id').notNull(),
  version: varchar('version', 20).notNull(),
  content: jsonb('content').$type<Record<string, any>>(),
  changeDescription: text('change_description'),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// TABELAS LEGADAS (para compatibilidade)
// ============================================

export const attempts = pgTable('attempts', {
  id: serial('id').primaryKey(),
  candidate: varchar('candidate', 255).notNull(),
  identifier: varchar('identifier', 100),
  score: integer('score').notNull(),
  total: integer('total').notNull(),
  passed: boolean('passed').notNull(),
  answers: jsonb('answers').$type<Record<string, number>>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});