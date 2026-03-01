"use client"

/*
import { useEffect, useState } from "react";
import StreamView from "../components/StreamView";
import axios from "axios";
import { signIn, useSession } from "next-auth/react";

//const REFRESH_INTERVAL_MS = 5 * 100000000;
//const creatorId = "93e85c8f-1eca-47df-a376-84a558f287d3"; 

export default function Home() {
  const [creatorId, setCreatorId] = useState<string>("");
  const { status } = useSession();
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn();
    }
  }, [status]);
  useEffect(() => {
    async function handle() {
      const res = await axios.get('/api/getId');
      setCreatorId(res.data.id);
    }
    handle();
  }, []);
  if (status === 'loading') {
    return <p>Loading…</p>;
  }
  return (
    <>
      {creatorId && creatorId.length > 0 ? (
        <div>
          <StreamView creatorId={creatorId} />
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </>
  )
}

*/

"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const [roomInput, setRoomInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "loading") return null;
  if (status === "unauthenticated") {
    signIn();
    return null;
  }

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      const res = await axios.post("/api/rooms");
      router.push(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!roomInput.trim()) return;
    router.push(`/room/${roomInput}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <button onClick={()=>signOut()} className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg">Sign Out</button>

      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white py-24 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Start or Join a Music Room
        </h1>
        <p className="text-lg md:text-xl text-purple-100 max-w-2xl mx-auto">
          Create your own live voting room or join one instantly.
          Let everyone decide what plays next.
        </p>
      </div>

      {/* ACTION SECTION */}
      <div className="flex-1 flex items-center justify-center px-6 py-3">
        <div className="bg-white shadow-xl border border-gray-100 rounded-2xl p-10 w-full max-w-lg space-y-8">

          {/* Create */}
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Join */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleJoinRoom}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-black transition"
            >
              Join
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}