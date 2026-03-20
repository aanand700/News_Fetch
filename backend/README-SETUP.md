# LLM Setup (Required for Editorial Brief Filtering)

The LLM filters articles using your Editorial Brief. **Without this setup, all fetched articles are stored with generic heuristic scoring.**

## Steps

1. **Get an OpenAI API key**  
   https://platform.openai.com/api-keys

2. **Create `backend/.env`** (in this folder):
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Restart the backend**  
   Stop and run `npm run dev` again so it picks up the new env var.

4. **Save your Editorial Brief**  
   In the app, expand "Editorial Brief / Fetch Criteria", add your instructions, click Save.

5. **Run fetch**  
   Click "Run fetch now". You should see "Added X articles (LLM filtered by your brief)".

## Verify

- When LLM is configured, the yellow warning banner disappears.
- On backend startup, the console shows "LLM configured" or "LLM not configured".
- After a fetch, the success message says "(LLM filtered by your brief)" when it worked.

## Note on existing articles

LLM only filters **new** articles during each fetch. Articles stored before you set up the LLM will remain. To start fresh, you can remove feeds and re-add them, or clear the database (delete `backend/data/news.db` and restart).
