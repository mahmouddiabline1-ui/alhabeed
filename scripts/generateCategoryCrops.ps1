Add-Type -AssemblyName System.Drawing

$cards = @(
  @{ Id='egypt'; Source='category-art-v1.png'; Columns=3; Rows=2; Column=0; Row=0 },
  @{ Id='history'; Source='category-art-v1.png'; Columns=3; Rows=2; Column=1; Row=0 },
  @{ Id='football'; Source='category-art-v1.png'; Columns=3; Rows=2; Column=2; Row=0 },
  @{ Id='screen'; Source='category-art-v1.png'; Columns=3; Rows=2; Column=0; Row=1 },
  @{ Id='food'; Source='category-art-v1.png'; Columns=3; Rows=2; Column=1; Row=1 },
  @{ Id='science'; Source='category-art-v1.png'; Columns=3; Rows=2; Column=2; Row=1 },
  @{ Id='music'; Source='pack-art-v2.png'; Columns=4; Rows=1; Column=0; Row=0 },
  @{ Id='technology'; Source='pack-art-v2.png'; Columns=4; Rows=1; Column=1; Row=0 },
  @{ Id='nature'; Source='pack-art-v2.png'; Columns=4; Rows=1; Column=2; Row=0 },
  @{ Id='world'; Source='pack-art-v2.png'; Columns=4; Rows=1; Column=3; Row=0 },
  @{ Id='egypt_landmarks'; Source='landmarks-egypt-v1.png'; Columns=3; Rows=2; Column=1; Row=1 },
  @{ Id='world_landmarks'; Source='landmarks-world-v1.png'; Columns=3; Rows=2; Column=1; Row=0 },
  @{ Id='childhood_cartoon'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=0; Row=0 },
  @{ Id='gaming'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=1; Row=0 },
  @{ Id='cars'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=2; Row=0 },
  @{ Id='world_football'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=3; Row=0 },
  @{ Id='flags'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=0; Row=1 },
  @{ Id='riddles'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=1; Row=1 },
  @{ Id='medicine'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=2; Row=1 },
  @{ Id='inventions'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=3; Row=1 },
  @{ Id='ramadan'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=0; Row=2 },
  @{ Id='celebrities'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=1; Row=2 },
  @{ Id='strange_animals'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=2; Row=2 },
  @{ Id='travel'; Source='vip-card-art-v1.png'; Columns=4; Rows=3; Column=3; Row=2 }
)

$publicDir = Join-Path $PSScriptRoot '..\client\public'
$outputDir = Join-Path $publicDir 'cards\source'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$quality = [System.Drawing.Imaging.EncoderParameters]::new(1)
$quality.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 88L)

foreach ($card in $cards) {
  $source = [System.Drawing.Image]::FromFile((Join-Path $publicDir $card.Source))
  try {
    $cellWidth = $source.Width / $card.Columns
    $cellHeight = $source.Height / $card.Rows
    $sourceRatio = $cellWidth / $cellHeight
    $targetRatio = 600 / 750
    if ($sourceRatio -gt $targetRatio) {
      $cropHeight = $cellHeight
      $cropWidth = $cellHeight * $targetRatio
      $cropX = ($card.Column * $cellWidth) + (($cellWidth - $cropWidth) / 2)
      $cropY = $card.Row * $cellHeight
    } else {
      $cropWidth = $cellWidth
      $cropHeight = $cellWidth / $targetRatio
      $cropX = $card.Column * $cellWidth
      $cropY = ($card.Row * $cellHeight) + (($cellHeight - $cropHeight) / 2)
    }
    $bitmap = [System.Drawing.Bitmap]::new(600, 750)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 600, 750), [single]$cropX, [single]$cropY, [single]$cropWidth, [single]$cropHeight, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $bitmap.Save((Join-Path $outputDir "$($card.Id).jpg"), $jpegCodec, $quality)
    } finally { $bitmap.Dispose() }
  } finally { $source.Dispose() }
}

$quality.Dispose()
