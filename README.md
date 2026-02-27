# Intel Super Builder Chat Application

A FastAPI + Streamlit chat application that integrates with **Intel® AI Super Builder** for local, private AI inference on Intel hardware.

![Platform](https://img.shields.io/badge/Platform-Intel%20Core%20Ultra-0071C5?style=flat&logo=intel)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=flat&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)
![Streamlit](https://img.shields.io/badge/Streamlit-1.30-FF4B4B?style=flat&logo=streamlit)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

---

## 🎯 Overview

This application provides a clean, modern chat interface for interacting with Intel AI Super Builder's local LLM inference service. It consists of:

- **FastAPI Backend**: REST API that communicates with Super Builder via gRPC
- **Streamlit Frontend**: Interactive chat UI with real-time streaming responses
- **gRPC Client**: Wrapper for Intel Super Builder service communication

### Key Benefits

✅ **Private & Secure** - All processing happens locally on your Intel AI PC  
✅ **Hardware Optimized** - Leverages Intel Core Ultra NPU via OpenVINO™  
✅ **Real-time Streaming** - See responses as they're generated  
✅ **Simple Architecture** - Clean separation between frontend, backend, and AI service  

---

## ✨ Features

- 💬 **Real-time Chat** - Streaming responses from local LLM
- 🎨 **Clean UI** - Modern Streamlit interface with chat history
- 🔄 **Session Management** - Maintain conversation context
- ❤️ **Health Monitoring** - Real-time status of backend and AI service
- 📊 **API Documentation** - Auto-generated Swagger/OpenAPI docs
- 🔌 **Platform Agnostic** - Develop on Linux, deploy on Windows

---

## 🏗️ Architecture

```
┌─────────────────┐      HTTP/REST      ┌──────────────────┐
│   Streamlit     │ ◄─────────────────► │   FastAPI        │
│   Frontend      │   (localhost:8501)  │   Backend        │
│   (Python)      │                     │   (localhost:8000)│
└─────────────────┘                     └──────────────────┘
                                                 │
                                                 │ gRPC
                                                 ▼
                                        ┌──────────────────┐
                                        │ Intel Super      │
                                        │ Builder Service  │
                                        │ (localhost:5006) │
                                        │ [Windows]        │
                                        └──────────────────┘
```

### Communication Flow

1. **User** → Streamlit: Types chat message
2. **Streamlit** → FastAPI: HTTP POST to `/chat` endpoint
3. **FastAPI** → Super Builder: gRPC `Chat()` call
4. **Super Builder** → FastAPI: Streams response chunks via gRPC
5. **FastAPI** → Streamlit: Streams response via HTTP
6. **Streamlit** → User: Displays real-time response

---

## 📦 Prerequisites

### On Windows (Target Platform)

1. **Intel AI Super Builder** installed and running
   - Download from: [https://aibuilder.intel.com](https://aibuilder.intel.com)
   - Service must be running on `localhost:5006`
   - Process name: `IntelAiaService.exe`

2. **Hardware Requirements**
   - Intel® Core™ Ultra processor (Meteor Lake or newer)
   - 16GB+ RAM (32GB recommended)
   - Windows 11 version 23H2 or newer

### On Development Machine (Linux/macOS)

- Python 3.8 or higher
- pip and virtualenv
- Git

---

## � WSL to Windows Connectivity

If you are developing in **WSL (Windows Subsystem for Linux)** while the Intel Super Builder service runs on **Windows**, you need to configure network bridging. This is because `localhost` in WSL refers to the Linux instance, not the Windows host.

### Why This Is Needed

- Intel Super Builder (`IntelAiaService.exe`) runs on Windows and binds to `127.0.0.1:5006`
- WSL has a separate network namespace; `localhost` in WSL does not reach Windows `localhost`
- A port proxy forwards traffic from WSL to the Windows service

### Setup Steps (Run on Windows)

Open **PowerShell as Administrator** and run:

```powershell
# Step 1: Add port proxy to forward connections to localhost
netsh interface portproxy add v4tov4 listenport=5006 listenaddress=0.0.0.0 connectport=5006 connectaddress=127.0.0.1

# Step 2: Allow inbound connections through Windows Firewall
New-NetFirewallRule -DisplayName "WSL gRPC 5006" -Direction Inbound -LocalPort 5006 -Protocol TCP -Action Allow

# Step 3: Verify the port proxy is configured
netsh interface portproxy show all
```

### Find the Windows Host IP (Run in WSL)

```bash
# Get the Windows host IP for WSL networking
ip route show default | awk '{print $3}'
# Or check the vEthernet adapter IP from Windows:
# Get-NetIPAddress | Where-Object {$_.InterfaceAlias -like "*WSL*"}
```

### Configure the Application

Set the environment variable before running the backend:

```bash
# Replace with your Windows host IP (e.g., 172.19.48.1)
export SUPERBUILDER_GRPC_HOST=172.19.48.1
export SUPERBUILDER_GRPC_PORT=5006  # Optional, defaults to 5006

# Then start the backend
python backend/main.py
```

### Cleanup (Optional)

To remove the port proxy when no longer needed:

```powershell
netsh interface portproxy delete v4tov4 listenport=5006 listenaddress=0.0.0.0
```

---

## �🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mohammad17ali/superbuilder-code
cd superbuilder-app
```

### 2. Run Setup Script

```bash
./scripts/setup.sh
```

This script will:
- Create Python virtual environment
- Install all dependencies
- Compile gRPC proto files

### 3. Manual Setup (Alternative)

If the setup script doesn't work:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Compile proto files
./scripts/compile_proto.sh
```

---

## 🎮 Usage

### Starting the Application

#### Option 1: Using Helper Scripts

**Terminal 1 - Start Backend:**
```bash
./scripts/run_backend.sh
```

**Terminal 2 - Start Frontend:**
```bash
./scripts/run_frontend.sh
```

#### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
source venv/bin/activate
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
source venv/bin/activate
streamlit run frontend/app.py
```

### Accessing the Application

- **Streamlit UI**: http://localhost:8501
- **FastAPI Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 📁 Project Structure

```
superbuilder-app/
├── README.md                   # This file
├── requirements.txt            # Python dependencies
├── .gitignore                 # Git ignore rules
│
├── backend/                   # FastAPI Backend
│   ├── __init__.py
│   ├── main.py               # FastAPI application
│   ├── grpc_client.py        # Super Builder gRPC client
│   ├── schemas.py            # Pydantic models
│   └── proto/                # gRPC Protocol Buffers
│       ├── superbuilder_service.proto
│       ├── superbuilder_service_pb2.py       (generated)
│       └── superbuilder_service_pb2_grpc.py  (generated)
│
├── frontend/                  # Streamlit Frontend
│   └── app.py                # Streamlit application
│
└── scripts/                   # Helper Scripts
    ├── setup.sh              # Initial setup
    ├── compile_proto.sh      # Compile proto files
    ├── run_backend.sh        # Start backend
    └── run_frontend.sh       # Start frontend
```

---

## 📚 API Documentation

### REST API Endpoints

#### `GET /`
Root endpoint with API information

#### `GET /health`
Check service health status

**Response:**
```json
{
  "status": "healthy",
  "superbuilder_connected": true,
  "llm_ready": true,
  "message": "All systems operational"
}
```

#### `POST /chat`
Send chat message and stream response

**Request:**
```json
{
  "prompt": "What can you help me with?",
  "session_id": null,
  "name": "User"
}
```

**Response:** Text stream (plain/text)

#### `POST /reconnect`
Manually reconnect to Super Builder service

### gRPC Service Definition

The application communicates with Intel Super Builder using gRPC on `localhost:5006`.

**Key Methods:**
- `SayHello()` - Connection health check
- `LoadModels()` - Load LLM models (blocking call)
- `Chat()` - Stream chat responses
- `DisconnectClient()` - Clean disconnection

Full protocol definition: [backend/proto/superbuilder_service.proto](backend/proto/superbuilder_service.proto)

---

## 🔧 Troubleshooting

### Backend Won't Connect

**Error:** `Cannot connect to Super Builder service`

**Solutions:**
1. Ensure Intel AI Super Builder is installed on Windows
2. Check that `IntelAiaService.exe` is running
3. Verify service is listening on `localhost:5006`
4. If on Linux, you may need SSH port forwarding:
   ```bash
   ssh -L 5006:localhost:5006 windows-machine
   ```

### Models Not Ready

**Error:** `LLM models not loaded`

**Solutions:**
1. Wait 1-2 minutes for models to load
2. Check Super Builder UI to ensure models are selected
3. Try the `/reconnect` endpoint
4. Restart Intel AI Super Builder service

### Proto Compilation Fails

**Error:** `Failed to import generated proto files`

**Solutions:**
1. Install grpcio-tools: `pip install grpcio-tools`
2. Re-run: `./scripts/compile_proto.sh`
3. Check that proto file exists in `backend/proto/`

### Streamlit Connection Error

**Error:** Cannot connect to FastAPI backend

**Solutions:**
1. Ensure backend is running on port 8000
2. Check firewall settings
3. Verify `API_URL` in `frontend/app.py`

---

## 🛠️ Development

### Adding New Features

The architecture is designed for easy extension:

1. **New API Endpoints**: Add to `backend/main.py`
2. **gRPC Methods**: Add wrappers in `backend/grpc_client.py`
3. **UI Components**: Modify `frontend/app.py`

### Code Style

- Follow PEP 8 for Python code
- Use type hints where possible
- Add docstrings to all functions
- Log important events

### Testing

```bash
# Test backend health
curl http://localhost:8000/health

# Test chat endpoint
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'
```

### Recompiling Proto Files

If you update the proto definition:

```bash
./scripts/compile_proto.sh
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---
**Built with ❤️ for Intel AI PCs**

