param(
    [string]$BaseName,
    [int]$Width = 3200,
    [int]$Height = 2200
)

Add-Type -AssemblyName System.Drawing

$dir = "C:\Users\HP\OneDrive\Desktop\eyewear field project\project_diagrams"
$svgPath = Join-Path $dir "$BaseName.svg"
$pngPath = Join-Path $dir "$BaseName.png"
$jpgPath = Join-Path $dir "$BaseName.jpg"

if (-not (Test-Path $svgPath)) {
    Write-Error "SVG not found: $svgPath"
    exit 1
}

$fileUri = "file:///" + ($svgPath -replace '\\', '/')
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$tempProfile = "$env:TEMP\edge_diag_profile"

Write-Host "Rendering PNG for $BaseName (${Width}x${Height})..."
$edgeArgs = "--headless=new --disable-gpu --no-sandbox --user-data-dir=`"$tempProfile`" --screenshot=`"$pngPath`" --window-size=$Width,$Height `"$fileUri`""
$proc = Start-Process -FilePath $edgePath -ArgumentList $edgeArgs -Wait -NoNewWindow -PassThru

if (Test-Path $pngPath) {
    Write-Host "Converting to high-quality JPG: $jpgPath..."
    $img = [System.Drawing.Image]::FromFile($pngPath)
    
    # Save as high quality JPEG
    $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]95)
    
    # Render with solid white background to avoid black background on transparent SVG
    $bitmap = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
    $g.Dispose()

    $bitmap.Save($jpgPath, $jpegEncoder, $encoderParams)
    $bitmap.Dispose()
    $img.Dispose()

    Write-Host "Successfully generated: $pngPath and $jpgPath"
} else {
    Write-Error "Failed to generate $pngPath"
}
