// supabase/functions/murugan_agent/index.ts
// Unified Murugan Agent Edge Function (scaffold)
// NOTE: This is a minimal Deno Edge Function entry with a single example tool handler.

interface MuruganAgentRequest {
  tool: string;
  arguments?: any;
}

interface MuruganAgentSuccess<T = any> {
  status: "success";
  tool: string;
  data: T;
}

interface MuruganAgentError {
  status: "error";
  tool?: string;
  error: {
    message: string;
    code?: string;
    [key: string]: any;
  };
}

function success<T = any>(tool: string, data: T): Response {
  const body: MuruganAgentSuccess<T> = {
    status: "success",
    tool,
    data,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(message: string, status = 400, tool?: string, code?: string): Response {
  const body: MuruganAgentError = {
    status: "error",
    tool,
    error: {
      message,
      code,
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function logAnalytics(tool: string, args: any, result: any) {
  // Placeholder analytics hook – to be wired into real tracking later.
  console.log("[murugan_agent][analytics]", {
    tool,
    args,
    result,
  });
}

async function handleAskAnything(args: any) {
  const query = (args?.query ?? "").toString();
  console.log("[murugan_agent] ask_anything invoked", { query });

  // Minimal example reply; real logic will be implemented later.
  return {
    reply: "Murugan Aruludan — I am here to guide you.",
    notes: "Enhanced placeholder.",
  };
}

// Panchangam & Festivals: get_next_sashti_date
async function handleGetNextSashtiDate(args: any) {
  console.log("[murugan_agent] get_next_sashti_date invoked", { args });

  return {
    next_sashti_date: "2025-01-14",
    tithi: "Shukla Sashti",
    notes: "Example placeholder until we connect real Panchangam API.",
  };
}

// Panchangam & Festivals: get_today_panchangam
async function handleGetTodayPanchangam(args: any) {
  console.log("[murugan_agent] get_today_panchangam invoked", { args });

  return {
    tithi: "Krishna Trayodashi",
    nakshatra: "Anusham",
    yogam: "Siddha",
    rahu_kaalam: "3:00 PM  4:30 PM",
    notes: "Static sample.",
  };
}

// Stories: get_murugan_story
async function handleGetMuruganStory(args: any) {
  const storyName = (args?.story_name ?? "Unknown Story").toString();
  console.log("[murugan_agent] get_murugan_story invoked", {
    storyName,
    args,
  });

  return {
    story_name: storyName,
    story_full:
      "This is a placeholder story for " +
      storyName +
      ". Lord Murugans divine grace is described beautifully in the full implementation.",
    notes: "Static story placeholder.",
  };
}

// Stories: get_random_story
async function handleGetRandomStory(args: any) {
  console.log("[murugan_agent] get_random_story invoked", { args });

  return {
    story_name: "Kanda Puranam  Battle with Surapadman",
    story_full:
      "Placeholder random story describing Murugans divine victory over Surapadman. Full content will be generated dynamically later.",
    notes: "Static random story placeholder.",
  };
}

// Stories: summarize_story
async function handleSummarizeStory(args: any) {
  const storyTextPreview = (args?.story_text ?? "").toString().slice(0, 80);
  console.log("[murugan_agent] summarize_story invoked", {
    storyTextPreview,
    args,
  });

  return {
    summary: "This is a simplified placeholder summary of the provided story.",
    notes: "Static summary placeholder.",
  };
}

// Stories: simplify_text
async function handleSimplifyText(args: any) {
  const textPreview = (args?.text ?? "").toString().slice(0, 80);
  console.log("[murugan_agent] simplify_text invoked", {
    textPreview,
    args,
  });

  return {
    simplified_text:
      "This is a simpler, easy-to-understand version of the text.",
    notes: "Static simplified text placeholder.",
  };
}

// Utility: convert_text_to_tamil
async function handleConvertTextToTamil(args: any) {
  const text = (args?.text ?? "").toString();
  const textPreview = text.slice(0, 80);
  console.log("[murugan_agent] convert_text_to_tamil invoked", {
    textPreview,
    args,
  });

  return {
    original: text,
    tamil: "இது ஒரு மாதிரி மாற்றம் (placeholder transliteration).",
    notes: "Static sample — real transliteration will come later.",
  };
}

// Utility: get_random_fact
async function handleGetRandomFact(args: any) {
  console.log("[murugan_agent] get_random_fact invoked", { args });

  return {
    fact: "Lord Murugan is also known as 'Tamil Kadavul' — the God of Tamil language.",
    notes: "Static fact placeholder.",
  };
}

// Utility: detect_language
async function handleDetectLanguage(args: any) {
  const input = (args?.text ?? "").toString();
  const inputPreview = input.slice(0, 80);
  console.log("[murugan_agent] detect_language invoked", {
    inputPreview,
    args,
  });

  return {
    input,
    detected_language: "tamil",
    notes: "Static placeholder until real language detection is added.",
  };
}

// Utility: health_check
async function handleHealthCheck(args: any) {
  console.log("[murugan_agent] health_check invoked", { args });

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    notes: "Edge function is alive.",
  };
}

// Devotional: get_murugan_quotes
async function handleGetMuruganQuotes(args: any) {
  console.log("[murugan_agent] get_murugan_quotes invoked", { args });

  return {
    quotes: [
      {
        text:
          "வேல் முருகன் நம் மனதில் துணிவையும், நம் வழியில் ஒளியையும் தருகிறான்.",
        source: "Traditional saying",
      },
      {
        text:
          "When you surrender worries at the feet of Lord Murugan, the path ahead becomes lighter.",
        source: "Devotional reflection",
      },
    ],
    notes: "Static Murugan quotes placeholder.",
  };
}

// Songs & Audio: get_murugan_songs
async function handleGetMuruganSongs(args: any) {
  console.log("[murugan_agent] get_murugan_songs invoked", { args });

  return {
    songs: [
      {
        title: "Kanda Sashti Kavacham - Original",
        youtube_url: "https://youtube.com/example1",
      },
      {
        title: "Vel Muruga Vel - Devotional",
        youtube_url: "https://youtube.com/example2",
      },
    ],
    notes: "Static placeholder list until playlist database is connected.",
  };
}

// Songs & Audio: play_specific_song
async function handlePlaySpecificSong(args: any) {
  const songName = (args?.song_name ?? "Unknown Song").toString();
  console.log("[murugan_agent] play_specific_song invoked", {
    songName,
    args,
  });

  return {
    requested_song: songName,
    youtube_url: "https://youtube.com/example",
    notes: "Static placeholder URL.",
  };
}

// Songs & Audio: get_chanting_audio
async function handleGetChantingAudio(args: any) {
  const chantName = (args?.chant_name ?? "Murugan Chant").toString();
  console.log("[murugan_agent] get_chanting_audio invoked", {
    chantName,
    args,
  });

  return {
    chant_name: chantName,
    audio_url: "https://example.com/chant.mp3",
    notes: "Static chant placeholder.",
  };
}

// Songs & Audio: get_kavacham
async function handleGetKavacham(args: any) {
  const kavachamName = (args?.kavacham_name ?? "Kanda Sashti Kavacham").toString();
  console.log("[murugan_agent] get_kavacham invoked", {
    kavachamName,
    args,
  });

  return {
    kavacham_name: kavachamName,
    lyrics: "Placeholder kavacham lyrics for demo.",
    meaning: "Placeholder meaning will be replaced by real DB data.",
    audio_url: "https://example.com/kavacham.mp3",
  };
}

// Songs & Audio: get_song_categories
async function handleGetSongCategories(args: any) {
  console.log("[murugan_agent] get_song_categories invoked", { args });

  return {
    categories: [
      "Kavacham",
      "Devotional Songs",
      "Bhajans",
      "Instrumentals",
    ],
    notes: "Static placeholder.",
  };
}

// Songs & Audio: search_song
async function handleSearchSong(args: any) {
  const query = (args?.query ?? "").toString();
  console.log("[murugan_agent] search_song invoked", {
    query,
    args,
  });

  return {
    query,
    results: [
      {
        title: "Vel Vel Muruga Vel",
        youtube_url: "https://youtube.com/example",
      },
    ],
  };
}

// Emotional & Remedy: get_pariharam
async function handleGetPariharam(args: any) {
  const problemType = (args?.problem_type ?? "general").toString();
  console.log("[murugan_agent] get_pariharam invoked", {
    problemType,
    args,
  });

  return {
    problem_type: problemType,
    pariharam: [
      "Light a ghee lamp for Lord Murugan on Tuesdays or Sashti days.",
      "Chant 'Om Saravanabhava' 27 times with a calm heart.",
      "Offer a small fruit (any available) with sincere devotion.",
    ],
    notes: "Static placeholder. Only positive, safe devotional steps.",
  };
}

// Emotional & Remedy: get_spiritual_guidance
async function handleGetSpiritualGuidance(args: any) {
  const topic = (args?.topic ?? "general").toString();
  console.log("[murugan_agent] get_spiritual_guidance invoked", {
    topic,
    args,
  });

  return {
    topic,
    guidance:
      "Stay calm and trust that Lord Murugan guides your path. Approach challenges with clarity and patience.",
    notes: "Static sample guidance.",
  };
}

// Emotional & Remedy: get_emotional_support
async function handleGetEmotionalSupport(args: any) {
  const feeling = (args?.feeling ?? "unspecified").toString();
  console.log("[murugan_agent] get_emotional_support invoked", {
    feeling,
    args,
  });

  return {
    feeling,
    message:
      "You are not alone. Lord Murugans grace surrounds you. Take a deep breath  everything will settle gently.",
    notes: "Static emotional support placeholder.",
  };
}

// Temple tools: get_temple_info
async function handleGetTempleInfo(args: any) {
  const location = args?.location ? String(args.location) : undefined;
  console.log("[murugan_agent] get_temple_info invoked", { location, args });

  return {
    temples: [
      {
        id: "palani",
        name: "Palani Murugan Temple",
        district: "Dindigul",
        description: "One of the Arupadai Veedu.",
        latitude: 10.4551,
        longitude: 77.5203,
      },
      {
        id: "tiruchendur",
        name: "Tiruchendur Murugan Temple",
        district: "Thoothukudi",
        description: "Sea-facing abode of Lord Murugan.",
        latitude: 8.4974,
        longitude: 78.1194,
      },
    ],
    notes: "Static placeholder until DB wiring.",
  };
}

// Temple tools: get_temple_photos
async function handleGetTemplePhotos(args: any) {
  const templeId = (args?.temple_id ?? "palani").toString();
  console.log("[murugan_agent] get_temple_photos invoked", { templeId, args });

  return {
    photos: [
      { url: "https://example.com/palani1.jpg", caption: "Temple view" },
      { url: "https://example.com/palani2.jpg", caption: "Hilltop view" },
    ],
  };
}

// Temple tools: get_temple_route_map
async function handleGetTempleRouteMap(args: any) {
  const origin = (args?.origin ?? "Chennai").toString();
  const templeId = (args?.temple_id ?? "palani").toString();

  const templeNameMap: Record<string, string> = {
    palani: "Palani Murugan Temple",
    tiruchendur: "Tiruchendur Murugan Temple",
  };

  const templeName = templeNameMap[templeId] ?? templeId;

  const routeUrl =
    "https://www.google.com/maps/dir/?api=1&origin=" +
    encodeURIComponent(origin) +
    "&destination=" +
    encodeURIComponent(templeName);

  console.log("[murugan_agent] get_temple_route_map invoked", {
    origin,
    templeId,
    templeName,
    routeUrl,
  });

  return {
    route_url: routeUrl,
    notes: "Placeholder route (static).",
  };
}

// Temple tools: get_distance
async function handleGetDistance(args: any) {
  const origin = (args?.origin ?? "Chennai").toString();
  const templeId = (args?.temple_id ?? "palani").toString();

  console.log("[murugan_agent] get_distance invoked", {
    origin,
    templeId,
    args,
  });

  return {
    distance_km: 143,
    travel_time: "3 hrs 20 mins",
    notes: "Static example until Maps API integration.",
  };
}

// Temple tools: get_temple_timings
async function handleGetTempleTimings(args: any) {
  const templeId = (args?.temple_id ?? "palani").toString();
  console.log("[murugan_agent] get_temple_timings invoked", {
    templeId,
    args,
  });

  return {
    temple_id: templeId,
    timings: [
      "5:00 AM - 12:30 PM",
      "4:00 PM - 8:30 PM",
    ],
  };
}

// Panchangam & Festivals: get_festival_list
async function handleGetFestivalList(args: any) {
  console.log("[murugan_agent] get_festival_list invoked", { args });

  return [
    { name: "Thaipusam", date: "2025-02-10" },
    { name: "Skanda Sashti", date: "2025-11-02" },
  ];
}

// Panchangam & Festivals: get_festival_details
async function handleGetFestivalDetails(args: any) {
  const festivalName = (args?.festival_name ?? "Unknown Festival").toString();
  console.log("[murugan_agent] get_festival_details invoked", {
    festivalName,
    args,
  });

  return {
    festival_name: festivalName,
    description: "Placeholder festival description for now.",
    rituals: ["Abhishekam", "Vel Pooja"],
    notes: "Static sample.",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let payload: MuruganAgentRequest;

  try {
    payload = (await req.json()) as MuruganAgentRequest;
  } catch (error) {
    console.error("[murugan_agent] JSON parse error", error);
    return errorResponse("Invalid JSON body", 400);
  }

  if (!payload || typeof payload.tool !== "string") {
    return errorResponse("Missing or invalid 'tool' field", 400);
  }

  const tool = payload.tool;
  const args = payload.arguments ?? {};

  try {
    let data: any;

    switch (tool) {
      case "ask_anything": {
        data = await handleAskAnything(args);
        break;
      }

      case "get_next_sashti_date": {
        data = await handleGetNextSashtiDate(args);
        break;
      }

      case "get_today_panchangam": {
        data = await handleGetTodayPanchangam(args);
        break;
      }

      case "get_festival_list": {
        data = await handleGetFestivalList(args);
        break;
      }

      case "get_festival_details": {
        data = await handleGetFestivalDetails(args);
        break;
      }

      case "get_temple_info": {
        data = await handleGetTempleInfo(args);
        break;
      }

      case "get_temple_photos": {
        data = await handleGetTemplePhotos(args);
        break;
      }

      case "get_temple_route_map": {
        data = await handleGetTempleRouteMap(args);
        break;
      }

      case "get_distance": {
        data = await handleGetDistance(args);
        break;
      }

      case "get_temple_timings": {
        data = await handleGetTempleTimings(args);
        break;
      }

      case "get_murugan_story": {
        data = await handleGetMuruganStory(args);
        break;
      }

      case "get_random_story": {
        data = await handleGetRandomStory(args);
        break;
      }

      case "summarize_story": {
        data = await handleSummarizeStory(args);
        break;
      }

      case "simplify_text": {
        data = await handleSimplifyText(args);
        break;
      }

      case "get_murugan_songs": {
        data = await handleGetMuruganSongs(args);
        break;
      }

      case "play_specific_song": {
        data = await handlePlaySpecificSong(args);
        break;
      }

      case "get_chanting_audio": {
        data = await handleGetChantingAudio(args);
        break;
      }

      case "get_kavacham": {
        data = await handleGetKavacham(args);
        break;
      }

      case "get_song_categories": {
        data = await handleGetSongCategories(args);
        break;
      }

      case "search_song": {
        data = await handleSearchSong(args);
        break;
      }

      case "get_pariharam": {
        data = await handleGetPariharam(args);
        break;
      }

      case "get_spiritual_guidance": {
        data = await handleGetSpiritualGuidance(args);
        break;
      }

      case "get_emotional_support": {
        data = await handleGetEmotionalSupport(args);
        break;
      }

      case "convert_text_to_tamil": {
        data = await handleConvertTextToTamil(args);
        break;
      }

      case "get_random_fact": {
        data = await handleGetRandomFact(args);
        break;
      }

      case "detect_language": {
        data = await handleDetectLanguage(args);
        break;
      }

      case "health_check": {
        data = await handleHealthCheck(args);
        break;
      }

      case "get_murugan_quotes": {
        data = await handleGetMuruganQuotes(args);
        break;
      }

      default: {
        return errorResponse(`Unknown tool: ${tool}`, 400, tool, "UNKNOWN_TOOL");
      }
    }

    await logAnalytics(tool, args, data);
    return success(tool, data);
  } catch (error: any) {
    console.error("[murugan_agent] Unhandled error", error);
    return errorResponse(
      error?.message || "Internal server error",
      500,
      tool,
      "INTERNAL_ERROR",
    );
  }
});
