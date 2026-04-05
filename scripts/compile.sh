#!/bin/bash
echo "Cleaning build directory...";
rm -rf build;

echo "Compiling TypeScript...";
if npx tsc; then
    echo "TypeScript compilation successful.";
else
    echo "TypeScript compilation failed. Please check the error messages above.";
    exit 1;
fi

echo "Build completed successfully!";