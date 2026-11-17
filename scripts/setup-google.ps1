[CmdletBinding()]
param([string]$ClientId, [string]$BaseUrl = 'http://localhost:5000')
$ErrorActionPreference = 'Stop'
$projectPath = Join-Path $PSScriptRoot '..\src\DameDast.Web'
if ([string]::IsNullOrWhiteSpace($ClientId)) { $ClientId = Read-Host 'Google OAuth Web client ID' }
if ($ClientId -notmatch '\.apps\.googleusercontent\.com$') { throw 'Enter the Google Web OAuth client ID.' }
$secretValue = Read-Host 'Google OAuth client secret (hidden)' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretValue)
try {
    $clientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    if ([string]::IsNullOrWhiteSpace($clientSecret)) { throw 'Client secret is required.' }
    $settings = @{ 'Authentication:Google:ClientId' = $ClientId; 'Authentication:Google:ClientSecret' = $clientSecret }
    # JSON is sent through stdin, rather than placing the secret in process arguments.
    $settings | ConvertTo-Json -Compress | dotnet user-secrets set --project $projectPath
    if ($LASTEXITCODE -ne 0) { throw 'Could not save local development settings.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    $clientSecret = $null
    $settings = $null
    $secretValue.Dispose()
}
Write-Host ('Register this exact redirect URI in Google Cloud: ' + $BaseUrl.TrimEnd('/') + '/signin-google')
Write-Host 'Restart the app in Development, then open Settings > Google sign-in setup.'
Write-Host 'These local .NET user secrets are for development, not production hosting.'
