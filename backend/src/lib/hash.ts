/**
 * Helpers de hashing de senha com bcrypt.
 */
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

/** Gera o hash bcrypt de uma senha em texto puro. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

/** Compara uma senha em texto puro com um hash bcrypt. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
