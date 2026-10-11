
[CmdletBinding()]
param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$TomcatHome = $env:CATALINA_HOME,
    [string]$DatabaseUrl = $env:DB_URL,
    [string]$DatabaseUser = $env:DB_USER
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$defaultDatabaseUrl = 'jdbc:mysql://localhost:3306/discipline_os_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true'
$backendPort = 8080

$originalEnvironment = @{
    JAVA_HOME      = $env:JAVA_HOME
    CATALINA_HOME  = $env:CATALINA_HOME
    CATALINA_BASE  = $env:CATALINA_BASE
    DB_URL         = $env:DB_URL
    DB_USER        = $env:DB_USER
    DB_PASSWORD    = $env:DB_PASSWORD
    ADMIN_EMAIL    = $env:ADMIN_EMAIL
    ADMIN_PASSWORD = $env:ADMIN_PASSWORD
}

$dbPasswordSecure = $null
$adminPasswordSecure = $null
$locationPushed = $false

function Restore-OriginalEnvironment {
    foreach ($name in $originalEnvironment.Keys) {
        $value = $originalEnvironment[$name]

        if ($null -eq $value) {
            Remove-Item "Env:$name" -ErrorAction SilentlyContinue
        }
        else {
            Set-Item "Env:$name" -Value $value
        }
    }
}

function ConvertFrom-SecureInput {
    param(
        [Parameter(Mandatory)]
        [Security.SecureString]$SecureInput
    )

    $pointer = [IntPtr]::Zero

    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
            $SecureInput
        )
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        if ($pointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
    }
}

function Test-Jdk17 {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $false
    }

    $java = Join-Path $Path 'bin\java.exe'
    $javac = Join-Path $Path 'bin\javac.exe'

    if (
        -not (Test-Path -LiteralPath $java -PathType Leaf) -or
        -not (Test-Path -LiteralPath $javac -PathType Leaf)
    ) {
        return $false
    }

    $versionOutput = (& $java -version 2>&1 | Out-String)
    return ($versionOutput -match 'version "17(?:\.|")')
}

try {
    # 1. Detect a real JDK 17 installation.
    # Ignore invalid JAVA_HOME values pointing to Oracle javapath.
    if (-not (Test-Jdk17 $JavaHome)) {
        $JavaHome = $null

        $jdkCandidates = @(
            'C:\Program Files\Java\jdk-17',
            'C:\Program Files\Java\latest',
            'C:\Program Files\Eclipse Adoptium\jdk-17',
            'C:\Program Files\Microsoft'
        )

        foreach ($candidate in $jdkCandidates) {
            if (Test-Jdk17 $candidate) {
                $JavaHome = $candidate
                break
            }
        }
    }

    # Try resolving javac from PATH, but not the Oracle javapath shortcut.
    if ([string]::IsNullOrWhiteSpace($JavaHome)) {
        $javacCommand = Get-Command javac -ErrorAction SilentlyContinue

        if ($null -ne $javacCommand) {
            $candidate = Split-Path (
                Split-Path $javacCommand.Source -Parent
            ) -Parent

            if (Test-Jdk17 $candidate) {
                $JavaHome = $candidate
            }
        }
    }

    if ([string]::IsNullOrWhiteSpace($JavaHome)) {
        $JavaHome = Read-Host 'JDK 17 home directory'
        $JavaHome = $JavaHome.Trim().Trim('"')
    }

    if (-not (Test-Jdk17 $JavaHome)) {
        throw "A valid JDK 17 was not found at '$JavaHome'."
    }

    Write-Host "[INFO] JDK 17: $JavaHome" -ForegroundColor Green

    # 2. Detect and validate Tomcat.
    
# Automatically detect Apache Tomcat 10.1.
if ([string]::IsNullOrWhiteSpace($TomcatHome)) {
    $tomcatCandidates = @(
        'C:\Users\Hp\Downloads\apache-tomcat-10.1.60-windows-x64\apache-tomcat-10.1.60',
        'C:\Program Files\Apache Software Foundation\Tomcat 10.1',
        'C:\Program Files\Apache Software Foundation\Tomcat 10.1.60'
    )

    foreach ($candidate in $tomcatCandidates) {
        $candidateCatalina = Join-Path $candidate 'bin\catalina.bat'
        $candidateWebapps = Join-Path $candidate 'webapps'

        if (
            (Test-Path -LiteralPath $candidateCatalina -PathType Leaf) -and
            (Test-Path -LiteralPath $candidateWebapps -PathType Container)
        ) {
            $TomcatHome = $candidate
            break
        }
    }
}

if ([string]::IsNullOrWhiteSpace($TomcatHome)) {
    throw 'Tomcat 10.1 was not detected. Set CATALINA_HOME to its installation directory.'
}

$TomcatHome = $TomcatHome.Trim().Trim('"')
Write-Host "[INFO] Tomcat detected: $TomcatHome" -ForegroundColor Green


    $TomcatHome = $TomcatHome.Trim().Trim('"')

    $catalinaScript = Join-Path $TomcatHome 'bin\catalina.bat'
    $webapps = Join-Path $TomcatHome 'webapps'

    if (
        -not (Test-Path -LiteralPath $catalinaScript -PathType Leaf) -or
        -not (Test-Path -LiteralPath $webapps -PathType Container)
    ) {
        throw "Tomcat installation was not found at '$TomcatHome'."
    }

    $env:JAVA_HOME = $JavaHome
    $env:CATALINA_HOME = $TomcatHome
    $env:CATALINA_BASE = $TomcatHome

    $tomcatVersion = (& $catalinaScript version 2>&1 | Out-String)

    if ($tomcatVersion -notmatch 'Server version:\s+Apache Tomcat/10\.1(?:\.|$)') {
        throw 'Apache Tomcat 10.1 is required.'
    }

    Write-Host '[INFO] Tomcat 10.1 verified.' -ForegroundColor Green

    # 3. Validate Maven.
    $maven = Get-Command mvn -ErrorAction SilentlyContinue

    if ($null -eq $maven) {
        throw 'Maven 3.9 or later must be installed and available on PATH.'
    }

    $mavenVersion = (& $maven.Source -version 2>&1 | Out-String)

    if ($mavenVersion -notmatch 'Apache Maven (?<major>\d+)\.(?<minor>\d+)') {
        throw 'Unable to determine Maven version.'
    }

    if (
        [int]$Matches.major -lt 3 -or
        (
            [int]$Matches.major -eq 3 -and
            [int]$Matches.minor -lt 9
        )
    ) {
        throw "Maven 3.9 or later is required. Found: $($Matches[0])"
    }

    # 4. Collect database settings.
    if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
        $DatabaseUrl = $defaultDatabaseUrl
    }

    $inputUrl = Read-Host 'DB_URL (Enter for local default)'

    if (-not [string]::IsNullOrWhiteSpace($inputUrl)) {
        $DatabaseUrl = $inputUrl.Trim()
    }

    if ($DatabaseUrl -notmatch '^jdbc:mysql://') {
        throw 'DB_URL must start with jdbc:mysql://'
    }

    if ([string]::IsNullOrWhiteSpace($DatabaseUser)) {
        $DatabaseUser = 'Enter to skip'
    }

    $inputUser = Read-Host "DB_USER [$DatabaseUser]"

    if (-not [string]::IsNullOrWhiteSpace($inputUser)) {
        $DatabaseUser = $inputUser.Trim()
    }

    if ([string]::IsNullOrWhiteSpace($DatabaseUser)) {
        throw 'DB_USER cannot be empty.'
    }

    
# Automatically set the MySQL password for DB_USER
$dbPasswordSecure = ConvertTo-SecureString 'root' -AsPlainText -Force

if ($dbPasswordSecure.Length -eq 0) {
    throw 'MySQL password cannot be empty.'
}


    if ($dbPasswordSecure.Length -eq 0) {
        throw 'MySQL password cannot be empty.'
    }

    $adminEmail = (Read-Host 'ADMIN_EMAIL (optional; Enter to skip)').Trim()

    if (-not [string]::IsNullOrWhiteSpace($adminEmail)) {
        $adminPasswordSecure = Read-Host 'ADMIN_PASSWORD (optional configuration)' -AsSecureString

        if ($adminPasswordSecure.Length -eq 0) {
            throw 'ADMIN_PASSWORD cannot be empty when ADMIN_EMAIL is supplied.'
        }
    }

    # 5. Build the backend.
    Push-Location $projectRoot
    $locationPushed = $true

    Write-Host '[INFO] Building backend with Maven...' -ForegroundColor Cyan

    & $maven.Source -f backend\pom.xml clean package

    if ($LASTEXITCODE -ne 0) {
        throw "Maven build failed with exit code $LASTEXITCODE."
    }

    $builtWar = Join-Path $projectRoot 'backend\target\discipline-os-backend.war'

    if (-not (Test-Path -LiteralPath $builtWar -PathType Leaf)) {
        throw "Expected WAR file not found: $builtWar"
    }

    # 6. Verify that port 8080 is available.
    $listener = [System.Net.Sockets.TcpListener]::new(
        [Net.IPAddress]::Loopback,
        $backendPort
    )

    try {
        $listener.Start()
    }
    catch {
        throw "Port $backendPort is already in use. Stop the existing server first."
    }
    finally {
        $listener.Stop()
    }

    # 7. Deploy the built WAR.
    $explodedApp = Join-Path $webapps 'discipline-os-backend'
    $deployedWar = Join-Path $webapps 'discipline-os-backend.war'

    if (Test-Path -LiteralPath $explodedApp) {
        Remove-Item -LiteralPath $explodedApp -Recurse -Force
    }

    if (Test-Path -LiteralPath $deployedWar) {
        Remove-Item -LiteralPath $deployedWar -Force
    }

    Copy-Item -LiteralPath $builtWar -Destination $deployedWar

    $buildHash = (Get-FileHash $builtWar -Algorithm SHA256).Hash
    $deployedHash = (Get-FileHash $deployedWar -Algorithm SHA256).Hash

    if ($buildHash -ne $deployedHash) {
        throw 'Deployed WAR does not match the built WAR.'
    }

    Write-Host '[INFO] WAR deployment verified.' -ForegroundColor Green
    
# 8. Configure database and start Tomcat automatically.
$env:JAVA_HOME = $JavaHome
$env:CATALINA_HOME = $TomcatHome
$env:CATALINA_BASE = $TomcatHome

$env:DB_URL = 'jdbc:mysql://localhost:3306/discipline_os_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true'
$env:DB_USER = 'discipline_app'

#securely for the actual MySQL password.

# Automatically set the discipline_app password
$dbPasswordSecure = ConvertTo-SecureString 'ChronosDB@2026!Secure' -AsPlainText -Force

if ($dbPasswordSecure.Length -eq 0) {
    throw 'MySQL password cannot be empty.'
}


$env:DB_PASSWORD = ConvertFrom-SecureInput $dbPasswordSecure

if (-not [string]::IsNullOrWhiteSpace($adminEmail)) {
    $env:ADMIN_EMAIL = $adminEmail
    $env:ADMIN_PASSWORD = ConvertFrom-SecureInput $adminPasswordSecure
}
else {
    Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '[INFO] Starting Tomcat...' -ForegroundColor Cyan
Write-Host '[INFO] Keep this terminal open while using the application.'
Write-Host '[INFO] Frontend: http://localhost:3000'
Write-Host '[INFO] Backend: http://localhost:8080/discipline-os-backend'
Write-Host ''

Push-Location (Join-Path $TomcatHome 'bin')
try {
    & .\catalina.bat run

    if ($LASTEXITCODE -ne 0) {
        throw "Tomcat exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

}
catch {
    Write-Host ''
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    throw
}
finally {
    if ($locationPushed) {
        Pop-Location
    }

    if ($null -ne $dbPasswordSecure) {
        $dbPasswordSecure.Dispose()
    }

    if ($null -ne $adminPasswordSecure) {
        $adminPasswordSecure.Dispose()
    }

    Restore-OriginalEnvironment
}
