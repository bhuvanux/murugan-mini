# Simple rules for Murugan-related & major Hindu festivals

FESTIVAL_RULES = [
     {
         "name": "சஷ்டி",
         "match": lambda ctx: ctx.get("tithi") == 6,
     },
     {
         "name": "தைப்பூசம்",
         "match": lambda ctx: ctx.get("tamil_month") == "தை" and ctx.get("nakshatra") == 8,
     },
     {
         "name": "பிரதோஷம்",
         "match": lambda ctx: ctx.get("tithi") in {13, 28},
     },
     {
         "name": "பௌர்ணமி",
         "match": lambda ctx: ctx.get("tithi") == 15,
     },
     {
         "name": "அமாவாசை",
         "match": lambda ctx: ctx.get("tithi") == 30,
     },
     {
         "name": "கார்த்திகை",
         "match": lambda ctx: ctx.get("nakshatra") == 3,
     },
     {
         "name": "பங்குனி உத்திரம்",
         "match": lambda ctx: ctx.get("tamil_month") == "பங்குனி" and ctx.get("nakshatra") == 12,
     },
     {
         "name": "வைகாசி விசாகம்",
         "match": lambda ctx: ctx.get("tamil_month") == "வைகாசி" and ctx.get("nakshatra") == 16,
     },
 ]
