import re
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


def docx_to_text(docx_path: Path) -> str:
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    with zipfile.ZipFile(docx_path) as z:
        xml_bytes = z.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    paras: list[str] = []
    for para in root.findall(".//w:p", namespace):
        texts = [t.text for t in para.findall(".//w:t", namespace) if t.text]
        if not texts:
            continue
        s = "".join(texts)
        s = re.sub(r"\s+", " ", s).strip()
        if s:
            paras.append(s)
    return "\n".join(paras)


def main() -> None:
    ref_dir = Path(r"d:\ai\ai编程\财税小工具\参考")
    docx_files = sorted(ref_dir.glob("*.docx"))
    for docx in docx_files:
        text = docx_to_text(docx)
        out_path = Path(str(docx) + ".txt")
        out_path.write_text(text, encoding="utf-8")
        print(f"Wrote: {out_path.name} ({len(text)} chars)")


if __name__ == "__main__":
    main()

