#!/bin/bash

# Render Build Script
# Ensures Python 3.12 is used and dependencies are installed

echo "=== Starting Build Process ==="
echo "Python Version:"
python3 --version

echo ""
echo "=== Upgrading pip, setuptools, and wheel ==="
pip install --upgrade pip setuptools wheel

echo ""
echo "=== Installing requirements ==="
pip install -r requirements.txt

echo ""
echo "=== Build Complete ==="
