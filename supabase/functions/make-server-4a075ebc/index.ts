// Supabase Edge Function entrypoint for make-server-4a075ebc
// This file simply imports the main server implementation located in src/supabase/functions/server/index.tsx
// The imported file calls Deno.serve(app.fetch) and wires all routes, including /api/upload/sparkle.

import "../../../src/supabase/functions/server/index.tsx";
