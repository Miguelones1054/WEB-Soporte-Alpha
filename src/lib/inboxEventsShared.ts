export interface InboxEvent {
  id: string;
  title: string;
  description: string;
  url: string;
  url_image: string;
  created_at?: string | null;
  updated_at?: string | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
}
