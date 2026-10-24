import { z } from 'zod'
import { customerSchema } from './customers'

export const modelTriggerSchema = z.enum([
  'SNAPSHOT_IMPORTED',
  'SETTINGS_UPDATED',
])

export const modelRecalculatedSchema = z.object({
  trigger: modelTriggerSchema,
  calculatedAt: z.iso.datetime(),
  summary: z.object({
    revenueAtRisk: z.coerce.number(),
    highRiskCount: z.coerce.number(),
  }),
})

export const customerRiskUpdatedSchema = z.object({
  updated: z.array(customerSchema),
})

export type ModelTrigger = z.infer<typeof modelTriggerSchema>
export type ModelRecalculated = z.infer<typeof modelRecalculatedSchema>
export type CustomerRiskUpdated = z.infer<typeof customerRiskUpdatedSchema>
