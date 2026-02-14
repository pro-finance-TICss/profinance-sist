
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Schema validation for request body
const updateBaseCurrencySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  baseCurrency: z.string().length(3, "Currency code must be 3 characters").toUpperCase(),
});

export async function POST(req: Request) {
  try {
    // 1. Authentication & Authorization
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN can change base currency
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Only Super Admins can perform this action" },
        { status: 403 }
      );
    }

    // 2. Validate Request Body
    const body = await req.json();
    const validationResult = updateBaseCurrencySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: "Invalid data", errors: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { userId, baseCurrency } = validationResult.data;

    // 3. User Existence Check
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 4. Update User & Create Audit Log
    const result = await prisma.$transaction(async (tx) => {
      // Update User
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { baseCurrency },
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          action: "UPDATE_BASE_CURRENCY",
          entityId: userId,
          entityType: "User",
          userId: session.user.id,
          details: JSON.stringify({
            previousCurrency: targetUser.baseCurrency,
            newCurrency: baseCurrency,
            reason: "Admin update"
          }),
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      message: `Base currency updated to ${baseCurrency} for user ${targetUser.email}`,
      user: {
        id: result.id,
        email: result.email,
        baseCurrency: result.baseCurrency,
      }
    });

  } catch (error) {
    logger.error("Error updating base currency:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
