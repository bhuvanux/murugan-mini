export interface DetectedIntent {
  tool: string;
  args: any;
}

const hasTamil = (text: string): boolean => /[\u0B80-\u0BFF]/.test(text);

export function detectIntent(userText: string): DetectedIntent {
  const raw = userText || "";
  const text = raw.toLowerCase();
  const tamil = hasTamil(raw);

  // Sashti Date
  if (text.includes("sashti") || raw.includes("சஷ்டி")) {
    return { tool: "get_next_sashti_date", args: {} };
  }

  // Panchangam
  if (text.includes("panchangam") || text.includes("panchang") || raw.includes("பஞ்சாங்கம்")) {
    return { tool: "get_today_panchangam", args: {} };
  }

  // Songs
  if (text.includes("song") || raw.includes("பாடல்")) {
    return { tool: "get_murugan_songs", args: {} };
  }

  // Kavacham
  if (text.includes("kavacham") || raw.includes("கவசம்")) {
    return {
      tool: "get_kavacham",
      args: { kavacham_name: "Kanda Sashti Kavacham" },
    };
  }

  // Story
  if (text.includes("story") || raw.includes("கதை")) {
    return { tool: "get_random_story", args: {} };
  }

  // Temple info (explicit Palani, otherwise general)
  if (text.includes("palani") || raw.includes("பழனி")) {
    return { tool: "get_temple_info", args: { location: "Palani" } };
  }

  if (text.includes("temple") || raw.includes("கோவில்")) {
    return { tool: "get_temple_info", args: { location: tamil ? "தமிழ்நாடு" : "Tamil Nadu" } };
  }

  // Route map – try to infer origin and Palani
  if (text.includes("route") || raw.includes("வழி")) {
    let origin = tamil ? "தமிழ்நாடு" : "Tamil Nadu";
    let templeId = "";

    // Very simple "from <place>" extraction in English
    const fromMatch = text.match(/from\s+([a-z\s]+)/);
    if (fromMatch && fromMatch[1]) {
      origin = fromMatch[1].trim();
    }

    if (text.includes("palani") || raw.includes("பழனி")) {
      templeId = "palani";
    }

    return {
      tool: "get_temple_route_map",
      args: { origin, temple_id: templeId },
    };
  }

  // Pariharam (optionally capture simple "for X")
  if (text.includes("pariharam") || raw.includes("பரிகாரம்")) {
    let problemType = "general";
    const forMatch = text.match(/pariharam\s+for\s+([a-z\s]+)/);
    if (forMatch && forMatch[1]) {
      problemType = forMatch[1].trim();
    }
    return { tool: "get_pariharam", args: { problem_type: problemType } };
  }

  // Emotional Support
  if (text.includes("sad") || raw.includes("அழுகிறேன்")) {
    return { tool: "get_emotional_support", args: { feeling: "sad" } };
  }

  // Quotes
  if (text.includes("quote") || raw.includes("வாக்கியம்")) {
    return { tool: "get_murugan_quotes", args: {} };
  }

  // Fallback to general chat
  return {
    tool: "ask_anything",
    args: { query: userText },
  };
}
