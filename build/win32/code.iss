#define RootLicenseFileName FileExists(RepoDir + '\\LICENSE.rtf') ? 'LICENSE.rtf' : 'LICENSE.txt'
#define LocalizedLanguageFile(Language = "") \
    DirExists(RepoDir + "\\licenses") && Language != "" \
      ? ('; LicenseFile: "' + RepoDir + '\\licenses\\LICENSE-' + Language + '.rtf"') \
      : '; LicenseFile: "' + RepoDir + '\\' + RootLicenseFileName + '"'

[Setup]
AppId={#AppId}
AppName={#NameLong}
AppVerName={#NameVersion}
AppPublisher=Real Vibecode Project
AppPublisherURL=https://github.com/Razisafir/Real-vibecode
AppSupportURL=https://github.com/Razisafir/Real-vibecode/issues
AppUpdatesURL=https://github.com/Razisafir/Real-vibecode/releases
DefaultGroupName={#NameLong}
AllowNoIcons=yes
OutputDir={#OutputDir}
OutputBaseFilename=RealVibecodeSetup
Compression=lzma
SolidCompression=yes
AppMutex={code:GetAppMutex}
SetupMutex={code:GetSetupMutex}
WizardImageFile="{#RepoDir}\\resources\\win32\\inno-big-100.bmp,{#RepoDir}\\resources\\win32\\inno-big-125.bmp,{#RepoDir}\\resources\\win32\\inno-big-150.bmp,{#RepoDir}\\resources\\win32\\inno-big-175.bmp,{#RepoDir}\\resources\\win32\\inno-big-200.bmp,{#RepoDir}\\resources\\win32\\inno-big-225.bmp,{#RepoDir}\\resources\\win32\\inno-big-250.bmp"
WizardSmallImageFile="{#RepoDir}\\resources\\win32\\inno-small-100.bmp,{#RepoDir}\\resources\\win32\\inno-small-125.bmp,{#RepoDir}\\resources\\win32\\inno-small-150.bmp,{#RepoDir}\\resources\\win32\\inno-small-175.bmp,{#RepoDir}\\resources\\win32\\inno-small-200.bmp,{#RepoDir}\\resources\\win32\\inno-small-225.bmp,{#RepoDir}\\resources\\win32\\inno-small-250.bmp"
SetupIconFile={#RepoDir}\\resources\\win32\\code.ico
UninstallDisplayIcon={app}\\{#ExeBasename}.exe
ChangesEnvironment=true
ChangesAssociations=true
MinVersion=10.0
SourceDir={#SourceDir}
