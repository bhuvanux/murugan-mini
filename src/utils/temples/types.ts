export type TempleRow = {
  id: string;
  temple_name_ta: string;
  temple_name_en: string | null;
  temple_fame: string;
  place: string;
  latitude: number | null;
  longitude: number | null;
  google_map_url: string | null;
  is_active: boolean;
  is_distance_enabled: boolean | null;
  click_count: number | null;
  search_key: string;
  created_at: string;
  updated_at: string;
};

export type TempleFestivalRow = {
  id: string;
  temple_id: string;
  festival_id: string;
  created_at: string;
};
