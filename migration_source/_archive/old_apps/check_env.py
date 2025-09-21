# VS Code Python Environment Test
# This file helps VS Code recognize the correct Python interpreter

import sys
import os

print("🔧 VS Code Python Environment Check")
print(f"✅ Python executable: {sys.executable}")
print(f"✅ Python version: {sys.version}")
print(f"✅ Working directory: {os.getcwd()}")

# Test wallet imports
try:
    from cryptography.fernet import Fernet
    import requests
    print("✅ Cryptography module: OK")
    print("✅ Requests module: OK")
    print("✅ All wallet dependencies: AVAILABLE")
except ImportError as e:
    print(f"❌ Import error: {e}")

print("\n🎯 VS Code should now recognize the correct Python environment!")
