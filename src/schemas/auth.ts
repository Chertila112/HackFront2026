import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
})

export const authSessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
  user: userSchema,
})

export const loginCredentialsSchema = z.object({
  username: z.string('Введите username').trim().min(1, 'Введите username'),
  password: z.string('Введите пароль').min(1, 'Введите пароль'),
})

export type User = z.infer<typeof userSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
export type LoginCredentials = z.infer<typeof loginCredentialsSchema>
