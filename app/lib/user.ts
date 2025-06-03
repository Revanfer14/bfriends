import { unstable_noStore as NoStore } from "next/cache";
import { prisma } from "./prisma";

export async function getUserData(userId: string) {
  if (!userId) return null;

  NoStore();

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      userName: true,
      imageUrl: true,
    },
  });

  return user;
}
