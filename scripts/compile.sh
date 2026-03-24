#!/bin/bash
echo "Cleaning build directory...";
rm -rf build;

echo "Compiling TypeScript...";
npx tsc;

echo "Build completed successfully!";