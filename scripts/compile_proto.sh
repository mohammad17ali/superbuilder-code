#!/bin/bash

# Script to compile gRPC proto files
# This generates the Python stubs for gRPC communication with Intel Super Builder

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROTO_DIR="$PROJECT_ROOT/backend/proto"

echo "Compiling proto files..."
echo "Proto directory: $PROTO_DIR"

# Check if proto file exists
if [ ! -f "$PROTO_DIR/superbuilder_service.proto" ]; then
    echo "Error: superbuilder_service.proto not found in $PROTO_DIR"
    exit 1
fi

# Compile proto files
python -m grpc_tools.protoc \
    -I"$PROTO_DIR" \
    --python_out="$PROTO_DIR" \
    --grpc_python_out="$PROTO_DIR" \
    "$PROTO_DIR/superbuilder_service.proto"

if [ $? -eq 0 ]; then
    echo "✓ Proto files compiled successfully!"
    echo "  Generated:"
    echo "    - superbuilder_service_pb2.py"
    echo "    - superbuilder_service_pb2_grpc.py"
else
    echo "✗ Proto compilation failed!"
    exit 1
fi
