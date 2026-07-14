"use client";

import { useState, useEffect, useRef, use, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SwingAvatar, { AVATAR_COLORS, AvatarColor } from "@/components/ui/swing-avatar";
import RouletteWheel from "@/components/roulette-wheel";
import ResultModal from "@/components/result-modal";
import { Suggestion } from "@/types/planco";
import { useShakeDetector } from "@/lib/hooks/useShakeDetector";

// ── Types ────────────────────────────────────────────────────────────────────

interface PresenceMember {
  nickname: string;
  avatar_color: string;
  is_host: boolean;
  userId: string;
}

interface VoteRow {
  id: string;
  member_id: string;
  tag_name: string;
}

interface Candidate {
  id: string;
  name: string;
  description: string;
  budget: string;
  reason: string;
}

interface LikeRow {
  id: string;
  candidate_id: string;
  member_id: string;
}

interface MemberRecord {
  id: string;
  nickname: string;
  avatar_color: string;
}

type Phase = "voting" | "suggesting" | "results" | "mode-select" | "game-ready" | "game-play" | "roulette";

// ── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TAGS = [
  { name: "食べたい", emoji: "🍜" },
  { name: "カフェ", emoji: "☕" },
  { name: "屋内", emoji: "🏠" },
  { name: "屋外", emoji: "🌞" },
  { name: "アクティブ", emoji: "🏃" },
  { name: "まったり", emoji: "😴" },
  { name: "映え", emoji: "📸" },
  { name: "エンタメ", emoji: "🎭" },
];

const LOCATION_TAGS = [
  { name: "都市部", emoji: "🏙️" },
  { name: "自然・公園", emoji: "🌿" },
  { name: "駅近", emoji: "🚉" },
  { name: "郊外", emoji: "🌄" },
];

const BUDGET_TAGS = [
  { name: "〜1000円", emoji: "🪙" },
  { name: "〜3000円", emoji: "💴" },
  { name: "〜5000円", emoji: "💰" },
  { name: "上限なし", emoji: "💎" },
];

const ALL_VOTE_TAGS = [...ACTIVITY_TAGS, ...LOCATION_TAGS, ...BUDGET_TAGS];

const HEART_PARTICLES = ["❤️", "💕", "💗", "✨"];

const SHAKE_GOAL = 80;

const GAME_DURATION = 5; // seconds
const GAME_COUNTDOWN_SEC = 3; // seconds before game starts
const TARGET_SHAKES_PER_PERSON = 15; // for sync mode 80% threshold

const TRAP_CANDIDATE: Candidate = {
  id: "trap",
  name: "？？？",
  description: "運命の選択...",
  budget: "？",
  reason: "神のみぞ知る",
};

// ── Audio helpers ─────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_audioCtx) {
      _audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch {
    return null;
  }
}

function playShakeTick() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(500 + Math.random() * 300, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

function playDrumRoll(durationMs: number) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const steps = Math.floor(durationMs / 60);
  for (let i = 0; i < steps; i++) {
    const t = now + (i / steps) * (durationMs / 1000);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60 + (i / steps) * 50, t);
    const vol = 0.04 + (i / steps) * 0.18;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.start(t);
    osc.stop(t + 0.055);
  }
}

function playAlert() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const [freq, offset] of [[440, 0], [587, 0.22], [784, 0.44]]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now + offset);
    gain.gain.setValueAtTime(0.22, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
    osc.start(now + offset);
    osc.stop(now + offset + 0.18);
  }
}

function playVictoryFanfare() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const [freq, offset] of [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45]]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + offset);
    gain.gain.setValueAtTime(0.32, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);
    osc.start(now + offset);
    osc.stop(now + offset + 0.35);
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HeartParticles({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {HEART_PARTICLES.map((emoji, i) => (
        <span
          key={i}
          className="absolute text-lg animate-float-up"
          style={{ left: `${20 + i * 20}%`, bottom: "40%", animationDelay: `${i * 0.1}s` }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InviteRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  // Basic
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState("");
  const [myAvatarColor, setMyAvatarColor] = useState<AvatarColor>("orange");
  const [myIsHost, setMyIsHost] = useState(false);
  const [myUserId, setMyUserId] = useState("");
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [pendingNickname, setPendingNickname] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [copied, setCopied] = useState(false);

  // Phase & data
  const [phase, setPhase] = useState<Phase>("voting");
  const [memberRecords, setMemberRecords] = useState<MemberRecord[]>([]);
  const [voteRows, setVoteRows] = useState<VoteRow[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [likeRows, setLikeRows] = useState<LikeRow[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [likeAnimating, setLikeAnimating] = useState<string | null>(null);

  // Roulette
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [syncedTarget, setSyncedTarget] = useState<number | undefined>(undefined);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerCandidate, setWinnerCandidate] = useState<Candidate | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const baseRotationRef = useRef(0);

  // Demo: shake charge
  const [chargeCount, setChargeCount] = useState(0);
  const [showRainbow, setShowRainbow] = useState(false);
  const [showDramaticText, setShowDramaticText] = useState(false);
  const [showTrapModal, setShowTrapModal] = useState(false);
  const [pendingTrapSpot, setPendingTrapSpot] = useState("");
  const rainbowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dramaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Game feature state
  const [modeVotes, setModeVotes] = useState<Record<string, 'sync' | 'battle'>>({});
  const [myModeVote, setMyModeVote] = useState<'sync' | 'battle' | null>(null);
  const [gameMode, setGameMode] = useState<'sync' | 'battle' | null>(null);
  const [gameScores, setGameScores] = useState<Record<string, { nickname: string; score: number }>>({});
  const [myShakeScore, setMyShakeScore] = useState(0);
  const [gameTimeLeft, setGameTimeLeft] = useState(GAME_DURATION);
  const [gameCountdown, setGameCountdown] = useState(GAME_COUNTDOWN_SEC);
  const [gameActive, setGameActive] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [gameWinnerInfo, setGameWinnerInfo] = useState<{ nickname: string; memberId: string; candidateName: string } | null>(null);
  const [coopSyncRate, setCoopSyncRate] = useState(0);
  const [showBattleBoostBanner, setShowBattleBoostBanner] = useState(false);

  const presenceRef = useRef<RealtimeChannel | null>(null);
  const realtimeRef = useRef<RealtimeChannel | null>(null);
  const broadcastRef = useRef<RealtimeChannel | null>(null);
  const myShakeScoreRef = useRef(0); // ref version for use in intervals
  const lastShakeMsRef = useRef(0);  // for 150ms cooldown
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const formatCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;

  // ── Computed ──────────────────────────────────────────────────────────────

  const tagVoteMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of ALL_VOTE_TAGS) map[t.name] = [];
    for (const v of voteRows) {
      if (map[v.tag_name] !== undefined) map[v.tag_name].push(v.member_id);
      else map[v.tag_name] = [v.member_id];
    }
    return map;
  }, [voteRows]);

  const myTagVoteSet = useMemo(
    () => new Set(voteRows.filter((v) => v.member_id === myMemberId).map((v) => v.tag_name)),
    [voteRows, myMemberId]
  );

  const likeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of likeRows) map[l.candidate_id] = (map[l.candidate_id] ?? 0) + 1;
    return map;
  }, [likeRows]);

  const myLikeSet = useMemo(
    () => new Set(likeRows.filter((l) => l.member_id === myMemberId).map((l) => l.candidate_id)),
    [likeRows, myMemberId]
  );

  const memberColorMap = useMemo(() => {
    const map: Record<string, AvatarColor> = {};
    for (const m of memberRecords) map[m.id] = m.avatar_color as AvatarColor;
    return map;
  }, [memberRecords]);

  // Top 4 by likes → roulette base
  const rouletteItems = useMemo(
    () =>
      [...candidates]
        .sort((a, b) => (likeCountMap[b.id] ?? 0) - (likeCountMap[a.id] ?? 0))
        .slice(0, 4),
    [candidates, likeCountMap]
  );

  // Add trap sector (conditionally based on game results)
  const rouletteItemsWithTrap = useMemo(() => {
    let items = [...rouletteItems];

    if (gameMode === 'battle' && gameWinnerInfo) {
      const boostItem = items.find(c => c.name === gameWinnerInfo.candidateName);
      if (boostItem) {
        items = [boostItem, ...items]; // duplicate → 2x probability
      }
    }

    if (gameMode === 'sync' && coopSyncRate >= 80) {
      return items; // no trap slot
    }

    return [...items, TRAP_CANDIDATE];
  }, [rouletteItems, gameMode, gameWinnerInfo, coopSyncRate]);

  const chargeReady = chargeCount >= SHAKE_GOAL;

  // Dynamic swing animation driven by charge level
  const chargeRatio = Math.min(chargeCount, SHAKE_GOAL) / SHAKE_GOAL;
  const swingAngle = 6 + chargeRatio * 164;   // 6° → 170°
  const swingDuration = Math.max(0.4, 2.5 - chargeRatio * 2.1); // 2.5s → 0.4s

  // ── Initial data load ─────────────────────────────────────────────────────

  const loadInitialData = useCallback(
    async (rId: string, roomStatus: string, existingWinnerId: string | null) => {
      if (!supabase) return;

      const [membersRes, votesRes, candidatesRes] = await Promise.all([
        supabase.from("room_members").select("id, nickname, avatar_color").eq("room_id", rId),
        supabase.from("room_votes").select("id, member_id, tag_name").eq("room_id", rId),
        supabase
          .from("room_candidates")
          .select("id, name, description, budget, reason")
          .eq("room_id", rId)
          .order("created_at"),
      ]);

      if (membersRes.data) setMemberRecords(membersRes.data as MemberRecord[]);
      if (votesRes.data) setVoteRows(votesRes.data as VoteRow[]);

      const cands = (candidatesRes.data ?? []) as Candidate[];
      if (cands.length > 0) {
        setCandidates(cands);
        setPhase(roomStatus === "roulette" ? "roulette" : "results");

        const { data: likeData } = await supabase
          .from("room_candidate_likes")
          .select("id, candidate_id, member_id");
        if (likeData) {
          const cids = new Set(cands.map((c) => c.id));
          setLikeRows((likeData as LikeRow[]).filter((l) => cids.has(l.candidate_id)));
        }

        if (existingWinnerId) {
          const winner = cands.find((c) => c.id === existingWinnerId);
          if (winner) setWinnerCandidate(winner);
        }
      }
    },
    []
  );

  // ── Fetch room on mount ───────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) {
      setError("Supabaseが設定されていません");
      setLoading(false);
      return;
    }

    const sb = supabase;
    const init = async () => {
      const { data, error: e } = await sb
        .from("rooms")
        .select("id, status, selected_candidate_id")
        .eq("invite_code", code)
        .maybeSingle();

      if (e || !data) {
        setError("ルームが見つかりません");
        setLoading(false);
        return;
      }

      const rId = data.id as string;
      const roomStatus = (data.status as string) ?? "setup";
      const existingWinnerId = (data.selected_candidate_id as string | null) ?? null;
      setRoomId(rId);
      if (roomStatus === "roulette") setPhase("roulette");

      let savedNickname = sessionStorage.getItem("planco_nickname");
      let savedColor = sessionStorage.getItem("planco_avatar_color") as AvatarColor | null;
      let savedIsHost = sessionStorage.getItem("planco_is_host") === "true";
      let savedMemberId = sessionStorage.getItem("planco_memberId");
      let savedUserId = sessionStorage.getItem("planco_userId");
      if (!savedUserId) {
        savedUserId = crypto.randomUUID();
        sessionStorage.setItem("planco_userId", savedUserId);
      }

      // If no session data, check localStorage for persistent host identity (survives tab close)
      if (!savedNickname) {
        try {
          const localHostRaw = localStorage.getItem(`planco_host_${code}`);
          if (localHostRaw) {
            const { memberId, nickname: localNick, color: localColor } = JSON.parse(localHostRaw) as {
              memberId: string; nickname: string; color: string;
            };
            const { data: memberRow } = await sb
              .from("room_members")
              .select("id, is_host")
              .eq("id", memberId)
              .maybeSingle();
            if (memberRow?.is_host) {
              savedNickname = localNick;
              savedColor = localColor as AvatarColor;
              savedIsHost = true;
              savedMemberId = memberId;
              sessionStorage.setItem("planco_nickname", localNick);
              sessionStorage.setItem("planco_avatar_color", localColor);
              sessionStorage.setItem("planco_is_host", "true");
              sessionStorage.setItem("planco_memberId", memberId);
            }
          }
        } catch {
          // ignore localStorage errors
        }
      }

      if (savedMemberId) setMyMemberId(savedMemberId);

      if (savedNickname && savedColor) {
        setMyNickname(savedNickname);
        setMyAvatarColor(savedColor);
        setMyIsHost(savedIsHost);
        setMyUserId(savedUserId);
        setLoading(false);
      } else {
        setMyUserId(savedUserId);
        setShowNicknameDialog(true);
        setLoading(false);
      }

      loadInitialData(rId, roomStatus, existingWinnerId);
    };

    init();
  }, [code, loadInitialData]);

  // ── Presence channel ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase || !myNickname || !myUserId || !roomId) return;

    const channel = supabase.channel(`room-invite-${code}`, {
      config: { presence: { key: myUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMember>();
        const raw = Object.values(state).flat() as PresenceMember[];
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

    presenceRef.current = channel;
    return () => { supabase?.removeChannel(channel); };
  }, [myNickname, myAvatarColor, myIsHost, myUserId, roomId, code]);

  // ── Realtime DB changes ───────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase || !roomId) return;

    const channel = supabase
      .channel(`room-step3-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as { status?: string; selected_candidate_id?: string };
          if (updated.status === "roulette") setPhase("roulette");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_votes", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as VoteRow;
          setVoteRows((prev) => [
            ...prev.filter((v) => !(v.member_id === row.member_id && v.tag_name === row.tag_name)),
            row,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "room_votes", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.old as { id: string };
          setVoteRows((prev) => prev.filter((v) => v.id !== row.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_candidates", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newCand = payload.new as Candidate;
          setCandidates((prev) => [...prev.filter((c) => c.id !== newCand.id), newCand]);
          setPhase("results");
          setSuggesting(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_candidate_likes" },
        (payload) => {
          const row = payload.new as LikeRow;
          setLikeRows((prev) => [
            ...prev.filter((l) => !(l.candidate_id === row.candidate_id && l.member_id === row.member_id)),
            row,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "room_candidate_likes" },
        (payload) => {
          const row = payload.old as { id: string };
          setLikeRows((prev) => prev.filter((l) => l.id !== row.id));
        }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => { supabase?.removeChannel(channel); };
  }, [roomId]);

  // ── Broadcast channel ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase || !roomId) return;

    const channel = supabase.channel(`room-bc-${roomId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "SHAKE" }, () => {
        setChargeCount((c) => Math.min(c + 1, SHAKE_GOAL));
      })
      .on("broadcast", { event: "SPIN" }, ({ payload }) => {
        const { targetRotation } = payload as { targetRotation: number };
        baseRotationRef.current = targetRotation;
        setSyncedTarget(targetRotation);
        setSpinTrigger((t) => t + 1);
        setIsSpinning(true);
        setWinnerCandidate(null);
        setShowWinnerModal(false);

        // Drum roll for first 2.5s
        playDrumRoll(2500);

        // Dramatic text at 1.5s
        if (dramaticTimerRef.current) clearTimeout(dramaticTimerRef.current);
        dramaticTimerRef.current = setTimeout(() => setShowDramaticText(true), 1500);

        // Rainbow flash + alert + vibration at 2.5s (2s before wheel stops)
        if (rainbowTimerRef.current) clearTimeout(rainbowTimerRef.current);
        rainbowTimerRef.current = setTimeout(() => {
          setShowRainbow(true);
          playAlert();
          navigator.vibrate?.([200, 100, 200]);
        }, 2500);
      })
      .on("broadcast", { event: "RESET" }, () => {
        setWinnerCandidate(null);
        setShowWinnerModal(false);
        setShowTrapModal(false);
        setPendingTrapSpot("");
        setChargeCount(SHAKE_GOAL);
      })
      .on("broadcast", { event: "FULL_RESET" }, () => {
        setCandidates([]);
        setVoteRows([]);
        setLikeRows([]);
        setWinnerCandidate(null);
        setShowWinnerModal(false);
        setShowTrapModal(false);
        setPendingTrapSpot("");
        setPhase("voting");
        setChargeCount(0);
        setSyncedTarget(undefined);
        baseRotationRef.current = 0;
        setIsSpinning(false);
        setSuggesting(false);
        setSuggestError(null);
        setModeVotes({});
        setMyModeVote(null);
        setGameMode(null);
        setGameScores({});
        setMyShakeScore(0);
        myShakeScoreRef.current = 0;
        setGameTimeLeft(GAME_DURATION);
        setGameCountdown(GAME_COUNTDOWN_SEC);
        setGameActive(false);
        setMotionReady(false);
        setGameWinnerInfo(null);
        setCoopSyncRate(0);
        setShowBattleBoostBanner(false);
      })
      .on("broadcast", { event: "MODE_SELECT_START" }, () => {
        setPhase("mode-select");
        setModeVotes({});
        setMyModeVote(null);
      })
      .on("broadcast", { event: "MODE_VOTE" }, ({ payload }) => {
        const { userId, vote } = payload as { userId: string; vote: 'sync' | 'battle' };
        setModeVotes(prev => ({ ...prev, [userId]: vote }));
      })
      .on("broadcast", { event: "GAME_SCORE_UPDATE" }, ({ payload }) => {
        const { userId, nickname, score } = payload as { userId: string; nickname: string; score: number };
        setGameScores(prev => ({ ...prev, [userId]: { nickname, score } }));
      })
      .on("broadcast", { event: "TRAP_REVEAL" }, ({ payload }) => {
        const { spotName } = payload as { spotName: string };
        setWinnerCandidate({ ...TRAP_CANDIDATE, name: spotName });
        setShowTrapModal(false);
        setPendingTrapSpot("");
        setShowWinnerModal(true);
        playVictoryFanfare();
        if (typeof window !== "undefined") {
          import("canvas-confetti").then(({ default: confetti }) => {
            confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 },
              colors: ["#f59e0b", "#ef4444", "#8b5cf6"] });
          });
        }
      })
      .subscribe();

    broadcastRef.current = channel;
    return () => { supabase?.removeChannel(channel); };
  }, [roomId]);

  // ── Shake detection ───────────────────────────────────────────────────────

  const handleShake = useCallback(() => {
    if (phase !== "roulette" || isSpinning || chargeCount >= SHAKE_GOAL) return;
    playShakeTick();
    broadcastRef.current?.send({
      type: "broadcast",
      event: "SHAKE",
      payload: {},
    });
  }, [phase, isSpinning, chargeCount]);

  const { permissionState: motionPermission, requestPermission: requestMotionPermission } =
    useShakeDetector(handleShake);

  // ── Game useEffects ───────────────────────────────────────────────────────

  // Effect A: Auto-decide mode when all votes are in
  useEffect(() => {
    if (phase !== 'mode-select' || members.length === 0) return;
    if (Object.keys(modeVotes).length < members.length) return;

    const syncCount = Object.values(modeVotes).filter(v => v === 'sync').length;
    const battleCount = Object.values(modeVotes).filter(v => v === 'battle').length;
    const decided = battleCount > syncCount ? 'battle' : 'sync';
    setGameMode(decided);
    setPhase('game-ready');
    setGameCountdown(GAME_COUNTDOWN_SEC);
  }, [modeVotes, members.length, phase]);

  // Effect B: Game-ready countdown → transition to game-play
  useEffect(() => {
    if (phase !== 'game-ready') return;
    if (gameCountdown <= 0) {
      setPhase('game-play');
      setGameTimeLeft(GAME_DURATION);
      setGameActive(true);
      myShakeScoreRef.current = 0;
      setMyShakeScore(0);
      return;
    }
    const t = setTimeout(() => setGameCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, gameCountdown]);

  // Effect C: Game-play 5-second timer
  useEffect(() => {
    if (phase !== 'game-play' || !gameActive) return;
    if (gameTimeLeft <= 0) {
      // Game over — compute results
      setGameActive(false);
      if (motionHandlerRef.current) {
        window.removeEventListener('devicemotion', motionHandlerRef.current);
        motionHandlerRef.current = null;
      }

      if (gameMode === 'battle') {
        // Find winner from gameScores + my own score
        const allScores = {
          ...gameScores,
          [myUserId]: { nickname: myNickname, score: myShakeScoreRef.current },
        };
        let winnerUserId = myUserId;
        let winnerNickname = myNickname;
        let winnerScore = myShakeScoreRef.current;
        for (const [uid, { nickname, score }] of Object.entries(allScores)) {
          if (score > winnerScore) {
            winnerUserId = uid;
            winnerNickname = nickname;
            winnerScore = score;
          }
        }
        // Find winner's most-liked candidate
        const winnerMember = memberRecords.find(m => m.nickname === winnerNickname);
        if (winnerMember) {
          const winnerLikedCandidateId = likeRows
            .filter(l => l.member_id === winnerMember.id)
            .map(l => l.candidate_id)[0];
          const winnerCandidate = rouletteItems.find(c => c.id === winnerLikedCandidateId);
          if (winnerCandidate) {
            setGameWinnerInfo({ nickname: winnerNickname, memberId: winnerMember.id, candidateName: winnerCandidate.name });
            setShowBattleBoostBanner(true);
            setTimeout(() => setShowBattleBoostBanner(false), 3000);
          } else {
            setGameWinnerInfo({ nickname: winnerNickname, memberId: winnerMember?.id ?? '', candidateName: '' });
          }
        }
      } else {
        // Sync mode — compute sync rate
        const totalShakes = Object.values(gameScores).reduce((s, v) => s + v.score, 0) + myShakeScoreRef.current;
        const rate = Math.min(100, Math.round((totalShakes / (members.length * TARGET_SHAKES_PER_PERSON)) * 100));
        setCoopSyncRate(rate);
      }

      // Transition to roulette
      setPhase('roulette');
      supabase?.from('rooms').update({ status: 'roulette' }).eq('id', roomId ?? '');
      return;
    }
    const t = setTimeout(() => setGameTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, gameActive, gameTimeLeft, gameMode, gameScores, myUserId, myNickname, memberRecords, likeRows, rouletteItems, members.length, roomId]);

  // Effect D: Throttled score broadcast (every 400ms during game)
  useEffect(() => {
    if (phase !== 'game-play' || !gameActive) return;
    const iv = setInterval(() => {
      broadcastRef.current?.send({
        type: "broadcast",
        event: "GAME_SCORE_UPDATE",
        payload: { userId: myUserId, nickname: myNickname, score: myShakeScoreRef.current },
      });
    }, 400);
    return () => clearInterval(iv);
  }, [phase, gameActive, myUserId, myNickname]);

  // Effect E: DeviceMotion listener during game-play
  useEffect(() => {
    if (phase !== 'game-play' || !gameActive || !motionReady) return;

    const handler = (e: DeviceMotionEvent) => {
      const acc = e.acceleration;
      if (!acc) return;
      const mag = Math.max(Math.abs(acc.x ?? 0), Math.abs(acc.y ?? 0), Math.abs(acc.z ?? 0));
      const now = Date.now();
      if (mag > 5.0 && now - lastShakeMsRef.current > 150) {
        lastShakeMsRef.current = now;
        myShakeScoreRef.current += 1;
        setMyShakeScore(myShakeScoreRef.current);
      }
    };
    motionHandlerRef.current = handler;
    window.addEventListener('devicemotion', handler);
    return () => { window.removeEventListener('devicemotion', handler); motionHandlerRef.current = null; };
  }, [phase, gameActive, motionReady]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

      const { data: memberData } = await supabase
        .from("room_members")
        .insert({ room_id: roomId, nickname: name, avatar_color: color, is_host: false })
        .select("id")
        .single();

      if (memberData) {
        sessionStorage.setItem("planco_memberId", memberData.id);
        setMyMemberId(memberData.id);
      }

      sessionStorage.setItem("planco_nickname", name);
      sessionStorage.setItem("planco_avatar_color", color);
      sessionStorage.setItem("planco_is_host", "false");

      setMyNickname(name);
      setMyAvatarColor(color);
      setMyIsHost(false);
      setShowNicknameDialog(false);

      const { data: updatedMembers } = await supabase
        .from("room_members")
        .select("id, nickname, avatar_color")
        .eq("room_id", roomId);
      if (updatedMembers) setMemberRecords(updatedMembers as MemberRecord[]);
    } catch {
      // silently ignore
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleTagVote = async (tagName: string) => {
    if (!supabase || !myMemberId || !roomId) return;
    const alreadyVoted = myTagVoteSet.has(tagName);

    if (alreadyVoted) {
      setVoteRows((prev) =>
        prev.filter((v) => !(v.member_id === myMemberId && v.tag_name === tagName))
      );
      await supabase
        .from("room_votes")
        .delete()
        .eq("room_id", roomId)
        .eq("member_id", myMemberId)
        .eq("tag_name", tagName);
    } else {
      const tempId = `temp-${Date.now()}`;
      setVoteRows((prev) => [...prev, { id: tempId, member_id: myMemberId, tag_name: tagName }]);
      const { data } = await supabase
        .from("room_votes")
        .insert({ room_id: roomId, member_id: myMemberId, tag_name: tagName })
        .select("id")
        .single();
      if (data) {
        setVoteRows((prev) => prev.map((v) => (v.id === tempId ? { ...v, id: data.id } : v)));
      }
    }
  };

  const handleDecide = async () => {
    if (!supabase || !roomId || suggesting) return;
    setSuggestError(null);
    setSuggesting(true);

    const topTags = Object.entries(tagVoteMap)
      .filter(([, voters]) => voters.length > 0)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 5)
      .map(([tag]) => tag);

    try {
      const res = await fetch("/api/suggest-group-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, tags: topTags }),
      });
      if (!res.ok) {
        const { error: errMsg } = await res.json();
        throw new Error(errMsg ?? "AI提案に失敗しました");
      }
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "AI提案に失敗しました");
      setSuggesting(false);
    }
  };

  const handleLike = async (candidateId: string) => {
    if (!supabase || !myMemberId) return;
    const alreadyLiked = myLikeSet.has(candidateId);

    if (alreadyLiked) {
      setLikeRows((prev) =>
        prev.filter((l) => !(l.candidate_id === candidateId && l.member_id === myMemberId))
      );
      await supabase
        .from("room_candidate_likes")
        .delete()
        .eq("candidate_id", candidateId)
        .eq("member_id", myMemberId);
    } else {
      setLikeAnimating(candidateId);
      setTimeout(() => setLikeAnimating(null), 900);
      const tempId = `temp-${Date.now()}`;
      setLikeRows((prev) => [...prev, { id: tempId, candidate_id: candidateId, member_id: myMemberId }]);
      const { data } = await supabase
        .from("room_candidate_likes")
        .insert({ candidate_id: candidateId, member_id: myMemberId })
        .select("id")
        .single();
      if (data) {
        setLikeRows((prev) => prev.map((l) => (l.id === tempId ? { ...l, id: data.id } : l)));
      }
    }
  };

  const handleGoToModeSelect = () => {
    if (!broadcastRef.current) return;
    broadcastRef.current.send({ type: "broadcast", event: "MODE_SELECT_START", payload: {} });
  };

  const handleModeVote = (vote: 'sync' | 'battle') => {
    if (myModeVote === vote) return; // already voted this
    setMyModeVote(vote);
    setModeVotes(prev => ({ ...prev, [myUserId]: vote }));
    broadcastRef.current?.send({
      type: "broadcast",
      event: "MODE_VOTE",
      payload: { userId: myUserId, vote },
    });
  };

  const handleRequestMotionPermission = async () => {
    if (typeof window === 'undefined') return;
    const DM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DM.requestPermission === 'function') {
      try {
        const result = await DM.requestPermission();
        if (result === 'granted') setMotionReady(true);
      } catch { /* ignore */ }
    } else {
      setMotionReady(true); // Android / PC — no permission needed
    }
  };

  const handleNewRound = async () => {
    if (!supabase || !roomId || !myIsHost) return;
    // Clear FK reference first, then delete candidates (likes cascade)
    await supabase
      .from("rooms")
      .update({ status: "setup", selected_candidate_id: null })
      .eq("id", roomId);
    await Promise.all([
      supabase.from("room_candidates").delete().eq("room_id", roomId),
      supabase.from("room_votes").delete().eq("room_id", roomId),
    ]);
    broadcastRef.current?.send({ type: "broadcast", event: "FULL_RESET", payload: {} });
  };

  const handleTrapReveal = () => {
    const spotName = pendingTrapSpot.trim();
    if (!spotName || !broadcastRef.current) return;
    broadcastRef.current.send({
      type: "broadcast",
      event: "TRAP_REVEAL",
      payload: { spotName },
    });
  };

  const handleSpin = useCallback(() => {
    if (isSpinning || rouletteItemsWithTrap.length === 0 || !broadcastRef.current) return;

    const extra = Math.random() * 360;
    const newTarget = baseRotationRef.current + 360 * 7 + extra;

    broadcastRef.current.send({
      type: "broadcast",
      event: "SPIN",
      payload: { targetRotation: newTarget, startTime: Date.now() },
    });
  }, [isSpinning, rouletteItemsWithTrap]);

  const handleRouletteComplete = useCallback(
    (winnerName: string) => {
      if (rainbowTimerRef.current) clearTimeout(rainbowTimerRef.current);
      if (dramaticTimerRef.current) clearTimeout(dramaticTimerRef.current);
      setShowRainbow(false);
      setShowDramaticText(false);

      const isTrap = winnerName === "？？？";
      const found = isTrap
        ? TRAP_CANDIDATE
        : (rouletteItems.find((c) => c.name === winnerName) ?? null);

      setWinnerCandidate(found);
      setIsSpinning(false);

      if (isTrap) {
        navigator.vibrate?.([500, 200, 500, 200, 500]);
        playAlert();
        setShowTrapModal(true);
      } else {
        if (found) setShowWinnerModal(true);
        navigator.vibrate?.([200, 100, 400]);
        playVictoryFanfare();
        if (typeof window !== "undefined") {
          import("canvas-confetti").then(({ default: confetti }) => {
            confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
            setTimeout(
              () => confetti({ particleCount: 80, spread: 120, origin: { y: 0.8, x: 0.1 } }),
              350
            );
            setTimeout(
              () => confetti({ particleCount: 80, spread: 120, origin: { y: 0.8, x: 0.9 } }),
              700
            );
          });
        }
      }

      if (supabase && roomId && found && !isTrap) {
        supabase.from("rooms").update({ selected_candidate_id: found.id }).eq("id", roomId);
      }
    },
    [rouletteItems, roomId]
  );

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

  // ── Loading / Error ───────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Trap decision modal */}
      {showTrapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="text-center mb-5">
              <p className="text-5xl mb-2">⚡</p>
              <h2 className="text-xl font-extrabold text-gray-800">ぷらんこ神の裁き</h2>
              <p className="text-gray-400 text-sm mt-1">？？？が出ました！</p>
            </div>

            {myIsHost ? (
              <>
                <p className="text-sm font-bold text-gray-600 mb-3 text-center">
                  神として行き先を決めよ！
                </p>
                <input
                  type="text"
                  value={pendingTrapSpot}
                  onChange={(e) => setPendingTrapSpot(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTrapReveal()}
                  placeholder="行き先を入力..."
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-yellow-100 bg-yellow-50 text-gray-700 font-bold placeholder:text-gray-300 focus:outline-none focus:border-yellow-400 text-sm mb-4"
                />
                <button
                  onClick={handleTrapReveal}
                  disabled={!pendingTrapSpot.trim()}
                  className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" }}
                >
                  神の裁きを下す！⚡
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-700 font-extrabold text-base animate-pulse">
                  ぷらんこ神が行先を決めています...
                </p>
                <div className="flex justify-center gap-1.5 mt-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-full bg-yellow-400 animate-dot-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Winner Modal */}
      <ResultModal
        suggestion={showWinnerModal ? (winnerCandidate as unknown as Suggestion) : null}
        location=""
        onClose={() => setShowWinnerModal(false)}
        onReSpin={() => {
          broadcastRef.current?.send({
            type: "broadcast",
            event: "RESET",
            payload: {},
          });
          setShowWinnerModal(false);
          setWinnerCandidate(null);
          setChargeCount(SHAKE_GOAL);
        }}
        reSpinLabel="もう一度回す"
        hideMap={winnerCandidate?.id === "trap" && winnerCandidate?.name === "？？？"}
      />

      {/* Rainbow flash overlay */}
      {showRainbow && (
        <div className="fixed inset-0 z-30 pointer-events-none animate-rainbow" />
      )}

      {/* Dramatic text overlay */}
      {showDramaticText && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none px-6" style={{ zIndex: 35 }}>
          <p
            className="text-4xl font-extrabold text-yellow-400 text-center animate-pulse drop-shadow-2xl"
            style={{
              fontFamily: "serif",
              textShadow: "0 0 24px rgba(251,191,36,0.9), 0 2px 8px rgba(0,0,0,0.5)",
              lineHeight: 1.4,
            }}
          >
            ぷらんこ神の<br />裁きが下る...！
          </p>
        </div>
      )}

      {/* Battle boost banner */}
      {showBattleBoostBanner && gameWinnerInfo && gameWinnerInfo.candidateName && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="fixed top-8 left-0 right-0 z-50 flex justify-center px-4"
        >
          <div className="bg-red-500 text-white rounded-2xl px-6 py-4 shadow-2xl text-center max-w-sm">
            <p className="font-extrabold text-lg">⚔️ {gameWinnerInfo.nickname} の勝利！</p>
            <p className="text-sm mt-1 text-red-100">「{gameWinnerInfo.candidateName}」の当選確率が2倍にアップ！🔥</p>
          </div>
        </motion.div>
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
                {phase === "roulette" ? "🎡 ルーレット！" : "みんなで決める 👥"}
              </h1>
            </div>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 transition-colors active:scale-95"
            >
              <Share2 size={18} className="text-white" />
            </button>
          </header>

          {/* Invite code */}
          {phase !== "roulette" && phase !== "mode-select" && phase !== "game-ready" && phase !== "game-play" && (
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
          )}

          {/* Members */}
          <p className="text-white font-extrabold text-center mb-3 text-lg">
            {members.length}人 が参加中
          </p>
          <div
            className="rounded-3xl p-5 shadow-xl mb-5 flex flex-wrap gap-4 justify-center min-h-[80px] items-center"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {members.length === 0 ? (
              <p className="text-white/70 font-bold text-sm">友達の参加を待っています...</p>
            ) : (
              <AnimatePresence>
                {members.map((m) => (
                  <motion.div
                    key={m.userId}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <SwingAvatar color={m.avatar_color as AvatarColor} size={60} swing />
                    <p className="text-white font-bold text-xs">
                      {m.nickname}
                      {m.nickname === myNickname && (
                        <span className="text-white/70 font-normal">（あなた）</span>
                      )}
                    </p>
                    <p className="text-xs">{m.is_host ? "👑" : " "}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* ── Phase content ──────────────────────────────────────────── */}
          <AnimatePresence mode="wait">

            {/* VOTING */}
            {phase === "voting" && (
              <motion.div
                key="voting"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-3xl p-5 shadow-xl space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-extrabold text-gray-700">みんなで選ぼう 🗳️</p>
                    <p className="text-xs text-gray-400 mt-0.5">タップで投票（複数OK）</p>
                  </div>

                  {/* テーマ */}
                  <div>
                    <p className="text-xs font-extrabold text-gray-400 mb-2">🎯 テーマ</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ACTIVITY_TAGS.map((tag) => {
                        const voters = tagVoteMap[tag.name] ?? [];
                        const voted = myTagVoteSet.has(tag.name);
                        return (
                          <motion.button key={tag.name} onClick={() => handleTagVote(tag.name)} whileTap={{ scale: 0.92 }}
                            className={`relative rounded-2xl px-2 py-3 flex flex-col items-center gap-1 transition-all border-2 ${voted ? "border-orange-300 bg-orange-50 shadow-md" : "border-gray-100 bg-gray-50"}`}>
                            {voters.length > 0 && (
                              <div className="flex justify-center gap-0.5 flex-wrap">
                                {voters.slice(0, 3).map((mid) => <SwingAvatar key={mid} color={(memberColorMap[mid] ?? "orange") as AvatarColor} size={18} swing={false} />)}
                                {voters.length > 3 && <span className="text-xs text-gray-400 font-bold self-end">+{voters.length - 3}</span>}
                              </div>
                            )}
                            <span className="text-xl">{tag.emoji}</span>
                            <span className={`text-xs font-extrabold ${voted ? "text-orange-500" : "text-gray-600"}`}>{tag.name}</span>
                            {voters.length > 0 && <span className="text-xs font-bold text-orange-400">{voters.length}票</span>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* エリア */}
                  <div>
                    <p className="text-xs font-extrabold text-gray-400 mb-2">📍 エリア</p>
                    <div className="grid grid-cols-2 gap-2">
                      {LOCATION_TAGS.map((tag) => {
                        const voters = tagVoteMap[tag.name] ?? [];
                        const voted = myTagVoteSet.has(tag.name);
                        return (
                          <motion.button key={tag.name} onClick={() => handleTagVote(tag.name)} whileTap={{ scale: 0.92 }}
                            className={`relative rounded-2xl px-2 py-3 flex flex-col items-center gap-1 transition-all border-2 ${voted ? "border-blue-300 bg-blue-50 shadow-md" : "border-gray-100 bg-gray-50"}`}>
                            {voters.length > 0 && (
                              <div className="flex justify-center gap-0.5 flex-wrap">
                                {voters.slice(0, 3).map((mid) => <SwingAvatar key={mid} color={(memberColorMap[mid] ?? "orange") as AvatarColor} size={18} swing={false} />)}
                                {voters.length > 3 && <span className="text-xs text-gray-400 font-bold self-end">+{voters.length - 3}</span>}
                              </div>
                            )}
                            <span className="text-xl">{tag.emoji}</span>
                            <span className={`text-xs font-extrabold ${voted ? "text-blue-500" : "text-gray-600"}`}>{tag.name}</span>
                            {voters.length > 0 && <span className="text-xs font-bold text-blue-400">{voters.length}票</span>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 予算 */}
                  <div>
                    <p className="text-xs font-extrabold text-gray-400 mb-2">💰 予算（1人あたり）</p>
                    <div className="grid grid-cols-2 gap-2">
                      {BUDGET_TAGS.map((tag) => {
                        const voters = tagVoteMap[tag.name] ?? [];
                        const voted = myTagVoteSet.has(tag.name);
                        return (
                          <motion.button key={tag.name} onClick={() => handleTagVote(tag.name)} whileTap={{ scale: 0.92 }}
                            className={`relative rounded-2xl px-2 py-3 flex flex-col items-center gap-1 transition-all border-2 ${voted ? "border-emerald-300 bg-emerald-50 shadow-md" : "border-gray-100 bg-gray-50"}`}>
                            {voters.length > 0 && (
                              <div className="flex justify-center gap-0.5 flex-wrap">
                                {voters.slice(0, 3).map((mid) => <SwingAvatar key={mid} color={(memberColorMap[mid] ?? "orange") as AvatarColor} size={18} swing={false} />)}
                                {voters.length > 3 && <span className="text-xs text-gray-400 font-bold self-end">+{voters.length - 3}</span>}
                              </div>
                            )}
                            <span className="text-xl">{tag.emoji}</span>
                            <span className={`text-xs font-extrabold ${voted ? "text-emerald-600" : "text-gray-600"}`}>{tag.name}</span>
                            {voters.length > 0 && <span className="text-xs font-bold text-emerald-500">{voters.length}票</span>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {myIsHost && (
                  <div className="space-y-2">
                    {suggestError && (
                      <p className="text-white font-bold text-sm text-center bg-red-400/80 rounded-2xl px-4 py-2">
                        {suggestError}
                      </p>
                    )}
                    <button
                      onClick={handleDecide}
                      disabled={suggesting}
                      className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95 disabled:opacity-70"
                      style={{ background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)" }}
                    >
                      {suggesting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="w-2 h-2 rounded-full bg-white animate-dot-pulse"
                                style={{ animationDelay: `${i * 0.2}s` }}
                              />
                            ))}
                          </span>
                          AIが考え中...
                        </span>
                      ) : (
                        "これで決定！🚀"
                      )}
                    </button>
                    <p className="text-white/70 text-xs text-center">
                      ホストのみ表示 · 押すとAIがスポットを提案します
                    </p>
                  </div>
                )}

                {!myIsHost && members.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/30 rounded-2xl px-5 py-3 text-center"
                  >
                    <p className="text-white font-extrabold text-base">🎉 みんな集まってきたね！</p>
                    <p className="text-white/80 text-sm mt-1">ホストが決定するまで投票しよう ✨</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* RESULTS */}
            {phase === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-4"
              >
                <p className="text-white font-extrabold text-center text-lg">🎯 AIのおすすめスポット</p>
                <p className="text-white/70 text-center text-sm -mt-2">❤️ で気に入ったを教えよう！</p>

                <AnimatePresence>
                  {candidates.map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.92, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.12, type: "spring", stiffness: 260, damping: 22 }}
                      className="bg-white rounded-3xl p-5 shadow-xl relative overflow-hidden"
                    >
                      <HeartParticles show={likeAnimating === c.id} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-extrabold text-gray-800 text-base">{c.name}</p>
                          <p className="text-orange-400 font-bold text-xs mt-0.5">{c.budget}</p>
                          <p className="text-gray-500 text-sm mt-2 leading-relaxed">{c.description}</p>
                          <p className="text-gray-400 text-xs mt-2 italic">💡 {c.reason}</p>
                        </div>
                        <button
                          onClick={() => handleLike(c.id)}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all active:scale-90 min-w-[52px] ${
                            myLikeSet.has(c.id)
                              ? "bg-rose-50 text-rose-500"
                              : "bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-400"
                          }`}
                        >
                          <span className={`text-2xl ${myLikeSet.has(c.id) ? "animate-heart-pop" : ""}`}>
                            {myLikeSet.has(c.id) ? "❤️" : "🤍"}
                          </span>
                          <span className="text-xs font-extrabold">{likeCountMap[c.id] ?? 0}</span>
                        </button>
                      </div>
                      {(likeCountMap[c.id] ?? 0) > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-rose-400 rounded-full"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, ((likeCountMap[c.id] ?? 0) / Math.max(members.length, 1)) * 100)}%`,
                              }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 font-bold whitespace-nowrap">
                            {likeCountMap[c.id]}人が❤️
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {myIsHost && candidates.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 pt-2"
                  >
                    <button
                      onClick={handleGoToModeSelect}
                      className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95"
                      style={{ background: "linear-gradient(135deg, #FB923C 0%, #F472B6 100%)" }}
                    >
                      みんなで決める 🎡
                    </button>
                    <p className="text-white/70 text-xs text-center">
                      ホストのみ表示 · ❤️ の多い順でルーレットが始まります
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* MODE-SELECT */}
            {phase === "mode-select" && (
              <motion.div
                key="mode-select"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-white font-extrabold text-2xl">どっちで行く？🎮</p>
                  <p className="text-white/70 text-sm mt-1">タップして投票！多数決で決まります</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => handleModeVote('sync')}
                    whileTap={{ scale: 0.95 }}
                    className={`rounded-3xl p-5 flex flex-col items-center gap-2 transition-all border-4 ${
                      myModeVote === 'sync'
                        ? 'border-orange-300 bg-orange-50 shadow-xl'
                        : 'border-white/30 bg-white/20'
                    }`}
                  >
                    <span className="text-4xl">🤝</span>
                    <p className={`font-extrabold text-sm leading-tight text-center ${myModeVote === 'sync' ? 'text-orange-600' : 'text-white'}`}>
                      シンクロ・ルーレット
                    </p>
                    <p className={`text-xs text-center ${myModeVote === 'sync' ? 'text-orange-400' : 'text-white/70'}`}>
                      みんなの心を一つに！
                    </p>
                    <motion.p
                      key={Object.values(modeVotes).filter(v => v === 'sync').length}
                      animate={{ scale: [1, 1.3, 1] }}
                      className={`text-3xl font-extrabold ${myModeVote === 'sync' ? 'text-orange-500' : 'text-white'}`}
                    >
                      {Object.values(modeVotes).filter(v => v === 'sync').length}人
                    </motion.p>
                  </motion.button>

                  <motion.button
                    onClick={() => handleModeVote('battle')}
                    whileTap={{ scale: 0.95 }}
                    className={`rounded-3xl p-5 flex flex-col items-center gap-2 transition-all border-4 ${
                      myModeVote === 'battle'
                        ? 'border-red-300 bg-red-50 shadow-xl'
                        : 'border-white/30 bg-white/20'
                    }`}
                  >
                    <span className="text-4xl">⚔️</span>
                    <p className={`font-extrabold text-sm leading-tight text-center ${myModeVote === 'battle' ? 'text-red-600' : 'text-white'}`}>
                      フリフリ・バトル
                    </p>
                    <p className={`text-xs text-center ${myModeVote === 'battle' ? 'text-red-400' : 'text-white/70'}`}>
                      勝者が確率を奪い取る！
                    </p>
                    <motion.p
                      key={Object.values(modeVotes).filter(v => v === 'battle').length}
                      animate={{ scale: [1, 1.3, 1] }}
                      className={`text-3xl font-extrabold ${myModeVote === 'battle' ? 'text-red-500' : 'text-white'}`}
                    >
                      {Object.values(modeVotes).filter(v => v === 'battle').length}人
                    </motion.p>
                  </motion.button>
                </div>

                <p className="text-center text-white/60 text-sm">
                  {Object.keys(modeVotes).length} / {members.length} 人 投票済み
                </p>
              </motion.div>
            )}

            {/* GAME-READY */}
            {phase === "game-ready" && (
              <motion.div
                key="game-ready"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
                  <p className="text-5xl">{gameMode === 'sync' ? '🤝' : '⚔️'}</p>
                  <p className="font-extrabold text-gray-800 text-lg">
                    {gameMode === 'sync' ? 'シンクロ・ルーレット！' : 'フリフリ・バトル！'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {gameMode === 'sync'
                      ? 'みんなで一緒にスマホを振ろう！シンクロ率80%でトラップ消滅！'
                      : '5秒間でいちばん多く振った人の候補地が2倍に！'}
                  </p>

                  <div className="py-2">
                    <p className="text-gray-400 text-xs mb-1">ゲームスタートまで</p>
                    <motion.p
                      key={gameCountdown}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-7xl font-extrabold text-orange-500"
                    >
                      {gameCountdown > 0 ? gameCountdown : 'GO!'}
                    </motion.p>
                  </div>

                  <button
                    onClick={handleRequestMotionPermission}
                    className={`w-full py-4 rounded-2xl font-extrabold text-lg shadow-lg transition-all active:scale-95 ${
                      motionReady
                        ? 'bg-green-400 text-white'
                        : 'text-orange-500 bg-orange-50'
                    }`}
                  >
                    {motionReady ? '✅ 準備完了！' : '📱 スマホを握って準備完了！タップ！'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* GAME-PLAY */}
            {phase === "game-play" && (
              <motion.div
                key="game-play"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Timer */}
                <div className="text-center">
                  <motion.p
                    key={gameTimeLeft}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-8xl font-extrabold text-white drop-shadow-xl"
                  >
                    {gameTimeLeft}
                  </motion.p>
                  <p className="text-white/70 font-bold">秒</p>
                </div>

                {/* My score */}
                <div className="bg-white/85 backdrop-blur-sm rounded-3xl px-6 py-4 shadow-xl text-center">
                  <p className="text-gray-400 text-xs font-bold mb-1">あなたのフリフリ数</p>
                  <motion.p
                    key={myShakeScore}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.15 }}
                    className="text-5xl font-extrabold text-orange-500"
                  >
                    {myShakeScore}
                  </motion.p>
                  {!motionReady && (
                    <p className="text-xs text-gray-400 mt-2">端末センサー未許可 — タップしてもカウントされます</p>
                  )}
                </div>

                {/* Battle: ranking */}
                {gameMode === 'battle' && (
                  <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-4 shadow-xl space-y-2">
                    <p className="text-gray-500 font-extrabold text-xs text-center mb-2">🏆 リアルタイムランキング</p>
                    <AnimatePresence>
                      {[
                        { userId: myUserId, nickname: myNickname, score: myShakeScore },
                        ...Object.entries(gameScores)
                          .filter(([uid]) => uid !== myUserId)
                          .map(([uid, v]) => ({ userId: uid, nickname: v.nickname, score: v.score })),
                      ]
                        .sort((a, b) => b.score - a.score)
                        .map((entry, rank) => (
                          <motion.div
                            key={entry.userId}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-2xl ${entry.userId === myUserId ? 'bg-orange-50' : 'bg-gray-50'}`}
                          >
                            <span className="text-lg font-extrabold text-gray-400 w-6">{rank + 1}</span>
                            <p className="flex-1 font-bold text-gray-700 text-sm">{entry.nickname}</p>
                            <motion.p
                              key={entry.score}
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.15 }}
                              className="font-extrabold text-orange-500"
                            >
                              {entry.score}
                            </motion.p>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Sync: coop gauge */}
                {gameMode === 'sync' && (() => {
                  const totalShakes = Object.values(gameScores).reduce((s, v) => s + v.score, 0) + myShakeScore;
                  const rate = Math.min(100, Math.round((totalShakes / (members.length * TARGET_SHAKES_PER_PERSON)) * 100));
                  return (
                    <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-5 shadow-xl space-y-3">
                      <div className="flex justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.25, 1] }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                          className="text-6xl"
                        >
                          💗
                        </motion.div>
                      </div>
                      <p className="text-center text-gray-500 font-bold text-xs">リズムに合わせて振ろう！</p>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                          <span>シンクロゲージ</span>
                          <span className={rate >= 80 ? 'text-orange-500 font-extrabold' : ''}>{rate}%{rate >= 80 ? ' 🎉' : ''}</span>
                        </div>
                        <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: rate >= 80 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#FFB5A7,#FEC89A)' }}
                            animate={{ width: `${rate}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                      <p className="text-center text-gray-400 text-xs">
                        合計 {totalShakes} フリフリ / 目標 {members.length * TARGET_SHAKES_PER_PERSON}
                      </p>
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* ROULETTE */}
            {phase === "roulette" && (
              <motion.div
                key="roulette"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Top items */}
                <div className="bg-white/30 rounded-2xl px-4 py-3">
                  <p className="text-white text-xs font-bold mb-2">❤️ いいね上位スポット + 神の手</p>
                  <div className="flex flex-wrap gap-2">
                    {rouletteItems.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/70 text-orange-500"
                      >
                        {c.name}
                        {(likeCountMap[c.id] ?? 0) > 0 && (
                          <span className="ml-1 text-rose-500">❤️{likeCountMap[c.id]}</span>
                        )}
                      </span>
                    ))}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-800/70 text-yellow-300">
                      ？？？ ✨
                    </span>
                  </div>
                </div>

                {/* ── Power charge sub-phase ── */}
                {!isSpinning && !winnerCandidate && chargeCount < SHAKE_GOAL && (
                  <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
                    <p className="text-center font-extrabold text-gray-800 text-lg mb-1">
                      ⚡ フリフリパワーをためよう！
                    </p>
                    <p className="text-center text-gray-400 text-xs mb-4">
                      端末を振るか、タップでパワーチャージ
                    </p>

                    {/* Dynamic swinging avatar */}
                    <div className="flex justify-center mb-5">
                      <motion.div
                        animate={{ rotate: [-swingAngle, swingAngle] }}
                        transition={{
                          duration: swingDuration,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut",
                        }}
                        style={{ transformOrigin: "50% 14%", display: "inline-block" }}
                      >
                        <SwingAvatar color={myAvatarColor} size={120} swing={false} />
                      </motion.div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                        <span>フリフリパワー</span>
                        <span className={chargeReady ? "text-orange-500" : ""}>
                          {Math.min(chargeCount, SHAKE_GOAL)} / {SHAKE_GOAL}
                          {chargeReady && " ⚡MAX!"}
                        </span>
                      </div>
                      <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: chargeReady
                              ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                              : "linear-gradient(90deg, #FFB5A7, #FEC89A)",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (chargeCount / SHAKE_GOAL) * 100)}%` }}
                          transition={{ duration: 0.15 }}
                        />
                      </div>
                    </div>

                    {/* iOS permission button */}
                    {motionPermission === "unknown" && (
                      <button
                        onClick={requestMotionPermission}
                        className="w-full mb-3 py-3 rounded-2xl font-bold text-white bg-blue-400 hover:bg-blue-500 transition-all active:scale-95"
                      >
                        📱 端末センサーを許可する（iOS）
                      </button>
                    )}

                    {/* Tap-to-shake fallback */}
                    <button
                      onClick={handleShake}
                      disabled={chargeReady || isSpinning}
                      className="w-full py-4 rounded-2xl font-extrabold text-orange-500 bg-orange-50 text-lg transition-all active:scale-95 disabled:opacity-40 mb-3"
                    >
                      📳 フリフリする！
                    </button>

                    {/* Host spin button */}
                    {myIsHost && (
                      <button
                        onClick={handleSpin}
                        disabled={!chargeReady || isSpinning}
                        className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}
                      >
                        {chargeReady
                          ? "回す！🎡"
                          : `あと${SHAKE_GOAL - Math.min(chargeCount, SHAKE_GOAL)}フリフリ...`}
                      </button>
                    )}

                    {!myIsHost && (
                      <p className="text-gray-500 font-bold text-center text-sm mt-1">
                        {chargeReady
                          ? "パワーMAX！✨ ホストが回すのを待っています"
                          : "みんなでフリフリしてパワーをためよう！"}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Wheel (shown when charged, spinning, or result) ── */}
                {(isSpinning || winnerCandidate || chargeReady) && (
                  <div className="bg-white/85 backdrop-blur-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center">
                    {chargeReady && !isSpinning && !winnerCandidate && (
                      <p className="text-xs font-bold text-orange-400 mb-3">
                        ⚡ パワーMAX！ホストが回すのを待っています
                      </p>
                    )}
                    {isSpinning && (
                      <p className="text-xs font-bold text-orange-400 mb-3 animate-pulse">
                        🎡 ルーレット回転中...
                      </p>
                    )}
                    <RouletteWheel
                      items={rouletteItemsWithTrap.map((c) => c.name)}
                      spinTrigger={spinTrigger}
                      onComplete={handleRouletteComplete}
                      syncedTarget={syncedTarget}
                    />
                    {winnerCandidate && !isSpinning && (
                      <div className="mt-5 text-center animate-pop-in">
                        <p className="text-xs text-gray-400 font-bold tracking-widest">
                          {winnerCandidate.id === "trap" && winnerCandidate.name === "？？？"
                            ? "ぷらんこ神が決めています..."
                            : "決まりました！"}
                        </p>
                        <p className="text-3xl font-extrabold text-orange-500 mt-1">
                          {winnerCandidate.name === "？？？"
                            ? "⚡ ？？？ ⚡"
                            : `${winnerCandidate.name} ${winnerCandidate.id === "trap" ? "⚡" : "🎉"}`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Host: spin when charged */}
                {myIsHost && chargeReady && !isSpinning && !winnerCandidate && (
                  <button
                    onClick={handleSpin}
                    className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #FFB5A7 0%, #FEC89A 100%)" }}
                  >
                    回す！🎡
                  </button>
                )}

                {/* Guest: wait when charged */}
                {!myIsHost && chargeReady && !isSpinning && !winnerCandidate && (
                  <div className="bg-white/30 rounded-2xl px-5 py-4 text-center">
                    <p className="text-white font-extrabold text-base">
                      ⏳ ホストが回すのを待っています...
                    </p>
                  </div>
                )}

                {/* Guest: during spin */}
                {!myIsHost && isSpinning && (
                  <div className="bg-white/30 rounded-2xl px-5 py-4 text-center">
                    <p className="text-white font-extrabold text-base animate-pulse">
                      🎡 回っています！ドキドキ...
                    </p>
                  </div>
                )}

                {/* Result detail button */}
                {winnerCandidate && !isSpinning && (
                  <button
                    onClick={() => setShowWinnerModal(true)}
                    className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg active:scale-95 bg-emerald-400 hover:bg-emerald-500 transition-all"
                  >
                    {winnerCandidate.id === "trap"
                      ? "運命を確認する 😱"
                      : "詳細を見る・ここに決定！✨"}
                  </button>
                )}

                {/* Host-only: restart with same room code */}
                {myIsHost && winnerCandidate && !isSpinning && (
                  <button
                    onClick={handleNewRound}
                    className="w-full py-3 rounded-2xl font-bold text-white/90 text-base active:scale-95 transition-all"
                    style={{ background: "rgba(255,255,255,0.25)" }}
                  >
                    🔄 新しいラウンドを始める
                  </button>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
