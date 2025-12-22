-- Enable click tracking for quote module (Panchang Banner)

INSERT INTO analytics_config (module_name, event_type, display_name, description, icon, sort_order)
VALUES ('quote', 'click', 'Quote Clicks', 'Track daily quote/banner clicks', 'MousePointer', 71)
ON CONFLICT (module_name, event_type) DO NOTHING;
