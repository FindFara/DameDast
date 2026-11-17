#!/usr/bin/env bash
set -euo pipefail
if command -v dotnet >/dev/null 2>&1; then
  poolo_dotnet="$(command -v dotnet)"
elif [[ -x /workspace/tools/dotnet/dotnet ]]; then
  poolo_dotnet="/workspace/tools/dotnet/dotnet"
else
  poolo_dotnet="$(pwd)/../tools/dotnet/dotnet"
fi
export ASPNETCORE_ENVIRONMENT=Development
poolo_port="${PORT:-5000}"
poolo_host="127.0.0.1"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) poolo_port="$2"; shift 2 ;;
    --host) poolo_host="$2"; shift 2 ;;
    *) shift ;;
  esac
done
exec "$poolo_dotnet" run --no-build --project src/Poolo.Web --urls "http://${poolo_host}:${poolo_port}"
