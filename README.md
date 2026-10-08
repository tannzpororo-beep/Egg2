# TANN EGG HEIST 3D — V2 Fast Start

Static GitHub/Vercel build. No npm, Node.js, Supabase, Firebase, or backend is required to play the single-player game.

## Deploy
Upload the contents of this folder to GitHub, then import the repository into Vercel. Use **Framework: Other**, **Build Command: empty**, **Output Directory: .**

## Performance changes
- Starter world only is created before gameplay.
- Distant biomes stream in after gameplay starts.
- Starter scenery reduced.
- Shadow map reduced to 512.
- Pixel ratio capped at 1.25 for mobile.
- Only one guardian is active at startup.
- Service worker caches the game shell for faster repeat launches.
