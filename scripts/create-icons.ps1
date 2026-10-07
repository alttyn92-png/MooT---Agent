Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null
foreach ($size in @(16,32,48,128)) {
  $bitmap = New-Object System.Drawing.Bitmap($size,$size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = 'AntiAlias'
  $graphics.ScaleTransform($size/128.0,$size/128.0)
  $background = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#b8f5d0'))
  $foreground = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#142c25'))
  $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
  $shape.AddArc(0,0,64,64,180,90)
  $shape.AddArc(64,0,64,64,270,90)
  $shape.AddArc(64,64,64,64,0,90)
  $shape.AddArc(0,64,64,64,90,90)
  $shape.CloseFigure()
  $graphics.FillPath($background,$shape)
  $pen = New-Object System.Drawing.Pen($foreground,12)
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $points = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new(28,86),[System.Drawing.PointF]::new(28,40),[System.Drawing.PointF]::new(36,40),[System.Drawing.PointF]::new(64,70),[System.Drawing.PointF]::new(92,40),[System.Drawing.PointF]::new(100,40),[System.Drawing.PointF]::new(100,86))
  $graphics.DrawLines($pen,$points)
  $graphics.FillEllipse($foreground,44,77,10,14)
  $graphics.FillEllipse($foreground,74,77,10,14)
  $bitmap.Save((Join-Path $iconDirectory "moot-$size.png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose(); $shape.Dispose(); $foreground.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
# The source manifest is also loadable directly from the project root.
$sourceIcons = Join-Path $PSScriptRoot '../icons'
New-Item -ItemType Directory -Force -Path $sourceIcons | Out-Null
Copy-Item -Path (Join-Path $iconDirectory '*.png') -Destination $sourceIcons -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '../public/moot-logo.svg') -Destination (Join-Path $PSScriptRoot '../moot-logo.svg') -Force
