import { prismaClient } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json(
      { message: "Missing roomId" },
      { status: 400 }
    );
  }

  try {
    const result = await prismaClient.$transaction(async (tx) => {

      // 1️⃣ Remove existing current song
      await tx.currentPlaying.deleteMany({
        where: { roomId }
      });

      // 2️⃣ Get highest voted stream
      const next = await tx.stream.findFirst({
        where: { roomId },
        orderBy: {
          votes: {
            _count: "desc"
          }
        }
      });

      if (!next) {
        return null;
      }

      // 3️⃣ Move it to CurrentPlaying
      const current = await tx.currentPlaying.create({
        data: {
          roomId,
          title: next.title,
          url: next.url,
          extractedId: next.extractedId,
          thumbnail: next.thumbnail,
        }
      });

      // 4️⃣ Delete it from queue
      await tx.stream.delete({
        where: { id: next.id }
      });

      return current;
    });

    return NextResponse.json({ current: result });

  } catch (e) {
    console.error("Error advancing song:", e);
    return NextResponse.json(
      { message: "Error advancing song" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json(
      { message: "Missing roomId" },
      { status: 400 }
    );
  }

  // 1️⃣ Check if something already playing
  let current = await prismaClient.currentPlaying.findUnique({
    where: { roomId }
  });

  // 2️⃣ If nothing playing → auto start next
  if (!current) {
    current = await prismaClient.$transaction(async (tx) => {

      const next = await tx.stream.findFirst({
        where: { roomId },
        orderBy: {
          votes: { _count: "desc" }
        }
      });

      if (!next) return null;

      const created = await tx.currentPlaying.create({
        data: {
          roomId,
          title: next.title,
          url: next.url,
          extractedId: next.extractedId,
          thumbnail: next.thumbnail,
        }
      });

      await tx.stream.delete({
        where: { id: next.id }
      });

      return created;
    });
  }

  return NextResponse.json({ current });
}
/*

export async function DELETE(req: NextRequest) {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    if (!creatorId) {
        return NextResponse.json({
            message: "Missing creatorId"
        }, {
            status: 400
        })
    }
    const streams = await prismaClient.currPlaying.deleteMany({
        where: {
            creatorId: creatorId ?? ""
        }
    })
    //console.log(streams);
    return NextResponse.json({
        streams: streams
    })
}

*/