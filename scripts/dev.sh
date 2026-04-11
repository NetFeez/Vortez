#!/bin/bash
echo "Removing old build files...";
rm -rf build;

echo "Starting TypeScript compiler in watch mode...";
tsc --watch;