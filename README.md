# Pokemon_Webapp — Development setup

This project uses a Python virtual environment. The venv may be named either `.venv` or `venv`.

macOS (zsh) — create & activate

1. Create the venv (example using `.venv`):

   python3.12 -m venv .venv

2. Activate the venv:

   # if your venv directory is named `.venv`
   source .venv/bin/activate

   # if your venv directory is named `venv`
   source venv/bin/activate

3. Upgrade pip / install dependencies:

   python -m pip install --upgrade pip
   pip install -r requirements.txt

To verify the Python version inside the venv:

   python -V  # should report Python 3.12.x

Notes:
- If `python3.12` is not available on your system, install it (pyenv, Homebrew, or the official installer), then recreate the venv with that interpreter.
