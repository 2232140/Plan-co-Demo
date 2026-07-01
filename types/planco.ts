export interface Suggestion {
  id: string;
  name: string;
  budget: string;
  description: string;
  reason: string;
}

export interface SuggestRequest {
  peopleCount: string;
  budget: string;
  theme: string;
  location: string;
}

export interface HistoryEntry {
  id: string;
  created_at: string;
  type: "ai" | "custom";
  conditions: {
    peopleCount?: string;
    budget?: string;
    theme?: string;
    location?: string;
  };
  options: string[];
  selected_option: string;
}
