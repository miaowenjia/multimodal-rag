param(
  [Parameter(Mandatory=$true)]
  [string]$NpmArgs,
  [int]$TimeoutSeconds = 180,
  [string]$WorkDir = (Get-Location).Path
)

$npmPath = 'E:\文档\Node js\npm.cmd'
if (-not (Test-Path $npmPath)) {
  Write-Error "npm.cmd not found: $npmPath"
  exit 2
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $npmPath
$psi.Arguments = $NpmArgs
$psi.WorkingDirectory = $WorkDir
$psi.UseShellExecute = $false

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$null = $proc.Start()

$ok = $proc.WaitForExit($TimeoutSeconds * 1000)
if (-not $ok) {
  try { $proc.Kill($true) } catch { try { $proc.Kill() } catch {} }
  Write-Output "TIMEOUT_KILLED after ${TimeoutSeconds}s"
  exit 124
}

Write-Output "EXIT_CODE=$($proc.ExitCode)"
exit $proc.ExitCode
