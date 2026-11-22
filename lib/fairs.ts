import type { Prisma } from "../generated/prisma/client";
import { proposeFairStock } from "./fair-stock";
import { reservingOrders } from "./fulfillment";
import { todayInBerlin } from "./inventory";

export const fairRequests = {
  orderBy: { productId: "asc" },
  include: {
    product: {
      include: {
        batches: { include: { allocations: { where: { line: { order: reservingOrders } } } } },
      },
    },
  },
} satisfies Prisma.Fair$requestsArgs;

type Request = Prisma.FairRequestGetPayload<{ include: typeof fairRequests.include }>;

export function fairProposal(requests: Request[], eventDate: string) {
  const today = todayInBerlin();
  const useDate = eventDate > today ? eventDate : today;
  return requests.map(({ product, quantity }) => ({
    product,
    quantity,
    assignments: proposeFairStock(product.batches, quantity, useDate),
  }));
}
