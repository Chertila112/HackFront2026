import {
  customerDetailSchema,
  customersPageSchema,
  customersQuerySchema,
  type Customer,
  type CustomerDetail,
  type CustomersPage,
  type CustomersQuery,
} from '../schemas/customers'
import { CUSTOMERS_PATH, customerPath } from './endpoints'
import { apiRequest } from './http'

function buildCustomersSearch(query: Partial<CustomersQuery>): string {
  const parsed = customersQuerySchema.parse(query)
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }

  return params.toString()
}

export function fetchCustomers(
  query: Partial<CustomersQuery> = {},
): Promise<CustomersPage> {
  const search = buildCustomersSearch(query)

  return apiRequest(
    search ? `${CUSTOMERS_PATH}?${search}` : CUSTOMERS_PATH,
    customersPageSchema,
  )
}

export function fetchCustomerDetail(
  id: Customer['id'],
): Promise<CustomerDetail> {
  return apiRequest(customerPath(id), customerDetailSchema)
}
