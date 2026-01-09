// ============================================================================
// NEXTAUTH API ROUTE HANDLER
// ============================================================================
// Expone los endpoints de NextAuth en /api/auth/*
// ============================================================================

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
