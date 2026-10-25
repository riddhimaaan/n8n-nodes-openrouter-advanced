# n8n-nodes-openrouter-advanced

An n8n community node for the [OpenRouter](https://openrouter.ai) API.

n8n ships an OpenRouter chat model node, but it only exposes nine settings. This package
covers the inference side of the API properly: chat, responses, Anthropic-style messages,
image generation, video generation, text-to-speech, transcription, embeddings and reranking —
plus the OpenRouter-specific controls that make it worth using in the first place, like
provider routing, plugins, reasoning effort and hard price ceilings.

Multimodal input is a first-class field rather than something you hand-assemble: attach an
image, a video, an audio clip or a PDF straight from a binary field and the node builds the
request for you.

## Two nodes

**OpenRouter** — a regular action node. Drag it into a workflow to call any of the endpoints below.

**OpenRouter Chat Model (Advanced)** — an AI sub-node. Connect it to an AI Agent, Basic LLM
Chain, or any other node that takes a language model. It does everything the built-in
OpenRouter Chat Model does, plus provider routing, plugins, reasoning control and model fallbacks.

Both use the **existing `OpenRouter` credential** that ships with n8n, so there is no new
credential to set up and nothing to re-enter.

## What it covers

| Resource | Operations |
|---|---|
| **Chat** | Complete |
| **Response** | Create |
| **Message** | Create (Anthropic format) |
| **Image** | Generate, List Models |
| **Video** | Generate, Generate and Wait, Get Status, Download, List Models |
| **Audio** | Text to Speech, Transcribe |
| **Embedding** | Create, List Models |
| **Rerank** | Rerank |
| **Model** | List, Get, List Endpoints, List Providers |

### Attachments

Chat and Response have an **Attachments** section that sends images, video, audio and
documents alongside the prompt. Point it at a binary field on the incoming item and it reads
the file, encodes it, and builds the content part itself — no conversion node in front, no
hand-written JSON.

Each attachment takes a **Type** and a **Source**. Leave Type on *Auto* and the file's own
type decides whether it goes as an image, a video, audio or a document. Source is a binary
field by default, but a URL or an already-encoded base64 string work too.

| Type | Chat sends | Response sends |
|---|---|---|
| Image | `image_url` | `input_image` |
| Video | `video_url` | `input_video` |
| Audio | `input_audio` | `input_audio` |
| File | `file` | `input_file` |

Add as many as you like to one prompt — an image and a video together, three screenshots, a
PDF plus a question about it.

Two things worth knowing:

- **A URL is fetched by the model provider, not by n8n.** Plenty of hosts block that, so a
  perfectly valid link can still come back as a 400. A binary field always works.
- **Audio has no URL form** in either API. Download it first, then attach the binary field.
  The node says so rather than sending a broken request.

Attachments appear only on the simple input modes. The raw *Messages* and *Input Items* modes
already hand you the content array, so build the parts yourself there.

### Provider routing

Decide which upstream provider serves each request: order, allow-list, ignore-list, sort by
price / throughput / latency / accuracy, quantization filter, zero data retention, data
collection policy, latency and throughput preferences, and **max price** ceilings per prompt
token, completion token, image or whole request. The request fails rather than exceeding them.

### Plugins

All ten are supported, each with its own settings: Web Search, Web Fetch, File Parser,
Moderation, Response Healing, Context Compression, Auto Router, Pareto Router and Fusion.

### Reasoning

Effort from `minimal` through `max`, plus how much of the reasoning trace to return.

### Everything else

Model fallback chains, structured output (JSON object, JSON schema, grammar, Python), tool
calling, prompt caching, the full sampling parameter set, session IDs, tracing metadata and
leaderboard attribution headers.

## Installing

The package is built and symlinked into n8n's custom-node folder:

```bash
cd "/run/media/nothingness/New Volume/Custom N8n Nodes/n8n-nodes-openrouter-advanced"
npm install && npm run build
ln -sfn "$PWD" ~/.n8n/custom/node_modules/n8n-nodes-openrouter-advanced
```

Restart n8n afterwards so it picks the nodes up.

> **Note:** the package lives on the external drive. If the drive is not mounted, n8n will
> start without these nodes and any workflow using them will fail to load.

## Development

```bash
npm run build     # compile TypeScript and copy icons
npm run dev       # recompile on change
npm run lint      # n8n community-node lint rules
npm run lintfix   # autofix what it can
```

### Dependency handling

`n8n-workflow`, `@langchain/core`, `@langchain/openai` and `@n8n/ai-utilities` are **not
shipped**. n8n adds its own `node_modules` to `NODE_PATH` at startup, so an installed copy of
this package borrows whatever versions n8n itself is running. They are declared as optional
`peerDependencies` and kept in `devDependencies` only so the TypeScript build can see them.

That means the published package never goes stale against a newer n8n — there is nothing to
re-pin after an upgrade.

**For local development via a symlink**, the story differs: the `devDependencies` installed
next to the source *do* shadow n8n's copies at runtime, because `NODE_PATH` is searched last.
So after upgrading n8n, match the devDependency versions to the new install and rebuild:

```bash
node -p "require('<n8n-install>/node_modules/n8n-workflow/package.json').version"
```

A quick way to check what an installed copy would actually load:

```bash
NODE_PATH=<n8n-install>/node_modules node -p "require('n8n-workflow/package.json').version"
```

## Notes

- **Streaming is off** on the action node. n8n returns a complete item per execution, so there
  is nothing to stream into. The sub-node streams normally through LangChain.
- **Video generation is asynchronous.** *Generate* submits the job and returns a job ID.
  *Generate and Wait* submits, polls, and downloads the finished file, with a configurable
  poll interval and timeout. If it times out, the job ID is included in the error so you can
  pick it up later with *Get Status*.
- **Binary data**: generated images, speech and video are written to a binary field you name.
  Transcription and attachments read from binary fields on the incoming item.
- Enterprise and account-management endpoints (Workspaces, SCIM, Guardrails, Observability,
  BYOK, API Keys, Credits, Activity, Analytics, Files, Presets) are deliberately out of scope.
  They can be added as extra resources later without restructuring anything.

## Licence

MIT
