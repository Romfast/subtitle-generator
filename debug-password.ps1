# Debug-Password.ps1
# Diagnose Basic Auth password issues - English version

Write-Host "Basic Auth Password Diagnostics" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# 1. Check .env file
Write-Host "1. .env file contents:" -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    foreach ($line in $envContent) {
        if ($line -like "AUTH_USERNAME=*") {
            Write-Host "   $line" -ForegroundColor White
        }
        if ($line -like "AUTH_PASSWORD=*") {
            $passwordLine = $line -replace "AUTH_PASSWORD=", ""
            Write-Host "   AUTH_PASSWORD=[HIDDEN - length: $($passwordLine.Length) characters]" -ForegroundColor White
            
            # Check for special characters
            if ($passwordLine -match '[^a-zA-Z0-9]') {
                Write-Host "   WARNING: Password contains special characters!" -ForegroundColor Red
                Write-Host "   Recommendation: Use only letters and numbers" -ForegroundColor Yellow
            } else {
                Write-Host "   OK: Password contains only simple characters" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "   ERROR: .env file does not exist!" -ForegroundColor Red
    exit
}

Write-Host ""

# 2. Check nginx container
Write-Host "2. Nginx container status:" -ForegroundColor Yellow
try {
    $nginxStatus = docker-compose ps nginx
    Write-Host "   $nginxStatus" -ForegroundColor White
    
    if ($nginxStatus -like "*Up*") {
        Write-Host "   OK: Nginx is running" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Nginx is not running!" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERROR: Cannot check nginx status" -ForegroundColor Red
}

Write-Host ""

# 3. Check .htpasswd file
Write-Host "3. .htpasswd file:" -ForegroundColor Yellow
try {
    $htpasswdExists = docker-compose exec -T nginx test -f /etc/nginx/.htpasswd
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   OK: .htpasswd file exists" -ForegroundColor Green
        
        $htpasswdContent = docker-compose exec -T nginx cat /etc/nginx/.htpasswd
        Write-Host "   Contents: $htpasswdContent" -ForegroundColor White
        
        if ($htpasswdContent -match 'admin:') {
            Write-Host "   OK: User admin found" -ForegroundColor Green
        } else {
            Write-Host "   ERROR: User admin not found!" -ForegroundColor Red
        }
        
        if ($htpasswdContent -match '\$') {
            Write-Host "   OK: Password hash detected" -ForegroundColor Green
        } else {
            Write-Host "   ERROR: No password hash found!" -ForegroundColor Red
            Write-Host "   This is the main problem - password hash is missing!" -ForegroundColor Red
        }
    } else {
        Write-Host "   ERROR: .htpasswd file does not exist!" -ForegroundColor Red
    }
} catch {
    Write-Host "   ERROR: Cannot access .htpasswd file" -ForegroundColor Red
}

Write-Host ""

# 4. Test connection
Write-Host "4. Connection test:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost" -Method GET -TimeoutSec 5 2>&1
    if ($response.StatusCode -eq 401) {
        Write-Host "   OK: Server requires authentication (401)" -ForegroundColor Green
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "   WARNING: Server does not require authentication" -ForegroundColor Yellow
    } else {
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor White
    }
} catch {
    if ($_.Exception.Message -like "*401*") {
        Write-Host "   OK: Server requires authentication" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Cannot connect to server" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "QUICK SOLUTIONS:" -ForegroundColor Green
Write-Host ""

Write-Host "SOLUTION 1 - Simple password:" -ForegroundColor Yellow
Write-Host "1. Edit .env and set:" -ForegroundColor White
Write-Host "   AUTH_PASSWORD=test12345" -ForegroundColor Gray
Write-Host "2. docker-compose restart nginx" -ForegroundColor White
Write-Host ""

Write-Host "SOLUTION 2 - Manual regeneration:" -ForegroundColor Yellow
Write-Host "docker-compose exec nginx htpasswd -cb /etc/nginx/.htpasswd admin test12345" -ForegroundColor White
Write-Host ""

Write-Host "SOLUTION 3 - Temporary disable:" -ForegroundColor Yellow
Write-Host "Comment in nginx.conf the lines:" -ForegroundColor White
Write-Host "# auth_basic ..." -ForegroundColor Gray
Write-Host "# auth_basic_user_file ..." -ForegroundColor Gray
Write-Host ""

# Ask for quick fix
$fix = Read-Host "Do you want me to try a quick fix? (y/n)"
if ($fix -eq "y") {
    Write-Host ""
    Write-Host "Applying quick fix..." -ForegroundColor Yellow
    
    # Set simple password in .env
    $envContent = Get-Content ".env"
    $newEnvContent = @()
    foreach ($line in $envContent) {
        if ($line -like "AUTH_PASSWORD=*") {
            $newEnvContent += "AUTH_PASSWORD=test12345"
            Write-Host "Password set to: test12345" -ForegroundColor Green
        } else {
            $newEnvContent += $line
        }
    }
    
    # Save .env
    $newEnvContent | Out-File -FilePath ".env" -Encoding ASCII
    
    # Restart nginx
    Write-Host "Restarting nginx..." -ForegroundColor Yellow
    docker-compose restart nginx
    
    Write-Host ""
    Write-Host "DONE! Try now with:" -ForegroundColor Green
    Write-Host "Username: admin" -ForegroundColor White  
    Write-Host "Password: test12345" -ForegroundColor White
    Write-Host ""
    Write-Host "URL: http://localhost" -ForegroundColor Cyan
}