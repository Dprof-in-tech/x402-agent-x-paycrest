#!/bin/bash

# Quick GitHub Setup for Synthesis Submission
# Run this script to initialize a repo and get it on GitHub immediately.

echo "🚀 Synthesis Hackathon: Rapid GitHub Setup"

# 1. Initialize Git
git init

# 2. Add all files
git add .

# 3. Initial Commit
git commit -m "Initial x402 Agent-X Paytech build for Synthesis 2026"

# 4. Instructions for the User
echo ""
echo "----------------------------------------------------"
echo "✅ Git repository initialized and files committed!"
echo "----------------------------------------------------"
echo ""
echo "Next steps to make this public for your submission:"
echo ""
echo "1. Go to https://github.com/new"
echo "2. Create a NEW PUBLIC repository named 'x402-agent-x-synthesis'"
echo "3. Run these commands in your terminal:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/x402-agent-x-synthesis.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "Then, copy your repo URL and submit at https://synthesis.md/before the deadline!"
