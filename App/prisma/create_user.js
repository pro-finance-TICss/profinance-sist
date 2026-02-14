/**
 * SCRIPT: CREAR USUARIO (CREATE USER)
 *
 * DESCRIPCIÓN:
 * Crea un nuevo usuario con rol USER, nombre completo, país y moneda base.
 *
 * USO:
 * node prisma/create_user.js
 * (El script solicitará los datos de manera interactiva)
 */

const { PrismaClient } = require("@prisma/client");
const readline = require("readline");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Mapa simple de país a moneda para sugerencias
const COUNTRY_CURRENCY_MAP = {
  'CO': 'COP',
  'MX': 'MXN',
  'US': 'USD',
  'ES': 'EUR',
};

async function main() {
  console.log("=== CREACIÓN DE USUARIO NUEVO ===");
  console.log("Por favor ingrese los datos solicitados.\n");

  try {
    const firstName = await question("Nombre(s): ");
    const paternalSurname = await question("Apellido Paterno: ");
    const maternalSurname = await question("Apellido Materno: ");
    const email = await question("Correo Electrónico: ");
    const password = await question("Contraseña: ");
    const country = (await question("País (código ISO 2 letras, ej: CO): ")).toUpperCase();
    
    let defaultCurrency = COUNTRY_CURRENCY_MAP[country] || 'COP';
    const baseCurrencyInput = await question(`Moneda Base [${defaultCurrency}]: `);
    const baseCurrency = (baseCurrencyInput || defaultCurrency).toUpperCase();

    if (!firstName || !paternalSurname || !email || !password) {
      console.error("\n❌ Error: Faltan campos obligatorios.");
      process.exit(1);
    }

    console.log(`\nCreando usuario ${email} con moneda base ${baseCurrency}...`);

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        paternalSurname,
        maternalSurname,
        email,
        password: hashedPassword,
        role: "USER",
        country: country || null,
        baseCurrency: baseCurrency,
        totpEnabled: false,
        mustChangePassword: true,
      },
    });

    // Crear cuenta por defecto para el nuevo usuario
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Mi Cuenta",
        role: "USER",
        investedCapital: 0,
      },
    });

    console.log("\n✅ Usuario creado exitosamente:");
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Nombre: ${user.firstName} ${user.paternalSurname}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Rol: ${user.role}`);
    console.log(`   - País: ${user.country || 'N/A'}`);
    console.log(`   - Moneda Base: ${user.baseCurrency}`);
    console.log(`   - Cuenta: "${account.name}" (${account.id})`);

  } catch (error) {
    if (error.code === 'P2002') {
      console.error("\n❌ Error: El correo electrónico ya está registrado.");
    } else {
      console.error("\n❌ Error al crear usuario:", error);
    }
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
