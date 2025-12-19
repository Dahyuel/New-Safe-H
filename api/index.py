from backend.app import app

# Vercel needs a handler for WSGI
# But typically for Flask on Vercel, simply exposing 'app' is enough if vercel.json points to it.
# However, importing from parent directory 'backend' might require sys path adjustment in some environments.
# To be safe:
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app

# Vercel serverless function entry point
# For WSGI apps, Vercel looks for 'app' or 'handler' or 'application'
# We export 'app' which is the Flask instance.
if __name__ == "__main__":
    app.run()
