"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Footer } from "../../components/layout/Footer";
import { useSessionValidator } from "@/hooks/useSessionValidator";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { useAccount } from "@/contexts/AccountContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { Z_INDEX } from "@/constants/zIndex";

// 👇 todo tu código exactamente igual desde aquí
