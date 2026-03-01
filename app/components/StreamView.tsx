"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import YouTube from "react-youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { ChevronUp, ChevronDown, Music, Share2, Play, ListMusic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface Stream {
  id: string;
  title: string;
  url: string;
  extractedId: string;
  thumbnail: string | null;
  _count: { votes: number };
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
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const [streamsRes, currentRes] = await Promise.all([
        axios.get(`/api/streams?roomId=${roomId}`),
        axios.get(`/api/currPlaying?roomId=${roomId}`)
      ]);
      const sortedQueue = streamsRes.data.streams.sort(
        (a: Stream, b: Stream) => b._count.votes - a._count.votes
      );
      setQueue(sortedQueue);
      setCurrent(currentRes.data.current);
    } catch (err) {
      console.error("Polling error:", err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;

    const loadingToast = toast.loading("Adding to queue...");
    try {
      await axios.post(`/api/streams?roomId=${roomId}`, { url: videoUrl });
      setVideoUrl("");
      fetchState();
      toast.success("Song added!", { id: loadingToast });
    } catch {
      toast.error("Invalid YouTube URL", { id: loadingToast });
    }
  };

  const handleVote = async (streamId: string, type: "up" | "down") => {
    try {
      await axios.post(`/api/streams/${type === "up" ? "upvote" : "downvote"}`, { streamId });
      fetchState();
    } catch {
      toast.error("Vote failed");
    }
  };

  const handleEnd = async () => {
    await axios.post(`/api/currPlaying?roomId=${roomId}`);
    fetchState();
  };

  const handleShare = ()=>{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(roomId);
      toast.success("Room URL copied to clipboard!");
    } else {
      toast.error("Clipboard not supported");
    }
  }
  return (
    <div className="min-h-screen bg-[#FDFCFE] text-slate-900 font-sans selection:bg-purple-100">
      {/* HEADER SECTION */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-2 rounded-xl">
              <Music className="text-white h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-purple-950">AudiVote</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2 border-purple-100 hover:bg-purple-50"
          onClick={handleShare}>
            <Share2 className="h-4 w-4 text-purple-600" />
            Share Room Id
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PLAYER & SUBMIT */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* NOW PLAYING CARD */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-purple-900">
              <Play className="h-5 w-5 fill-current" />
              <h2 className="text-lg font-bold uppercase tracking-wider text-sm">Now Playing</h2>
            </div>
            
            <Card className="overflow-hidden border-none shadow-2xl shadow-purple-200/50 bg-slate-950 rounded-3xl">
              {current ? (
                <div className="aspect-video w-full">
                  <YouTube
                    videoId={current.extractedId}
                    opts={{
                      width: "100%",
                      height: "100%",
                      playerVars: { autoplay: 1, modestbranding: 1, rel: 0 }
                    }}
                    onEnd={handleEnd}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center text-slate-400 bg-slate-900">
                  <div className="animate-pulse bg-slate-800 p-4 rounded-full mb-4">
                    <Music className="h-8 w-8" />
                  </div>
                  <p className="font-medium">The queue is empty</p>
                  <p className="text-sm">Add a YouTube link to start the party</p>
                </div>
              )}
              {current && (
                <div className="p-6 bg-white border-t">
                  <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{current.title}</h3>
                </div>
              )}
            </Card>
          </section>

          {/* INPUT SECTION */}
          <Card className="border-purple-100 shadow-sm bg-purple-50/50">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  placeholder="Paste YouTube Link here..."
                  className="bg-white border-purple-200 focus-visible:ring-purple-500 rounded-xl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 shadow-lg shadow-purple-200">
                  Add to Queue
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: QUEUE */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-900">
              <ListMusic className="h-5 w-5" />
              <h2 className="text-lg font-bold uppercase tracking-wider text-sm">Upcoming</h2>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">
              {queue.length} Songs
            </Badge>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
            {queue.length === 0 && !loading && (
              <div className="text-center py-20 border-2 border-dashed border-purple-100 rounded-3xl">
                <p className="text-slate-400">No songs in queue yet</p>
              </div>
            )}

            {queue.map((song, index) => (
              <Card 
                key={song.id} 
                className="group border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white hover:translate-x-1"
              >
                <div className="flex items-center p-3 gap-4">
                  <div className="relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden shadow-inner bg-slate-100">
                    {song.thumbnail ? (
                      <Image src={song.thumbnail} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-100">
                        <Music className="h-6 w-6 text-purple-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate pr-2">{song.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                         #{index + 1}
                       </span>
                       <span className="text-xs text-slate-400 flex items-center gap-1">
                         {song._count.votes} votes
                       </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-green-100 hover:text-green-600 rounded-lg"
                      onClick={() => handleVote(song.id, "up")}
                    >
                      <ChevronUp className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-red-100 hover:text-red-600 rounded-lg"
                      onClick={() => handleVote(song.id, "down")}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}