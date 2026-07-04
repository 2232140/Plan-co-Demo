"use client";

import { motion, AnimatePresence } from "framer-motion";
import SwingAvatar, { AvatarColor } from "@/components/ui/swing-avatar";

interface Member {
  nickname: string;
  avatar_color: string;
  is_host?: boolean;
}

interface Props {
  members: Member[];
  myNickname?: string;
}

export default function AvatarList({ members, myNickname }: Props) {
  return (
    <div className="flex flex-wrap gap-6 justify-center">
      <AnimatePresence>
        {members.map((member) => (
          <motion.div
            key={member.nickname}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-1"
          >
            <SwingAvatar color={member.avatar_color as AvatarColor} size={72} swing={true} />
            <p className="text-white font-bold text-sm">
              {member.nickname}
              {myNickname && member.nickname === myNickname && (
                <span className="text-white/70 font-normal">（あなた）</span>
              )}
            </p>
            {member.is_host && (
              <p className="text-white/80 text-xs font-bold">👑 ホスト</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
