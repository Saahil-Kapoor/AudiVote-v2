import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DownvoteSchema = z.object({
  streamId: z.string()
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json(
      { message: "Unauthenticated" },
      { status: 401 }
    );
  }

  const user = await prismaClient.user.findUnique({
    where: {
      email: session.user.email
    }
  });

  if (!user) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 401 }
    );
  }

  try {
    const data = DownvoteSchema.parse(await req.json());

    await prismaClient.vote.delete({
      where: {
        userId_streamId: {
          userId: user.id,
          streamId: data.streamId
        }
      }
    });

    return NextResponse.json(
      { message: "Downvoted successfully" },
      { status: 200 }
    );

  } catch (e: any) {

    // If vote doesn't exist
    if (e.code === "P2025") {
      return NextResponse.json(
        { message: "You haven't voted on this stream" },
        { status: 400 }
      );
    }

    console.error("Error downvoting stream:", e);

    return NextResponse.json(
      { message: "Error while downvoting" },
      { status: 500 }
    );
  }
}