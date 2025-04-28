# local-test.sh
#!/bin/bash

# Create a local test directory
TEST_DIR="./test-local"
mkdir -p "$TEST_DIR"
echo "{\"basePath\": \"src\", \"fileNameCase\": \"camel\"}" > "$TEST_DIR/vss-api.config.json"

# Build the project
echo "Building project..."
npm run build

# Run the command
echo "Running domain command for local test directory..."
npx ts-node src/index.ts create:domain product --yes -p "$TEST_DIR"

# Check results
echo "Checking results..."
find "$TEST_DIR" -type f | sort

# Check if src directory was created
if [ -d "$TEST_DIR/src" ]; then
  echo -e "\nContents of src directory:"
  find "$TEST_DIR/src" -type f | sort
  
  # Show TypeScript files
  TS_FILES=$(find "$TEST_DIR/src" -name "*.ts")
  if [ -n "$TS_FILES" ]; then
    echo -e "\nTypeScript files generated:"
    echo "$TS_FILES"
    
    # Print content of first TypeScript file
    FIRST_FILE=$(echo "$TS_FILES" | head -n 1)
    if [ -n "$FIRST_FILE" ]; then
      echo -e "\nContents of $FIRST_FILE:"
      cat "$FIRST_FILE"
    fi
  else
    echo "No TypeScript files found."
  fi
else
  echo "No src directory was created."
fi

# Check for log file
LOG_FILE="schematic-debug.log"
if [ -f "$LOG_FILE" ]; then
  echo -e "\nDebug log contents:"
  cat "$LOG_FILE"
else
  echo "No debug log file found."
fi
