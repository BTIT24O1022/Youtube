import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

const isValidMongoId = (id: any): id is string =>
  Boolean(id && typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id.trim()));

const SubscribeButton = ({ channelId, showCount = false }: { channelId?: string; showCount?: boolean }) => {
  const { user, handlegooglesignin } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    const idToUse = isValidMongoId(channelId) ? channelId : undefined;
    if (!idToUse) return;
    axiosInstance
      .get(`/subscription/status/${idToUse}`)
      .then((res) => {
        setIsSubscribed(res.data.isSubscribed);
        setCount(res.data.subscriberCount || 0);
        if (res.data.resolvedChannelId && isValidMongoId(res.data.resolvedChannelId)) {
          setResolvedId(res.data.resolvedChannelId);
        }
      })
      .catch((err) => console.log(err));
  }, [channelId, user?._id]);

  const targetId = (isValidMongoId(resolvedId) ? resolvedId : undefined) || (isValidMongoId(channelId) ? channelId : undefined);

  // Hide button only when the logged-in user IS the channel owner
  if (user && isValidMongoId(targetId) && String(user._id) === String(targetId)) return null;

  const handleClick = async () => {
    if (!user) {
      handlegooglesignin();
      return;
    }
    if (!isValidMongoId(targetId)) {
      alert("Cannot subscribe to this channel (channel identifier not found).");
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.post(`/subscription/${targetId}`);
      setIsSubscribed(res.data.subscribed);
      setCount(res.data.subscriberCount || 0);
      if (res.data.resolvedChannelId && isValidMongoId(res.data.resolvedChannelId)) {
        setResolvedId(res.data.resolvedChannelId);
      }
    } catch (error: any) {
      console.log(error);
      alert(error?.response?.data?.message || "Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={loading || !isValidMongoId(targetId)}
        variant={isSubscribed ? "outline" : "default"}
        className={isSubscribed ? "bg-gray-100 rounded-full dark:bg-gray-800" : "bg-black text-white hover:bg-gray-800 rounded-full dark:bg-white dark:text-black dark:hover:bg-gray-200"}
      >
        {isSubscribed ? "Subscribed 🔔" : "Subscribe"}
      </Button>
      {showCount && isValidMongoId(targetId) && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {count.toLocaleString()} {count === 1 ? "subscriber" : "subscribers"}
        </span>
      )}
    </div>
  );
};

export default SubscribeButton;


