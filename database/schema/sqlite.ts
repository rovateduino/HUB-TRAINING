import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================
// GOVERNANÇA
// ============================================

export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: text('permissions'), // JSON string
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  identifier: text('identifier'),
  roleId: integer('role_id').references(() => roles.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const permissions = sqliteTable('permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
});

// ============================================
// INFRAESTRUTURA
// ============================================

export const equipmentTypes = sqliteTable('equipment_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  category: text('category'),
  description: text('description'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const technicalEquipment = sqliteTable('technical_equipment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  typeId: integer('type_id').references(() => equipmentTypes.id),
  function: text('function'),
  location: text('location'),
  system: text('system'),
  status: text('status').default('ACTIVE'),
  version: text('version'),
  source: text('source'),
  technicalNotes: text('technical_notes'),
  specifications: text('specifications'), // JSON string
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const equipmentRelationships = sqliteTable('equipment_relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').references(() => technicalEquipment.id).notNull(),
  targetId: integer('target_id').references(() => technicalEquipment.id).notNull(),
  relationshipType: text('relationship_type').notNull(),
  description: text('description'),
  order: integer('order').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  createdBy: integer('created_by'),
});

// ============================================
// TREINAMENTO
// ============================================

export const trainingModules = sqliteTable('training_modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  category: text('category'),
  estimatedDuration: integer('estimated_duration'),
  prerequisites: text('prerequisites'), // JSON string
  status: text('status').default('PENDING_TECHNICAL_VALIDATION'),
  version: text('version'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const trainingLessons = sqliteTable('training_lessons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  moduleId: integer('module_id').references(() => trainingModules.id).notNull(),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  objective: text('objective'),
  content: text('content').notNull(),
  technicalNotes: text('technical_notes'),
  warnings: text('warnings'),
  classification: text('classification'),
  images: text('images'), // JSON string
  documents: text('documents'), // JSON string
  references: text('references'), // JSON string
  estimatedDuration: integer('estimated_duration'),
  status: text('status').default('PENDING_TECHNICAL_VALIDATION'),
  version: text('version'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const lessonProgress = sqliteTable('lesson_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  lessonId: integer('lesson_id').references(() => trainingLessons.id).notNull(),
  status: text('status').default('NOT_STARTED'),
  progress: integer('progress').default(0),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  checkpointsCompleted: integer('checkpoints_completed').default(0),
  totalCheckpoints: integer('total_checkpoints').default(0),
  lastAccessedAt: text('last_accessed_at'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const lessonCheckpoints = sqliteTable('lesson_checkpoints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lessonId: integer('lesson_id').references(() => trainingLessons.id).notNull(),
  question: text('question').notNull(),
  type: text('type').default('MULTIPLE_CHOICE'),
  order: integer('order').default(0),
  points: integer('points').default(1),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const checkpointOptions = sqliteTable('checkpoint_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checkpointId: integer('checkpoint_id').references(() => lessonCheckpoints.id).notNull(),
  optionText: text('option_text').notNull(),
  order: integer('order').default(0),
  isCorrect: integer('is_correct', { mode: 'boolean' }).default(false),
});

export const checkpointAnswers = sqliteTable('checkpoint_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  checkpointId: integer('checkpoint_id').references(() => lessonCheckpoints.id).notNull(),
  selectedOptionId: integer('selected_option_id').references(() => checkpointOptions.id),
  isCorrect: integer('is_correct', { mode: 'boolean' }),
  attemptNumber: integer('attempt_number').default(1),
  byAdmin: integer('by_admin', { mode: 'boolean' }).default(false),
  answeredAt: text('answered_at').default('CURRENT_TIMESTAMP'),
});

// ============================================
// CERTIFICACAO
// ============================================

export const certificates = sqliteTable('certificates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  certificateNumber: text('certificate_number').notNull().unique(),
  seq: integer('seq').notNull(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  trainingName: text('training_name').notNull(),
  modality: text('modality').notNull(),
  workloadHours: text('workload_hours'),
  score: integer('score').notNull(),
  total: integer('total').notNull(),
  percentage: real('percentage').notNull(),
  completionDate: text('completion_date').notNull(),
  issueDate: text('issue_date').notNull(),
  signer1Name: text('signer1_name'),
  signer1Role: text('signer1_role'),
  signer2Name: text('signer2_name'),
  signer2Role: text('signer2_role'),
  status: text('status').default('VALID'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const certificateSettings = sqliteTable('certificate_settings', {
  id: integer('id').primaryKey(),
  workloadHours: text('workload_hours'),
  modality: text('modality').default('Treinamento profissional interno'),
  signer1Name: text('signer1_name'),
  signer1Role: text('signer1_role'),
  signer2Name: text('signer2_name'),
  signer2Role: text('signer2_role'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// ============================================
// SIMULADO
// ============================================

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  question: text('question').notNull(),
  difficulty: text('difficulty').default('MEDIUM'),
  explanation: text('explanation'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  moduleId: integer('module_id').references(() => trainingModules.id),
  order: integer('order').default(0),
  version: text('version'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const questionOptions = sqliteTable('question_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  optionText: text('option_text').notNull(),
  order: integer('order').default(0),
  isCorrect: integer('is_correct', { mode: 'boolean' }).default(false),
});

export const quizAttempts = sqliteTable('quiz_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  score: integer('score').notNull(),
  total: integer('total').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  attemptNumber: integer('attempt_number').default(1),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  timeSpent: integer('time_spent'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const quizAnswers = sqliteTable('quiz_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  attemptId: integer('attempt_id').references(() => quizAttempts.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  selectedOptionId: integer('selected_option_id').references(() => questionOptions.id),
  isCorrect: integer('is_correct', { mode: 'boolean' }),
  timeSpent: integer('time_spent'),
  answeredAt: text('answered_at'),
});

// ============================================
// AUDITORIA
// ============================================

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  oldValue: text('old_value'), // JSON string
  newValue: text('new_value'), // JSON string
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: text('timestamp').default('CURRENT_TIMESTAMP'),
  description: text('description'),
});

export const contentVersions = sqliteTable('content_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  version: text('version').notNull(),
  content: text('content'), // JSON string
  changeDescription: text('change_description'),
  authorId: integer('author_id').references(() => users.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

// ============================================
// TABELA LEGADA (compatibilidade)
// ============================================

export const attempts = sqliteTable('attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  candidate: text('candidate').notNull(),
  identifier: text('identifier'),
  score: integer('score').notNull(),
  total: integer('total').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  answers: text('answers').notNull(), // JSON string
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});