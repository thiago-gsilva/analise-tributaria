@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Analise Tributaria - Atualizar GitHub

REM Coloque este arquivo na RAIZ do repositorio Git da Analise Tributaria.
REM Faz: verificar repositorio / revisar alteracoes / git add -A / commit / push.
REM Nao apaga arquivos, nao usa force push, nao modifica branches.

pushd "%~dp0" || goto :erro_pasta

where git >nul 2>&1
if errorlevel 1 (
    echo ERRO: Git nao encontrado. Instale ou ajuste o PATH do Git.
    goto :falha
)

REM Validacao da raiz INDEPENDENTE DE CODIFICACAO: usa "git rev-parse --show-prefix"
REM executado a partir da pasta do .cmd. Prefixo vazio = esta pasta e a raiz do repositorio;
REM prefixo preenchido = esta pasta e uma subpasta. Nenhum caminho e comparado como texto,
REM entao acentos (ex.: Analise Tributaria com acento) nao causam falso bloqueio.
set "DENTRO="
for /f "delims=" %%R in ('git -C "%~dp0." rev-parse --is-inside-work-tree 2^>nul') do set "DENTRO=%%R"
if /I not "%DENTRO%"=="true" (
    echo ERRO: Esta pasta nao pertence a um repositorio Git.
    echo Coloque este .cmd na raiz do projeto conectado ao GitHub.
    goto :falha
)
git -C "%~dp0." rev-parse --show-prefix >nul 2>&1
if errorlevel 1 (
    echo ERRO: Nao foi possivel verificar a raiz do repositorio Git.
    goto :falha
)
set "PREFIXO="
for /f "delims=" %%P in ('git -C "%~dp0." rev-parse --show-prefix 2^>nul') do set "PREFIXO=%%P"
if defined PREFIXO (
    echo ERRO: O .cmd nao esta na raiz do repositorio ^(esta em uma subpasta^).
    echo Isso impede enviar arquivos de outros projetos por acidente.
    goto :falha
)

set "RAMO="
for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "RAMO=%%B"
if not defined RAMO (
    echo ERRO: Git esta sem branch ativo ^(detached HEAD^).
    goto :falha
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo ERRO: Remote 'origin' nao configurado.
    goto :falha
)

echo.
echo =============================================
echo   ANALISE TRIBUTARIA - ATUALIZAR GITHUB
echo =============================================
echo Repositorio: "%CD%"
echo Branch: %RAMO%
echo Remote:
git remote get-url origin
echo.
echo ALTERACOES DETECTADAS:
git status --short
if errorlevel 1 goto :falha

echo.
choice /C SN /N /M "Atualizar este repositorio e enviar ao GitHub? [S/N]: "
if errorlevel 2 goto :cancelado

echo.
echo Preparando arquivos...
git add -A
if errorlevel 1 (
    echo ERRO: git add -A falhou.
    goto :falha
)

REM Impede commit de arquivos sensiveis ou pacotes de backup por acidente.
REM Caso encontre um, ABORTA antes de commit/push; nao altera nenhum arquivo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$a=@(git -c core.quotepath=false diff --cached --name-only --diff-filter=ACMR); $r=@($a | Where-Object { $_ -match '(?i)(^|/)(node_modules|\.venv|venv|backups?|segredos|secrets)(/|$)' -or $_ -match '(?i)(^|/)\.env($|\.)' -or $_ -match '(?i)\.(zip|7z|rar|pem|pfx|p12|key|sqlite|db)$' }); if($r.Count -gt 0) { Write-Host 'BLOQUEADO: arquivos que exigem revisao antes do envio:'; $r | ForEach-Object { Write-Host (' - ' + $_) }; exit 2 }"
if errorlevel 1 (
    echo.
    echo Nenhum commit ou push foi realizado.
    echo Os arquivos permanecem na area de stage do Git para revisao.
    echo Ajuste o .gitignore ou remova do stage os itens apontados.
    goto :falha
)

git diff --cached --quiet
if not errorlevel 1 (
    echo.
    echo Nao ha mudancas novas para commitar.
    goto :enviar
)

echo.
echo RESUMO DO COMMIT:
git diff --cached --stat
if errorlevel 1 goto :falha

set "MARCA="
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set "MARCA=%%T"
if not defined MARCA set "MARCA=atualizacao"

git commit -m "Atualiza Analise Tributaria - %MARCA%"
if errorlevel 1 (
    echo ERRO: falha no commit. Verifique nome/email do Git e os hooks.
    goto :falha
)

:enviar
echo.
echo Enviando branch %RAMO% ao GitHub...
git push origin "%RAMO%"
if errorlevel 1 (
    echo.
    echo ERRO: push falhou. O commit LOCAL foi preservado.
    echo Confira autenticacao, rede e se houve alteracoes remotas.
    echo Nao use force push para resolver isso.
    goto :falha
)

echo.
echo SUCESSO! Repositorio atualizado no GitHub.
git status --short
echo.
pause
popd
exit /b 0

:cancelado
echo.
echo Operacao cancelada. Nada foi enviado.
pause
popd
exit /b 0

:erro_pasta
echo ERRO: Nao foi possivel abrir a pasta do script.
pause
exit /b 1

:falha
echo.
echo Processo interrompido. Revise a mensagem acima.
pause
popd
exit /b 1
