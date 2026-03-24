#!/bin/bash
echo "Starting publish process...";
bash scripts/compile.sh;

echo "Publishing...";
npm publish;

echo "Publish completed successfully!";