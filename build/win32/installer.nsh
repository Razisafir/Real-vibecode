; =============================================================================
; VibeCode — NSIS custom installer header
; =============================================================================
; This file is included by electron-builder during NSIS installer generation.
; It adds custom pages, registry entries, and post-install configuration.
; =============================================================================

!macro customHeader
  ; Branding for the installer title bar
  !system "echo VibeCode Installer > /dev/null"
!macroend

!macro preInit
  ; Write registry keys for the vibecode:// protocol handler
  WriteRegStr SHCTX "SOFTWARE\Classes\vibecode" "" "URL:Vibecode Protocol"
  WriteRegStr SHCTX "SOFTWARE\Classes\vibecode" "URL Protocol" ""
  WriteRegStr SHCTX "SOFTWARE\Classes\vibecode\DefaultIcon" "" "$INSTDIR\VibeCode.exe,0"
  WriteRegStr SHCTX "SOFTWARE\Classes\vibecode\shell\open\command" "" '"$INSTDIR\VibeCode.exe" "--open-url" "%1"'

  ; Write registry keys for .vibecode file association
  WriteRegStr SHCTX "SOFTWARE\Classes\.vibecode" "" "VibeCode.vibecode"
  WriteRegStr SHCTX "SOFTWARE\Classes\VibeCode.vibecode" "" "VibeCode Project File"
  WriteRegStr SHCTX "SOFTWARE\Classes\VibeCode.vibecode\DefaultIcon" "" "$INSTDIR\VibeCode.exe,1"
  WriteRegStr SHCTX "SOFTWARE\Classes\VibeCode.vibecode\shell\open\command" "" '"$INSTDIR\VibeCode.exe" "%1"'
!macroend

!macro customInstall
  ; Register the vibecode:// protocol for the current user
  WriteRegStr SHCTX "SOFTWARE\Classes\vibecode" "" "URL:Vibecode Protocol"
  WriteRegStr SHCTX "SOFTWARE\Classes\vibecode" "URL Protocol" ""
  WriteRegStr SHCTX "SOFTWARE\Classes\vibecode\shell\open\command" "" '"$INSTDIR\VibeCode.exe" "--open-url" "%1"'

  ; Register .vibecode file type
  WriteRegStr SHCTX "SOFTWARE\Classes\.vibecode" "" "VibeCode.vibecode"
  WriteRegStr SHCTX "SOFTWARE\Classes\VibeCode.vibecode\shell\open\command" "" '"$INSTDIR\VibeCode.exe" "%1"'

  ; Add "Open with VibeCode" to context menu for files
  WriteRegStr SHCTX "SOFTWARE\Classes\*\shell\VibeCode" "" "Open w&ith VibeCode"
  WriteRegStr SHCTX "SOFTWARE\Classes\*\shell\VibeCode\command" "" '"$INSTDIR\VibeCode.exe" "%1"'

  ; Add "Open with VibeCode" to context menu for directories
  WriteRegStr SHCTX "SOFTWARE\Classes\Directory\shell\VibeCode" "" "Open w&ith VibeCode"
  WriteRegStr SHCTX "SOFTWARE\Classes\Directory\shell\VibeCode\command" "" '"$INSTDIR\VibeCode.exe" "%V"'

  ; Add to PATH (user-level)
  EnVar::SetUserValue "PATH" "$INSTDIR\bin" ""
!macroend

!macro customUnInstall
  ; Remove vibecode:// protocol registration
  DeleteRegKey SHCTX "SOFTWARE\Classes\vibecode"

  ; Remove .vibecode file association
  DeleteRegKey SHCTX "SOFTWARE\Classes\.vibecode"
  DeleteRegKey SHCTX "SOFTWARE\Classes\VibeCode.vibecode"

  ; Remove context menu entries
  DeleteRegKey SHCTX "SOFTWARE\Classes\*\shell\VibeCode"
  DeleteRegKey SHCTX "SOFTWARE\Classes\Directory\shell\VibeCode"

  ; Remove from PATH
  EnVar::DeleteUserValue "PATH" "$INSTDIR\bin"
!macroend

!macro customRemoveFiles
  ; Leave user data intact — only remove application files
!macroend
