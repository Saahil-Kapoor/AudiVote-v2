import { prismaClient } from "@/app/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { message: "Unauthenticated" },
      { status: 401 }
    );
  }

  const user = await prismaClient.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 }
    );
  }

  // Create or return existing room
  const room = await prismaClient.room.upsert({
    where: { creatorId: user.id },
    update: {},
    create: { creatorId: user.id }
  });

  return NextResponse.json({ roomId: room.id });
}