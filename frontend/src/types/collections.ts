export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  screenshot_count?: number; // Fetched via relation
}
