#!/usr/bin/env bash
#
# One-time bootstrap for the staging environment on the production VPS.
#
#   sudo bash infra/scripts/setup-staging.sh
#
# Run it from /opt/s2s-finance-staging AFTER cloning the repo there and writing .env
# (see infra/env/staging.env.example). Safe to re-run — that is in fact the intended use:
#
#   PASS 1 (before any tag exists)  validates .env, starts the database, stops there.
#   PASS 2 (after the first deploy) migrates, seeds, starts the app.
#
# The split exists because the app image is built by the pipeline, so there is nothing to run
# migrations *in* until a `staging-v*` tag has been released. The script detects which situation
# it is in and tells you what to do next.
#
# This never touches production. It refuses to run from production's directory, and every
# resource it creates is namespaced `s2s-finance-staging`.

set -euo pipefail

DEPLOY_DIR="/opt/s2s-finance-staging"
PROD_DIR="/opt/digital-onboarding-guide"
IMAGE="ghcr.io/digital-ecosystem/s2s-finance"
COMPOSE="docker compose --project-directory . -f infra/docker-compose.staging.yml"

say()  { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n\n' "$*" >&2; exit 1; }

# ── Guards ───────────────────────────────────────────────────────────────────────────────────
# Production shares this VPS. Everything below writes to a database and restarts containers, so
# establish beyond doubt which environment we are in before doing any of it.
say "Checking we are in the staging environment"

[ "$PWD" = "$DEPLOY_DIR" ] || die "Run this from $DEPLOY_DIR — currently in $PWD"
[ "$PWD" != "$PROD_DIR" ]  || die "This is the PRODUCTION directory. Refusing."
[ -f infra/docker-compose.staging.yml ] || die "infra/docker-compose.staging.yml not found — wrong repo or wrong branch?"

# The pinned project name is what keeps staging off production's volumes.
grep -qx "name: s2s-finance-staging" infra/docker-compose.staging.yml \
  || die "Staging compose is not pinned to 'name: s2s-finance-staging' — refusing."

[ -f .env ] || die ".env missing. Copy infra/env/staging.env.example to .env and fill it in."
ok "In $DEPLOY_DIR with a staging-pinned compose file and a .env"

# ── .env sanity ──────────────────────────────────────────────────────────────────────────────
# Sourced in a subshell so the values never leak into this script's environment or its logs.
# `|| true` because `set -e` is inherited by $( ): without it a .env that fails to parse would
# abort the subshell before the loop and report nothing missing.
say "Validating .env"

# shellcheck disable=SC1091
missing=$(set +u; . ./.env >/dev/null 2>&1 || true
  for v in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB DATABASE_URL NEXT_PUBLIC_ENV \
           NEXT_PUBLIC_FRONTEND_URL JWT_SECRET NEXTAUTH_SECRET OPENAI_API_KEY; do
    [ -n "${!v:-}" ] || echo "$v"
  done)
[ -z "$missing" ] || die "Missing/empty in .env: $(echo "$missing" | tr '\n' ' ')"

# NEXT_PUBLIC_ENV=production would make staging use the LIVE SignTeq work area — test runs would
# create real signature requests against real advisors. This is the single most consequential
# value in the file.
env_mode=$(set +u; . ./.env >/dev/null 2>&1 || true; echo "${NEXT_PUBLIC_ENV:-}")
[ "$env_mode" != "production" ] \
  || die "NEXT_PUBLIC_ENV=production on staging would use the LIVE SignTeq work area. Set it to 'staging'."

# The staging app must talk to staging-db. A DATABASE_URL still pointing at production would make
# every staging test write into real customer data.
db_url=$(set +u; . ./.env >/dev/null 2>&1 || true; echo "${DATABASE_URL:-}")
case "$db_url" in
  *staging-db*) ok "DATABASE_URL points at staging-db" ;;
  *) die "DATABASE_URL must point at host 'staging-db' (the compose service). Got something else — refusing to continue." ;;
esac
ok "NEXT_PUBLIC_ENV=$env_mode, required keys present"

# ── Database ─────────────────────────────────────────────────────────────────────────────────
# This half never depends on the app image, so it works on the very first pass.
say "Starting staging-db"
$COMPOSE up -d --wait staging-db
ok "staging-db healthy on 127.0.0.1:5433"

# ── Is there an app image yet? ───────────────────────────────────────────────────────────────
# Everything after this point runs commands *inside* the app image (prisma migrate, npm run seed),
# so it cannot happen until the pipeline has built and pushed one.
say "Looking for an app image"
have_image=no
if docker image inspect "$IMAGE:staging-latest" >/dev/null 2>&1; then
  have_image=yes
  ok "Image already present locally"
elif docker pull "$IMAGE:staging-latest" >/dev/null 2>&1; then
  have_image=yes
  ok "Pulled $IMAGE:staging-latest"
else
  warn "No image available yet"
fi

if [ "$have_image" = no ]; then
  cat <<EOF

  ─────────────────────────────────────────────────────────────────────────────
  Pass 1 complete. The database is up; the app has never been built.

  Two reasons that can happen, and they need different fixes:

    a) No staging-v* tag has been released yet. Expected on a first run.
       Cut one from your machine:

           git tag staging-v0.1.0 && git push origin staging-v0.1.0

       The pipeline builds the image, creates the GHCR package, applies
       migrations and starts the app.

    b) This user cannot read the private package. Log in once — as the SAME
       user the deploy workflow SSHes in as, or its pull fails with "denied":

           docker login ghcr.io -u <github-username> -p <PAT with read:packages>

  Then re-run this script to seed the database:

      sudo bash infra/scripts/setup-staging.sh
  ─────────────────────────────────────────────────────────────────────────────

EOF
  exit 0
fi

# ── Migrations ───────────────────────────────────────────────────────────────────────────────
# Harmless if the pipeline already applied them — `migrate deploy` only applies what is pending.
say "Applying migrations"
# --no-deps: only this container, don't drag the app up as a side effect.
$COMPOSE run --rm --no-deps -T staging-app npx prisma migrate deploy
ok "Schema up to date"

# ── Seed ─────────────────────────────────────────────────────────────────────────────────────
# prisma/seed.ts is a FACTORY RESET, not a top-up: it opens with deleteMany() across question,
# qASession, agent, admin, team, partner and product. On an empty staging database that is
# exactly what you want. On any database with data in it, it destroys that data. Hence the
# prompt, and hence it is not in the deploy pipeline.
say "Seeding"
# "Is this database empty?" asked without depending on Prisma's table naming: sum the live-tuple
# estimates across user tables, ignoring _prisma_migrations (which migrate deploy always fills).
# An estimate is fine — the only question is zero vs not-zero.
pg_user=$(set +u; . ./.env >/dev/null 2>&1 || true; echo "${POSTGRES_USER:-}")
pg_db=$(set +u;   . ./.env >/dev/null 2>&1 || true; echo "${POSTGRES_DB:-}")
existing=$($COMPOSE exec -T staging-db psql -U "$pg_user" -d "$pg_db" -tAc \
  "SELECT COALESCE(SUM(n_live_tup),0) FROM pg_stat_user_tables WHERE relname <> '_prisma_migrations'" \
  2>/dev/null | tr -dc '0-9' || echo 0)

if [ "${existing:-0}" -gt 0 ]; then
  printf '\n  ⚠  This database is not empty — roughly %s row(s) across its tables.\n' "$existing"
  printf '     Seeding DELETES all sessions, agents, admins, teams, partners and products.\n'
  read -r -p "     Type 'wipe staging' to seed anyway, anything else to skip: " confirm
  if [ "$confirm" != "wipe staging" ]; then
    ok "Seed skipped — schema is still up to date"
    confirm=skip
  fi
else
  confirm="wipe staging"
fi

if [ "$confirm" = "wipe staging" ]; then
  $COMPOSE run --rm --no-deps -T staging-app npm run seed
  ok "Seeded questions, products, terms and the default accounts"
  warn "Those accounts use the passwords committed in prisma/seed.ts — change them, or"
  warn "restrict port 4002 to your own IP. See infra/README.md."
fi

# ── App ──────────────────────────────────────────────────────────────────────────────────────
say "Starting staging-app"
$COMPOSE up -d staging-app
ok "staging-app running"

say "Done"
cat <<EOF

  Staging is up.

    app        http://<vps-ip>:4002
    database   127.0.0.1:5433  (loopback only)
    volumes    s2s-finance-staging_*
    logs       $COMPOSE logs -f staging-app

  ⚠  Voice will not work over a bare IP. Browsers only grant microphone access on a secure
     origin, so http://<ip>:4002 can load the app but cannot record. Everything else — login,
     questions by tap, PDFs, admin — works fine. See infra/README.md → "Voice needs HTTPS"
     for the two ways round it.

  From here on you never run this script again. Releases are just:

      git tag staging-v0.2.0 && git push origin staging-v0.2.0

EOF
