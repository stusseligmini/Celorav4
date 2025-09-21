#!/usr/bin/env python3

import requests
import time
import sys

def check_deployment_status(url="https://celora-api.onrender.com"):
    """Check if deployment is ready"""
    
    print(f"Monitoring deployment status for: {url}")
    print("=" * 60)
    
    max_attempts = 20
    attempt = 0
    
    while attempt < max_attempts:
        attempt += 1
        try:
            print(f"Attempt {attempt}/{max_attempts}: ", end="", flush=True)
            
            # Test health endpoint
            response = requests.get(f"{url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"SUCCESS! Status: {data.get('status', 'unknown')}")
                print(f"Deployment is live and healthy!")
                print(f"Version: {data.get('version', 'unknown')}")
                print(f"Timestamp: {data.get('timestamp', 'unknown')}")
                return True
            elif response.status_code == 404:
                print("404 - Service not found (still deploying...)")
            else:
                print(f"Status {response.status_code} - {response.text[:50]}")
                
        except requests.exceptions.RequestException as e:
            print(f"Connection error: {str(e)[:50]}")
        
        if attempt < max_attempts:
            print("Waiting 30 seconds before retry...")
            time.sleep(30)
    
    print(f"\nDeployment not ready after {max_attempts} attempts")
    print("Check Render dashboard for build logs")
    return False

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://celora-api.onrender.com"
    check_deployment_status(url)
