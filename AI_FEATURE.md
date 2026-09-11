# SANA conversational AI

## Architecture

The browser sends a bounded JSON request to either `chatgpt.php` or a configured public Hugging Face Space. The PHP file is a thin optional proxy; it contains no model logic and reads configuration only from environment variables. The Gradio Space applies deterministic safety routing, builds the central system prompt with small user/mood context, and calls a cached open-weight instruction model.

No Hugging Face token is stored in browser JavaScript. For a private Space, configure `HF_TOKEN` only on the PHP host. A public Space needs no browser token.

## Model and configuration

The initial model is `Qwen/Qwen2.5-3B-Instruct`. Change only `MODEL_ID` in `sana-space/config.py`, or set a Space environment variable with the same name, to compare a 7B model. Generation is capped at 160 new tokens with a bounded input and a maximum of eight recent conversation messages.

## Model caching and ZeroGPU

`sana-space/model_service.py` owns the process-level model and tokenizer cache. A lock prevents duplicate initialization. The model is loaded at module startup and moved to CUDA at the module level, as required by current ZeroGPU guidance; the generation function is decorated with `@spaces.GPU`. Logs distinguish `Loading model`, `Model loaded`, and `Using cached model` without recording private messages.

The model is cached only for the lifetime of the active Space process. A Hugging Face cold restart or sleep may cause a model reload. This is expected and is different from loading the model for every message.

## Memory and privacy

The current browser tab keeps at most eight user/assistant messages in `sessionStorage`. It sends those messages with the next request so references such as “it” can be understood. “New conversation” deletes that tab history. No permanent mental-health profile is created. The most recent explicit mood check-in is stored in `localStorage` and passed as a short optional context value.

## Safety

Auditable phrase-based safety routing runs in both browser and Space before ordinary generation. Clear current-risk language interrupts normal chat and surfaces trusted emergency and human-support routes. Historical, research, and third-person markers reduce false escalation. This layer is deliberately conservative and is not a clinical classifier; production use requires expert review, localisation, monitoring, and a more thoroughly validated risk model.

The language model is also instructed not to diagnose, give medication advice, claim professional status, invent emergency numbers, or encourage dependence.

## Trusted tool actions

The Space maps deterministic action IDs to an allowlist of local routes for Breathing, Grounding, Journal, Human Support, and Emergency Resources. Model output cannot create arbitrary links, and the browser validates every returned route again.

## Deploy the Space

1. Create a Gradio Space and choose ZeroGPU in its hardware settings.
2. Upload the contents of `sana-space/` to the Space root.
3. Wait for the initial model download/build and confirm `/chat` is listed under “Use via API”.
4. For a static website, put the public `https://USERNAME-SPACE.hf.space` URL in `ai-config.js`.
5. For PHP hosting, leave `ai-config.js` blank and set `SANA_SPACE_URL` on the server. If the Space is private, also set server-only `HF_TOKEN`.

Locally, the current Python static server cannot execute PHP. Until a Space URL is configured in `ai-config.js`, the UI will intentionally show its friendly offline state.

## Evaluation

The fixed 20-prompt set covers distress, positive emotion, preference to vent, memory, diagnosis/medication boundaries, unrelated conversation, and crisis cases. Run the same set against any configured model:

```bash
cd sana-space
python -m pip install -r requirements.txt
python evaluation/run_eval.py --space USERNAME/SPACE_NAME --output qwen-3b.csv
```

Fill the qualitative scoring columns for empathy, relevance, naturalness, conciseness, safety, and notes. Change only `MODEL_ID`, redeploy, and repeat to compare 3B and 7B.

Run deterministic safety tests without loading the model:

```bash
cd sana-space
python -m unittest discover -s tests
```

## Known limitations

- The current authentication is browser-local and is appropriate for a portfolio demo, not production identity or authorisation.
- The Gradio response is returned after generation; the UI provides a modern typing/cold-start state but does not yet stream individual tokens.
- Keyword safety routing cannot understand every nuance and must not be treated as a clinical safety system.
- ZeroGPU availability and cold-start time depend on the Hugging Face queue and Space lifecycle.
- Breathing, Grounding, Journal, and professional-resource destination pages must exist on the deployed site for every action to complete.
