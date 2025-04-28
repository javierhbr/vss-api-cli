# simple-local-test.sh
#!/bin/bash

# Clean up test directory
TEST_DIR="./test-domain-local"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Create config file
echo "{\"basePath\": \"src\", \"fileNameCase\": \"camel\"}" > "$TEST_DIR/vss-api.config.json"

echo "Created test directory with config file"

# Create local log file for manual debugging
echo "Starting test at $(date)" > test-output.log

# Build the project
echo "Building project..."
npm run build

# Run the command and capture output
echo "Running command..."
npx ts-node src/index.ts create:domain product --yes -p "$TEST_DIR" > command-output.txt 2>&1
CMD_STATUS=$?

echo "Command exited with status: $CMD_STATUS" >> test-output.log
cat command-output.txt >> test-output.log

echo "Command output saved to command-output.txt"

# Check results
echo "Checking for created files..."
find "$TEST_DIR" -type f | sort

# Check src directory
if [ -d "$TEST_DIR/src" ]; then
  echo "src directory exists. Contents:"
  ls -la "$TEST_DIR/src"
  
  # Check model directory
  MODEL_DIR="$TEST_DIR/src/product/models"
  if [ -d "$MODEL_DIR" ]; then
    echo "Model directory exists. Contents:"
    ls -la "$MODEL_DIR"
    
    # Check for model file
    if [ -f "$MODEL_DIR/product.ts" ]; then
      echo "SUCCESS! Found camelCase model file: $MODEL_DIR/product.ts"
      echo "Content:"
      cat "$MODEL_DIR/product.ts"
    else
      echo "Error: Did not find camelCase model file"
      if [ -f "$MODEL_DIR/Product.ts" ]; then
        echo "Found PascalCase file instead: $MODEL_DIR/Product.ts"
      fi
    fi
  else
    echo "Error: Model directory not found"
  fi
else
  echo "Error: src directory not found"
fi

echo "Test results saved to test-output.log"
