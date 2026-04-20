#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

BACKEND_URL="${BACKEND_URL:-http://localhost:5251}"
RECOMMENDER_URL="${RECOMMENDER_URL:-http://localhost:8000}"
DATASET_DIR="${DATASET_DIR:-${REPO_ROOT}/recommender/app/data/datasets}"
METRICS_OUTPUT="${METRICS_OUTPUT:-}"

INTERACTIONS_FILE="${DATASET_DIR}/paumarket_interactions.csv"
LISTINGS_FILE="${DATASET_DIR}/paumarket_listings.csv"

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  cat >&2 <<'EOF'
ADMIN_TOKEN is required.

Example:
  ADMIN_TOKEN="your-admin-jwt" ./recommender/scripts/export_and_train_paumarket.sh

Optional overrides:
  BACKEND_URL=http://localhost:5251
  RECOMMENDER_URL=http://localhost:8000
  DATASET_DIR=/custom/path
  METRICS_OUTPUT=/tmp/paumarket_metrics.json
EOF
  exit 1
fi

command -v curl >/dev/null 2>&1 || {
  echo "curl is required but was not found." >&2
  exit 1
}

mkdir -p "${DATASET_DIR}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

download_csv() {
  local endpoint="$1"
  local output_file="$2"
  local temp_file="${TMP_DIR}/$(basename "${output_file}")"

  echo "Downloading ${endpoint}..."
  curl --fail --show-error --silent \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    "${BACKEND_URL}${endpoint}" \
    --output "${temp_file}"

  if [[ ! -s "${temp_file}" ]]; then
    echo "Export returned an empty file: ${endpoint}" >&2
    exit 1
  fi

  mv "${temp_file}" "${output_file}"
  echo "Saved ${output_file}"
}

download_csv "/api/recommender-export/interactions" "${INTERACTIONS_FILE}"
download_csv "/api/recommender-export/listings" "${LISTINGS_FILE}"

echo "Training recommender with PAU Market exports..."
curl --fail --show-error --silent \
  -X POST "${RECOMMENDER_URL}/train?source=paumarket"

echo
echo "Fetching recommender metrics..."
if [[ -n "${METRICS_OUTPUT}" ]]; then
  curl --fail --show-error --silent \
    "${RECOMMENDER_URL}/metrics" \
    --output "${METRICS_OUTPUT}"
  echo "Saved metrics to ${METRICS_OUTPUT}"
else
  curl --fail --show-error --silent \
    "${RECOMMENDER_URL}/metrics"
  echo
fi
