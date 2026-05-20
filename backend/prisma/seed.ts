import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: { username: adminUsername, password: hashed, role: "admin" },
    });
    console.log(`Admin user "${adminUsername}" created`);
  } else {
    console.log(`Admin user "${adminUsername}" already exists, skipping`);
  }

  // Seed some default categories and products if empty
  const catCount = await prisma.category.count();
  if (catCount === 0) {
    const drinks = await prisma.category.create({
      data: { name: "Getränke", icon: "🍺", order: 0 },
    });
    const food = await prisma.category.create({
      data: { name: "Essen", icon: "🍔", order: 1 },
    });
    const deposits = await prisma.category.create({
      data: { name: "Pfand", icon: "♻️", order: 2 },
    });

    // Deposit items
    const flaschenpfand = await prisma.product.create({
      data: {
        name: "Flaschenpfand",
        price: 0.25,
        categoryId: deposits.id,
        isDeposit: true,
        order: 0,
      },
    });

    const dosepfand = await prisma.product.create({
      data: {
        name: "Dosenpfand",
        price: 0.25,
        isDeposit: true,
        categoryId: deposits.id,
        order: 1,
      },
    });

    const glaspfand = await prisma.product.create({
      data: {
        name: "Glaspfand",
        price: 0.50,
        isDeposit: true,
        categoryId: deposits.id,
        order: 2,
      },
    });

    const fasspfand = await prisma.product.create({
      data: {
        name: "Fasskrügepfand",
        price: 2.0,
        isDeposit: true,
        categoryId: deposits.id,
        order: 3,
      },
    });

    // Drinks
    await prisma.product.createMany({
      data: [
        { name: "Bier (0.5L)", price: 3.5, categoryId: drinks.id, depositId: flaschenpfand.id, order: 0 },
        { name: "Bier (0.33L)", price: 3.0, categoryId: drinks.id, depositId: dosepfand.id, order: 1 },
        { name: "Weizen (0.5L)", price: 4.0, categoryId: drinks.id, depositId: flaschenpfand.id, order: 2 },
        { name: "Radler (0.5L)", price: 3.5, categoryId: drinks.id, depositId: flaschenpfand.id, order: 3 },
        { name: "Cola", price: 2.5, categoryId: drinks.id, depositId: dosepfand.id, order: 4 },
        { name: "Cola Zero", price: 2.5, categoryId: drinks.id, depositId: dosepfand.id, order: 5 },
        { name: "Fanta", price: 2.5, categoryId: drinks.id, depositId: dosepfand.id, order: 6 },
        { name: "Spezi", price: 2.5, categoryId: drinks.id, depositId: dosepfand.id, order: 7 },
        { name: "Wasser (0.5L)", price: 2.0, categoryId: drinks.id, depositId: flaschenpfand.id, order: 8 },
        { name: "Wasser (1L)", price: 3.0, categoryId: drinks.id, order: 9 },
        { name: "Apfelsaft", price: 2.5, categoryId: drinks.id, depositId: flaschenpfand.id, order: 10 },
        { name: "Orangensaft", price: 2.5, categoryId: drinks.id, depositId: flaschenpfand.id, order: 11 },
        { name: "Kaffee", price: 2.0, categoryId: drinks.id, order: 12 },
        { name: "Espresso", price: 2.0, categoryId: drinks.id, order: 13 },
        { name: "Tee", price: 2.0, categoryId: drinks.id, order: 14 },
        { name: "Wein (Glas)", price: 4.5, categoryId: drinks.id, depositId: glaspfand.id, order: 15 },
        { name: "Sekt (Glas)", price: 5.0, categoryId: drinks.id, depositId: glaspfand.id, order: 16 },
        { name: "Fassbier (1L Krug)", price: 8.0, categoryId: drinks.id, depositId: fasspfand.id, order: 17 },
      ],
    });

    // Food
    await prisma.product.createMany({
      data: [
        { name: "Pretzel", price: 2.0, categoryId: food.id, order: 0 },
        { name: "Breze mit Butter", price: 3.5, categoryId: food.id, order: 1 },
        { name: "Wurstsemmel", price: 3.0, categoryId: food.id, order: 2 },
        { name: "Käsesemmel", price: 3.0, categoryId: food.id, order: 3 },
        { name: "Pommes", price: 3.5, categoryId: food.id, order: 4 },
      ],
    });

    console.log("Seeded categories and products");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
