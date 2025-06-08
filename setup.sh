#!/bin/bash
echo "Setting up the kernel environment..."
npm install || true
pip install -r requirements.txt || echo "No Python dependencies"
