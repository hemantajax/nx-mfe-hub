## 06 — Docker Compose for Local Environments

> **TL;DR:** Docker Compose lets you define **multi-container stacks** (UI, API, DB, cache) in a single YAML file and run them with one command. For UI architects, it is the standard tool to spin up a full environment locally and in ephemeral preview environments.

---

## 1. What Problem Does Compose Solve?

Without Compose, you'd need to:

- Run multiple `docker run ...` commands.
- Manually remember:
  - Port mappings.
  - Networks.
  - Volumes.
  - Environment variables.

This becomes unmanageable with:

- Several APIs.
- Databases and caches.
- Message brokers.

**Compose** solves this by:

- Declaring your stack in `docker-compose.yml` (or `compose.yml`).
- Making it easy to:
  - Start everything with `docker compose up`.
  - Stop and clean up with `docker compose down`.

---

## 2. Compose File Structure

Typical `docker-compose.yml`:

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: ./api
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/mydb
    ports:
      - "8080:8080"

  ui:
    build: ./ui
    depends_on:
      - api
    ports:
      - "4200:80"

volumes:
  pgdata:
```

Key concepts:

- `services` — containers in your stack.
- `image` / `build` — use an existing image or build from a Dockerfile.
- `environment` — env vars.
- `ports` — host:container port mappings.
- `volumes` — attach volumes by name.
- `depends_on` — startup ordering (note: doesn't wait for service to be *ready*, just *started*).

---

## 3. Local Full-Stack Example for UI Architect

Imagine:

- `ui-shell` — Angular shell app built into NGINX image.
- `api-bff` — Node/Express BFF.
- `db` — Postgres.

Compose file:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api-bff:
    build: ./apps/bff
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/mydb
    ports:
      - "8080:8080"
    depends_on:
      - db

  ui-shell:
    build: ./apps/ui-shell
    ports:
      - "4200:80"
    depends_on:
      - api-bff

volumes:
  pgdata:
```

Run:

```bash
docker compose up --build
```

Now:

- `http://localhost:4200` → UI shell.
- `ui-shell` calls `http://api-bff:8080/...` within the network.
- `api-bff` connects to Postgres via `db:5432`.

---

## 4. Profiles & Environment-Specific Overrides

Compose supports:

- **Profiles** — selectively enable services.
- **Override files** — environment-specific overrides like `docker-compose.override.yml`.

Profiles example:

```yaml
services:
  db:
    image: postgres:16-alpine

  mailhog:
    image: mailhog/mailhog
    profiles: ["dev"]
    ports:
      - "8025:8025"
```

Run dev-only services:

```bash
docker compose --profile dev up
```

Override example:

- `docker-compose.yml` — baseline.
- `docker-compose.override.yml` — developer-specific overrides (not committed, or committed with local-friendly settings).

---

## 5. Compose Networking Model

By default:

- Compose creates a network for the project (e.g., `myproj_default`).
- All services join that network.

Within the stack:

- Services reach each other via `http://service-name:port`.

You rarely need to define networks explicitly unless:

- You want multiple networks (e.g., front-tier and back-tier).
- You need to connect to external Docker networks.

For UI-centric stacks:

- Keep it simple:
  - One default network.
  - UI and APIs communicate by service name.

---

## 6. Developer Experience & Productivity

Why Compose is essential for UI architects:

- **One command onboarding:**
  - "Install Docker, run `docker compose up`, open browser."
- **Consistent environment:**
  - All developers use same DB version, ports, env vars.
- **Integration testing:**
  - Spin up full stack in CI to run E2E tests.
- **Preview environments:**
  - Use Compose definitions as part of ephemeral review apps.

Mention in interviews:

> "I keep a `docker-compose.yml` at the root of the repo that defines the full stack, so new devs can get the UI + APIs + DB running locally with a single command."

---

## 7. Common Compose Commands

```bash
# Start stack in foreground
docker compose up

# Start stack in background
docker compose up -d

# Build images before starting
docker compose up --build

# Stop and remove containers, default network, and default volumes
docker compose down

# Stop only
docker compose stop

# See logs for all or a single service
docker compose logs
docker compose logs api-bff
docker compose logs -f ui-shell
```

In CI:

```bash
docker compose up -d
# run tests ...
docker compose down
```

---

## 8. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Packing too much logic into Compose (complex scripts/conditionals) | Harder to maintain; keep Compose declarative and push logic into images or scripts. |
| Exposing every service's ports unnecessarily | Larger attack surface; use private networking and only expose entrypoints. |
| Using `depends_on` as a readiness check | It only ensures start order, not readiness; still need health checks/retries. |
| Spreading configuration across many override files | Confusing mental model; keep structure simple and documented. |

---

## 9. Interview Q&A

**Q: How do you use Docker Compose for frontend-heavy projects?**  
**A:**  
> "I define a stack with the UI containers, BFF/API services, and dependencies like Postgres and Redis in `docker-compose.yml`. Developers run `docker compose up` to get the full environment locally. Only the shell UI and API gateway are exposed to the host; internal services talk over the default Compose network using service names."

**Q: What's the difference between using raw `docker run` commands and Docker Compose?**  
**A:**  
> "`docker run` is great for single containers or quick experiments. Compose is for reproducible multi-service environments. It gives you a declarative config that can be versioned, shared, and used in CI, and lets you manage the whole stack with a small set of commands."

---

## 10. Next Topic

→ **[07-docker-in-ci-cd.md](./07-docker-in-ci-cd.md)** — How Docker fits into CI/CD pipelines, image tagging strategies, caching, and promoting images across environments.

