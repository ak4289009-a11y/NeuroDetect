' NeuroDetect - Silent Background Launcher
' Starts the backend watchdog supervisor in the background using pythonw.exe with zero console windows.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get directory of this script
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
backendDir = scriptDir & "\backend"

pyExe = backendDir & "\venv\Scripts\pythonw.exe"
If Not fso.FileExists(pyExe) Then
    pyExe = backendDir & "\venv\Scripts\python.exe"
    If Not fso.FileExists(pyExe) Then
        pyExe = "python.exe"
    End If
End If

watchdogScript = backendDir & "\watchdog_service.py"
cmdLine = """" & pyExe & """ """ & watchdogScript & """"

' Run completely hidden (0 = hide window, False = don't wait for completion)
WshShell.CurrentDirectory = backendDir
WshShell.Run cmdLine, 0, False

Set WshShell = Nothing
Set fso = Nothing
