# infra

Deployment configuration for **S2S Finance** (PecunAI).

Everything lives in this repository rather than a separate `infra` repo, because PecunAI is a
single service — one Next.js app with its own `server.ts`, no front/back split, so there is
nothing to coordinate between two repos and no `repository_dispatch` hand-off.

```
Dockerfile                          repo ROOT — the build context is the repo root
.dockerignore                       root, same reason
infra/
  docker-compose.staging.yml        staging stack   (automated)
  docker-compose.demo.yml           demo stack      (automated, separate VPS)
  env/staging.env.example           template for /opt/s2s-finance-staging/.env
  env/demo.env.example              template for /opt/s2s-finance-demo/.env
  nginx-host/
    onboarding.conf                 live production vhost
    staging-ip.conf                 staging via bare IP (in use — no DNS available)
    staging.conf.example            ready for when staging gets a hostname
  scripts/setup-staging.sh          one-time staging bootstrap
  scripts/setup-demo.sh             one-time demo bootstrap
.github/workflows/
  deploy-staging.yml                staging-v* tag → typecheck → GHCR → SSH release
  deploy-demo.yml                   demo-v*    tag → typecheck → GHCR → SSH release
```

`Dockerfile` stays at the root deliberately: its builder stage does `COPY . .`, so the context is
the repository root, and `infra/Dockerfile` with `context: ..` reads worse than it solves.

## The three environments

Production and staging share one VPS. The **demo runs on a different machine entirely** — it is
shown to prospects, so it is built from its own branch, into its own GHCR package, and deployed
with its own SSH credentials. Nothing in the demo pipeline can reach the production box.

|  | production | staging | demo |
|---|---|---|---|
| VPS | `217.160.250.227` | same box | **separate machine** |
| released by | **hand** — `git pull` + `up -d --build` | `staging-v*` tag | `demo-v*` tag |
| branch | `complete` | `staging` | `demo` |
| GHCR package | `s2s-finance` | `s2s-finance` | **`s2s-finance-demo`** |
| image tag | `v*` | `staging-v*` | `demo-v*` |
| directory | `/opt/digital-onboarding-guide` | `/opt/s2s-finance-staging` | `/opt/s2s-finance-demo` |
| compose project | `digital-onboarding-guide` | `s2s-finance-staging` | `s2s-finance-demo` |
| volumes | `digital-onboarding-guide_*` | `s2s-finance-staging_*` | `s2s-finance-demo_*` |
| app port | `4001` | `4002` | `4003` |
| database port | `5432` | `5433` | `5434` |
| containers | `onboarding-app` / `-db` | `staging-app` / `-db` | `demo-app` / `-db` |
| `NEXT_PUBLIC_ENV` | `production` | `staging` | `demo` |
| SignTeq work area | live | test (`SIGNTEQ_*_DEV`) | test (`SIGNTEQ_*_DEV`) |
| SSH secrets | — | `VPS_*` | `DEMO_VPS_*` |
| migrations | manual, supervised | automatic per deploy | automatic per deploy |
| delete-session control | hidden | hidden | **visible** |

**Production is untouched by any of this.** No workflow deploys it, and releasing it is still the
same manual sequence it was.

Ports differ across all three even though the demo has its own machine. That is insurance, not
necessity: if the demo stack were ever brought up on the shared box by mistake, nothing collides,
and the mistake surfaces instead of two environments quietly fighting over a port.

### The demo's delete-session control

`NEXT_PUBLIC_ENV=demo` is the only build in which the customer dashboard shows a per-session
delete button (`DEMO_MODE` in `src/app/customer/dashboard/page.tsx`), so a demo can be reset
between viewings without deleting rows on the server by hand.

Because `NEXT_PUBLIC_*` is inlined at build time, this is not a runtime switch — in the staging
and production bundles the control does not exist at all. The API route behind it
(`DELETE /api/qa-session/[sessionId]`) is deliberately **not** gated: it predates this, enforces
its own authentication and an ownership check, and cascades to every child record plus the
session's PDFs on disk. What the demo build adds is only a way to reach it.

## Running compose

Always from the **repository root**, never from inside `infra/`:

```bash
docker compose --project-directory . -f infra/docker-compose.staging.yml <command>
```

Production's compose file is **not** in this repository — it lives only on the VPS at
`/opt/digital-onboarding-guide/docker-compose.yml`, untracked, and is run the way it always was:

```bash
cd /opt/digital-onboarding-guide && docker compose up -d --build
```

`--project-directory .` makes relative paths (`./Vektordatenbank`, the build context) and the
`.env` file resolve against the repo root, which is where `.env` lives on the VPS. Running plain
`docker compose` from inside `infra/` would look for `infra/.env`, find nothing, and silently
interpolate empty `POSTGRES_*` values.

```bash
C="docker compose --project-directory . -f infra/docker-compose.staging.yml"

$C ps                          # what's running
$C logs -f staging-app         # follow logs
$C restart staging-app         # bounce it
$C up -d --build staging-app   # build on the host instead of pulling (slow — fallback only)

IMAGE_TAG=staging-v1.0.0 $C pull staging-app   # deploy a specific tag by hand
IMAGE_TAG=staging-v1.0.0 $C up -d staging-app
```

## The project name is the safety boundary — leave it alone

`docker-compose.staging.yml` pins `name: s2s-finance-staging`. Docker prefixes volume names with
the project name, so staging's database volume is `s2s-finance-staging_staging-db-data` while
production's is `digital-onboarding-guide_onboarding-db-data`.

Production's file has no `name:` — it doesn't need one, because compose falls back to the
*directory* name and production only ever runs from `/opt/digital-onboarding-guide`, which
produces exactly that prefix. Staging can't rely on that: it must be pinned so the name is a
property of the file rather than of wherever someone happens to run it.

Two failure modes, both silent:

- **Without the pin**, the project name comes from the directory — `s2s-finance-staging` on the
  VPS, but `pecunai` in a local checkout. A changed prefix does not error; Docker creates **brand
  new empty volumes**, i.e. a database that comes up blank.
- **With the wrong pin** — say production's name gets copied into the staging file — staging
  attaches to the **production volumes** and writes test data into real customer records. Docker
  would not warn. It would just work.

So `deploy-staging.yml` and `setup-staging.sh` both assert `name: s2s-finance-staging` is present
before touching anything, and both refuse to run outside `/opt/s2s-finance-staging`.

Verify once on the VPS:

```bash
docker volume ls | grep -E "onboarding|staging"
```

Production volumes must all be prefixed `digital-onboarding-guide_`, staging's
`s2s-finance-staging_`.

## Releasing

Same shape for both automated environments — push the branch, then tag:

```bash
git push origin staging && git tag staging-v1.0.0 && git push origin staging-v1.0.0
git push origin demo    && git tag demo-v1.0.0    && git push origin demo-v1.0.0
```

### Releasing to staging

Pushing to `staging` does **not** deploy. A release is a tag:

```bash
git push origin staging
git tag staging-v1.0.0
git push origin staging-v1.0.0
```

That runs: typecheck → build image → push to `ghcr.io/digital-ecosystem/s2s-finance` → SSH to the
VPS → check out the tag → assert it is the staging environment → pull → `prisma migrate deploy` →
restart `staging-app` → poll for HTTP 200. Any failing step stops the release.

To re-release an existing tag: **Actions → Deploy Staging → Run workflow**, pass the tag.

### Releasing to demo

Identical, via `deploy-demo.yml` and the `demo-v*` prefix, landing on the demo VPS at
`/opt/s2s-finance-demo`. It uses the `DEMO_VPS_*` secrets rather than `VPS_*` — deliberately
distinct names, so a copy-paste cannot point a demo release at the production box.

### Why the typecheck job is load-bearing

`next.config.ts` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`,
so a green `npm run build` says **nothing** about type safety — the Docker build alone would
happily ship type-broken code. `eslint` is deliberately *not* gated: the repo carries known
pre-existing findings, and a pipeline that fails every release on them is one people learn to
bypass. (`private-documents` is gitignored, so the Figma-export type errors that must be filtered
out locally don't exist in a CI checkout — `tsc --noEmit` is genuinely clean there.)

### Why staging images can't be promoted to production

`NEXT_PUBLIC_*` variables are inlined into the bundle at **build** time, not read at runtime.
`NEXT_PUBLIC_ENV` is what selects the SignTeq work area, so `:staging-v1.2.0` has the *test* work
area compiled into it. Shipping that image to production would point live signature requests at
the test tenant.

Both environments therefore build their own image from their own tag, into the **same GHCR
package** (`s2s-finance`, front and back together — it is one app), separated by tag prefix:
`v*` for production, `staging-v*` for staging. Staging also publishes `staging-latest` rather than
`latest`, so that a `docker compose pull` on the production box can never land a staging build.

### Migrations: automatic on staging, manual on production

The staging deploy runs `prisma migrate deploy` on every release. That is the point of having a
staging environment — a bad migration should break *this* box, loudly, while someone is watching.

Production keeps them manual. An unattended migration is how a bad one takes production down at
2am with nobody there:

```bash
cd /opt/digital-onboarding-guide
npx prisma migrate status     # confirm what's pending
npx prisma migrate deploy     # never `migrate dev` — it can offer to reset
```

### `npm run seed` is a factory reset — never run it on production

`prisma/seed.ts` opens with `deleteMany()` across `question`, `qASession`, `agent`, `admin`,
`team`, `partner` and `product`. It is not a top-up. Pointed at production it destroys every
customer session, every advisor account and every admin login.

It is therefore **not** in the deploy pipeline. It runs once, from `setup-staging.sh`, which
checks the database is empty first and demands a typed confirmation if it isn't.

## Reaching staging: the provider firewall only allows 22/80/443

Port 4002 is open **on the VPS** — `ufw` is inactive and the container binds `0.0.0.0` — but the
hosting firewall (IONOS, above the OS) drops everything except 22, 80 and 443. Staging was
therefore unreachable from a browser, with `ERR_CONNECTION_TIMED_OUT` rather than a refusal.
Changing 4002 to another port does not help; they are all blocked.

nginx already owns 80 and 443, so staging is served through nginx instead:
`infra/nginx-host/staging-ip.conf`, deployed to `/etc/nginx/sites-available/staging-ip` and
symlinked into `sites-enabled`.

| URL | goes to |
|---|---|
| `https://217.160.250.227` | staging (self-signed cert) |
| `http://217.160.250.227` | staging (plain) |
| `https://onboarding.4money.at` | production, unchanged |

It is a `default_server` block, which only catches requests matching **no** `server_name`.
Production declares `server_name onboarding.4money.at`, so anything carrying that Host or TLS SNI
still reaches production exactly as before — verified by comparing response hashes. Certbot
renewals are unaffected: the HTTP-01 challenge arrives with production's Host header.

### Why HTTPS, given the browser warning

Browsers only grant microphone access on a **secure origin**. Over plain HTTP the app loads and
login, tap-through questions, PDFs and admin all work, but `getUserMedia` is blocked — so the
voice flow, which is the product, cannot be tested at all.

A public CA cannot issue a certificate for a bare IP, so the cert is self-signed with
`subjectAltName = IP:...`. The browser shows a one-time interstitial; **Advanced → Proceed**. Once
accepted, the origin counts as secure and voice works. That warning is expected, not a fault.

### When a hostname becomes available

Switch to `infra/nginx-host/staging.conf.example` — real certificate, no warning, no
`default_server`. Its header carries the full recipe: DNS A record, certbot, flip `STAGING_BIND`
to `127.0.0.1`, update `NEXT_PUBLIC_FRONTEND_URL`, re-tag. Remove the `staging-ip` symlink at that
point so the bare IP stops answering.

## One-time setup

### On the VPS

```bash
sudo mkdir -p /opt/s2s-finance-staging
sudo git clone -b staging <repo-url> /opt/s2s-finance-staging
cd /opt/s2s-finance-staging

# The deploy runs `git fetch` / `git checkout` as VPS_USER. A root-owned clone makes both fail —
# on permissions, or on git's "dubious ownership" refusal. Hand it to the deploy user now.
sudo chown -R <VPS_USER>:<VPS_USER> /opt/s2s-finance-staging

sudo cp infra/env/staging.env.example .env
sudo nano .env                       # fill in — see the comments in that file
sudo chmod 600 .env                  # it holds API keys

# so it can pull the private image (same user the workflow SSHes in as, or the pull is "denied")
docker login ghcr.io -u <github-username> -p <PAT with read:packages>

sudo ufw allow 4002/tcp              # only while there is no nginx in front — see the warning below

sudo bash infra/scripts/setup-staging.sh
```

> **Opening 4002 puts staging on the public internet, unencrypted.** Two consequences worth
> deciding about rather than inheriting:
>
> - `prisma/seed.ts` creates admin and partner accounts with **passwords written in that file** —
>   which is in the repository. On a reachable staging box those are live credentials. Either
>   change them straight after seeding, or restrict who can reach the port:
>   `sudo ufw allow from <your-ip> to any port 4002 proto tcp` instead of the blanket rule.
> - There is no TLS, so logins and OTP codes cross the network in the clear.
>
> Both go away once staging is behind nginx with a certificate, which is the same change that
> makes voice testable. Until then, treat staging as readable by strangers and keep real customer
> data off it.

The bootstrap script validates `.env`, refuses to run if `NEXT_PUBLIC_ENV=production` or if
`DATABASE_URL` doesn't point at `staging-db`, and starts the database.

**It runs in two passes, and that is deliberate.** Migrations and the seed execute *inside* the
app image, and the app image is built by the pipeline — so on a brand-new box there is nothing to
run them in yet. The script detects this, stops after the database, and tells you to cut your
first tag. Once the pipeline has built the image and deployed, run the same command again and it
migrates, seeds and starts the app:

```
pass 1   validate .env → start staging-db → "no image yet, go cut a tag"
   ↓
         git tag staging-v0.1.0 && git push origin staging-v0.1.0
         (pipeline: build → GHCR package created → migrate → start app)
   ↓
pass 2   sudo bash infra/scripts/setup-staging.sh  → migrate → seed → app up
```

After that you never run the script again — every release is just a tag.

### GitHub → Settings → Secrets and variables → Actions

**Variables** (baked into the client bundle at build time — not secret):

| Variable | Value |
|---|---|
| `STAGING_NEXT_PUBLIC_ENV` | `staging` |
| `STAGING_NEXT_PUBLIC_FRONTEND_URL` | `http://<vps-ip>:4002` (later the https URL) |

**Secrets:**

| Secret | What |
|---|---|
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USER` | SSH user — needs docker access |
| `VPS_SSH_KEY` | private key whose public half is in that user's `authorized_keys` |
| `VPS_PORT` | optional, defaults to 22 |

`GITHUB_TOKEN` covers pushing to GHCR — no PAT needed for the push side. The PAT is only for the
VPS's *pull* side.

### Setting up the demo VPS

Same shape as staging, on the other machine, with `demo` substituted throughout:

```bash
sudo mkdir -p /opt/s2s-finance-demo
sudo git clone -b demo <repo-url> /opt/s2s-finance-demo
sudo chown -R <DEMO_VPS_USER>:<DEMO_VPS_USER> /opt/s2s-finance-demo
cd /opt/s2s-finance-demo

sudo cp infra/env/demo.env.example .env
sudo nano .env                       # NEXT_PUBLIC_ENV=demo, DATABASE_URL host demo-db
sudo chmod 600 .env

docker login ghcr.io -u <github-username> -p <PAT with read:packages>

sudo bash infra/scripts/setup-demo.sh
```

Like staging's, the script runs in **two passes** — it stops after the database on a fresh box,
because migrations and the seed execute inside an image the pipeline has not built yet. Cut the
first tag, then re-run it to seed.

**Variables** (build-time, not secret):

| Variable | Value |
|---|---|
| `DEMO_NEXT_PUBLIC_ENV` | `demo` — must be exactly this, it is what enables the delete control |
| `DEMO_NEXT_PUBLIC_FRONTEND_URL` | how the demo box is reached |

**Secrets** — separate names from staging's on purpose, so a demo release can never be pointed at
the production box:

| Secret | What |
|---|---|
| `DEMO_VPS_HOST` | demo VPS hostname or IP |
| `DEMO_VPS_USER` | SSH user with docker access |
| `DEMO_VPS_SSH_KEY` | **private** key whose public half is in that user's `authorized_keys` |
| `DEMO_VPS_PORT` | optional, defaults to 22 |

`DEMO_VPS_SSH_KEY` is the *private* key — the file **without** `.pub`, all lines including the
`-----BEGIN`/`-----END` headers. Putting the public key here produces
`ssh: handshake failed … [none publickey]`, which looks like a server problem and is not.

### The demo GHCR package

`s2s-finance-demo` is created automatically by the first successful `build` job — nothing to make
by hand. It is a **separate package** from `s2s-finance`, not another tag inside it, so the demo
machine's pull credential grants access to the demo image only. A box that is going to be handed
around and shown to outsiders cannot pull the production image.

### The GHCR package

The first successful `build` job creates `ghcr.io/digital-ecosystem/s2s-finance` automatically —
there is nothing to create by hand. It starts **private**, which is correct. Afterwards, link it
to this repository so the two are navigable from each other, under the package's **Package
settings → Manage Actions access**.

## When production moves onto the pipeline

A production workflow already exists as a draft at `private-documents/workflows/deploy.yml`.
Promoting it is:

1. Prove the staging pipeline over a few releases.
2. Bring production's `docker-compose.yml` into this repo as `infra/docker-compose.prod.yml` —
   it is currently untracked on the VPS. It needs two additions: `name: digital-onboarding-guide`
   (a no-op that pins today's derived value) and `image: ghcr.io/digital-ecosystem/s2s-finance:${IMAGE_TAG:-latest}`
   alongside the existing `build:`, so the VPS pulls instead of compiling Next.js itself.
3. Move `private-documents/workflows/deploy.yml` to `.github/workflows/deploy.yml`.
4. Add repo variables `NEXT_PUBLIC_ENV=production` and
   `NEXT_PUBLIC_FRONTEND_URL=https://onboarding.4money.at`.
5. Check the three things listed in `private-documents/after-demo/CI_CD_PIPELINE_PLAN.md` →
   "Before the first release": volume prefix, `sites-enabled/onboarding` is a **symlink**, and
   `docker compose config` parses on the box.
6. Keep migrations manual there.

## Observation, not changed

`proxy_read_timeout 300s` applies to the WebSocket at `/api/realtime/proxy`. If a voice session
ever goes five minutes without WebSocket traffic — plausible while a customer reads the Phase 5
contract documents — nginx would close it. No dropped-session reports exist, so this is left
exactly as it is rather than changed speculatively. Worth remembering if voice ever drops on long
idle screens.
