import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpvoteSchema = z.object({
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
    const data = UpvoteSchema.parse(await req.json());

    await prismaClient.vote.create({
      data: {
        userId: user.id,
        streamId: data.streamId
      }
    });

    return NextResponse.json(
      { message: "Upvoted successfully" },
      { status: 201 }
    );

  } catch (e: any) {

    // Unique constraint error = already voted
    if (e.code === "P2002") {
      return NextResponse.json(
        { message: "Already voted" },
        { status: 400 }
      );
    }

    console.error("Error upvoting stream:", e);

    return NextResponse.json(
      { message: "Error while upvoting" },
      { status: 500 }
    );
  }
}