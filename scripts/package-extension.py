from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
root = Path(__file__).resolve().parents[1]
source = root / 'src/Poolo.Web/wwwroot/extension'
shutil.copyfile(root / 'src/Poolo.Web/wwwroot/connected.css', source / 'connected.css')
output = root / 'src/Poolo.Web/wwwroot/downloads/damdast-extension.zip'
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(source))
print(output)
