import type { Prisma } from "../generated/prisma/client";
import { reservingOrders } from "./fulfillment";
import { todayInBerlin } from "./inventory";
import { allocate, availableBatches } from "./orders";

export class OrderError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message);
  }
}

export async function allocateOrderLines(
  tx: Prisma.TransactionClient,
  quantities: Map<number, number>,
  unitPrice: (product: { id: number; standardPriceCent: number }) => number,
  orderId = 0,
) {
  const products = await tx.product.findMany({
    where: { id: { in: [...quantities.keys()] } },
    include: { batches: { include: {
      ingredients: { orderBy: { ingredientId: "asc" } },
      allocations: { where: { line: { orderId: { not: orderId }, order: reservingOrders } } },
    } } },
  });
  if (products.length !== quantities.size) throw new OrderError("Ein Produkt ist nicht mehr verfügbar.", "quantities");

  const today = todayInBerlin();
  return products.map(product => {
    const quantity = quantities.get(product.id)!;
    const assignments = allocate(availableBatches(product.batches), quantity, today);
    if (!assignments) throw new OrderError(`Für „${product.name}“ sind weniger als ${quantity} Stück verfügbar.`, "quantities");
    return {
      productId: product.id, quantity, unitPrice: unitPrice(product),
      allocations: { create: assignments.map(({ batch, quantity }) => ({
        batchId: batch.id, quantity,
        ingredients: batch.ingredients.map(({ name, isAllergen, note }) => ({ name, isAllergen, note })),
      })) },
    };
  });
}
