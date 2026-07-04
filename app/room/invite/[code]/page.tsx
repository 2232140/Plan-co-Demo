"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import AvatarList from "@/components/room/avatar-list";
import { AVATAR_COLORS, AvatarColor } from "@/components/ui/swing-avatar";

interface PresenceMember {
  nickname: string;
  avatar_color: string;
  is_host: boolean;
  userId: string;
}

export default function InviteRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Session info
  const [myNickname, setMyNickname] = useState("");
  const [myAvatarColor, setMyAvatarColor] = useState<AvatarColor>("orange");
  const [myIsHost, setMyIsHost] = useState(false);
  const [myUserId, setMyUserId] = useState("");

  // Nickname dialog (when arriving via URL share)
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [pendingNickname, setPendingNickname] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);

  // Presence members
  const [members, setMembers] = useState<PresenceMember[]>([]);

  const [copied, setCopied] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const formatCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;

  // Fetch room on mount
  useEffect(() => {
    if (!supabase) {
      setError("Supabaseが設定されていません");
      setLoading(false);
      return;
    }

    supabase
      .from("rooms")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (e || !data) {
          setError("ルームが見つかりません");
          setLoading(false);
          return;
        }
        setRoomId(data.id as string);

        // Load session
        const savedNickname = sessionStorage.getItem("planco_nickname");
        const savedColor = sessionStorage.getItem("planco_avatar_color") as AvatarColor | null;
        const savedIsHost = sessionStorage.getItem("planco_is_host") === "true";
        let savedUserId = sessionStorage.getItem("planco_userId");
        if (!savedUserId) {
          savedUserId = crypto.randomUUID();
          sessionStorage.setItem("planco_userId", savedUserId);
        }

        if (savedNickname && savedColor) {
          setMyNickname(savedNickname);
          setMyAvatarColor(savedColor);
          setMyIsHost(savedIsHost);
          setMyUserId(savedUserId);
          setLoading(false);
        } else {
          // Need to collect nickname
          setMyUserId(savedUserId);
          setShowNicknameDialog(true);
          setLoading(false);
        }
      });
  }, [code]);

  // Join room as new member (when arriving via URL share)
  const handleDialogJoin = async () => {
    const name = pendingNickname.trim();
    if (!name || !supabase || !roomId) return;

    setJoiningRoom(true);
    try {
      const { data: existingMembers } = await supabase
        .from("room_members")
        .select("avatar_color")
        .eq("room_id", roomId);

      const usedColors = (existingMembers ?? []).map((m: { avatar_color: string }) => m.avatar_color);
      const unusedColors = AVATAR_COLORS.filter((c) => !usedColors.includes(c));
      const available = unusedColors.length > 0 ? unusedColors : [...AVATAR_COLORS];
      const color = available[Math.floor(Math.random() * available.length)] as AvatarColor;

      await supabase.from("room_members").insert({
        room_id: roomId,
        nickname: name,
        avatar_color: color,
        is_host: false,
      });

      sessionStorage.setItem("planco_nickname", name);
      sessionStorage.setItem("planco_avatar_color", color);
      sessionStorage.setItem("planco_is_host", "false");

      setMyNickname(name);
      setMyAvatarColor(color);
      setMyIsHost(false);
      setShowNicknameDialog(false);
    } catch {
      // silently ignore
    } finally {
      setJoiningRoom(false);
    }
  };

  // Subscribe to Realtime Presence
  useEffect(() => {
    if (!supabase || !myNickname || !myUserId || !roomId) return;

    const channel = supabase.channel(`room-invite-${code}`, {
      config: { presence: { key: myUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMember>();
        const raw = Object.values(state).flat() as PresenceMember[];

        // Deduplicate by userId
        const seen = new Set<string>();
        const unique = raw.filter((p) => {
          if (seen.has(p.userId)) return false;
          seen.add(p.userId);
          return true;
        });
        setMembers(unique);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            nickname: myNickname,
            avatar_color: myAvatarColor,
            is_host: myIsHost,
            userId: myUserId,
          });
        }
      });

    channelRef.current = channel;
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [myNickname, myAvatarColor, myIsHost, myUserId, roomId, code]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: "Plan-co ルーム", url });
    else await navigator.clipboard.writeText(url);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading
  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #FFB5A7 0%, #FEC89A 100%)" }}
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full bg-white animate-dot-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </main>
    );
  }

  // Error
  if (error) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
        style={{ background: "linear-gradient(160deg, #FFB5A7 0%, #FEC89A 100%)" }}
      >
        <p className="text-white font-extrabold text-xl">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-2xl bg-white/30 text-white font-bold"
        >
          ホームに戻る
        </button>
      </main>
    );
  }

  return (
    <>
      {/* Nickname Dialog */}
      {showNicknameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-extrabold text-gray-800 mb-1">ニックネームを入力</h2>
            <p className="text-gray-400 text-sm mb-4">ルーム内での表示名を決めよう 👋</p>
            <input
              type="text"
              value={pendingNickname}
              onChange={(e) => setPendingNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDialogJoin()}
              placeholder="例：はなこ"
              maxLength={12}
              autoFocus
              className="w-full px-4 py-2.5 rounded-2xl border-2 border-orange-100 bg-orange-50 text-gray-700 font-bold placeholder:text-gray-300 focus:outline-none focus:border-orange-300 text-sm mb-4"
            />
            <button
              onClick={handleDialogJoin}
              disabled={!pendingNickname.trim() || joiningRoom}
              className="w-full py-3 rounded-2xl font-extrabold text-white shadow-lg disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}
            >
              {joiningRoom ? "参加中..." : "参加する 🎡"}
            </button>
          </div>
        </div>
      )}

      <main
        className="min-h-screen pb-10"
        style={{ background: "linear-gradient(160deg, #FFB5A7 0%, #FEC89A 100%)" }}
      >
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Header */}
          <header className="flex items-center mb-6">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 transition-colors active:scale-95"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-xl font-extrabold text-white drop-shadow-md">
                みんなで決める 👥
              </h1>
            </div>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 transition-colors active:scale-95"
            >
              <Share2 size={18} className="text-white" />
            </button>
          </header>

          {/* Invite code card */}
          <div className="bg-white rounded-3xl p-5 shadow-2xl mb-5">
            <p className="text-xs font-extrabold text-gray-400 mb-2 text-center tracking-widest uppercase">
              招待コード
            </p>
            <div className="flex items-center justify-center gap-4">
              <p className="text-4xl font-extrabold tracking-widest text-gray-800">
                {formatCode(code)}
              </p>
              <button
                onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-orange-100 text-orange-400 hover:bg-orange-200 transition-colors active:scale-95"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {/* Member count */}
          <p className="text-white font-extrabold text-center mb-4 text-lg">
            {members.length}人 が参加中
          </p>

          {/* Avatar list card */}
          <div
            className="rounded-3xl p-6 shadow-xl min-h-[180px] flex flex-col items-center justify-center"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {members.length === 0 ? (
              <p className="text-white/70 font-bold text-sm">友達の参加を待っています...</p>
            ) : (
              <AvatarList members={members} myNickname={myNickname} />
            )}
          </div>

          {/* Gather message */}
          {members.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 bg-white/30 rounded-2xl px-5 py-3 text-center"
            >
              <p className="text-white font-extrabold text-base">
                🎉 みんな集まってきたね！
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
