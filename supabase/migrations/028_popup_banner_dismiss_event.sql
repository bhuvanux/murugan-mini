INSERT INTO analytics_config (module_name, event_type, display_name, description, icon, sort_order)
VALUES
  ('popup_banner', 'dismiss', 'Popup Banner Dismissals', 'Track when popup banners are dismissed', 'X', 82)
ON CONFLICT (module_name, event_type) DO NOTHING;
