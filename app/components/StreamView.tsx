"use client"
import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { toast, Toaster } from 'react-hot-toast'
import { signOut} from 'next-auth/react'
import YouTube from 'react-youtube';
import { currPlaying, Prisma } from '@prisma/client'

interface Song {
  id: string
  title: string
  artist: string
  votes: number
  imageUrl: string
}
type StreamWithUpvotes = Prisma.StreamGetPayload<{
  include: {
    upvotes: true;
    _count: {
      select: { upvotes: true };
    };
  };
}>;
function isStreamWithUpvotes(stream: StreamWithUpvotes | currPlaying): stream is StreamWithUpvotes {
  return 'upvotes' in stream;
}


const REFRESH_INTERVAL_MS = 2.5*1000;

export default function StreamView({
  creatorId
}: {
  creatorId: string
}) {
  const prev = useRef<string>('');
  const [videoUrl, setVideoUrl] = useState('')
  const [videoId, setVideoId] = useState('')
  const [queue, setQueue] = useState<Song[]>([])
  const [url, seturl] = useState<string | null>(null);
  const [all_streams, setAllStreams] = useState<StreamWithUpvotes[]>([]);
  const [curr_state, setcurrstate] = useState<StreamWithUpvotes|currPlaying>(null);

  useEffect(() => {
    async function handle() {
      const interval = setInterval(async () => {
        const res = await axios.get(`/api/streams/?creatorId=${creatorId}`);
        const variable = await axios.get(`/api/currPlaying/?creatorId=${creatorId}`);
        if (variable == null || variable.data.streams == null) {
          prev.current = '';
        }
        else {
          prev.current = variable.data.streams.url;
        }
        const all_stream = res.data.streams;
        console.log("All streams:", all_stream);
        const newId = all_stream[0]?.extractedId;
        const currentStream = all_stream[0];
        for (let i = 0; i < all_stream.length; i++) {
          if (all_stream[i].extractedId == prev.current) {
            console.log("Stream already playing, skipping update");
            console.log("Previous stream ID:"+ prev.current);
            console.log("Current stream ID:"+ all_stream[i].extractedId);
            const newQueue = all_stream.length > 0
              ? all_stream.filter((stream) => stream.extractedId !== prev.current).map(stream => ({
                id: stream.id,
                title: stream.title,
                artist: stream.id,
                votes: stream._count.upvotes,
                imageUrl: stream.smallImg || '/placeholder.svg?height=80&width=80'
              }))
              : [];
            setQueue(newQueue);
            if(!url || url.length === 0 || url !== prev.current) {
              const val = prev.current;
              seturl(val);
              setcurrstate(variable.data.streams);
              setAllStreams(all_stream);
            }
            return;
          }
        }
        if(all_stream.length === 0) {
          console.log("No streams available, skipping update");
          return;
        }
        console.log("New stream detected, updating state");
        console.log("variable",variable.data.streams);
        
        prev.current = currentStream.extractedId; 
        await axios.post(`/api/currPlaying/?creatorId=${creatorId}`, {
          url: currentStream.extractedId,
          streamId: currentStream.id
        });
        setcurrstate(currentStream);
        seturl(newId);
        const newQueue = all_stream.length > 0
          ? all_stream.slice(1).map(stream => ({
            id: stream.id,
            title: stream.title,
            artist: stream.id,
            votes: stream._count.upvotes,
            imageUrl: stream.smallImg || '/placeholder.svg?height=80&width=80'
          }))
          : [];
        setQueue(newQueue);
        setAllStreams(all_stream);
      }, REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }
    handle();
  }, []);


  const handleShare = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const shareableLink = `${window.location.host}/creator/${creatorId}`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareableLink).then(() => {
        toast.success("Shareable link copied to clipboard!", {
          position: 'top-right',
          duration: 3000,
        });
      }).catch((err) => {
        console.error("Failed to copy:", err);
      });
    } else {
      console.error("Clipboard API not supported.");
    }
  }

  const playNextVideo = async () => {
    console.log("This is queue", all_streams);
    if (all_streams.length == 0) {
      console.log("No videos in queue");
      return false;
    }
    const currStream = curr_state;
    let streamId = '';
    if(!isStreamWithUpvotes(currStream)) {
      streamId= currStream.streamId;
    }
    else if(isStreamWithUpvotes(currStream)){
      streamId= currStream.id;
    }
    console.log("Deleting stream:", streamId);
    const res = await axios.delete(`/api/streams/delete/?creatorId=${creatorId}`, { data: { id: streamId } })
    const press = await axios.delete(`/api/currPlaying/?creatorId=${creatorId}`)
    if(press.status != 200) {
      console.error("Error deleting current playing stream");
      return;
    }
    if (res.status != 200) {
      console.error("Error deleting the stream");
      return;
    }
    setAllStreams(all_streams => all_streams.filter(stream => stream.id !== streamId));
    let curr = all_streams;
    if (curr.length > 0) {
      curr = curr.filter(stream => stream.id !== streamId);
    }
    console.log("Current queue after deletion:", curr);
    const top = curr[0];

    setQueue(prevQueue => prevQueue.filter(song => song.id !== top.id));
    if (top) {
      seturl(top.extractedId);
      setcurrstate(top);
      console.log("Playing next video:", top.extractedId);
      axios.post(`/api/currPlaying/?creatorId=${creatorId}`, {
        url: top.extractedId,
        streamId: top.id
      });
    } else {
      seturl(null);
      console.log("No more videos in queue");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/streams/?creatorId=${creatorId}`, { url: videoUrl });
      console.log(res.data);
      setQueue(prevQueue => {
        const updated = [
          ...prevQueue,
          {
            id: res.data.id,
            title: res.data.title,
            artist: res.data.title,
            votes: 0,
            imageUrl: res.data.smallImg || '/placeholder.svg?height=80&width=80'
          }
        ];
        return updated.sort((a, b) => b.votes - a.votes);
      });
      setVideoUrl('')
      setVideoId('');
      const result = await axios.get(`/api/streams/?creatorId=${creatorId}`);
      setAllStreams(result.data.streams);
    } catch (error) {
      console.error('Error submitting video URL:', error);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setVideoUrl(url)
    const id = extractVideoId(url)
    setVideoId(id)
  }

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : ''
  }


  const handleVote = async (id: string, increment: number) => {
    if (increment === 1) {
      try {
        await axios.post('/api/streams/upvote', { streamId: id });
        toast.success("Upvote recorded!", {
          position: 'top-right',
          duration: 2000,
        });

        setQueue(prevQueue =>
          prevQueue.map(song =>
            song.id === id ? { ...song, votes: song.votes + 1 } : song
          ).sort((a, b) => b.votes - a.votes)
        );
        setAllStreams(prevAllStreams =>
          prevAllStreams.map(song =>
            song.id === id
              ? {
                ...song,
                _count: {
                  ...song._count,
                  upvotes: song._count.upvotes + 1,
                },
              }
              : song
          ).sort((a, b) => b._count.upvotes - a._count.upvotes)
        );

      } catch (err) {
        console.error("Error upvoting song:", err);
        toast.error("You have already upvoted the song", {
          position: 'top-right',
          duration: 3000,
        });
      }
    } else if (increment === -1) {
      try {
        await axios.post('/api/streams/downvote', { streamId: id });
        toast.success("Downvote recorded!", {
          position: 'top-right',
          duration: 2000,
        });

        setQueue(prevQueue =>
          prevQueue.map(song =>
            song.id === id ? { ...song, votes: song.votes - 1 } : song
          ).sort((a, b) => b.votes - a.votes)
        );
        setAllStreams(prevAllStreams =>
          prevAllStreams.map(song =>
            song.id === id
              ? {
                ...song,
                _count: {
                  ...song._count,
                  upvotes: song._count.upvotes - 1,
                },
              }
              : song
          ).sort((a, b) => b._count.upvotes - a._count.upvotes)
        );

      } catch (err) {
        console.error("Error downvoting song:", err);
        toast.error("You cannot downvote a song that you haven't upvoted", {
          position: 'top-right',
          duration: 3000,
        });
      }
    }
  }




  return (
    <div className="container mx-auto space-y-8">
      <div className='flex justify-between items-center'>
        <h1 className="text-3xl font-bold text-center">AudiVote</h1>
        <div>
          <Button onClick={() => signOut({ callbackUrl: '/' })}>Log out</Button>
          <Button className='m-10 w-xl' onClick={(e) => handleShare(e)}>Share</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* submit song component */}
          <Card>
            <CardHeader>
              <CardTitle>Submit a Song</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter YouTube video URL"
                  value={videoUrl}
                  onChange={handleInputChange}
                />
                <Button type="submit" disabled={!videoId}>Submit</Button>
              </form>
              {videoId && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Preview:</h3>
                  <iframe
                    width="100%"
                    height="200"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Voting Queue Component */}
          <Card >
            <CardHeader>
              <CardTitle>Voting Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {queue.map(song => (
                  <li key={song.id} className="flex items-center space-x-4 bg-gray-50 rounded-lg p-4">
                    <Image
                      src={song.imageUrl}
                      alt={`${song.title} by ${song.artist}`}
                      width={80}
                      height={80}
                      className="rounded-md"
                    />
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{song.title}</h3>
                      <p className="text-sm text-gray-500">{song.artist}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xl">{song.votes}</span>
                      <div className="space-y-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(song.id, 1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(song.id, -1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </div>
        {/* Currently Playing Component */}
        <>

          {!url && (
            <div className="text-center mb-4">
              <p>Please add Some Songs .....</p>

            </div>
          )}
          {url != null && url?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Currently Playing</CardTitle>
              </CardHeader>

              <CardContent>
                {/*}
                <iframe
                  width="100%"
                  height="315"
                  src={`https://www.youtube.com/embed/${url}?autoplay=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                
                */}
                <YouTube
                  videoId={url}
                  opts={{
                    width: '100%',
                    height: '321',
                    playerVars: {
                      autoplay: 1,
                      controls: 1,

                    }
                  }}
                  onEnd={playNextVideo}
                />
              </CardContent>
              <Button className='m-10 w-xl' onClick={() => {
                const val = playNextVideo()
                if (!val) {
                  toast.error("No more videos in queue", {
                    position: 'top-right',
                    duration: 3000,
                  });
                }
              }}>Play next</Button>

            </Card>
          )}


        </>
        <Toaster />
      </div>
    </div>
  )
}

