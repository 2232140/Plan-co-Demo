import { supabase } from "./supabase";
import { HistoryEntry } from "@/types/planco";

const LOCAL_KEY = "planco_history";

function loadLocal(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {}
}

export async function saveHistory(entry: Omit<HistoryEntry, "id" | "created_at">): Promise<void> {
  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("roulette_histories").insert({
        type: newEntry.type,
        conditions: newEntry.conditions,
        options: newEntry.options,
        selected_option: newEntry.selected_option,
      });
      return;
    } catch {
      // fallthrough to localStorage
    }
  }

  const existing = loadLocal();
  saveLocal([newEntry, ...existing]);
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("roulette_histories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) return data as HistoryEntry[];
    } catch {
      // fallthrough to localStorage
    }
  }

  return loadLocal();
}
