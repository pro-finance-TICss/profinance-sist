const fs = require("fs");
const content = `DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="secret-dev-123"
NEXTAUTH_URL="http://localhost:3000"`;
fs.writeFileSync(".env", content, { encoding: "utf8" });
console.log(".env file created successfully");
