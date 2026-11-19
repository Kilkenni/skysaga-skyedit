#!/usr/bin/env bash
set -euo pipefail
jq -r '.[] | select(has("icon") | not) | .name' "$1"