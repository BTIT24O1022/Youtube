import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PlaylistsPage = () => {
  const { user } = useUser();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/playlist/mine/${user._id}`);
      setPlaylists(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?._id]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await axiosInstance.post("/playlist", { name });
      setName("");
      load();
    } catch (error) {
      toast.error("Couldn't create playlist");
    }
  };

  const remove = async (id: string) => {
    try {
      await axiosInstance.delete(`/playlist/${id}`);
      setPlaylists((prev) => prev.filter((p) => p._id !== id));
    } catch (error) {
      toast.error("Couldn't delete playlist");
    }
  };

  if (!user) {
    return <main className="flex-1 p-6">Sign in to see your playlists.</main>;
  }
  if (loading) {
    return <main className="flex-1 p-6">Loading playlists...</main>;
  }

  return (
    <main className="flex-1 p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4">Your Playlists</h1>
      <div className="flex gap-2 mb-6">
        <Input placeholder="New playlist name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={create}>Create</Button>
      </div>
      {playlists.length === 0 ? (
        <p className="text-gray-500">You haven't created any playlists yet.</p>
      ) : (
        <div className="space-y-3">
          {playlists.map((p) => (
            <div key={p._id} className="flex items-center justify-between border rounded-lg p-4">
              <Link href={`/playlists/${p._id}`} className="font-medium hover:text-blue-600">
                {p.name} <span className="text-sm text-gray-500">({p.videos.length} videos)</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => remove(p._id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default PlaylistsPage;
