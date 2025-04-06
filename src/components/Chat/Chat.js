import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';

const Chat = ({ user, serverUrl = 'http://localhost:5000', onSendImage, onProcessMessage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if ((!input.trim() && !selectedFile) || isLoading) {
      return;
    }

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
      hasImage: !!selectedFile,
      image: selectedFile ? URL.createObjectURL(selectedFile) : null
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (selectedFile) {
        // Handle file upload if present
        onSendImage({
          type: 'image',
          content: URL.createObjectURL(selectedFile),
          title: 'User Uploaded Image'
        });
      }

      // Process message with OpenAI integration
      if (input.trim()) {
        // Use onProcessMessage callback to handle OpenAI integration
        await onProcessMessage(input.trim(), (response) => {
          if (response.content && response.content.trim()) {
            setMessages(prev => [...prev, {
              id: Date.now() + 1,
              text: response.content,
              sender: 'bot',
              timestamp: new Date().toISOString()
            }]);
          }
        });
      } else if (selectedFile) {
        // Simple response for image-only uploads
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: "I've added your image to the visualization area.",
          sender: 'bot',
          timestamp: new Date().toISOString()
        }]);
      }
      
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error: ${error.message || 'Failed to send message'}`,
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const formatMessage = (message) => {
    // Simple formatting - in a real app you might use markdown or HTML sanitization
    return { __html: message.replace(/\n/g, '<br/>') };
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat Assistant</h3>
        <div className="user-info">
          <span className="username">{user?.username || 'Guest'}</span>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <p>No messages yet. Start a conversation!</p>
            <p className="chat-hint">Try asking for a chart or data table.</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender}`}
            >
              {message.hasImage && (
                <div className="message-image">
                  <img src={message.image} alt="User upload" />
                </div>
              )}
              <div 
                className="message-text" 
                dangerouslySetInnerHTML={formatMessage(message.text)} 
              />
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message bot loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-container" onSubmit={sendMessage}>
        {selectedFile && (
          <div className="selected-file">
            <div className="file-preview">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Selected file" 
              />
              <button 
                type="button" 
                className="remove-file" 
                onClick={removeSelectedFile}
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        <div className="input-group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a chart or data visualization..."
            disabled={isLoading}
          />
          
          <div className="chat-buttons">
            <button 
              type="button" 
              className="upload-button" 
              onClick={triggerFileInput}
              disabled={isLoading}
            >
              📎
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*"
            />
            
            <button 
              type="submit" 
              className="send-button" 
              disabled={(!input.trim() && !selectedFile) || isLoading}
            >
              📤
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Chat;
