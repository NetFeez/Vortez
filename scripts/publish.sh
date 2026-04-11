#!/bin/bash
echo "Starting publish process...";
if bash scripts/test.sh; then
  echo "Tests passed successfully!";
else
  echo "Tests failed. Aborting publish.";
  exit 1;
fi

if [[ "$1" == "--dev" ]]; then
  echo "Publishing with tag 'dev'...";
  if npm publish --tag dev; then
    echo "Dev publish completed successfully!";
  else
    echo "Dev publish failed.";
    exit 1;
  fi
else
  echo "Publishing...";
  if npm publish; then
    echo "Publish completed successfully!";
  else
    echo "Publish failed.";
    exit 1;
  fi
fi