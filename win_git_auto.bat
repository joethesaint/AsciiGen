@echo off
setlocal enabledelayedexpansion

REM Check if inside a git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo Not a git repository. Exiting.
    exit /b 1
)

REM Get current branch
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "branch=%%b"
echo Current branch: !branch!

if /i "!branch!"=="main" (
    set /p ans="You are on the main branch. Do you want to make changes here? (y/n): "
    if /i "!ans!" NEQ "y" (
        echo Available branches:
        set i=0
        for /f "delims=" %%a in ('git branch --format="%%(refname:short)"') do (
            if /i not "%%a"=="main" (
                echo !i!^) %%a
                set "branch_!i!=%%a"
                set /a i+=1
            )
        )
        set branches_count=!i!
        set /p num="Enter the number of the branch to checkout: "
        call set "target_branch=%%branch_!num!%%"
        if not defined target_branch (
            echo Invalid branch number. Exiting.
            exit /b 1
        )
        git checkout "!target_branch!"
        for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "branch=%%b"
        echo Switched to branch: !branch!
    )
) else (
    set /p ans="You are not on the main branch. Do you want to switch to main? (y/n): "
    if /i "!ans!"=="y" (
        git checkout main
        for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "branch=%%b"
        echo Switched to branch: !branch!
    )
)

set /p addall="Do you want to add all files? (y/n): "
if /i "!addall!"=="y" (
    git add .
) else (
    echo Untracked/modified non-hidden files:
    for /f "tokens=2,*" %%a in ('git status --short') do (
        echo %%b | findstr /v /r /c:"\\\." /c:"^\." >nul && echo "%%b"
    )
    set /p files="Enter files to add (space-separated, quote if needed): "
    git add !files!
)

git status

set /p msg="Enter commit message: "
git commit -m "!msg!"

git push -u origin "!branch!"

endlocal