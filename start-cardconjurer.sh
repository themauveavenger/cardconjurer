#!/bin/bash
# Card Conjurer launcher — runs the local server and opens the browser.
# Close this terminal window to stop the server.

cd "$(dirname "$0")"
echo "================================="
echo "   CARD CONJURER is starting..."
echo "================================="
echo ""

# Start the Python HTTP server in the foreground
# (Using python3 -m http.server since launcher.py is just a thin wrapper)
python3 -m http.server 8080 --bind 127.0.0.1 &
SERVER_PID=$!

# Give it a moment to start
sleep 1

# Open the browser
xdg-open http://localhost:8080

echo "Server is running at http://localhost:8080"
echo "Open your browser to that address if it didn't open automatically."
echo ""
echo "--- Close this window to stop Card Conjurer ---"
echo ""

# Wait for the server process so the terminal stays open
# If the user presses Ctrl+C or closes the window, we clean up
trap "kill $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait $SERVER_PID

# If we reach here (server died unexpectedly), keep window open to show error
echo "Server stopped. You can close this window."
read -r
