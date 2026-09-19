$files = @('index.html', 'developer.html', 'about.html')
foreach ($file in $files) {
    if (Test-Path $file) {
        $content = [System.IO.File]::ReadAllText($file)
        $content = $content.Replace('Â©', '©')
        $content = $content.Replace('â€¢', '•')
        $content = $content.Replace('â†’', '→')
        $content = $content.Replace('âœ¨', '✨')
        $content = $content.Replace('â­ ', '⭐')
        $content = $content.Replace('â˜…', '★')
        $content = $content.Replace('âœ”', '✔')
        $content = $content.Replace('â—¾', '◾')
        $content = $content.Replace('â€', '”')
        $content = $content.Replace('â€œ', '“')
        $content = $content.Replace('Ã—', '×')
        $content = $content.Replace('â„¢', '™')
        
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    }
}
