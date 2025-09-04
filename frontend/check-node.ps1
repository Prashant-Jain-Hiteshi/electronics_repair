Write-Host "Checking Node.js installation..."

# Check if node is in PATH
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($nodePath) {
    Write-Host "Node.js found at: $nodePath"
    Write-Host "Node.js version: $(node --version)"
    Write-Host "npm version: $(npm --version)"
} else {
    Write-Host "Node.js not found in PATH"
}

# Check common installation paths
$commonPaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe",
    "$env:LOCALAPPDATA\nodejs\node.exe"
)

Write-Host "`nChecking common installation paths..."
foreach ($path in $commonPaths) {
    if (Test-Path $path) {
        Write-Host "Found Node.js at: $path"
        $version = & $path --version
        Write-Host "Version: $version"
    } else {
        Write-Host "Not found: $path"
    }
}

# Check environment variables
Write-Host "`nChecking environment variables..."
$envVars = @("Path", "NODE_PATH", "NPM_CONFIG_PREFIX")
foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var, [System.EnvironmentVariableTarget]::Process)
    Write-Host "$var: $value"
}
