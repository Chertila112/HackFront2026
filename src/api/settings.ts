import { z } from 'zod'
import { modelSettingsSchema } from '../schemas/settings'
import type {
  ModelSettings,
  PatchModelSettings,
} from '../types/settings'
import { MODEL_SETTINGS_PATH } from './endpoints'
import { apiRequest } from './http'

export function fetchModelSettings(): Promise<ModelSettings> {
  return apiRequest(MODEL_SETTINGS_PATH, modelSettingsSchema)
}

export async function patchModelSettings(
  payload: PatchModelSettings,
): Promise<void> {
  await apiRequest(MODEL_SETTINGS_PATH, z.unknown(), {
    method: 'PATCH',
    body: payload,
  })
}
