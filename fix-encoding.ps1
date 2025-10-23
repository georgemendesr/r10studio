# Script para corrigir encoding UTF-8
$file = "e:\R10 STUDIO\punch-zoom-creator-main\src\modules\video-slide\VideoSlidePage.tsx"

# Ler arquivo
$content = Get-Content $file -Raw -Encoding UTF8

# Substituições de caracteres mal codificados
$replacements = @{
    # Emojis
    'âš ï¸' = '⚠️'
    'âœ…' = '✅'
    'âŒ' = '❌'
    'âœ"' = '✓'
    'âœ¨' = '✨'
    'âš¡' = '⚡'
    'ðŸ"±' = '📱'
    'ðŸ"½ï¸' = '🎽️'
    
    # Pontuação
    'â€"' = '—'
    'â€™' = "'"
    'â€¢' = '•'
    'Â·' = '·'
    
    # Vogais acentuadas maiúsculas
    'Ã‰' = 'É'
    'Ã"' = 'Ó'
    'Ã' = 'Á'
    
    # Palavras completas comuns com erros
    'OBRIGATÃ"RIA' = 'OBRIGATÓRIA'
    'constância' = 'constância'
    'aleatório' = 'aleatório'
    'máximo' = 'máximo'
    'variação' = 'variação'
    'água' = 'água'
    'padrão' = 'padrão'
    'obrigatório' = 'obrigatório'
    'título' = 'título'
    'público' = 'público'
    'duração' = 'duração'
    'número' = 'número'
    'múltiplos' = 'múltiplos'
    'sequência' = 'sequência'
    'Denúncia' = 'Denúncia'
    'último' = 'último'
    'após' = 'após'
    
    # Padrões de letras individuais
    'Ã§' = 'ç'
    'Ã£' = 'ã'
    'Ã©' = 'é'
    'Ã­' = 'í'
    'Ã³' = 'ó'
    'Ãº' = 'ú'
    'Ã¡' = 'á'
    'Ãª' = 'ê'
    'Ã´' = 'ô'
}

# Aplicar substituições
foreach ($old in $replacements.Keys) {
    $new = $replacements[$old]
    $content = $content.Replace($old, $new)
}

# Salvar com UTF-8 sem BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)

Write-Host "✓ Encoding corrigido com sucesso!" -ForegroundColor Green
Write-Host "  Arquivo: VideoSlidePage.tsx" -ForegroundColor Cyan
