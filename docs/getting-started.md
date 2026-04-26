# Getting Started with Macadam

Macadam is designed to be simple to set up and use.

## Prerequisites
- Python 3.10+
- Virtualenv (handled by `run.sh`)

## Initial Setup
1. Clone the repository.
2. Run the `run.sh` script:
   ```bash
   ./run.sh
   ```
   This script will:
   - Create a `.venv` directory.
   - Install dependencies from `requirements.txt`.
   - Start the Flask server.

## Login
The default user is `rajkumar` with password `rajkumar`. You can change these in `app.py` or through the admin interface (once implemented).

## Tracking Your Miles
Once logged in, use the **Dashboard** to see your summary and the **Weekly Log** to enter new data.
