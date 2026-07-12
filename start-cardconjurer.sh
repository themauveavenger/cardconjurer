#!/bin/bash
# Card Conjurer launcher — runs the local server and opens the browser.
# Close this terminal window to stop the server.

cd "$(dirname "$0")"
echo "================================="
echo "   CARD CONJURER is starting..."
echo "================================="
echo ""

# Start the extended Card Conjurer server in the foreground
# (launcher.py serves static files and the card persistence API)
python3 launcher.py &
SERVER_PID=$!

# Give it a moment to start
sleep 1

# launcher.py opens the browser automatically

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
