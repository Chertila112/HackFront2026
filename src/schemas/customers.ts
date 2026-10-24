import { z } from 'zod'

export const intLikeSchema = z.coerce.number()

// В отличие от intLikeSchema не превращает null в 0 — оценка может отсутствовать.
export const nullableIntSchema = z.preprocess(
  (value) => (value === null ? null : Number(value)),
  z.number().nullable(),
)

export const customerStatusSchema = z.enum([
  'insufficient_data', 'evaluated'
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

// Карточка клиента в v1.yaml не описана — валидируем по фактическому ответу
// GET /customers/{id}, сервисы и транзакции повторяют Document из openapi.
export const customerDetailSchema = z.object({
  id: intLikeSchema,
  email: z.string(),
  balances: z.object({
    balance: intLikeSchema,
    withdrawBalance: intLikeSchema,
    bonusBalance: intLikeSchema,
    bonusState: bonusStateSchema,
    totalReplenished: intLikeSchema,
    effectiveBalance: intLikeSchema,
  }),
  riskAssessment: z.object({
    riskScore: nullableIntSchema,
    loyaltyScore: nullableIntSchema,
    revenueAtRisk: intLikeSchema,
    expectedLoss: intLikeSchema,
    riskFactors: z.array(z.record(z.string(), z.unknown())),
  }),
  services: z.array(
    z.object({
      id: intLikeSchema,
      name: z.string(),
      ownerId: intLikeSchema,
      paymentTerm: z.string(),
      autoProlong: z.boolean(),
      createdAt: z.string(),
      expiresAt: z.string(),
      status: z.string(),
      price: intLikeSchema,
    }),
  ),
  recentTransactions: z.array(
    z.object({
      id: intLikeSchema,
      amount: intLikeSchema,
      type: z.string(),
      status: z.string(),
      createdAt: z.string(),
    }),
  ),
})

export type Customer = z.infer<typeof customerSchema>
export type CustomerStatus = z.infer<typeof customerStatusSchema>
export type BonusState = z.infer<typeof bonusStateSchema>
export type CustomerSortField = z.infer<typeof customerSortFieldSchema>
export type SortDirection = z.infer<typeof sortDirectionSchema>
export type CustomersQuery = z.infer<typeof customersQuerySchema>
export type CustomersPage = z.infer<typeof customersPageSchema>
export type CustomerDetail = z.infer<typeof customerDetailSchema>
export type CustomerService = CustomerDetail['services'][number]
export type CustomerTransaction = CustomerDetail['recentTransactions'][number]
