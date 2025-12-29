@echo off
REM Convert Maestro recording to optimized GIF (Windows version)
REM Usage: convert-to-gif.bat <input.mp4> [output.gif] [width]

setlocal EnableDelayedExpansion

REM Check if ffmpeg is installed
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo [Warning] ffmpeg not found. Please install it:
    echo   choco install ffmpeg
    echo   OR download from: https://ffmpeg.org/download.html
    exit /b 1
)

REM Parse arguments
set INPUT=%~1
set OUTPUT=%~2
set WIDTH=%~3

if "%OUTPUT%"=="" set OUTPUT=demo.gif
if "%WIDTH%"=="" set WIDTH=720

if "%INPUT%"=="" (
    echo Usage: %~nx0 ^<input.mp4^> [output.gif] [width]
    echo.
    echo Examples:
    echo   %~nx0 recording.mp4
    echo   %~nx0 recording.mp4 my-demo.gif
    echo   %~nx0 recording.mp4 my-demo.gif 600
    exit /b 1
)

if not exist "%INPUT%" (
    echo [Error] Input file not found: %INPUT%
    exit /b 1
)

echo [Converting] Video to GIF...
echo   Input:  %INPUT%
echo   Output: %OUTPUT%
echo   Width:  %WIDTH%px
echo.

REM Convert with high-quality palette
ffmpeg -i "%INPUT%" -vf "fps=15,scale=%WIDTH%:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "%OUTPUT%" -y

if %errorlevel% neq 0 (
    echo [Error] Conversion failed
    exit /b 1
)

REM Check if gifsicle is available
where gifsicle >nul 2>&1
if %errorlevel% equ 0 (
    echo [Optimizing] GIF with gifsicle...
    set TEMP_GIF=%OUTPUT%.tmp
    move "%OUTPUT%" "!TEMP_GIF!" >nul
    gifsicle -O3 --lossy=80 -o "%OUTPUT%" "!TEMP_GIF!"
    del "!TEMP_GIF!"
)

REM Get file size
for %%A in ("%OUTPUT%") do set SIZE=%%~zA
set /a SIZE_MB=!SIZE! / 1024 / 1024

echo.
echo [Success] GIF created successfully!
echo   File: %OUTPUT%
echo   Size: !SIZE_MB!MB

if !SIZE_MB! gtr 10 (
    echo.
    echo [Warning] GIF is !SIZE_MB!MB (GitHub limit is 10MB^)
    echo.
    echo To reduce size, try:
    echo   * Lower width:  %~nx0 %INPUT% %OUTPUT% 600
    echo   * Lower width:  %~nx0 %INPUT% %OUTPUT% 480
)

echo.
echo [Done] Conversion complete!
