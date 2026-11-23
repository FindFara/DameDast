[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $BinDirectory,
    [ValidateRange(1024, 65535)]
    [int] $Port = 5432,
    [switch] $ImportLegacy
)

$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$postgresBin = (Resolve-Path -LiteralPath $BinDirectory).Path
$localDirectory = Join-Path $repository '.local/postgresql'
$databaseDirectory = Join-Path $localDirectory 'data'
$passwordFile = Join-Path $localDirectory 'password.txt'
$settingsFile = Join-Path $localDirectory 'settings.json'
$webSettingsFile = Join-Path $repository 'src/DameDast.Web/appsettings.Development.json'
$localTemp = Join-Path $repository '.local/tmp'

function Invoke-PostgresCommand {
    param([string] $Name, [string[]] $Arguments)
    & (Join-Path $postgresBin "$Name.exe") @Arguments
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed: $Name" }
}

foreach ($name in @('initdb', 'pg_ctl', 'pg_isready', 'psql', 'createdb')) {
    if (-not (Test-Path -LiteralPath (Join-Path $postgresBin "$name.exe"))) {
        throw "Missing PostgreSQL executable: $name.exe"
    }
}

New-Item -ItemType Directory -Path $localDirectory, $localTemp -Force | Out-Null
$previousTemp = $env:TEMP
$previousTmp = $env:TMP
$previousPassword = $env:PGPASSWORD
$previousConnection = $env:ConnectionStrings__Finance
try {
    $env:TEMP = $localTemp
    $env:TMP = $localTemp
    if (Test-Path -LiteralPath $settingsFile) {
        $settings = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
        if ($settings.Port -ne $Port) { throw "This cluster uses port $($settings.Port). Use the same -Port value." }
    }
    if (-not (Test-Path -LiteralPath $passwordFile)) {
        if (Test-Path -LiteralPath (Join-Path $databaseDirectory 'PG_VERSION')) {
            throw 'The local PostgreSQL password file is missing. Restore it before starting the existing cluster.'
        }
        $randomBytes = New-Object byte[] 32
        $random = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $random.GetBytes($randomBytes) } finally { $random.Dispose() }
        [IO.File]::WriteAllText($passwordFile, [Convert]::ToBase64String($randomBytes), [Text.Encoding]::ASCII)
    }
    $password = [IO.File]::ReadAllText($passwordFile).Trim()
    $env:PGPASSWORD = $password

    if (-not (Test-Path -LiteralPath (Join-Path $databaseDirectory 'PG_VERSION'))) {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($listener) { throw "Port $Port is already in use. Select a different -Port." }
        Invoke-PostgresCommand 'initdb' @('-D', $databaseDirectory, '-U', 'damedast', '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', "--pwfile=$passwordFile", '--no-locale', '--encoding=UTF8')
        [IO.File]::WriteAllText($settingsFile, (@{ Port = $Port } | ConvertTo-Json))
    }

    & (Join-Path $postgresBin 'pg_ctl.exe') -D $databaseDirectory status *> $null
    if ($LASTEXITCODE -ne 0) {
        $logFile = Join-Path $localDirectory 'postgres.log'
        $processArguments = @('-D', "`"$databaseDirectory`"", '-l', "`"$logFile`"", '-o', "`"-h 127.0.0.1 -p $Port`"", '-w', 'start')
        $starter = Start-Process -FilePath (Join-Path $postgresBin 'pg_ctl.exe') -ArgumentList $processArguments -WindowStyle Hidden -PassThru
        if (-not $starter.WaitForExit(60000) -or $starter.ExitCode -ne 0) {
            throw "PostgreSQL did not start. See $logFile"
        }
    }

    $exists = & (Join-Path $postgresBin 'psql.exe') -h 127.0.0.1 -p $Port -U damedast -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'damedast'"
    if ($LASTEXITCODE -ne 0) { throw 'Unable to connect to the local PostgreSQL cluster.' }
    if ($exists -ne '1') {
        Invoke-PostgresCommand 'createdb' @('-h', '127.0.0.1', '-p', "$Port", '-U', 'damedast', 'damedast')
    }

    $connection = "Host=127.0.0.1;Port=$Port;Database=damedast;Username=damedast;Password=$password;Timeout=10;Command Timeout=30"
    if ($ImportLegacy) {
        $source = Join-Path $repository 'src/DameDast.Web/data/damedast.db'
        if (-not (Test-Path -LiteralPath $source)) { $source = Join-Path $repository 'src/DameDast.Web/data/poolo.db' }
        if (-not (Test-Path -LiteralPath $source)) { throw 'No legacy database was found. Omit -ImportLegacy for a new installation.' }
        $env:ConnectionStrings__Finance = $connection
        dotnet run --project (Join-Path $repository 'tools/DameDast.DatabaseMigration') -- $source
        if ($LASTEXITCODE -ne 0) { throw 'Legacy import failed. The development connection was not changed.' }
    }

    $webSettings = if (Test-Path -LiteralPath $webSettingsFile) {
        Get-Content -LiteralPath $webSettingsFile -Raw | ConvertFrom-Json
    } else { [pscustomobject]@{} }
    if (-not $webSettings.PSObject.Properties['ConnectionStrings']) {
        $webSettings | Add-Member NoteProperty ConnectionStrings ([pscustomobject]@{})
    }
    $webSettings.ConnectionStrings | Add-Member NoteProperty Finance $connection -Force
    [IO.File]::WriteAllText($webSettingsFile, ($webSettings | ConvertTo-Json -Depth 20), [Text.UTF8Encoding]::new($false))
    Write-Host "PostgreSQL is ready at 127.0.0.1:$Port; database: damedast."
    Write-Host 'Development settings were saved locally. Start the app with:'
    Write-Host 'dotnet run --project src/DameDast.Web --environment ASPNETCORE_ENVIRONMENT=Development -- --urls http://localhost:5000'
}
finally {
    $env:TEMP = $previousTemp
    $env:TMP = $previousTmp
    $env:PGPASSWORD = $previousPassword
    $env:ConnectionStrings__Finance = $previousConnection
}
