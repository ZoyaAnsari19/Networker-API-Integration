#!/usr/bin/env bash
# Apply one or more SQL files to the local FMCG-Binary Postgres (docker-compose port 5434).
# Usage:
#   ./apply-sql.sh 017_path_rank_slabs.sql
#   ./apply-sql.sh                    # applies all *.sql in numeric order (skips already-applied objects via IF NOT EXISTS in files)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${DB_HOST:-127.0.0.1}"
PORT="${DB_PORT:-5434}"
USER="${DB_USER:-fmcg_binary}"
DB="${DB_NAME:-fmcg_binary}"
export PGPASSWORD="${DB_PASSWORD:-fmcg_binary_secret}"

run_file() {
  echo ">>> $1"
  psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 -f "$1"
}

if [[ $# -gt 0 ]]; then
  for name in "$@"; do
    f="$ROOT/$name"
    [[ -f "$f" ]] || f="$name"
    [[ -f "$f" ]] || { echo "missing: $name" >&2; exit 1; }
    run_file "$f"
  done
else
  for f in "$ROOT"/*.sql; do
    run_file "$f"
  done
fi

echo "done"
