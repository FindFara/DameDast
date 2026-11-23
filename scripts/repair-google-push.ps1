[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Git {
    param([string[]]$Arguments)
    $result = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw ('Git failed: ' + $Arguments[0]) }
    return $result
}

function Get-GoogleCredentials {
    param([string]$BaseCommit, [string]$SettingsPath)
    # Inspect only unpublished commits; never print configuration or credential values.
    $commits = @(Invoke-Git -Arguments @('log', '--format=%H', "$BaseCommit..HEAD", '--', $SettingsPath))
    foreach ($commit in @('HEAD') + $commits) {
        $json = & git show ($commit + ':' + $SettingsPath) 2>$null
        if ($LASTEXITCODE -ne 0) { continue }
        try { $settings = ($json -join "`n") | ConvertFrom-Json } catch { continue }
        $authentication = $settings.PSObject.Properties['Authentication']
        if ($null -eq $authentication) { continue }
        $google = $authentication.Value.PSObject.Properties['Google']
        if ($null -eq $google) { continue }
        $clientId = $google.Value.PSObject.Properties['ClientId']
        $clientSecret = $google.Value.PSObject.Properties['ClientSecret']
        if ($null -ne $clientId -and $null -ne $clientSecret -and
            -not [string]::IsNullOrWhiteSpace([string]$clientId.Value) -and
            -not [string]::IsNullOrWhiteSpace([string]$clientSecret.Value)) {
            return @{
                'Authentication:Google:ClientId' = [string]$clientId.Value
                'Authentication:Google:ClientSecret' = [string]$clientSecret.Value
            }
        }
    }
    return $null
}

$root = Invoke-Git -Arguments @('rev-parse', '--show-toplevel')
Push-Location $root
try {
    $branch = Invoke-Git -Arguments @('branch', '--show-current')
    if ($branch -ne 'fara') { throw 'Switch to branch fara before running this script.' }
    foreach ($operation in @('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply')) {
        $operationPath = Invoke-Git -Arguments @('rev-parse', '--git-path', $operation)
        if (Test-Path $operationPath) { throw 'Finish the current merge/rebase/cherry-pick first.' }
    }
    $status = @(Invoke-Git -Arguments @('status', '--porcelain'))
    if ($status.Count -gt 0) { throw 'Commit or stash your changes, including untracked files, first.' }

    Invoke-Git -Arguments @('fetch', 'origin', 'refs/heads/fara:refs/remotes/origin/fara') | Out-Null
    $baseCommit = Invoke-Git -Arguments @('rev-parse', 'refs/remotes/origin/fara')
    $originalHead = Invoke-Git -Arguments @('rev-parse', 'HEAD')
    & git merge-base --is-ancestor $baseCommit $originalHead
    if ($LASTEXITCODE -ne 0) { throw 'Run git merge origin/fara, resolve any conflicts and rerun this script.' }
    if ($baseCommit -eq $originalHead) {
        Write-Host 'No unpublished commits to repair.'
        return
    }
    Invoke-Git -Arguments @('var', 'GIT_AUTHOR_IDENT') | Out-Null
    Invoke-Git -Arguments @('var', 'GIT_COMMITTER_IDENT') | Out-Null

    $settingsPath = 'src/DameDast.Web/appsettings.json'
    $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
    $google = $settings.Authentication.Google
    $credentials = Get-GoogleCredentials -BaseCommit $baseCommit -SettingsPath $settingsPath
    if ($null -ne $credentials) {
        Get-Command dotnet -ErrorAction Stop | Out-Null
        # Pass JSON on stdin, keeping credentials out of process arguments and shell history.
        $credentials | ConvertTo-Json -Compress | & dotnet user-secrets set --project src/DameDast.Web
        if ($LASTEXITCODE -ne 0) { throw 'Could not save User Secrets; branch history has not been changed.' }
        $credentials = $null
    }

    $backup = 'backup/fara-before-google-cleanup-' + [Guid]::NewGuid().ToString('N')
    Invoke-Git -Arguments @('branch', $backup, $originalHead) | Out-Null
    if (-not [string]::IsNullOrEmpty([string]$google.ClientId) -or
        -not [string]::IsNullOrEmpty([string]$google.ClientSecret)) {
        $google.ClientId = ''
        $google.ClientSecret = ''
        $json = ($settings | ConvertTo-Json -Depth 100) + "`n"
        [IO.File]::WriteAllText((Join-Path $root $settingsPath), $json, [Text.UTF8Encoding]::new($false))
    }
    Invoke-Git -Arguments @('add', '--', $settingsPath) | Out-Null
    $tree = Invoke-Git -Arguments @('write-tree')
    # Preserve the complete local file tree, but give it only the published branch as parent.
    # The original commits remain available on the local backup branch.
    $commit = Invoke-Git -Arguments @('commit-tree', $tree, '-p', $baseCommit, '-m',
        'Preserve unpublished changes without committed Google OAuth credentials')
    Invoke-Git -Arguments @('update-ref', '-m', 'Repair blocked Google OAuth push',
        'refs/heads/fara', $commit, $originalHead) | Out-Null

    Write-Host ('Repaired fara. Local recovery branch: ' + $backup)
    Write-Host 'Do not push the recovery branch: it contains the original credentials.'
    Write-Host 'Review git diff origin/fara..HEAD, then run: git push origin fara'
    Write-Host 'Use Development locally to load User Secrets; configure environment variables on your server.'
} finally {
    Pop-Location
}
