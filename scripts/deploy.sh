#!/bin/bash

# SuiStage Event Contract Deployment Script
# Role 2: Event Management System

set -e

echo "🚀 Starting SuiStage Event Contract Deployment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo -e "${RED}❌ Error: sui CLI not found${NC}"
    echo "Please install Sui CLI first:"
    echo "cargo install --locked --git https://github.com/MystenLabs/sui.git sui"
    exit 1
fi

echo -e "${GREEN}✓${NC} Sui CLI found"

# Check if we're in the correct directory
if [ ! -f "Move.toml" ]; then
    echo -e "${RED}❌ Error: Move.toml not found${NC}"
    echo "Please run this script from the contracts directory"
    exit 1
fi

echo -e "${GREEN}✓${NC} Move.toml found"
echo ""

# Build the contract
echo "📦 Building contract..."
sui move build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build successful"
echo ""

# Run tests
echo "🧪 Running tests..."
sui move test

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} All tests passed"
echo ""

# Deploy to testnet
echo "🌐 Deploying to Sui Testnet..."
echo ""

DEPLOY_OUTPUT=$(sui client publish --gas-budget 100000000 --json 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Extract package ID and object IDs
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | jq -r '.objectChanges[] | select(.type == "published") | .packageId')
REGISTRY_ID=$(echo "$DEPLOY_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("EventRegistry")) | .objectId')

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 IMPORTANT: Save these values"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "PACKAGE_ID=$PACKAGE_ID"
echo "EVENT_REGISTRY_ID=$REGISTRY_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo "1. Copy the above values to your backend .env file"
echo "2. Update PACKAGE_ID and EVENT_REGISTRY_ID"
echo "3. Restart your backend server"
echo ""

# Save to file
ENV_FILE="../backend/.env"
if [ -f "$ENV_FILE" ]; then
    echo "📝 Updating .env file..."
    
    # Update or add PACKAGE_ID
    if grep -q "^PACKAGE_ID=" "$ENV_FILE"; then
        sed -i "s/^PACKAGE_ID=.*/PACKAGE_ID=$PACKAGE_ID/" "$ENV_FILE"
    else
        echo "PACKAGE_ID=$PACKAGE_ID" >> "$ENV_FILE"
    fi
    
    # Update or add EVENT_REGISTRY_ID
    if grep -q "^EVENT_REGISTRY_ID=" "$ENV_FILE"; then
        sed -i "s/^EVENT_REGISTRY_ID=.*/EVENT_REGISTRY_ID=$REGISTRY_ID/" "$ENV_FILE"
    else
        echo "EVENT_REGISTRY_ID=$REGISTRY_ID" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✓${NC} .env file updated"
fi

# Save deployment info
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "Deployed at: $TIMESTAMP" > deployment-info.txt
echo "Package ID: $PACKAGE_ID" >> deployment-info.txt
echo "Event Registry ID: $REGISTRY_ID" >> deployment-info.txt
echo "Network: testnet" >> deployment-info.txt

echo ""
echo "📄 Deployment info saved to deployment-info.txt"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
