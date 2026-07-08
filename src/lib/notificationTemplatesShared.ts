export type NotificationTemplateApp = 'nequi' | 'bancolombia' | 'daviplata';

export interface NotificationTemplate {
  id: string;
  app: NotificationTemplateApp;
  title: string;
  description: string;
  created_at?: string | null;
  updated_at?: string | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
}

export const NOTIFICATION_TEMPLATE_APP_LABELS: Record<NotificationTemplateApp, string> = {
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  daviplata: 'Daviplata',
};
