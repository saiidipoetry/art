"""
Simple Flask backend for S.I.N. wall notes.
Stores submissions to notes.json and commits to GitHub.
"""

import os
import json
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

NOTES_FILE = "notes.json"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = "saiidipoetry/art"

def load_notes():
    """Load existing notes from file."""
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_notes(notes):
    """Save notes to file and commit to GitHub."""
    with open(NOTES_FILE, "w") as f:
        json.dump(notes, f, indent=2)

    if GITHUB_TOKEN:
        try:
            subprocess.run(["git", "add", NOTES_FILE], check=True)
            subprocess.run(
                ["git", "commit", "-m", f"Add new note from wall"],
                check=True
            )
            subprocess.run(
                ["git", "push", f"https://x-access-token:{GITHUB_TOKEN}@github.com/{GITHUB_REPO}.git", "main"],
                check=True
            )
        except Exception as e:
            print(f"Git commit/push failed: {e}")

@app.route("/api/notes", methods=["GET"])
def get_notes():
    """Fetch all notes."""
    notes = load_notes()
    return jsonify(notes)

@app.route("/api/notes", methods=["POST"])
def submit_note():
    """Submit a new note."""
    data = request.get_json()
    
    if not data or "text" not in data:
        return jsonify({"error": "Missing note text"}), 400

    notes = load_notes()
    new_note = {
        "text": data.get("text", "").strip(),
        "name": data.get("name", "anon").strip().lower(),
        "time": datetime.now().isoformat()
    }

    if not new_note["text"]:
        return jsonify({"error": "Empty note"}), 400

    notes.append(new_note)
    save_notes(notes)

    return jsonify({"success": True, "note": new_note}), 201

@app.route("/notes.json", methods=["GET"])
def serve_notes_json():
    """Serve notes.json directly for frontend fetch."""
    notes = load_notes()
    response = jsonify(notes)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET')
    return response

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
