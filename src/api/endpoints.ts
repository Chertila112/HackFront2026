export const AUTH_LOGIN_PATH = '/api/v1/auth/login'
export const AUTH_ME_PATH = '/api/v1/auth/me'
export const AUTH_SESSION_PATH = '/api/v1/auth/refresh'
export const AUTH_LOGOUT_PATH = '/api/v1/auth/logout'
export const CUSTOMERS_PATH = '/api/v1/customers'
export const MODEL_SETTINGS_PATH = '/api/v1/model/settings'
export const ANALYTICS_SUMMARY_PATH = '/api/v1/analytics/summary'

export function customerPath(id: number | string): string {
  return `${CUSTOMERS_PATH}/${id}`
}
