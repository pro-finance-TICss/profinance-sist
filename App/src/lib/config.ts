import { prisma } from "@/lib/prisma";

/**
 * Obtiene el valor de una configuración del sistema.
 * @param key Clave de la configuración
 * @param defaultValue Valor por defecto si no existe
 */
export async function getSystemSetting(
  key: string,
  defaultValue: string = ""
): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });
  return setting?.value ?? defaultValue;
}

/**
 * Obtiene el valor de una configuración como booleano.
 * "true" (case insensitive) y "1" se consideran true.
 */
export async function getSystemSettingBoolean(
  key: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const value = await getSystemSetting(key, defaultValue.toString());
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Actualiza o crea una configuración del sistema.
 */
export async function setSystemSetting(
  key: string,
  value: string,
  description?: string
) {
  return prisma.systemSetting.upsert({
    where: { key },
    update: { value, description },
    create: { key, value, description },
  });
}
