// app/room/[roomId]/page.tsx

import { prismaClient } from "@/app/lib/db";
import StreamView from "@/app/components/StreamView";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params;
  const room = await prismaClient.room.findUnique({
    where: { id: roomId }
  });

  if (!room) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <StreamView roomId={roomId} />
    </div>
  );
}