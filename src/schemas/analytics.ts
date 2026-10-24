import { z } from 'zod'
import { intLikeSchema } from './customers'

export const riskLevelStatSchema = z.object({
  count: intLikeSchema,
  percentage: z.coerce.number(),
})

export const analyticsSummarySchema = z.object({
  totalCustomers: intLikeSchema,
  riskDistribution: z.object({
    high: riskLevelStatSchema,
    medium: riskLevelStatSchema,
    low: riskLevelStatSchema,
    insufficientData: riskLevelStatSchema,
  }),
  financials: z.object({
    currency: z.string(),
    totalMonthlyRecurringRevenue: intLikeSchema,
    revenueAtRisk: intLikeSchema,
    expectedLoss: intLikeSchema,
    immediateBalanceDeficit: intLikeSchema,
  }),
  reasonsBreakdown: z.array(
    z.object({
      reason: z.string(),
      label: z.string(),
      affectedCustomersCount: intLikeSchema,
    }),
  ),
  churnDynamics: z.array(
    z.object({
      period: z.string(),
      factDeleted: intLikeSchema,
      forecastRisk: intLikeSchema,
    }),
  ),
  lastCalculatedAt: z.string(),
})

export type RiskLevelStat = z.infer<typeof riskLevelStatSchema>
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>
export type ReasonItem = AnalyticsSummary['reasonsBreakdown'][number]
export type ChurnItem = AnalyticsSummary['churnDynamics'][number]
