#!/bin/sh
# PostToolUse hook pro sezení spuštěné z kořene monorepa: po úpravě souboru v lasermania-blit386/
# spustí formátování šablony blit386 (biome + prettier). Ostatní části neformátuje.
# Nikdy neblokuje práci: chyby jen zapíše a skončí s 0.
f=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in
  */lasermania-blit386/*)
    cd "$CLAUDE_PROJECT_DIR/lasermania-blit386" 2>/dev/null && npm run format --silent >/dev/null 2>&1 \
      || echo "[format-blit] formátování se nepovedlo (chybí npm install?)" >&2 ;;
esac
exit 0
