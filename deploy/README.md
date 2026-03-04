# Deployment Scaffold

This directory contains production deployment scaffolding:

- `docker/` production Dockerfiles
- `compose/compose.prod.yml` production runtime stack (`traefik + web + api + worker`)
- `traefik/dynamic.yml` security/compression middleware config

## Build images locally

```bash
docker build -f deploy/docker/api.Dockerfile -t rlfantasy-api:local .
docker build -f deploy/docker/web.Dockerfile -t rlfantasy-web:local .
```

## Run stack locally (production-like)

```bash
cp deploy/compose/.env.example /tmp/rlfantasy.env
# edit /tmp/rlfantasy.env with real values
docker compose -f deploy/compose/compose.prod.yml --env-file /tmp/rlfantasy.env up -d
```

## Notes

- In production, pin `API_IMAGE` and `WEB_IMAGE` by digest.
- `api` has `ENABLE_SCHEDULER=false`.
- `worker` runs the scheduler process (`run-scheduler.ts`).
