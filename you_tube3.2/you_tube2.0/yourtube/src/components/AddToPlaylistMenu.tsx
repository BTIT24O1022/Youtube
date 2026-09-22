import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ListPlus } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

const AddToPlaylistMenu = ({ videoId }: { videoId: string }) => {
  const { user } = useUser();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newName, setNewName] = useState("");

  const load = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/playlist/mine/${user._id}`);
      setPlaylists(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    load();
  }, [user?._id]);

  const addTo = async (playlistId: string) => {
    try {
      await axiosInstance.post(`/playlist/${playlistId}/add`, { videoId });
      toast.success("Added to playlist");
    } catch (error) {
      toast.error("Couldn't add to playlist");
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    try {
      const res = await axiosInstance.post("/playlist", { name: newName });
      await axiosInstance.post(`/playlist/${res.data._id}/add`, { videoId });
      setNewName("");
      load();
      toast.success(`Added to new playlist "${res.data.name}"`);
    } catch (error) {
      toast.error("Couldn't create playlist");
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="bg-gray-100 rounded-full">
          <ListPlus className="w-5 h-5 mr-2" />
          Save
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        {playlists.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-gray-500">No playlists yet</div>
        )}
        {playlists.map((p) => (
          <DropdownMenuItem key={p._id} onClick={() => addTo(p._id)}>
            {p.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex gap-1 p-1.5" onClick={(e) => e.stopPropagation()}>
          <Input
            placeholder="New playlist"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8"
          />
          <Button size="sm" className="h-8" onClick={createAndAdd}>Add</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddToPlaylistMenu;
