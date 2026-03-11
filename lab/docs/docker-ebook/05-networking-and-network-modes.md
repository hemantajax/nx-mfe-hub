## 05 — Networking & Service Discovery

> **TL;DR:** Docker gives each container its own network namespace and can connect containers via **user-defined networks** with built-in DNS. You typically run frontends and APIs on a shared bridge network so they can reach each other by **service name**, while exposing only the entrypoints (like API gateway or UI) to the host. Interviews care that you understand bridge vs host networks, port mapping, and how services talk to each other securely.

---

## 1. Docker Networking Basics

When Docker is installed, it usually creates:

- A default `bridge` network (`docker0` on Linux).
- Optional `host` and `none` network modes.

Containers connected to the same bridge network:

- Get their own private IP addresses.
- Can talk to each other by IP.

With **user-defined bridge networks**, they also get:

- **DNS resolution by container/service name**.
- Better isolation between stacks.

---

## 2. Port Mapping — Exposing Containers to the Host

Containers often listen on internal ports like `80`, `3000`, `8080`.

To expose them to the host:

```bash
docker run -d \
  -p 8080:80 \
  --name ui \
  my-ui:1.0.0
```

Meaning:

- `-p HOST_PORT:CONTAINER_PORT`.
- Requests to `localhost:8080` on host are forwarded to port `80` inside container.

Common patterns:

- UI: `-p 80:80` or `-p 4200:4200`.
- API: `-p 8080:8080`.

In interviews:

> "I only expose entrypoints like the API gateway or UI reverse proxy; internal services stay on private Docker networks and aren't directly reachable from the host or internet."

---

## 3. Bridge vs Host vs None

### 3.1 Bridge (Most Common)

Default mode for containers:

- Containers have internal IPs on a Docker-managed subnet.
- Port mappings (`-p`) are required to reach them from host.
- Great for **local stacks** and microservice-like architectures.

### 3.2 Host

Container shares the host's network stack:

```bash
docker run --net=host my-app:1.0.0
```

Characteristics:

- No port mapping needed; app binds directly to host ports.
- Less isolation; can be useful for:
  - Performance-sensitive networking.
  - Cases where host network integration is complex.

### 3.3 None

No networking:

- Container has no external network connectivity.
- Only usable for very specific scenarios (e.g., batch jobs that don't need network).

---

## 4. User-Defined Networks & Service Discovery

User-defined bridge networks are the **standard pattern** for multi-service stacks.

Create a network:

```bash
docker network create myapp-net
```

Run services on that network:

```bash
docker run -d --name api --network myapp-net my-api:1.0.0
docker run -d --name ui --network myapp-net -p 8080:80 my-ui:1.0.0
```

Now inside `ui`:

- You can reach API via `http://api:8080` (Docker-provided DNS).

**Interview soundbite:**

> "I put related services on a user-defined bridge network so they can reach each other by service name, while only exposing the external entrypoints via port mappings or a reverse proxy."

---

## 5. Local Microfrontends & APIs — Networking Pattern

For a UI architect, a common Docker-based local stack:

- `ui-shell` — main Angular/React shell.
- `ui-dashboard`, `ui-profile`, etc. — microfrontends (if using Module Federation).
- `api-gateway` — BFF or API gateway.
- `api-users`, `api-orders`, etc. — domain APIs.
- `db`, `cache` — Postgres, Redis.

Networking pattern:

1. All services share a user-defined network (e.g., `frontend-net`).
2. Only `ui-shell` and optionally `api-gateway` expose ports to host.
3. Frontends call APIs using internal service names.

Example (conceptual):

```bash
docker network create frontend-net

docker run -d --name api-gateway --network frontend-net api-gateway:1.0.0
docker run -d --name users-api --network frontend-net users-api:1.0.0
docker run -d --name shell-ui  --network frontend-net -p 4200:80 shell-ui:1.0.0
```

Shell calls:

- `http://api-gateway:8080/api/...`.

This pattern is usually codified in Docker Compose, but understanding it at the Docker level is important.

---

## 6. Security Considerations

Networking decisions directly impact security.

Good defaults:

- Expose only what is necessary:
  - Avoid `-p` on internal services; keep them on private networks.
- Use firewalls and security groups at the host/cloud level.
- Use TLS termination at a gateway or reverse proxy.

Interview-ready bullet points:

- "Containers on a private Docker network are not reachable from outside by default."
- "We only map ports for front-facing components, and we prefer to terminate TLS at the edge."
- "We avoid putting secrets in environment variables where possible and prefer secret stores; when we do use env vars, we scope containers tightly."

---

## 7. Troubleshooting Networking Issues

Common issues:

- Service can't reach another container.
- Misconfigured port mappings.
- Host can’t reach containerized service.

Debug commands:

```bash
docker network ls
docker network inspect frontend-net

docker exec -it shell-ui /bin/sh
apk add --no-cache curl       # in Alpine-based images
curl http://api-gateway:8080/health
```

Checklist:

- Are both containers on the **same network**?
- Is the service listening on the **expected port**?
- Is the host-port mapping correct (`HOST:CONTAINER`)?
- Is there a firewall/security group blocking connections?

Mention in interviews that you:

- Use `docker network inspect` to see which containers are attached and their IPs.
- Use `curl` inside containers to verify connectivity.

---

## 8. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Exposing every service with `-p` | Unnecessary attack surface; more firewall rules to manage. |
| Relying on hard-coded container IPs instead of service names | Breaks when containers restart or move. |
| Forgetting to attach containers to same user-defined network | Services can't reach each other by name. |
| Confusing host port with container port | "It works in the container but not from the host." |
| Using host network casually in prod | Reduces isolation; increases blast radius on compromise. |

---

## 9. Interview Q&A

**Q: How do two containers talk to each other in Docker?**  
**A:**  
> "I attach them to the same user-defined bridge network so Docker's internal DNS lets them resolve each other by container or service name. For example, a UI container can call `http://api:8080` instead of hard-coding IPs. Only the entrypoint container is exposed to the host via port mappings."

**Q: What's the difference between `-p 8080:80` and `-p 80:80`?**  
**A:**  
> "`-p HOST:CONTAINER` maps a host port to a container port. `-p 8080:80` exposes the container's port 80 on host port 8080, so you'd access it at `http://localhost:8080`. `-p 80:80` instead binds directly to port 80 on the host."

---

## 10. Next Topic

→ **[06-docker-compose.md](./06-docker-compose.md)** — Defining multi-service stacks declaratively with Docker Compose for local development and testing.

