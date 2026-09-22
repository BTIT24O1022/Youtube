import React from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import SubscribeButton from "./SubscribeButton";

const ChannelHeader = ({ channel, user }: any) => {
  return (
    <div className="w-full">
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden"></div>

      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            <AvatarFallback className="text-2xl">
              {channel?.channelname?.[0] || channel?.name?.[0] || "C"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold">{channel?.channelname || channel?.name || "Channel"}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>@{channel?.channelname ? channel.channelname.toLowerCase().replace(/\s+/g, "") : channel?.name ? channel.name.toLowerCase().replace(/\s+/g, "") : "channel"}</span>
            </div>
            {channel?.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 max-w-2xl">
                {channel?.description}
              </p>
            )}
          </div>

          <SubscribeButton channelId={channel?._id} showCount />
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
