# Sekani Studio - Static File Server
# Serves the LearningFolder on http://localhost:3000
# Uses only built-in .NET -- no Node.js or Python required.

$port = 3000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".mp4"  = "video/mp4"
    ".webm" = "video/webm"
    ".mp3"  = "audio/mpeg"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host ""
Write-Host "  +-----------------------------------------+" -ForegroundColor Cyan
Write-Host "  |   Sekani Studio  --  Dev Server Ready   |" -ForegroundColor Cyan
Write-Host "  +-----------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  Local:  http://localhost:$port           |" -ForegroundColor Green
Write-Host "  +-----------------------------------------+" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Serving from: $root" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

while ($listener.IsListening) {
    try {
        $context  = $listener.GetContext()
        $request  = $context.Request
        $response = $context.Response

        # Build the file path
        $urlPath = $request.Url.AbsolutePath
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        $filePath = Join-Path $root $urlPath.TrimStart("/").Replace("/", "\")

        if (Test-Path $filePath -PathType Leaf) {
            $ext     = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime    = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $content = [System.IO.File]::ReadAllBytes($filePath)

            $response.ContentType     = $mime
            $response.ContentLength64 = $content.Length
            $response.StatusCode      = 200
            $response.OutputStream.Write($content, 0, $content.Length)

            Write-Host "  [200] $($request.HttpMethod) $urlPath" -ForegroundColor Green
        } else {
            $body    = [System.Text.Encoding]::UTF8.GetBytes("<h2>404 - Not Found</h2><p>$urlPath</p>")
            $response.ContentType     = "text/html"
            $response.ContentLength64 = $body.Length
            $response.StatusCode      = 404
            $response.OutputStream.Write($body, 0, $body.Length)

            Write-Host "  [404] $($request.HttpMethod) $urlPath" -ForegroundColor Red
        }

        $response.OutputStream.Close()
    } catch {
        if ($listener.IsListening) {
            Write-Host "  [ERR] $_" -ForegroundColor Red
        }
    }
}
