#!/bin/bash
echo "Starting publish process...";
bash scripts/compile.sh;

if [[ "$1" == "--dev" ]]; then
  echo "Publishing with tag 'dev'...";
  npm publish --tag dev;
else
  echo "Publishing...";
  npm publish;
fi

echo "Publish completed successfully!";