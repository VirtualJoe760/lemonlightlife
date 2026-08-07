// Local dev entry — imports the Express app and starts a listener.
// In production (Vercel), api/[[...path]].js hands requests to the app
// directly and this file is never used.

import app from "./app.js";

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`server listening on :${PORT}`));
