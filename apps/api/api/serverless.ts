import { createApp } from '../src/app.js';

// Export the Express app so Vercel can run it as a serverless function
const app = createApp();

export default app;
