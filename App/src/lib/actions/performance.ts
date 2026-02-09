"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { revalidatePath } from "next/cache";

export interface CreatePerformanceInput {
  currency1: string;
  currency2: string;
  type: string; // "COMPRA" | "VENTA"
  percentage: number;
  targetRole: "USER" | "SOCIO";
  date?: Date;
}

/**
 * Fetches performance records relevant to the current user's dashboard.
 * Users see USER records, Socios see SOCIO records.
 */
export async function getDashboardPerformances() {
  const session = await auth();
  if (!session?.user) return [];

  const role = session.user.role;
  let targetRole = "USER";

  if (role === UserRole.SOCIO) {
    targetRole = "SOCIO";
  }
  // User sees USER
  // Socio sees SOCIO
  // SuperAdmin/Admin viewing this might just see USER by default or empty.
  // We'll assume this is for the User/Socio dashboard.

  const perfs = await prisma.performance.findMany({
    where: { targetRole },
    orderBy: { date: "desc" },
    take: 50,
  });

  // Convert Decimals to numbers for client safety if needed, 
  // though Next.js Server Components serialize JSON well usually. 
  // But Prisma Decimal is an object. usage `toNumber()` is needed.
  return perfs.map(p => ({
    ...p,
    percentage: p.percentage.toNumber(),
  }));
}

/**
 * Fetches all performance records for a specific target role (Superadmin usage)
 */
export async function getPerformancesByTarget(targetRole: "USER" | "SOCIO") {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Unauthorized");
  }

  const perfs = await prisma.performance.findMany({
    where: { targetRole },
    orderBy: { date: "desc" },
  });

  return perfs.map(p => ({
    ...p,
    percentage: p.percentage.toNumber(),
  }));
}

export async function createPerformance(data: CreatePerformanceInput) {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Unauthorized");
  }

  await prisma.performance.create({
    data: {
      currency1: data.currency1,
      currency2: data.currency2,
      type: data.type,
      percentage: data.percentage,
      targetRole: data.targetRole,
      date: data.date || new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/superadmin");
}

export async function deletePerformance(id: string) {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Unauthorized");
  }

  await prisma.performance.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/superadmin");
}
