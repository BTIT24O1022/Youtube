import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import axiosInstance from "@/lib/axiosinstance";
import socket from "@/lib/socket";
import { useUser } from "@/lib/AuthContext";
import { formatDistanceToNow } from "date-fns";

const NotificationBell = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user?._id) return;

    const fetchNotifications = async () => {
      try {
        const res = await axiosInstance.get("/notification");
        setNotifications(res.data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchNotifications();

    // Join a room named after this user's id, so the backend can push
    // notifications straight to them without a page refresh.
    socket.emit("join_user", user._id);
    const handleNew = (notif: any) => setNotifications((prev) => [notif, ...prev]);
    socket.on("notification", handleNew);
    return () => {
      socket.off("notification", handleNew);
    };
  }, [user?._id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpenChange = async (open: boolean) => {
    if (open && unreadCount > 0) {
      try {
        await axiosInstance.patch("/notification/read");
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch (error) {
        console.log(error);
      }
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        {notifications.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 15).map((n) => (
            <DropdownMenuItem key={n._id} className="flex-col items-start whitespace-normal py-2">
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(n.createdAt))} ago
              </p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
