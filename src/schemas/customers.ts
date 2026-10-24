import { z } from 'zod'

export const intLikeSchema = z.coerce.number()

export const customerStatusSchema = z.enum([
  'active',
  'suspended',
  'prolong_wait',
  'deleted',
  'blocked',
  'insufficient_data',
])

export const bonusStateSchema = z.enum(['locked', 'unlocked'])

export const customerSchema = z.object({
  id: intLikeSchema,
  email: z.string(),
  balance: intLikeSchema,
  withdrawBalance: intLikeSchema,
  bonusBalance: intLikeSchema,
  bonusState: bonusStateSchema,
  totalReplenished: intLikeSchema,
  riskScore: z.number().nullable(),
  status: customerStatusSchema,
  revenueAtRisk: intLikeSchema,
  primaryReasons: z.array(z.string()),
})

export const customerSortFieldSchema = z.enum([
  'id',
  'email',
  'balance',
  'totalReplenished',
  'riskScore',
])

export const sortDirectionSchema = z.enum(['asc', 'desc'])

export const customersQuerySchema = z.object({
  cursorOn: customerSortFieldSchema.optional(),
  cursorNext: z.string().optional(),
  takeAmount: z.coerce.number().int().positive().max(100).default(20),
  sortDirection: sortDirectionSchema.optional(),
  riskScoreMin: z.coerce.number().optional(),
  riskScoreMax: z.coerce.number().optional(),
  search: z.string().optional(),
})

export const customersPageSchema = z.object({
  items: z.array(customerSchema),
  nextCursor: z.string().nullable(),
})

export type Customer = z.infer<typeof customerSchema>
export type CustomerStatus = z.infer<typeof customerStatusSchema>
export type BonusState = z.infer<typeof bonusStateSchema>
export type CustomerSortField = z.infer<typeof customerSortFieldSchema>
export type SortDirection = z.infer<typeof sortDirectionSchema>
export type CustomersQuery = z.infer<typeof customersQuerySchema>
export type CustomersPage = z.infer<typeof customersPageSchema>
