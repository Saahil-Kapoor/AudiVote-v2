"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import YouTube from "react-youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Stream {
  id: string;
  title: string;
  url: string;
  extractedId: string;
  thumbnail: string | null;
  _count: {
    votes: number;
  };
}

interface Current {
  title: string;
  extractedId: string;
  thumbnail: string | null;
}

export default function StreamView({ roomId }: { roomId: string }) {
  const [queue, setQueue] = useState<Stream[]>([]);
  const [current, setCurrent] = useState<Current | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  // 🔹 Fetch everything
  const fetchState = async () => {
    const [streamsRes, currentRes] = await Promise.all([
      axios.get(`/api/streams?roomId=${roomId}`),
      axios.get(`/api/currPlaying?roomId=${roomId}`)
    ]);

    setQueue(streamsRes.data.streams);
    setCurrent(currentRes.data.current);
  };

  useEffect(() => {
    fetchState();
  }, [roomId]);

  // 🔹 Add stream
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await axios.post(`/api/streams?roomId=${roomId}`, {
        url: videoUrl
      });

      setVideoUrl("");
      fetchState();
    } catch {
      toast.error("Failed to add stream");
    }
  };

  // 🔹 Vote
  const handleVote = async (streamId: string, type: "up" | "down") => {
    try {
      if (type === "up") {
        await axios.post("/api/streams/upvote", { streamId });
      } else {
        await axios.post("/api/streams/downvote", { streamId });
      }

      fetchState();
    } catch {
      toast.error("Vote failed");
    }
  };

  // 🔹 When video ends → advance
  const handleEnd = async () => {
    await axios.post(`/api/currPlaying?roomId=${roomId}`);
    fetchState();
  };
  useEffect(() => {
    const fetchState = async () => {
      try {
        const [streamsRes, currentRes] = await Promise.all([
          axios.get(`/api/streams?roomId=${roomId}`),
          axios.get(`/api/currPlaying?roomId=${roomId}`)
        ]);

        setQueue(streamsRes.data.streams);
        setCurrent(currentRes.data.current);
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Initial fetch
    fetchState();

    const interval = setInterval(fetchState, 3000); // 3 seconds

    return () => clearInterval(interval);

  }, [roomId]);

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

      {/* LEFT SIDE */}
      <div className="space-y-6">

        {/* Submit */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Enter YouTube URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <Button type="submit">Add Song</Button>
        </form>

        {/* Queue */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Voting Queue</h2>
          <ul className="space-y-4">
            {queue.map((song) => (
              <li key={song.id} className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                <div>
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-gray-500">
                    Votes: {song._count.votes}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVote(song.id, "up")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVote(song.id, "down")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Currently Playing</h2>

        {current ? (
          <YouTube
            videoId={current.extractedId}
            opts={{
              width: "100%",
              height: "350",
              playerVars: { autoplay: 1 }
            }}
            onEnd={handleEnd}
          />
        ) : (
          <p>No song playing...</p>
        )}
      </div>
    </div>
  );
}