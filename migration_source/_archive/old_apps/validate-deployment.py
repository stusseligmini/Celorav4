import requests
import json
import time
import sys
import os

def check_api_health(base_url):
    """Check if the API is up and running."""
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"API Health Status: {data.get('status', 'unknown')}")
            print(f"API Timestamp: {data.get('timestamp', 'unknown')}")
            print(f"API Version: {data.get('version', 'unknown')}")
            
            # Check database connection if available
            db_info = data.get('database', {})
            print(f"Database Status: {db_info.get('status', 'unknown')}")
            
            return True
        else:
            print(f"API Health Check Failed: Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"API Health Check Failed: {e}")
        return False

def check_database_connection(base_url):
    """Check if the database connection is working."""
    try:
        response = requests.get(f"{base_url}/api/database-test")
        if response.status_code == 200:
            data = response.json()
            print(f"Database Connection: {data.get('status', 'unknown')}")
            print(f"Database URL: {data.get('database_url', 'unknown')}")
            if data.get('status') == 'success':
                print(f"Database Test Passed!")
                return True
            else:
                print(f"Database Test Failed: {data.get('message', 'unknown error')}")
                return False
        else:
            print(f"Database Test Failed: Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"Database Test Failed: {e}")
        return False

def check_users_endpoint(base_url):
    """Check if the users endpoint is returning data."""
    try:
        response = requests.get(f"{base_url}/api/users")
        if response.status_code == 200:
            users = response.json()
            print(f"Users Endpoint: {len(users)} users found")
            print(f"   First user: {users[0]['username'] if users else 'none'}")
            return True
        else:
            print(f"Users Endpoint Failed: Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"Users Endpoint Failed: {e}")
        return False

def check_wallets_endpoint(base_url):
    """Check if the wallets endpoint is returning data."""
    try:
        response = requests.get(f"{base_url}/api/wallets")
        if response.status_code == 200:
            wallets = response.json()
            print(f"Wallets Endpoint: {len(wallets)} wallets found")
            print(f"   First wallet: {wallets[0]['address'] if wallets else 'none'}")
            return True
        else:
            print(f"Wallets Endpoint Failed: Status code {response.status_code}")
            return False
    except Exception as e:
        print(f"Wallets Endpoint Failed: {e}")
        return False

def main():
    """Main function to validate deployment."""
    # Default to render URL or use the first command line argument
    base_url = "https://celora-api.onrender.com"
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    print(f"Validating deployment for: {base_url}")
    print("=" * 50)
    
    # Run all checks
    api_healthy = check_api_health(base_url)
    print("-" * 50)
    
    db_connected = check_database_connection(base_url)
    print("-" * 50)
    
    users_working = check_users_endpoint(base_url)
    print("-" * 50)
    
    wallets_working = check_wallets_endpoint(base_url)
    print("-" * 50)
    
    # Overall status
    if api_healthy and db_connected and users_working and wallets_working:
        print("All checks passed! Deployment is working correctly!")
    else:
        print("Some checks failed. Please check the logs above.")
    
    print("=" * 50)

if __name__ == "__main__":
    main()
