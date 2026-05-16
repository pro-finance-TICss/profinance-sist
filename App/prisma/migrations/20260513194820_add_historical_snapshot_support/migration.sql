-- ============================================================================
-- MIGRACIÓN: add_historical_snapshot_support
-- ============================================================================
-- Cambios en AccountPerformanceSnapshot:
--   1. performanceId: NOT NULL → NULL  (para snapshots sin Performance vinculado)
--   2. FK: onDelete CASCADE → SetNull  (no borrar el snapshot si se borra el Performance)
--   3. Nuevo campo: source TEXT NOT NULL DEFAULT 'SYSTEM'
--   4. Nuevo campo: note TEXT (nullable, comentario del superadmin)
--   5. Nuevo índice: source
-- ============================================================================

-- 1. Eliminar FK existente de performanceId (CASCADE → SetNull requiere recrearla)
ALTER TABLE "AccountPerformanceSnapshot"
  DROP CONSTRAINT "AccountPerformanceSnapshot_performanceId_fkey";

-- 2. Hacer performanceId nullable
ALTER TABLE "AccountPerformanceSnapshot"
  ALTER COLUMN "performanceId" DROP NOT NULL;

-- 3. Re-agregar FK con ON DELETE SET NULL
ALTER TABLE "AccountPerformanceSnapshot"
  ADD CONSTRAINT "AccountPerformanceSnapshot_performanceId_fkey"
  FOREIGN KEY ("performanceId")
  REFERENCES "Performance"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- 4. Agregar campo source con valor por defecto
ALTER TABLE "AccountPerformanceSnapshot"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'SYSTEM';

-- 5. Agregar campo note (nullable)
ALTER TABLE "AccountPerformanceSnapshot"
  ADD COLUMN "note" TEXT;

-- 6. Índice para filtrar por source
CREATE INDEX "AccountPerformanceSnapshot_source_idx"
  ON "AccountPerformanceSnapshot"("source");
