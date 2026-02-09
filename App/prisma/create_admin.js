/**
 * SCRIPT: CREAR ADMIN
 *
 * DESCRIPCIÓN:
 * Este script crea un usuario con rol ADMIN en la base de datos.
 * El usuario deberá configurar 2FA y cambiar su contraseña al primer login,
 * siguiendo el mismo flujo que Super Admin.
 *
 * USO:
 * node prisma/create_admin.js <email> <contraseña> <nombre> <apellidoPaterno> <apellidoMaterno>
 *
 * EJEMPLO:
 * node prisma/create_admin.js admin@empresa.com "TempPass123!" "Juan" "Pérez" "García"
 *
 * NOTAS:
 * - La contraseña es temporal; el usuario debe cambiarla al primer login.
 * - El usuario debe configurar 2FA obligatoriamente al primer login.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);

  if (args.length < 5) {
    console.error("❌ Uso incorrecto.");
    console.error("");
    console.error("USO:");
    console.error(
      "  node prisma/create_admin.js <email> <contraseña> <nombre> <apellidoPaterno> <apellidoMaterno>"
    );
    console.error("");
    console.error("EJEMPLO:");
    console.error(
      '  node prisma/create_admin.js admin@empresa.com "TempPass123!" "Juan" "Pérez" "García"'
    );
    process.exit(1);
  }

  const [email, passwordRaw, firstName, paternalSurname, maternalSurname] =
    args;

  // Validar formato de email básico
  if (!email.includes("@")) {
    console.error("❌ El email no tiene un formato válido.");
    process.exit(1);
  }

  // Validar longitud de contraseña
  if (passwordRaw.length < 8) {
    console.error("❌ La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  console.log(`\n📋 Creando Admin con los siguientes datos:`);
  console.log(`   - Email: ${email}`);
  console.log(
    `   - Nombre: ${firstName} ${paternalSurname} ${maternalSurname}`
  );
  console.log(`   - Contraseña: ${"*".repeat(passwordRaw.length)} (temporal)`);
  console.log("");

  // Verificar si el usuario ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error(`❌ Ya existe un usuario con el email: ${email}`);
    console.error(`   ID: ${existingUser.id}`);
    console.error(`   Rol actual: ${existingUser.role}`);
    process.exit(1);
  }

  // Encriptar la contraseña (salt rounds 10 para balance seguridad/velocidad)
  const hashedPassword = await bcrypt.hash(passwordRaw, 10);

  // Crear el usuario ADMIN
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      paternalSurname,
      maternalSurname,
      role: "ADMIN",
      // Configuración de seguridad obligatoria
      totpEnabled: false, // Debe configurar 2FA al primer login
      mustChangePassword: true, // Debe cambiar contraseña al primer login
      // Valores financieros iniciales
      investedCapital: 0,
    },
  });

  console.log(`✅ Admin creado exitosamente:`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(
    `   - Nombre: ${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`
  );
  console.log(`   - Rol: ${user.role}`);
  console.log(`   - 2FA Habilitado: ${user.totpEnabled}`);
  console.log(`   - Debe cambiar contraseña: ${user.mustChangePassword}`);
  console.log("");
  console.log(`⚠️  El usuario debe:`);
  console.log(`   1. Iniciar sesión con la contraseña temporal`);
  console.log(`   2. Configurar autenticación de dos factores (2FA)`);
  console.log(`   3. Cambiar su contraseña por una nueva`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error:", e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
