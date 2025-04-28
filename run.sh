# run.sh
#!/bin/bash

# Create test directory
mkdir -p ~/others/dev/poc/script-test
cd ~/others/dev/poc/script-test

# Create config file
cat > vss-api.config.json << EOF
{
  "basePath": "src",
  "fileNameCase": "camel"
}
EOF

echo "Created config file at $(pwd)/vss-api.config.json"

# Run the command
echo "Running domain command..."
cd ~/others/dev/poc/vss-ol-cli
npx ts-node src/index.ts create:domain product --yes -p ~/others/dev/poc/script-test

# Check results
echo "Checking results..."
find ~/others/dev/poc/script-test -type f | sort

# If files were created, show contents
SRC_DIR=~/others/dev/poc/script-test/src
if [ -d "$SRC_DIR" ]; then
  echo -e "\nContents of $SRC_DIR:"
  find "$SRC_DIR" -type f -name "*.ts" | sort
  
  # Show file contents
  for file in $(find "$SRC_DIR" -type f -name "*.ts"); do
    echo -e "\n--- $file ---"
    cat "$file"
  done
else
  echo "No src directory was created"
fi
