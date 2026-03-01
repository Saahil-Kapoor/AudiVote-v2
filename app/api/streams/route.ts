import { prismaClient } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import youtubesearchapi from "youtube-search-api";

const urlRegex =
  /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;

export async function POST(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { message: "Missing roomId" },
        { status: 400 }
      );
    }

    // 🔹 Validate room exists
    const room = await prismaClient.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json(
        { message: "Room not found" },
        { status: 404 }
      );
    }

    const data = await req.json();

    const isYt = data.url.match(urlRegex);
    if (!isYt) {
      return NextResponse.json(
        { message: "Invalid YouTube link" },
        { status: 400 }
      );
    }

    if (data.url.includes("youtu.be/")) {
      const id = data.url.split("youtu.be/")[1].split(/[?&]/)[0];
      data.url = `https://www.youtube.com/watch?v=${id}`;
    }

    const match = data.url.match(/[?&]v=([^&]+)/);
    const extractedId = match ? match[1] : null;

    const dt = await youtubesearchapi.GetVideoDetails(extractedId);

    const title = dt.title;

    let thumbnail = "";
    if (!dt.thumbnail || dt.thumbnail.thumbnails.length < 2) {
      thumbnail =
        "https://media.istockphoto.com/id/1175435360/vector/music-note-icon-vector-illustration.jpg";
    } else {
      const length = dt.thumbnail.thumbnails.length;
      thumbnail = dt.thumbnail.thumbnails[length - 2].url;
    }

    const stream = await prismaClient.stream.create({
      data: {
        roomId,
        url: data.url,
        title,
        extractedId,
        thumbnail
      }
    });

    return NextResponse.json(
      {
        message: "Stream added",
        id: stream.id,
        title,
        thumbnail
      },
      { status: 201 }
    );

  } catch (e) {
    console.error("Error adding stream:", e);
    return NextResponse.json(
      { message: "Error adding stream" },
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