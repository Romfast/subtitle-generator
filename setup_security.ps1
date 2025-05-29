# setup-security.ps1
# Script PowerShell pentru configurarea securitatii pe Windows
# Generator de Subtitrari Automate - Configurare Securitate

Write-Host "Configurare securitate pentru Generator de Subtitrari" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# Verifica daca fisierul .env exista deja
if (Test-Path ".env") {
    Write-Host "Fisierul .env exista deja." -ForegroundColor Yellow
    $overwrite = Read-Host "Vrei sa il suprascrii? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Configurare anulata." -ForegroundColor Red
        exit
    }
}

Write-Host "Creez fisierul .env..." -ForegroundColor Green

# Solicita username-ul (cu default admin)
$username = Read-Host "Username pentru Basic Auth [admin]"
if ([string]::IsNullOrEmpty($username)) {
    $username = "admin"
}

# Solicita parola (cu verificare)
do {
    $password = Read-Host "Parola pentru Basic Auth (min 8 caractere)" -AsSecureString
    $password_plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    
    if ($password_plain.Length -ge 8) {
        $password_confirm = Read-Host "Confirma parola" -AsSecureString
        $password_confirm_plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password_confirm))
        
        if ($password_plain -eq $password_confirm_plain) {
            break
        } else {
            Write-Host "Parolele nu se potrivesc. Incearca din nou." -ForegroundColor Red
        }
    } else {
        Write-Host "Parola trebuie sa aiba cel putin 8 caractere." -ForegroundColor Red
    }
} while ($true)

# Intreaba despre securitatea suplimentara
Write-Host ""
$enable_api_key = Read-Host "Activezi securitate suplimentara cu API Key? (y/N)"

# Genereaza API Key daca este necesar
$api_key = ""
if ($enable_api_key -eq "y" -or $enable_api_key -eq "Y") {
    # Genereaza un API key aleator (simuleza openssl rand -hex 32)
    $api_key = -join ((1..64) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
    Write-Host "API Key generat automat: $api_key" -ForegroundColor Green
}

# Solicita modelul Whisper preferat
Write-Host ""
Write-Host "Selecteaza modelul Whisper implicit:"
Write-Host "1) base - Rapid, mai putin precis (39MB)"
Write-Host "2) small - Echilibru bun (244MB) [recomandat]"
Write-Host "3) medium - Precizie buna (769MB)"
Write-Host "4) large - Cea mai buna precizie (1.5GB)"
$model_choice = Read-Host "Alege modelul [2]"
if ([string]::IsNullOrEmpty($model_choice)) {
    $model_choice = "2"
}

switch ($model_choice) {
    "1" { $whisper_model = "base" }
    "2" { $whisper_model = "small" }
    "3" { $whisper_model = "medium" }
    "4" { $whisper_model = "large" }
    default { $whisper_model = "small" }
}

# Scrie fisierul .env
$env_content = @"
# =================================
# CONFIGURARE SECURITATE APLICATIE
# Generat automat de setup-security.ps1
# =================================

# === BASIC AUTH NGINX ===
AUTH_USERNAME=$username
AUTH_PASSWORD=$password_plain

# === SECURITATE BACKEND API ===
"@

if ($enable_api_key -eq "y" -or $enable_api_key -eq "Y") {
    $env_content += @"

BACKEND_API_KEY=$api_key
REQUIRE_API_KEY=true
"@
} else {
    $env_content += @"

# BACKEND_API_KEY=
# REQUIRE_API_KEY=false
"@
}

$env_content += @"

# === CONFIGURARE WHISPER ===
WHISPER_MODEL=$whisper_model

# === CONFIGURARE UPLOADS ===
MAX_UPLOAD_SIZE=3000MB

# =================================
# GENERAT LA: $(Get-Date)
# =================================
"@

# Salveaza fisierul .env
$env_content | Out-File -FilePath ".env" -Encoding UTF8

Write-Host ""
Write-Host "Fisierul .env a fost creat cu succes!" -ForegroundColor Green
Write-Host ""

# Verifica daca Docker este disponibil
try {
    $null = docker-compose --version
    Write-Host "Docker Compose detectat." -ForegroundColor Green
    $start_app = Read-Host "Vrei sa pornesti aplicatia acum? (Y/n)"
    
    if ($start_app -ne "n" -and $start_app -ne "N") {
        Write-Host "Pornesc aplicatia..." -ForegroundColor Green
        
        # Creaza directorul pentru nginx logs daca nu exista
        if (-not (Test-Path "nginx\logs")) {
            New-Item -ItemType Directory -Path "nginx\logs" -Force | Out-Null
        }
        
        # Porneste aplicatia
        docker-compose up -d --build
        
        Write-Host ""
        Write-Host "Aplicatia a fost pornita cu succes!" -ForegroundColor Green
        Write-Host "Detalii acces:" -ForegroundColor Cyan
        Write-Host "   URL: http://localhost" -ForegroundColor White
        Write-Host "   Username: $username" -ForegroundColor White
        Write-Host "   Password: [parola setata]" -ForegroundColor White
        
        if ($enable_api_key -eq "y" -or $enable_api_key -eq "Y") {
            Write-Host "   API Key: $api_key" -ForegroundColor Yellow
            Write-Host "   Salveaza API Key-ul in loc sigur!" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Pentru a verifica statusul:" -ForegroundColor Cyan
        Write-Host "   docker-compose logs -f" -ForegroundColor White
        Write-Host ""
        Write-Host "Pentru a opri aplicatia:" -ForegroundColor Cyan
        Write-Host "   docker-compose down" -ForegroundColor White
    } else {
        Write-Host "Aplicatia nu a fost pornita." -ForegroundColor Yellow
        Write-Host "Pentru a o porni manual:" -ForegroundColor Cyan
        Write-Host "   docker-compose up -d --build" -ForegroundColor White
    }
} catch {
    Write-Host "Docker Compose nu a fost gasit." -ForegroundColor Yellow
    Write-Host "Instaleaza Docker Desktop si incearca din nou." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Detalii configurare salvate in fisierul .env" -ForegroundColor Green
Write-Host "Nu uita sa pastrezi .env in siguranta si sa nu il incluzi in Git!" -ForegroundColor Red

# Verifica daca .env este in .gitignore
if (Test-Path ".gitignore") {
    $gitignore_content = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
    if ($gitignore_content -notmatch "\.env") {
        Add-Content -Path ".gitignore" -Value "`n.env"
        Write-Host "Am adaugat .env in .gitignore pentru siguranta." -ForegroundColor Green
    }
} else {
    ".env" | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Host "Am creat .gitignore si am adaugat .env." -ForegroundColor Green
}

Write-Host ""
Write-Host "Configurare completa! Aplicatia ta este acum securizata." -ForegroundColor Green

# Pastreaza fereastra deschisa
Write-Host ""
Write-Host "Apasa orice tasta pentru a inchide..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")