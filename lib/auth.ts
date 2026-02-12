import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
  }
  return secret || 'your-secret-key-change-in-production'
})()
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: string
  role: UserRole
  email?: string | null
  promoterId?: number | null
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: String(JWT_EXPIRES_IN),
  } as jwt.SignOptions)
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export interface FaceVerifyPayload {
  userId: string
  purpose: 'face_verify'
}

const FACE_VERIFY_EXPIRES = '2m'

export function generateFaceVerifyToken(userId: string): string {
  return jwt.sign(
    { userId, purpose: 'face_verify' } as FaceVerifyPayload,
    JWT_SECRET,
    { expiresIn: FACE_VERIFY_EXPIRES } as jwt.SignOptions
  )
}

export function verifyFaceVerifyToken(token: string): FaceVerifyPayload {
  const payload = jwt.verify(token, JWT_SECRET) as FaceVerifyPayload
  if (payload.purpose !== 'face_verify') throw new Error('Invalid token purpose')
  return payload
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateRandomToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36)
}
