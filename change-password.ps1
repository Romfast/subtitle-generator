# Change-Password.ps1
# Script for changing Basic Auth password

Write-Host "Change Basic Auth Password" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if application is running
$nginxStatus = docker-compose ps nginx -q
if (-not $nginxStatus) {
    Write-Host "ERROR: Application is not running!" -ForegroundColor Red
    Write-Host "Start the application with: docker-compose up -d" -ForegroundColor Yellow
    exit
}

# Show current user (from .env)
if (Test-Path ".env") {
    $currentUser = (Get-Content ".env" | Where-Object { $_ -like "AUTH_USERNAME=*" }) -replace "AUTH_USERNAME=", ""
    Write-Host "Current user: $currentUser" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "WARNING: .env file not found!" -ForegroundColor Yellow
}

# Ask for new password
do {
    $newPassword = Read-Host "Enter new password (minimum 6 characters)" -AsSecureString
    $newPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword))
    
    if ($newPasswordPlain.Length -ge 6) {
        $confirmPassword = Read-Host "Confirm new password" -AsSecureString
        $confirmPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmPassword))
        
        if ($newPasswordPlain -eq $confirmPasswordPlain) {
            break
        } else {
            Write-Host "ERROR: Passwords do not match. Try again." -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: Password must be at least 6 characters long." -ForegroundColor Red
    }
} while ($true)

Write-Host ""
Write-Host "Updating password..." -ForegroundColor Yellow

# Method 1: Update .env file
if (Test-Path ".env") {
    Write-Host "Updating .env file..." -ForegroundColor Yellow
    
    $envContent = Get-Content ".env"
    $newEnvContent = @()
    $passwordUpdated = $false
    
    foreach ($line in $envContent) {
        if ($line -like "AUTH_PASSWORD=*") {
            $newEnvContent += "AUTH_PASSWORD=$newPasswordPlain"
            $passwordUpdated = $true
        } else {
            $newEnvContent += $line
        }
    }
    
    # If AUTH_PASSWORD line doesn't exist, add it
    if (-not $passwordUpdated) {
        $newEnvContent += "AUTH_PASSWORD=$newPasswordPlain"
    }
    
    # Save .env file
    $newEnvContent | Out-File -FilePath ".env" -Encoding ASCII
    Write-Host "   OK: .env file updated" -ForegroundColor Green
}

# Method 2: Restart nginx to regenerate .htpasswd
Write-Host "Restarting nginx to apply new password..." -ForegroundColor Yellow
docker-compose restart nginx

# Wait for nginx to start
Write-Host "Waiting for nginx to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Verify .htpasswd was updated
Write-Host "Verifying new password..." -ForegroundColor Yellow
try {
    $htpasswdContent = docker-compose exec -T nginx cat /etc/nginx/.htpasswd 2>$null
    if ($htpasswdContent -and $htpasswdContent -notlike "*:" -and $htpasswdContent -like "*$*") {
        Write-Host "   OK: .htpasswd file updated successfully" -ForegroundColor Green
        Write-Host "   New hash: $htpasswdContent" -ForegroundColor Gray
    } else {
        Write-Host "   WARNING: Possible issue with hash generation" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   WARNING: Cannot verify .htpasswd" -ForegroundColor Yellow
}

# Final test
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost" -Method GET -TimeoutSec 5 2>&1
    if ($response.StatusCode -eq 401) {
        Write-Host "   OK: Server requires authentication correctly" -ForegroundColor Green
    }
} catch {
    if ($_.Exception.Message -like "*401*") {
        Write-Host "   OK: Server requires authentication correctly" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: Possible connectivity issues" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "PASSWORD CHANGED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "URL: http://localhost" -ForegroundColor White
Write-Host "Username: $currentUser" -ForegroundColor White
Write-Host "Password: [new password set]" -ForegroundColor White
Write-Host ""
Write-Host "For future changes:" -ForegroundColor Cyan
Write-Host "   1. Edit .env and change AUTH_PASSWORD" -ForegroundColor White
Write-Host "   2. Run: docker-compose restart nginx" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "   Restart app: docker-compose restart" -ForegroundColor White
Write-Host "   Stop app: docker-compose down" -ForegroundColor White
Write-Host "   Start app: docker-compose up -d" -ForegroundColor White