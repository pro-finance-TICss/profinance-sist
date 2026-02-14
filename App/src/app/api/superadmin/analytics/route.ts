import { NextRequest, NextResponse } from "next/server";
import { getInvestmentAnalytics } from "@/lib/actions/superadmin-analytics";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") as "USER" | "SOCIO" | null;
    const timeRange = (searchParams.get("timeRange") || "1M") as
      | "1D"
      | "1W"
      | "1M"
      | "ALL";

    // Validate role
    if (!role || (role !== "USER" && role !== "SOCIO")) {
      return NextResponse.json(
        { success: false, message: "Invalid role parameter" },
        { status: 400 }
      );
    }

    // Get analytics data (auth check is done inside the action)
    const result = await getInvestmentAnalytics(role, timeRange);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("API Error:", error);
    
    // Handle authorization errors
    if (error.message?.includes("Unauthorized") || error.message?.includes("role")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
