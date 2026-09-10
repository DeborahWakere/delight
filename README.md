# Delight

Delight is a student productivity agent: upload a photo of assignments, tell it what you want, and receive an actionable plan.

## Project structure

```text
DELIGHT/
├── apps/
│   ├── web/              # React + Vite + TypeScript frontend
│   └── api/              # Node.js + Express + TypeScript + DBOS
├── packages/
│   └── shared/           # Shared TypeScript types
├── dbos-config.yaml      # DBOS application configuration
├── docker-compose.yml    # Local PostgreSQL
├── .env.example
├── package.json
└── README.md
```

This keeps the important DBOS configuration at the project root, like your original DBOS project. The old Python `env/` folder is not needed because this version is a Node.js application.

## Stack

- React + Vite + TypeScript frontend
- Node.js + Express + TypeScript API
- DBOS TypeScript SDK for durable agent workflows
- OpenAI Responses API for image understanding
- PostgreSQL for DBOS system state
- npm workspaces for the monorepo

## User flow

1. User uploads an assignment photo.
2. User enters a natural-language command.
3. API stores the image locally and starts a durable DBOS workflow.
4. The workflow calls the vision model in a DBOS step.
5. The result is returned as structured todos.
6. React polls the job and renders the plan.

DBOS is used for the recoverable part of the agent. Its workflow state is stored in PostgreSQL so an interrupted workflow can resume from its last completed step.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL (or Docker)
- OpenAI API key

## Run locally

```bash
cp .env.example .env
# Put your OpenAI API key in .env
npm install
docker compose up -d
npm run dev
```

Open `http://localhost:5173`.

The API runs on `http://localhost:3001`.

The DBOS configuration is in the root `dbos-config.yaml`.

## Production note

The MVP stores uploads on the API server's local disk. Before deploying, replace this with object storage (for example S3-compatible storage) and pass an object key/URL into the workflow. Do not commit `.env`, uploaded images, or API keys.
