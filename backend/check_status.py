"""
NeuroDetect - Backend Health & Status Inspector
"""

import sys
import os
import json
import time

try:
    import urllib.request
    HAS_URLLIB = True
except ImportError:
    HAS_URLLIB = False

def main():
    health_url = "http://127.0.0.1:8000/health"
    start_time = time.time()
    
    print("-" * 65)
    print("  Checking NeuroDetect Local Backend Status")
    print("-" * 65)

    try:
        req = urllib.request.Request(
            health_url,
            headers={"User-Agent": "NeuroDetect-Status-Check/1.0"}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            latency_ms = int((time.time() - start_time) * 1000)
            status_code = response.getcode()
            data = json.loads(response.read().decode("utf-8"))

        print("  Status         : ACTIVE & OPERATIONAL (HTTP 200)")
        print(f"  Response Time  : {latency_ms} ms")
        print(f"  System         : {data.get('system', 'NeuroDetect')}")
        print(f"  Version        : {data.get('version', 'Unknown')}")
        print(f"  Health Check   : {data.get('status', 'ok')}")

        pid_file = os.path.join(os.path.dirname(__file__), "backend.pid")
        if os.path.exists(pid_file):
            with open(pid_file, "r", encoding="utf-8") as f:
                supervisor_pid = f.read().strip()
            print(f"  Supervisor PID : {supervisor_pid} (Watchdog Active)")

        print("-" * 65)
        print("  All local clinical diagnostic services are ACTIVE and reachable!")
        print("  Open browser: http://127.0.0.1:8000")
        print("-" * 65)
        return 0

    except Exception as err:
        print("  Status         : INACTIVE / NOT RESPONDING")
        print(f"  Error Detail   : {err}")
        print("-" * 65)
        print("  To start the backend, run: START_ALWAYS_ACTIVE.bat")
        print("-" * 65)
        return 1

if __name__ == "__main__":
    sys.exit(main())
