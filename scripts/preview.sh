#!/usr/bin/env bash
set -euo pipefail
if command -v dotnet >/dev/null 2>&1; then
  damedast_dotnet="$(command -v dotnet)"
elif [[ -x /workspace/tools/dotnet/dotnet ]]; then
  damedast_dotnet="/workspace/tools/dotnet/dotnet"
else
  damedast_dotnet="$(pwd)/../tools/dotnet/dotnet"
fi
export ASPNETCORE_ENVIRONMENT=Development
damedast_port="${PORT:-5000}"
damedast_host="127.0.0.1"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) damedast_port="$2"; shift 2 ;;
    --host) damedast_host="$2"; shift 2 ;;
    *) shift ;;
  esac
done
exec "$damedast_dotnet" run --no-build --project src/DameDast.Web --urls "http://${damedast_host}:${damedast_port}"
