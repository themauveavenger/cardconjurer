"""
IMPORTS
"""
from http.server import SimpleHTTPRequestHandler, HTTPServer
import webbrowser
import os
import json
import urllib.parse
import re

"""
SETTINGS
"""

NAME = "localhost"
PORT = 8080
DIRECTORY = os.getcwd()
SAVED_CARDS_DIR = os.path.join(DIRECTORY, "saved_cards")

"""
HELPERS
"""


def ensure_saved_cards_dir():
    """Create the saved cards directory if it does not exist."""
    os.makedirs(SAVED_CARDS_DIR, exist_ok=True)


def sanitize_card_name(card_name):
    """
    Convert a card name into a safe filename base.

    - Decode URL encoding first.
    - Strip path separators, parent-directory references, and control characters.
    - Replace unsafe characters with underscores.
    - Trim and truncate to a reasonable length.
    """
    decoded = urllib.parse.unquote(card_name)
    # Strip path traversal attempts and directory separators.
    decoded = re.sub(r"\.\.+|[/\\]", "_", decoded)
    # Replace control characters and other filesystem-unfriendly characters.
    decoded = re.sub(r"[\x00-\x1f\x7f<>:\"|?*]", "_", decoded)
    # Trim whitespace from ends.
    decoded = decoded.strip()
    # Collapse multiple underscores/spaces.
    decoded = re.sub(r"[ _]+", "_", decoded)
    # Truncate to avoid overly long filenames.
    return decoded[:120] or "untitled"


def list_saved_cards():
    """Return an alphabetically sorted list of saved card names (without extension)."""
    ensure_saved_cards_dir()
    names = []
    for filename in os.listdir(SAVED_CARDS_DIR):
        if filename.endswith(".json") and os.path.isfile(os.path.join(SAVED_CARDS_DIR, filename)):
            names.append(filename[:-5])
    names.sort()
    return names


def send_json(handler, status, data):
    """Send a JSON response."""
    body = json.dumps(data).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def send_text(handler, status, text):
    """Send a plain text response."""
    body = text.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/plain")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


"""
REQUEST HANDLER
"""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Suppress request logging to keep the launcher console quiet.
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/api/cards":
            self._handle_list_cards()
        elif path.startswith("/api/cards/"):
            card_name = path[len("/api/cards/"):]
            self._handle_get_card(card_name)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/api/cards":
            self._handle_save_card()
        else:
            self.send_error(404, "Not Found")

    def _handle_list_cards(self):
        send_json(self, 200, list_saved_cards())

    def _handle_get_card(self, card_name):
        safe_name = sanitize_card_name(card_name)
        file_path = os.path.join(SAVED_CARDS_DIR, safe_name + ".json")

        if not os.path.exists(file_path):
            send_text(self, 404, f"Card '{safe_name}' not found.")
            return

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                card_data = json.load(f)
            send_json(self, 200, card_data)
        except json.JSONDecodeError:
            send_text(self, 500, f"Card '{safe_name}' is corrupted.")
        except Exception as e:
            send_text(self, 500, str(e))

    def _handle_save_card(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            send_text(self, 400, "Request body is empty.")
            return

        body = self.rfile.read(content_length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            send_text(self, 400, f"Invalid JSON: {e}")
            return

        # The client sends the card name separately from the card data object.
        if not isinstance(payload, dict) or "key" not in payload:
            send_text(self, 400, "Payload must include a 'key' field.")
            return

        card_name = payload["key"]
        card_data = payload.get("data", {})

        safe_name = sanitize_card_name(card_name)
        file_path = os.path.join(SAVED_CARDS_DIR, safe_name + ".json")

        try:
            ensure_saved_cards_dir()
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(card_data, f, ensure_ascii=False, indent=2)
            send_json(self, 200, {"savedAs": safe_name})
        except Exception as e:
            send_text(self, 500, str(e))


"""
START APP
"""

if __name__ == "__main__":
    ensure_saved_cards_dir()
    webServer = HTTPServer((NAME, PORT), Handler)
    print("Server started http://%s:%s" % (NAME, PORT))

    try:
        webbrowser.open('http://localhost:8080', new=2)
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")
