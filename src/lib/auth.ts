import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function createUser(username: string, email: string, password: string): Promise<User | null> {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return null;
    }

    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      }
    });

    // Retourner l'utilisateur sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return null;
  }
}

export async function loginUser(usernameOrEmail: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: usernameOrEmail },
          { username: usernameOrEmail }
        ]
      }
    });

    if (!user) return null;

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return null;

    // Retourner l'utilisateur sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) return null;

    // Retourner l'utilisateur sans le mot de passe
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        gamesPlayed: true,
        gamesWon: true,
        gamesLost: true,
        gamesDraw: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    return users as User[];
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return [];
  }
}

export async function updateUserStats(userId: string, result: 'win' | 'loss' | 'draw', newRating: number): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gamesPlayed: { increment: 1 },
        ...(result === 'win' && { gamesWon: { increment: 1 } }),
        ...(result === 'loss' && { gamesLost: { increment: 1 } }),
        ...(result === 'draw' && { gamesDraw: { increment: 1 } }),
        rating: newRating,
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des stats:', error);
  }
}
