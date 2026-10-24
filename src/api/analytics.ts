import {
  analyticsSummarySchema,
  type AnalyticsSummary,
} from '../schemas/analytics'
import { ANALYTICS_SUMMARY_PATH } from './endpoints'
import { apiRequest } from './http'

export function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  return apiRequest(ANALYTICS_SUMMARY_PATH, analyticsSummarySchema)
}
