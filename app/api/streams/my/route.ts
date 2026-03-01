import { NextResponse } from "next/server";
import { prismaClient } from "@/app/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json(
      { message: "roomId required" },
      { status: 400 }
    );
  }

  // Optional: validate room exists
  const room = await prismaClient.room.findUnique({
    where: { id: roomId }
  });

  if (!room) {
    return NextResponse.json(
      { message: "Room not found" },
      { status: 404 }
    );
  }

  const streams = await prismaClient.stream.findMany({
    where: {
      roomId
    },
    include: {
      _count: {
        select: { votes: true }
      }
    },
    orderBy: {
      votes: {
        _count: "desc"
      }
    }
  });

  return NextResponse.json({ streams });
}