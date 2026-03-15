$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$dir = $PSScriptRoot
$docxFiles = Get-ChildItem -LiteralPath $dir -Filter "*.docx"

foreach ($file in $docxFiles) {
  $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
  try {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" } | Select-Object -First 1
    if (-not $entry) { throw "Missing word/document.xml" }

    $sr = New-Object System.IO.StreamReader($entry.Open())
    try { $xmlText = $sr.ReadToEnd() } finally { $sr.Dispose() }

    [xml]$xml = $xmlText
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

    $paras = $xml.SelectNodes("//w:p", $ns)
    $lines = New-Object System.Collections.Generic.List[string]

    foreach ($p in $paras) {
      $ts = $p.SelectNodes(".//w:t", $ns)
      if ($ts -and $ts.Count -gt 0) {
        $s = ($ts | ForEach-Object { $_."#text" }) -join ""
        $s = ($s -replace "\s+", " ").Trim()
        if ($s) { $lines.Add($s) }
      }
    }

    $outPath = $file.FullName + ".txt"
    [System.IO.File]::WriteAllText($outPath, ($lines -join [Environment]::NewLine), [System.Text.Encoding]::UTF8)
    Write-Output ("Wrote: {0} ({1} lines)" -f [System.IO.Path]::GetFileName($outPath), $lines.Count)
  }
  finally {
    $zip.Dispose()
  }
}
