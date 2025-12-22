export type MuruganUserLanguage = "ta" | "en" | "tamil" | "english";

const toInternalLang = (lang: MuruganUserLanguage | undefined): "tamil" | "english" => {
  if (lang === "ta" || lang === "tamil") return "tamil";
  return "english";
};

export function formatMuruganResponse(
  tool: string,
  data: any,
  userLanguage: MuruganUserLanguage = "ta",
): string {
  const lang = toInternalLang(userLanguage);
  const t = (ta: string, en: string) => (lang === "tamil" ? ta : en);

  const safe = (value: any, fallback: string = "-") => {
    if (value === null || value === undefined) return fallback;
    const s = String(value).trim();
    return s.length ? s : fallback;
  };

  try {
    switch (tool) {
      // General chat
      case "ask_anything": {
        const reply = safe(data?.reply || data?.message || data?.text, "");
        if (!reply) {
          return t(
            "முருகனின் அருள் உங்களை வழிநடத்தட்டும்.",
            "May Lord Murugan guide you with grace.",
          );
        }
        return reply;
      }

      // Panchangam & festivals
      case "get_today_panchangam": {
        const tithi = safe(data?.tithi);
        const nakshatra = safe(data?.nakshatra);
        const yogam = safe(data?.yogam);
        const rahu = safe(data?.rahu_kaalam);

        if (lang === "tamil") {
          return (
            "இன்றைய பஞ்சாங்கம்:\n" +
            `• திதி: ${tithi}\n` +
            `• நக்ஷத்திரம்: ${nakshatra}\n` +
            `• யோகம்: ${yogam}\n` +
            `• ராகு காலம்: ${rahu}\n\n` +
            "முருகனின் அருள் எப்போதும் உங்களுடன் இருக்கட்டும்."
          );
        }
        return (
          "Today’s Panchangam:\n" +
          `• Tithi: ${tithi}\n` +
          `• Nakshatra: ${nakshatra}\n` +
          `• Yogam: ${yogam}\n` +
          `• Rahu Kaalam: ${rahu}\n\n` +
          "May Lord Murugan bless your day."
        );
      }

      case "get_next_sashti_date": {
        const date = safe(data?.next_sashti_date);
        const tithi = safe(data?.tithi);
        if (lang === "tamil") {
          return (
            `அடுத்த சஷ்டி நாள்: ${date}\n` +
            `திதி: ${tithi}\n\n` +
            "அந்த நாளில் பக்தியுடன் முருகனை வழிபட்டால் மனஅமைதி பெருகும்."
          );
        }
        return (
          `Next Sashti date: ${date}\n` +
          `Tithi: ${tithi}\n\n` +
          "Worship Lord Murugan on this day with devotion for peace of mind."
        );
      }

      case "get_festival_list": {
        const list: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.festivals)
          ? data.festivals
          : [];
        if (!list.length) {
          return t(
            "தற்போது திருவிழா தகவல்கள் இல்லை.",
            "No festival information is available right now.",
          );
        }
        const lines = list.map((f) => `• ${safe(f.name)} – ${safe(f.date)}`);
        return (
          t("வரவிருக்கும் முருகன் திருவிழாக்கள்:", "Upcoming Murugan festivals:") +
          "\n" +
          lines.join("\n")
        );
      }

      case "get_festival_details": {
        const name = safe(data?.festival_name);
        const desc = safe(data?.description, "");
        const rituals: any[] = Array.isArray(data?.rituals)
          ? data.rituals
          : [];
        const ritualLines = rituals.map((r) => `• ${safe(r)}`);
        return (
          (lang === "tamil"
            ? `முருகன் திருவிழா: ${name}\n\n${desc}`
            : `Murugan festival: ${name}\n\n${desc}`) +
          (ritualLines.length
            ? "\n\n" + t("முக்கிய சடங்குகள்:", "Key rituals:") +
              "\n" +
              ritualLines.join("\n")
            : "")
        );
      }

      // Temple tools
      case "get_temple_info": {
        const temples: any[] = Array.isArray(data?.temples)
          ? data.temples
          : [];
        if (!temples.length) {
          return t(
            "முருகன் கோவில் தகவல் எதுவும் கிடைக்கவில்லை.",
            "No Murugan temple information was found.",
          );
        }
        const header = t(
          "உங்களுக்கு உதவக்கூடிய முருகன் கோவில்கள்:",
          "Here are some Murugan temples that may help you:",
        );
        const lines = temples.map((tpl) => {
          const name = safe(tpl.name);
          const district = safe(tpl.district, "");
          const desc = safe(tpl.description, "");
          return `• ${name}${district ? " – " + district : ""}$${
            desc ? "\n  " + desc : ""
          }`;
        });
        return header + "\n" + lines.join("\n\n");
      }

      case "get_temple_route_map": {
        const url = safe(data?.route_url);
        return (
          t("இங்கு வழி வரைபட இணைப்பு:", "Here is your route link:") +
          "\n" +
          url +
          "\n\n" +
          t(
            "முருகனின் அருளுடன் உங்கள் பயணம் சிறப்பாக அமையட்டும்.",
            "May your journey be blessed by Lord Murugan.",
          )
        );
      }

      case "get_distance": {
        const km = safe(data?.distance_km);
        const time = safe(data?.travel_time);
        return t(
          `தூரம்: ${km} கி.மீ.\nபயண நேரம்: ${time}.\n\nமெதுவாகவும் பாதுகாப்பாகவும் பயணம் செய்யுங்கள்.`,
          `Distance: ${km} km.\nApprox. travel time: ${time}.\n\nTravel calmly and safely with Murugan's grace.`,
        );
      }

      case "get_temple_timings": {
        const timings: any[] = Array.isArray(data?.timings)
          ? data.timings
          : [];
        const id = safe(data?.temple_id, "");
        const lines = timings.map((tmg) => `• ${safe(tmg)}`);
        return (
          (lang === "tamil"
            ? `கோவில் நேரங்கள் (${id}):`
            : `Temple timings (${id}):`) +
          (lines.length ? "\n" + lines.join("\n") : "")
        );
      }

      // Stories
      case "get_murugan_story":
      case "get_random_story": {
        const name = safe(data?.story_name, "");
        const full = safe(data?.story_full, "");
        if (lang === "tamil") {
          return (
            (name ? `இன்றைய முருகன் அருள்கதை: ${name}\n\n` : "இன்றைய முருகன் அருள்கதை:\n\n") +
            full +
            "\n\nஅருள் பெறும் வாழ்வு உங்களுக்கு கூடுகட்டும்."
          );
        }
        return (
          (name ? `Today's Murugan story: ${name}\n\n` : "Today's Murugan story:\n\n") +
          full +
          "\n\nMay this story bring you courage and devotion."
        );
      }

      case "summarize_story": {
        const summary = safe(data?.summary);
        return t(
          `கதையின் சுருக்கம்:\n${summary}`,
          `Here is a short summary of the story:\n${summary}`,
        );
      }

      case "simplify_text": {
        const text = safe(data?.simplified_text);
        return t(
          `எளிமைப்படுத்தப்பட்ட உரை:\n${text}`,
          `Simplified text:\n${text}`,
        );
      }

      // Songs & audio
      case "get_murugan_songs": {
        const songs: any[] = Array.isArray(data?.songs) ? data.songs : [];
        if (!songs.length) {
          return t(
            "முருகன் பாடல்கள் தற்போது கிடைக்கவில்லை.",
            "No Murugan songs are available at the moment.",
          );
        }
        const header = t(
          "சில முருகன் பக்தி பாடல்கள்:",
          "Some Murugan devotional songs:",
        );
        const lines = songs.map((song) => {
          const title = safe(song.title);
          const url = safe(song.youtube_url, "");
          return `• ${title}${url ? "\n  " + url : ""}`;
        });
        return header + "\n" + lines.join("\n\n");
      }

      case "play_specific_song": {
        const title = safe(data?.requested_song);
        const url = safe(data?.youtube_url, "");
        return t(
          `நீங்கள் கேட்ட பாடல்: ${title}${url ? "\n" + url : ""}\n\nமுருகனின் அருளுடன் இந்த பாடலை கேளுங்கள்.`,
          `Requested song: ${title}${url ? "\n" + url : ""}\n\nListen with devotion and Murugan's grace.`,
        );
      }

      case "get_chanting_audio": {
        const name = safe(data?.chant_name);
        const url = safe(data?.audio_url, "");
        return t(
          `ஜபம்: ${name}${url ? "\n" + url : ""}\n\nஅமைதியாக அமர்ந்து இந்த மந்திரத்தை கேளுங்கள்.`,
          `Chant: ${name}${url ? "\n" + url : ""}\n\nSit calmly and listen to this chant.`,
        );
      }

      case "get_kavacham": {
        const name = safe(data?.kavacham_name);
        const lyrics = safe(data?.lyrics, "");
        const meaning = safe(data?.meaning, "");
        const url = safe(data?.audio_url, "");
        if (lang === "tamil") {
          return (
            `கவசம்: ${name}\n\n` +
            lyrics +
            (meaning ? `\n\nபொருள்:\n${meaning}` : "") +
            (url ? `\n\nநேரடி கேட்க:\n${url}` : "")
          );
        }
        return (
          `Kavacham: ${name}\n\n` +
          lyrics +
          (meaning ? `\n\nMeaning:\n${meaning}` : "") +
          (url ? `\n\nListen:\n${url}` : "")
        );
      }

      case "get_song_categories": {
        const cats: any[] = Array.isArray(data?.categories)
          ? data.categories
          : [];
        if (!cats.length) {
          return t(
            "பாடல் வகைகள் கிடைக்கவில்லை.",
            "No song categories are available.",
          );
        }
        const lines = cats.map((c) => `• ${safe(c)}`);
        return (
          t("முருகன் பக்தி பாடல் வகைகள்:", "Murugan song categories:") +
          "\n" +
          lines.join("\n")
        );
      }

      case "search_song": {
        const q = safe(data?.query, "");
        const results: any[] = Array.isArray(data?.results)
          ? data.results
          : [];
        if (!results.length) {
          return t(
            `"${q}" என்பதற்கான பாடல்கள் இல்லை.`,
            `No songs found for "${q}".`,
          );
        }
        const header = t(
          `"${q}" சம்பந்தப்பட்ட பாடல்கள்:`,
          `Songs related to "${q}":`,
        );
        const lines = results.map((r) => {
          const title = safe(r.title);
          const url = safe(r.youtube_url, "");
          return `• ${title}${url ? "\n  " + url : ""}`;
        });
        return header + "\n" + lines.join("\n\n");
      }

      // Emotional & remedy tools
      case "get_pariharam": {
        const type = safe(data?.problem_type);
        const items: any[] = Array.isArray(data?.pariharam)
          ? data.pariharam
          : [];
        const header =
          lang === "tamil"
            ? `சிக்கல் வகை: ${type}\nமுருகன் பரிகார வழிகள்:`
            : `Problem type: ${type}\nSuggested Murugan pariharam steps:`;
        const lines = items.map((p: any) => `• ${safe(p)}`);
        return header + (lines.length ? "\n" + lines.join("\n") : "");
      }

      case "get_spiritual_guidance": {
        const topic = safe(data?.topic, "");
        const guidance = safe(data?.guidance);
        return t(
          (topic
            ? `ஆன்மீக வழிகாட்டல் (${topic}):\n${guidance}`
            : `ஆன்மீக வழிகாட்டல்:\n${guidance}`),
          (topic
            ? `Spiritual guidance (${topic}):\n${guidance}`
            : `Spiritual guidance:\n${guidance}`),
        );
      }

      case "get_emotional_support": {
        const feeling = safe(data?.feeling, "");
        const msg = safe(data?.message);
        return t(
          (feeling
            ? `உங்கள் உணர்வு: ${feeling}\n\n${msg}`
            : msg),
          (feeling
            ? `How you are feeling: ${feeling}\n\n${msg}`
            : msg),
        );
      }

      // Utility tools
      case "convert_text_to_tamil": {
        const original = safe(data?.original, "");
        const tamil = safe(data?.tamil);
        return t(
          `மூல உரை:\n${original}\n\nதமிழில் (மாதிரி மாற்றம்):\n${tamil}`,
          `Original text:\n${original}\n\nTamil (sample transliteration):\n${tamil}`,
        );
      }

      case "get_random_fact": {
        const fact = safe(data?.fact);
        return t(
          `முருகன் குறித்த ஒரு சுவாரஸ்யமான தகவல்:\n${fact}\n\nவேல் முருகன் எப்போதும் உங்களை காக்கட்டும்.`,
          `A devotional fact about Lord Murugan:\n${fact}\n\nMay Vel Murugan always protect you.`,
        );
      }

      case "get_murugan_quotes": {
        const quotes: any[] = Array.isArray(data?.quotes) ? data.quotes : [];
        if (!quotes.length) {
          return t(
            "முருகன் வாக்கியங்கள் தற்போது இல்லை.",
            "No Murugan quotes are available right now.",
          );
        }
        const header = t(
          "இன்றைய முருகன் உணர்வூட்டும் வாக்கியங்கள்:",
          "Devotional quotes from Lord Murugan:",
        );
        const lines = quotes.map((q) => {
          const text = safe(q.text);
          const source = safe(q.source, "");
          return `• ${text}${source ? "\n  — " + source : ""}`;
        });
        return header + "\n" + lines.join("\n\n");
      }

      case "detect_language": {
        const input = safe(data?.input, "");
        const langCode = safe(data?.detected_language, "");
        return t(
          `உங்கள் உரையின் மொழி (மாதிரி கணிப்பு): ${langCode}\n\nஉரை:\n${input}`,
          `Detected language (sample guess): ${langCode}\n\nText:\n${input}`,
        );
      }

      case "health_check": {
        const status = safe(data?.status);
        const ts = safe(data?.timestamp, "");
        return t(
          `சேவை நிலை: ${status}\nசமயம்: ${ts}`,
          `Service status: ${status}\nTimestamp: ${ts}`,
        );
      }

      default: {
        // Generic, non-JSON fallback formatting
        if (typeof data === "string") {
          return data;
        }
        if (Array.isArray(data)) {
          const lines = data.map((item, idx) => `• ${safe(item, `Item ${idx + 1}`)}`);
          return lines.join("\n");
        }
        if (data && typeof data === "object") {
          const entries = Object.entries(data);
          const lines = entries.map(([key, value]) => `• ${key}: ${safe(value)}`);
          return lines.join("\n");
        }
        return t(
          "முருகனின் அருளுடன் பதில் தயார், ஆனால் விவரங்கள் கிடைக்கவில்லை.",
          "A response was prepared with Murugan's grace, but details are missing.",
        );
      }
    }
  } catch (error) {
    console.error("[formatMuruganResponse] Error formatting response for tool", tool, error);
    return t(
      "முருகன் அருளுடன் சிறிய சிக்கல் ஏற்பட்டது. தயவு செய்து மீண்டும் முயற்சிக்கவும்.",
      "There was a small issue formatting the response. Please try again.",
    );
  }
}
