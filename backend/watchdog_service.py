"""
NeuroDetect - Always-Active Local Watchdog Supervisor
Monitors the Uvicorn application server and automatically restarts it if it crashes.
"""

import sys
import os
import time
import subprocess
import signal

# Working directories
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
PID_FILE = os.path.join(BACKEND_DIR, "backend.pid")
LOG_FILE = os.path.join(BACKEND_DIR, "backend_service.log")

# Select python executable (venv or system)
venv_py = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
if os.path.exists(venv_py):
    PYTHON_EXE = venv_py
else:
    PYTHON_EXE = sys.executable

running = True
current_proc = None

def handle_exit(signum, frame):
    global running, current_proc
    running = False
    log("Terminating backend supervisor...")
    if current_proc and current_proc.poll() is None:
        try:
            current_proc.terminate()
            current_proc.wait(timeout=3)
        except Exception:
            try:
                current_proc.kill()
            except Exception:
                pass

signal.signal(signal.SIGINT, handle_exit)
signal.signal(signal.SIGTERM, handle_exit)

def log(msg: str):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] [Watchdog] {msg}"
    try:
        if sys.stdout is not None and hasattr(sys.stdout, "write"):
            print(formatted)
    except Exception:
        pass
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def write_pid(pid: int):
    try:
        with open(PID_FILE, "w", encoding="utf-8") as f:
            f.write(str(pid))
    except Exception:
        pass

def clear_pid():
    try:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
    except Exception:
        pass

def main():
    global current_proc
    log("==========================================================")
    log("Starting NeuroDetect Always-Active Backend Supervisor")
    log(f"Python interpreter: {PYTHON_EXE}")
    log(f"Backend directory : {BACKEND_DIR}")
    log("==========================================================")

    # Save watchdog process PID
    write_pid(os.getpid())

    crash_count = 0
    max_fast_crashes = 10
    last_start_time = 0

    cmd = [
        PYTHON_EXE,
        "-m", "uvicorn",
        "app.main:app",
        "--host", "127.0.0.1",
        "--port", "8000"
    ]

    # Open persistent log file descriptor for child process
    log_file_handle = open(LOG_FILE, "a", encoding="utf-8", buffering=1)

    try:
        while running:
            last_start_time = time.time()
            log("Launching Uvicorn server on http://127.0.0.1:8000 ...")

            try:
                current_proc = subprocess.Popen(
                    cmd,
                    cwd=BACKEND_DIR,
                    stdout=log_file_handle,
                    stderr=subprocess.STDOUT
                )
                
                log(f"Backend process spawned with PID {current_proc.pid}")

                # Monitor process while running
                while running:
                    exit_code = current_proc.poll()
                    if exit_code is not None:
                        # Process died
                        elapsed = time.time() - last_start_time
                        log(f"Backend process (PID {current_proc.pid}) exited with code {exit_code} after {elapsed:.1f}s")
                        
                        if elapsed < 5:
                            crash_count += 1
                        else:
                            crash_count = 0  # Reset if it ran normally for a while

                        if crash_count >= max_fast_crashes:
                            log(f"ERROR: Server crashed {crash_count} times in rapid succession. Pausing 30 seconds before retry...")
                            time.sleep(30)
                            crash_count = 0
                        else:
                            log("Auto-restarting backend in 2 seconds to keep it ALWAYS ACTIVE...")
                            time.sleep(2)
                        break

                    time.sleep(1)

            except Exception as e:
                log(f"Failed to spawn backend process: {e}")
                time.sleep(5)
    finally:
        if current_proc and current_proc.poll() is None:
            try:
                current_proc.terminate()
            except Exception:
                pass
        try:
            log_file_handle.close()
        except Exception:
            pass
        clear_pid()
        log("Backend supervisor stopped.")

if __name__ == "__main__":
    main()
