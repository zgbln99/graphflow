import { z } from 'zod'

// ============================================
// AUTH
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Podaj poprawny adres email'),
  password: z.string().min(1, 'Hasło jest wymagane'),
})

export const registerSchema = z.object({
  email: z.string().email('Podaj poprawny adres email'),
  password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
})

export const resetPasswordRequestSchema = z.object({
  email: z.string().email('Podaj poprawny adres email'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token jest wymagany'),
  password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Hasła nie są identyczne',
  path: ['confirmPassword'],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktualne hasło jest wymagane'),
  newPassword: z.string().min(8, 'Nowe hasło musi mieć minimum 8 znaków'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Hasła nie są identyczne',
  path: ['confirmPassword'],
})

// ============================================
// CLIENT ACCOUNT
// ============================================

export const createClientAccountSchema = z.object({
  name: z.string().min(2, 'Nazwa firmy musi mieć minimum 2 znaki'),
  email: z.string().email('Podaj poprawny adres email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  emailDomains: z.string().optional(), // np. "firma.pl,firma.com"
})

export const updateClientAccountSchema = createClientAccountSchema.partial()

// ============================================
// USER
// ============================================

export const createUserSchema = z.object({
  email: z.string().email('Podaj poprawny adres email'),
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków').optional(),
  clientAccountId: z.string().optional(),
  role: z.enum(['ADMIN', 'CLIENT_USER']).default('CLIENT_USER'),
})

export const updateUserSchema = z.object({
  email: z.string().email('Podaj poprawny adres email').optional(),
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki').optional(),
  isActive: z.boolean().optional(),
})

// ============================================
// PROJECT
// ============================================

export const createProjectSchema = z.object({
  title: z.string().min(3, 'Tytuł musi mieć minimum 3 znaki'),
  description: z.string().optional(),
  clientAccountId: z.string().min(1, 'Wybierz klienta'),
  statusId: z.string().optional(),
  deadline: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  localPath: z.string().optional(),
  dropboxPath: z.string().optional(),
  dropboxLink: z.string().url('Podaj poprawny URL').optional().or(z.literal('')),
  tagIds: z.array(z.string()).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

// ============================================
// PROJECT STATUS
// ============================================

export const createProjectStatusSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Podaj poprawny kolor HEX'),
  order: z.number().int().optional(),
  isDefault: z.boolean().optional(),
})

export const updateProjectStatusSchema = createProjectStatusSchema.partial()

// ============================================
// TICKET
// ============================================

export const createTicketSchema = z.object({
  title: z.string().min(3, 'Tytuł musi mieć minimum 3 znaki'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  deadline: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  projectId: z.string().optional(),
  clientAccountId: z.string().optional(), // Tylko dla admina
})

export const updateTicketSchema = z.object({
  title: z.string().min(3, 'Tytuł musi mieć minimum 3 znaki').optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'WAITING_FOR_ADMIN', 'RESOLVED', 'CLOSED']).optional(),
  deadline: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  projectId: z.string().nullable().optional(),
})

// ============================================
// TIMELINE
// ============================================

export const createTimelineStageSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki'),
  plannedDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  description: z.string().optional(),
})

export const updateTimelineStageSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki').optional(),
  plannedDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
  actualDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
  isCurrent: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
})

// ============================================
// COMMENT
// ============================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Treść komentarza jest wymagana'),
  visibility: z.enum(['PUBLIC', 'INTERNAL']).default('PUBLIC'),
  ticketId: z.string().optional(),
  projectId: z.string().optional(),
}).refine(
  (data) => data.ticketId || data.projectId,
  { message: 'Komentarz musi być powiązany z ticketem lub projektem' }
)

// ============================================
// NOTE (prywatna notatka admina)
// ============================================

export const createNoteSchema = z.object({
  content: z.string().min(1, 'Treść notatki jest wymagana'),
  ticketId: z.string().optional(),
  projectId: z.string().optional(),
}).refine(
  (data) => data.ticketId || data.projectId,
  { message: 'Notatka musi być powiązana z ticketem lub projektem' }
)

// ============================================
// FILE LOCATION
// ============================================

export const createFileLocationSchema = z.object({
  projectId: z.string().min(1, 'Wybierz projekt'),
  type: z.enum(['LOCAL', 'DROPBOX', 'GOOGLE_DRIVE', 'OTHER']).default('LOCAL'),
  path: z.string().min(1, 'Ścieżka jest wymagana'),
  label: z.string().optional(),
})

// ============================================
// TIMELINE TEMPLATE
// ============================================

export const createTimelineTemplateSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki'),
  isDefault: z.boolean().optional(),
  stages: z.array(z.object({
    name: z.string().min(2, 'Nazwa etapu musi mieć minimum 2 znaki'),
    order: z.number().int(),
  })),
})

// ============================================
// PROJECT TAG
// ============================================

export const createProjectTagSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć minimum 2 znaki'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Podaj poprawny kolor HEX').default('#6366f1'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateClientAccountInput = z.infer<typeof createClientAccountSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type CreateFileLocationInput = z.infer<typeof createFileLocationSchema>
