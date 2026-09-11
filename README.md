# SANA

SANA is a student wellbeing web application with mood check-ins, reports, peer community features, support tools, evaluation, and an AI-assisted supportive chat.

## Architecture

- The SANA website is served by a small Node server that delivers the existing HTML/CSS/JavaScript interface.
- `Xinxinzi1021/sana-ai` remains the Hugging Face Gradio + ZeroGPU inference backend using Qwen.
- The frontend server calls that backend through a same-origin `/api/chat` proxy. `HF_TOKEN` is a Hugging Face Space Secret and is never delivered to the browser.

## Development

For a local frontend with the secure chat proxy, authenticate with the Hugging Face CLI and run:

```bash
HF_TOKEN="$(hf auth token)" npm start
```

Open `http://localhost:7860/`. Accounts in this static demo are stored in browser localStorage; use Sign Up to create one.
