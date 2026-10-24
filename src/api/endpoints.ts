export const AUTH_LOGIN_PATH = '/api/v1/auth/login'
export const AUTH_SESSION_PATH = '/api/v1/auth/refresh'
export const AUTH_LOGOUT_PATH = '/api/v1/auth/logout'
export const AUTH_REGISTER_PATH = '/api/v1/auth/register'
export const CUSTOMERS_PATH = '/api/v1/customers'

export function customerPath(id: number | string): string {
  return `${CUSTOMERS_PATH}/${id}`
}
