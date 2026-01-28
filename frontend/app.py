
import streamlit as st
import requests
from typing import Generator
import time


# Configuration
API_URL = "http://localhost:8003"
CHAT_ENDPOINT = f"{API_URL}/chat"
HEALTH_ENDPOINT = f"{API_URL}/health"



def check_backend_health() -> dict:
    """
    Check if the FastAPI backend and Super Builder service are healthy.
    
    Returns:
        Dictionary with health status or None if check fails
    """
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except requests.exceptions.RequestException:
        return None


def stream_chat_response(prompt: str, session_id: int = None) -> Generator[str, None, None]:
    """
    Send chat request and stream the response.
    
    Args:
        prompt: User's chat message
        session_id: Optional session ID for conversation history
        
    Yields:
        Response chunks from the LLM
    """
    try:
        payload = {
            "prompt": prompt,
            "session_id": session_id,
            "name": "Streamlit Client"
        }
        
        with requests.post(CHAT_ENDPOINT, json=payload, stream=True, timeout=60) as response:
            if response.status_code == 200:
                # Stream the response
                for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                    if chunk:
                        yield chunk
            else:
                yield f"\n\n❌ Error: {response.status_code} - {response.text}"
                
    except requests.exceptions.RequestException as e:
        yield f"\n\n❌ Connection Error: {str(e)}\n\nPlease ensure the FastAPI backend is running on {API_URL}"


def init_session_state():
    """Initialize Streamlit session state variables."""
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    if "session_id" not in st.session_state:
        # Generate a simple session ID
        st.session_state.session_id = int(time.time() * 1000) % 100000000


def main():
    """Main Streamlit application."""
    
    # Page configuration
    st.set_page_config(
        page_title="Intel Super Builder Chat",
        page_icon="🤖",
        layout="centered",
        initial_sidebar_state="collapsed"
    )
    
    # Initialize session state
    init_session_state()
    
    # Header
    st.title("🤖 Intel Super Builder Chat")
    st.caption("Powered by Intel AI Super Builder on Intel Core Ultra NPU")
    
    # Sidebar with status
    with st.sidebar:
        st.header("⚙️ System Status")
        
        # Check health
        with st.spinner("Checking system status..."):
            health = check_backend_health()
        
        if health:
            st.success("✅ Backend Connected")
            
            if health.get("superbuilder_connected"):
                st.success("✅ Super Builder Connected")
            else:
                st.error("❌ Super Builder Disconnected")
            
            if health.get("llm_ready"):
                st.success("✅ LLM Models Ready")
            else:
                st.warning("⚠️ LLM Models Not Ready")
            
            st.info(f"ℹ️ {health.get('message', 'Status unknown')}")
        else:
            st.error("❌ Backend Unavailable")
            st.warning(f"Cannot connect to FastAPI backend at {API_URL}")
            st.info("Please ensure:\n1. Backend is running: `cd backend && python main.py`\n2. Intel Super Builder service is running on Windows")
        
        st.divider()
        
        # Session info
        st.caption(f"Session ID: {st.session_state.session_id}")
        
        # Clear chat button
        if st.button("🗑️ Clear Chat History", use_container_width=True):
            st.session_state.messages = []
            st.rerun()
    
    # Main chat interface
    st.divider()
    
    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Chat input
    if prompt := st.chat_input("Ask me anything..."):
        # Add user message to chat history
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Display assistant response with streaming
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            full_response = ""
            
            # Stream the response
            for chunk in stream_chat_response(prompt, st.session_state.session_id):
                full_response += chunk
                message_placeholder.markdown(full_response + "▌")
            
            # Final response without cursor
            message_placeholder.markdown(full_response)
        
        # Add assistant response to chat history
        st.session_state.messages.append({"role": "assistant", "content": full_response})
    
    # Footer
    st.divider()
    st.caption(
        "💡 **Tip:** This chat runs completely locally on your Intel AI PC. "
        "Your conversations are private and secure."
    )


if __name__ == "__main__":
    main()
