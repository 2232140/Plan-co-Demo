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
