#!/usr/bin/env python3
"""
Cross-platform browser opener for development servers.

Opens the default web browser to a localhost URL with the specified port.
Supports Windows, macOS, and Linux platforms.

Usage:
    python open_browser.py [port] [path]

Examples:
    python open_browser.py              # Opens http://localhost:3000
    python open_browser.py 5173         # Opens http://localhost:5173
    python open_browser.py 8080 /admin  # Opens http://localhost:8080/admin

Arguments:
    port: Port number (default: 3000)
    path: URL path (default: /)

Environment Variables:
    BROWSER=none    Disables browser opening
    CI=true         Disables browser opening (CI environment)
"""

import sys
import webbrowser
import time
import os
from urllib.error import URLError
from urllib.request import urlopen


def wait_for_server(url, max_attempts=30, delay=0.5):
    """
    Wait for the server to be ready by attempting to connect.

    Args:
        url: The URL to check
        max_attempts: Maximum number of connection attempts
        delay: Delay in seconds between attempts

    Returns:
        bool: True if server is ready, False otherwise
    """
    for attempt in range(max_attempts):
        try:
            urlopen(url, timeout=1)
            return True
        except (URLError, OSError):
            if attempt < max_attempts - 1:
                time.sleep(delay)
            continue
    return False


def open_browser_to_localhost(port=3000, path="/"):
    """
    Opens the default browser to a localhost URL.

    Args:
        port: Port number for localhost
        path: URL path to open (should start with /)

    Returns:
        bool: True if browser opened successfully, False otherwise
    """
    # Check if browser opening is disabled
    browser_env = os.getenv("BROWSER", "").lower()
    ci_env = os.getenv("CI", "").lower()

    if browser_env == "none" or ci_env == "true":
        print(f"Browser opening disabled (BROWSER={browser_env}, CI={ci_env})")
        return False

    # Ensure path starts with /
    if not path.startswith("/"):
        path = "/" + path

    # Construct URL
    url = f"http://localhost:{port}{path}"

    print(f"Waiting for server at {url}...")

    # Wait for server to be ready
    if not wait_for_server(url):
        print(f"Warning: Server at {url} did not respond within timeout")
        print(f"Opening browser anyway...")

    # Open browser
    try:
        print(f"Opening {url} in default browser...")
        success = webbrowser.open(url)

        if success:
            print(f"Successfully opened browser to {url}")
            return True
        else:
            print(f"Failed to open browser to {url}")
            print("Please open manually or check your default browser settings")
            return False

    except Exception as e:
        print(f"Error opening browser: {e}")
        print(f"Please open {url} manually in your browser")
        return False


def main():
    """Main entry point for the script."""
    # Default values
    port = 3000
    path = "/"

    # Parse command line arguments
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            if port < 1 or port > 65535:
                print(f"Error: Port must be between 1 and 65535, got {port}")
                sys.exit(1)
        except ValueError:
            print(f"Error: Invalid port number '{sys.argv[1]}'")
            print("Usage: python open_browser.py [port] [path]")
            sys.exit(1)

    if len(sys.argv) > 2:
        path = sys.argv[2]

    # Open browser
    success = open_browser_to_localhost(port, path)

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
