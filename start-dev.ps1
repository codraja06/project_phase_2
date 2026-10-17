# Civic Complaint Management System - One-Click Dev Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Civic Issue Detection & Complaint System Dev   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start AI Microservice (FastAPI + YOLOv8 on Port 8000)
Write-Host "`n[1/3] Launching AI Microservice on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\ai-service'; .\venv\Scripts\activate; uvicorn app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# 2. Start Backend API (Express TypeScript on Port 5000)
Write-Host "[2/3] Launching Backend API on http://localhost:5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

Start-Sleep -Seconds 2

# 3. Start Expo React Native / Web App
Write-Host "[3/3] Launching Expo App..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\mobile'; npx expo start"

Write-Host "`nAll 3 services have been launched in separate terminal windows!" -ForegroundColor Magenta
Write-Host "Useful URLs:" -ForegroundColor Yellow
Write-Host "  - AI Health:     http://localhost:8000/health"
Write-Host "  - AI Swagger UI: http://localhost:8000/docs"
Write-Host "  - Backend API:   http://localhost:5000/health"
Write-Host "  - Expo Dev / Web: Press 'w' in the Expo window or visit http://localhost:8081"
Write-Host "`nTest Accounts (seeded):" -ForegroundColor Yellow
Write-Host "  - Citizen:   citizen@example.com  / password123"
Write-Host "  - Authority: officer@city.gov     / password123"
Write-Host "==========================================================" -ForegroundColor Cyan
