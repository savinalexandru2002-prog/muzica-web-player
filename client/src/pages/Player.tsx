import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Trash2 } from "lucide-react";

export default function Player() {
  const { user } = useAuth();
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: tracks = [], refetch: refetchTracks } = trpc.music.listTracks.useQuery();
  const { data: spotifyTrack } = trpc.spotify.getCurrentTrack.useQuery(undefined, {
    refetchInterval: 3000,
  });
  const uploadMutation = trpc.music.uploadTrack.useMutation();
  const deleteMutation = trpc.music.deleteTrack.useMutation();

  const currentTrack = tracks.find(t => t.id === currentTrackId);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
      if (currentIndex < tracks.length - 1) {
        setCurrentTrackId(tracks[currentIndex + 1].id);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrackId, tracks]);

  const handlePlayPause = () => {
    if (!currentTrack) {
      if (tracks.length > 0) {
        setCurrentTrackId(tracks[0].id);
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevious = () => {
    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex > 0) {
      setCurrentTrackId(tracks[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex < tracks.length - 1) {
      setCurrentTrackId(tracks[currentIndex + 1].id);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleTrackSelect = (trackId: number) => {
    setCurrentTrackId(trackId);
    setIsPlaying(true);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const artist = formData.get("artist") as string;

    if (!file || !title || !artist) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await uploadMutation.mutateAsync({
        title,
        artist,
        duration: 0,
        fileData: Buffer.from(buffer),
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      toast.success("Track uploaded successfully");
      setShowUploadModal(false);
      refetchTracks();
      e.currentTarget.reset();
    } catch (error) {
      toast.error("Failed to upload track");
    }
  };

  const handleDelete = async (trackId: number) => {
    try {
      await deleteMutation.mutateAsync({ id: trackId });
      toast.success("Track deleted");
      if (currentTrackId === trackId) {
        setCurrentTrackId(null);
        setIsPlaying(false);
      }
      refetchTracks();
    } catch (error) {
      toast.error("Failed to delete track");
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <audio
        ref={audioRef}
        src={currentTrack?.fileUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Spotify Now Playing Banner */}
      {spotifyTrack?.track && (
        <div className="bg-gradient-to-r from-secondary to-accent p-4 text-center border-b border-primary/20">
          <div className="neon-heading text-lg">
            🎧 {spotifyTrack.track.artist} - {spotifyTrack.track.name}
          </div>
          <p className="text-secondary-neon mt-1">{spotifyTrack.track.album}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Player Section */}
          <div className="lg:col-span-2">
            <div className="card-neon relative">
              <div className="accent-line-left"></div>
              <div className="accent-line-right"></div>

              <div className="text-center mb-8">
                <h1 className="neon-heading text-4xl mb-2">MUZICA</h1>
                <p className="text-secondary-neon">Cinematic Audio Experience</p>
              </div>

              {/* Now Playing Display */}
              {currentTrack ? (
                <div className="bg-card rounded p-6 mb-8 border border-primary/20">
                  <p className="text-secondary-neon text-sm mb-2">NOW PLAYING</p>
                  <h2 className="neon-heading text-2xl mb-1">{currentTrack.title}</h2>
                  <p className="text-foreground/80 mb-4">{currentTrack.artist}</p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-primary/20 rounded cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-2 text-sm text-foreground/60">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Player Controls */}
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <button
                      onClick={handlePrevious}
                      className="btn-neon p-2"
                      disabled={tracks.length === 0}
                    >
                      <SkipBack size={20} />
                    </button>

                    <button
                      onClick={handlePlayPause}
                      className="btn-neon p-3 scale-125"
                    >
                      {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>

                    <button
                      onClick={handleNext}
                      className="btn-neon p-2"
                      disabled={tracks.length === 0}
                    >
                      <SkipForward size={20} />
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-3">
                    <Volume2 size={18} className="text-primary" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-primary/20 rounded cursor-pointer accent-primary"
                    />
                    <span className="text-sm text-foreground/60 w-8">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded p-6 mb-8 border border-primary/20 text-center">
                  <p className="text-secondary-neon mb-4">No track selected</p>
                  <p className="text-foreground/60">Select a track from the playlist to start playing</p>
                </div>
              )}

              {/* Upload Button */}
              {user && (
                <button
                  onClick={() => setShowUploadModal(!showUploadModal)}
                  className="btn-neon w-full flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  Upload New Track
                </button>
              )}

              {/* Upload Form */}
              {showUploadModal && user && (
                <form onSubmit={handleUpload} className="mt-6 p-4 bg-card rounded border border-primary/20">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Track Title</label>
                      <Input
                        name="title"
                        type="text"
                        placeholder="Enter track title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Artist</label>
                      <Input
                        name="artist"
                        type="text"
                        placeholder="Enter artist name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Audio File</label>
                      <Input
                        name="file"
                        type="file"
                        accept="audio/*"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="btn-neon flex-1"
                        disabled={uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowUploadModal(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Playlist Sidebar */}
          <div className="lg:col-span-1">
            <div className="card-neon relative">
              <div className="accent-line-left"></div>
              <h3 className="neon-heading text-xl mb-4">PLAYLIST</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tracks.length === 0 ? (
                  <p className="text-secondary-neon text-center py-8">No tracks yet</p>
                ) : (
                  tracks.map((track) => (
                    <div
                      key={track.id}
                      className={`p-3 rounded cursor-pointer transition-all border ${
                        currentTrackId === track.id
                          ? "bg-primary/20 border-primary"
                          : "bg-card border-primary/10 hover:border-primary/30"
                      }`}
                      onClick={() => handleTrackSelect(track.id)}
                    >
                      <p className="font-semibold text-sm truncate">{track.title}</p>
                      <p className="text-xs text-foreground/60 truncate">{track.artist}</p>
                      <p className="text-xs text-foreground/40 mt-1">
                        {formatTime(track.duration)}
                      </p>
                      {user && track.uploadedBy === user.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(track.id);
                          }}
                          className="mt-2 text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
