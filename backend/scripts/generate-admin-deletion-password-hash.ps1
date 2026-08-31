[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$backendRoot = Split-Path -Parent $PSScriptRoot
$gradleWrapper = Join-Path $backendRoot "gradlew.bat"
$passwordPointer = [IntPtr]::Zero
$confirmationPointer = [IntPtr]::Zero
$passwordText = $null
$confirmationText = $null
$payload = $null
$locationChanged = $false
$originalOutputEncoding = $OutputEncoding

try {
    $password = Read-Host "삭제 확인 비밀번호" -AsSecureString
    $confirmation = Read-Host "삭제 확인 비밀번호 재입력" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)
    $passwordText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $confirmationText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)
    $payload = "$passwordText`n$confirmationText"

    Push-Location $backendRoot
    $locationChanged = $true
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $payload | & $gradleWrapper -PadminDeletionPasswordFromStdin adminDeletionPasswordHash --quiet --console=plain
    if ($LASTEXITCODE -ne 0) {
        throw "비밀번호 해시 생성에 실패했습니다."
    }
} finally {
    $OutputEncoding = $originalOutputEncoding
    if ($locationChanged) {
        Pop-Location
    }
    $payload = $null
    $passwordText = $null
    $confirmationText = $null
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($confirmationPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer)
    }
    if ($null -ne $password) {
        $password.Dispose()
    }
    if ($null -ne $confirmation) {
        $confirmation.Dispose()
    }
}
