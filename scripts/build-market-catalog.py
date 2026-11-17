from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
source = root / 'src/Poolo.Application/Features/Market/market-catalog.json'
target = root / 'src/Poolo.Web/wwwroot/market-catalog.js'
target.write_text('export const instruments = ' + json.dumps(json.loads(source.read_text()), ensure_ascii=False, separators=(',', ':')) + ';\n')
print(target)
