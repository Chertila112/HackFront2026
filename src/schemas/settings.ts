import { z } from 'zod'

export const modelWeightsSchema = z.object({
  prolongWaitWithoutFundsWeight: z.coerce.number().min(0),
  autoprolongDisabledExpiringWeight: z.coerce.number().min(0),
  autoprolongEnabledDeficitWeight: z.coerce.number().min(0),
  suspendedServiceWeight: z.coerce.number().min(0),
  recentFailedProlongationWeight: z.coerce.number().min(0),
})

export const modelThresholdsSchema = z.object({
  highRiskThreshold: z.coerce.number(),
  mediumRiskThreshold: z.coerce.number(),
  imminentExpiryDays: z.coerce.number().int().min(0),
})

export const modelSettingsSchema = z.object({
  weights: modelWeightsSchema,
  thresholds: modelThresholdsSchema,
  updatedAt: z.iso.datetime(),
  updatedBy: z.string(),
})

export const patchModelSettingsSchema = z.object({
  weights: modelWeightsSchema.nullable(),
  thresholds: modelThresholdsSchema.nullable(),
})

export type ModelWeights = z.infer<typeof modelWeightsSchema>
export type ModelThresholds = z.infer<typeof modelThresholdsSchema>
export type ModelSettings = z.infer<typeof modelSettingsSchema>
export type PatchModelSettings = z.infer<typeof patchModelSettingsSchema>
