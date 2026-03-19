@echo off
echo Chrome을 원격 디버깅 모드로 실행합니다...
echo Market Radar 앱이 준비되면 http://localhost:5173 으로 이동하세요.
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --profile-directory=Default http://localhost:5173
