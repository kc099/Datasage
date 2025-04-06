import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Login from './components/Auth/Login';
import Chat from './components/Chat/Chat';
import OpenAI from 'openai';

// Initialize OpenAI client - in a real app, you would use environment variables
// for the API key instead of hardcoding it
const openai = new OpenAI({
  apiKey: '', // Replace with your actual API key or use process.env.OPENAI_API_KEY
  dangerouslyAllowBrowser: true // Only for demo purposes, not recommended for production
});

function App() {
  const [user, setUser] = useState(null);
  const [selectedDataSource, setSelectedDataSource] = useState(null);
  const [selectedVisual, setSelectedVisual] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [outputItems, setOutputItems] = useState([]);
  const [leftPanelType, setLeftPanelType] = useState(null); // 'visualizations', 'fields', or 'filters'
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  
  const handleLogin = (userData) => {
    setUser(userData);
  };

  const addOutputItem = (item) => {
    setOutputItems(prev => [...prev, {
      id: Date.now(),
      ...item,
      position: { x: 50, y: 50 },
      size: { width: 300, height: item.type === 'image' ? 200 : 300 }
    }]);
  };

  const handleItemMove = (id, position) => {
    setOutputItems(prev => 
      prev.map(item => item.id === id ? { ...item, position } : item)
    );
  };

  const handleItemResize = (id, size) => {
    setOutputItems(prev => 
      prev.map(item => item.id === id ? { ...item, size } : item)
    );
  };

  const handleItemRemove = (id) => {
    setOutputItems(prev => prev.filter(item => item.id !== id));
  };

  // Handle OpenAI API integration
  const handleProcessMessage = async (message, onResponse) => {
    try {
      // In a real app, you would use your actual API key
      // For demo purposes, we'll simulate the API call
      let response;
      let hasVisualization = false;
      
      try {
        // Attempt to call the OpenAI API
        response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that can generate data visualizations. If the user asks for a chart, table, or any visualization, include it in your response. Format tables using markdown."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 1000
        });
        
        // Process the text response
        if (response && response.choices && response.choices[0]) {
          const textResponse = response.choices[0].message.content;
          let cleanedResponse = textResponse;
          
          // Check for table content (markdown tables)
          if (textResponse.includes('|')) {
            // Extract table data from markdown
            const tableLines = textResponse.split('\n').filter(line => line.includes('|'));
            if (tableLines.length >= 2) {
              // Parse markdown table to JSON
              const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
              const rows = [];
              
              for (let i = 2; i < tableLines.length; i++) {
                const cells = tableLines[i].split('|').map(c => c.trim()).filter(c => c);
                if (cells.length === headers.length) {
                  const row = {};
                  headers.forEach((header, index) => {
                    row[header] = cells[index];
                  });
                  rows.push(row);
                }
              }
              
              if (rows.length > 0) {
                addOutputItem({
                  type: 'table',
                  content: rows,
                  title: 'Generated Table'
                });
                hasVisualization = true;
                
                // Remove the table from the response text
                const tableRegex = /\|[\s\S]*?\|\n/g;
                cleanedResponse = textResponse.replace(tableRegex, '');
              }
            }
          }
          
          // Check for chart descriptions and generate a chart
          if (
            textResponse.toLowerCase().includes('chart') || 
            textResponse.toLowerCase().includes('graph') || 
            textResponse.toLowerCase().includes('plot')
          ) {
            // Generate a chart based on the description
            // In a real app, you would use a charting library like Chart.js
            // For demo purposes, we'll use a placeholder image
            addOutputItem({
              type: 'image',
              content: `https://via.placeholder.com/600x400?text=${encodeURIComponent('Generated Chart')}`,
              title: 'Generated Chart'
            });
            hasVisualization = true;
          }
          
          // Send the cleaned text response (without tables)
          cleanedResponse = cleanedResponse.trim();
          if (cleanedResponse) {
            onResponse({ type: 'text', content: cleanedResponse });
          } else if (!hasVisualization) {
            onResponse({ type: 'text', content: "I've processed your request but couldn't generate a specific visualization." });
          }
        }
      } catch (apiError) {
        console.error('OpenAI API Error:', apiError);
        
        // Fallback to simulated responses for demo purposes
        console.log('Using fallback simulation for demo');
        
        // Simulate responses based on user message
        if (message.toLowerCase().includes('chart') || message.toLowerCase().includes('graph')) {
          addOutputItem({
            type: 'image',
            content: 'https://via.placeholder.com/600x400?text=Generated+Chart',
            title: 'AI Generated Chart'
          });
          onResponse({ 
            type: 'text', 
            content: 'I\'ve created a chart based on your request. You can see it in the visualization area.'
          });
        } 
        else if (message.toLowerCase().includes('table') || message.toLowerCase().includes('data')) {
          addOutputItem({
            type: 'table',
            content: [
              { id: 1, category: 'Electronics', revenue: '$24,500', growth: '+12%' },
              { id: 2, category: 'Clothing', revenue: '$18,300', growth: '+7%' },
              { id: 3, category: 'Home Goods', revenue: '$12,250', growth: '+15%' },
              { id: 4, category: 'Books', revenue: '$8,100', growth: '+2%' },
            ],
            title: 'AI Generated Data Table'
          });
          onResponse({ 
            type: 'text', 
            content: 'I\'ve created a data table based on your request. You can see it in the visualization area.'
          });
        }
        else {
          onResponse({ 
            type: 'text', 
            content: 'I understand your request. Try asking for specific charts or data tables to see visualizations.'
          });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      onResponse({ 
        type: 'text', 
        content: 'Sorry, there was an error processing your request.'
      });
    }
  };

  const toggleLeftPanel = (panelType) => {
    if (leftPanelType === panelType && leftPanelVisible) {
      setLeftPanelVisible(false);
    } else {
      setLeftPanelType(panelType);
      setLeftPanelVisible(true);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }
  
  return (
    <div className="app">
      <Header 
        user={user} 
        setChatVisible={setChatVisible} 
        chatVisible={chatVisible}
      />
      <div className={`content-container ${chatVisible ? 'chat-visible' : ''}`}>
        <LeftControls 
          toggleLeftPanel={toggleLeftPanel}
          activePanel={leftPanelType}
          isPanelVisible={leftPanelVisible}
        />
        
        {leftPanelVisible && (
          <LeftPanel 
            panelType={leftPanelType}
            setSelectedVisual={setSelectedVisual}
            selectedVisual={selectedVisual}
            closePanel={() => setLeftPanelVisible(false)}
          />
        )}
        
        <div className="main-with-visualization">
          <MainContent 
            selectedDataSource={selectedDataSource} 
            setSelectedDataSource={setSelectedDataSource}
            outputItems={outputItems}
            onItemMove={handleItemMove}
            onItemResize={handleItemResize}
            onItemRemove={handleItemRemove}
          />
        </div>
        {chatVisible && (
          <div className="chat-panel">
            <Chat 
              user={user} 
              serverUrl="http://your-server-ip-address:port"
              onSendImage={addOutputItem}
              onProcessMessage={handleProcessMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ user, setChatVisible, chatVisible }) {
  return (
    <div className="header">
      <div className="title">Power BI Dashboard</div>
      <div className="import-options">
        <div className="import-option-small" title="Import data from Excel">
          <span className="import-icon-small excel">📊</span>
        </div>
        <div className="import-option-small" title="Import data from SQL Server">
          <span className="import-icon-small sql">🗄️</span>
        </div>
        <div className="import-option-small" title="Paste data into a blank table">
          <span className="import-icon-small table">📋</span>
        </div>
        <div className="import-option-small" title="Use sample data">
          <span className="import-icon-small sample">📚</span>
        </div>
        <div className="import-option-small" title="Settings">
          <span className="import-icon-small settings">⚙️</span>
        </div>
      </div>
      <div className="header-actions">
        <button 
          className={`chat-toggle ${chatVisible ? 'active' : ''}`}
          onClick={() => setChatVisible(!chatVisible)}
        >
          {chatVisible ? 'Hide Chat' : 'Show Chat'}
        </button>
        <div className="user-profile">
          <span>{user.username}</span>
        </div>
      </div>
    </div>
  );
}

function LeftControls({ toggleLeftPanel, activePanel, isPanelVisible }) {
  return (
    <div className="left-controls">
      <div 
        className={`control-item ${activePanel === 'visualizations' && isPanelVisible ? 'active' : ''}`}
        onClick={() => toggleLeftPanel('visualizations')}
        title="Visualizations"
      >
        <span className="control-icon">📊</span>
      </div>
      <div 
        className={`control-item ${activePanel === 'fields' && isPanelVisible ? 'active' : ''}`}
        onClick={() => toggleLeftPanel('fields')}
        title="Fields"
      >
        <span className="control-icon">📋</span>
      </div>
      <div 
        className={`control-item ${activePanel === 'filters' && isPanelVisible ? 'active' : ''}`}
        onClick={() => toggleLeftPanel('filters')}
        title="Filters"
      >
        <span className="control-icon">🔍</span>
      </div>
    </div>
  );
}

function LeftPanel({ panelType, setSelectedVisual, selectedVisual, closePanel }) {
  const visualizationTypes = [
    { id: 'bar', name: 'Bar Chart', icon: '📊' },
    { id: 'line', name: 'Line Chart', icon: '📈' },
    { id: 'pie', name: 'Pie Chart', icon: '🥧' },
    { id: 'table', name: 'Table', icon: '📋' },
    { id: 'area', name: 'Area Chart', icon: '📉' },
    { id: 'scatter', name: 'Scatter Plot', icon: '⚪' },
    { id: 'map', name: 'Map', icon: '🗺️' },
    { id: 'card', name: 'Card', icon: '🃏' },
  ];

  return (
    <div className="left-panel">
      <div className="panel-header">
        <h3>
          {panelType === 'visualizations' && 'Visualizations'}
          {panelType === 'fields' && 'Fields'}
          {panelType === 'filters' && 'Filters'}
        </h3>
        <button className="panel-close" onClick={closePanel}>×</button>
      </div>
      
      <div className="panel-content">
        {panelType === 'visualizations' && (
          <div className="visualization-grid">
            {visualizationTypes.map(vis => (
              <div 
                key={vis.id} 
                className={`visualization-item ${selectedVisual === vis.id ? 'selected' : ''}`}
                onClick={() => setSelectedVisual(vis.id)}
              >
                <div className="vis-icon">{vis.icon}</div>
                <div className="vis-name">{vis.name}</div>
              </div>
            ))}
          </div>
        )}
        
        {panelType === 'fields' && (
          <div className="fields-list">
            <p className="empty-text">No fields available. Import data to see fields.</p>
          </div>
        )}
        
        {panelType === 'filters' && (
          <div className="filters-list">
            <div className="filter-group">
              <h4>Page Filters</h4>
              <p className="empty-text">No filters applied</p>
            </div>
            <div className="filter-group">
              <h4>Visualization Filters</h4>
              <p className="empty-text">Select a visualization to see filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MainContent({ selectedDataSource, setSelectedDataSource, outputItems, onItemMove, onItemResize, onItemRemove }) {
  const dataSourceOptions = [
    { id: 'blank', name: 'Blank report', icon: '📄' },
    { id: 'excel', name: 'Excel workbook', icon: '📊' },
    { id: 'sql', name: 'SQL Server', icon: '🗄️' },
    { id: 'sample', name: 'Learn with sample data', icon: '📚' },
    { id: 'other', name: 'Get data from other sources', icon: '🔍' },
  ];

  const renderDataSourceSelection = () => (
    <div className="data-source-container">
      <h2>Select a data source or start with a blank report</h2>
      <div className="data-source-options">
        {dataSourceOptions.map(source => (
          <div 
            key={source.id} 
            className={`data-source-option ${selectedDataSource === source.id ? 'selected' : ''}`}
            onClick={() => setSelectedDataSource(source.id)}
          >
            <div className="icon-large">{source.icon}</div>
            <div className="option-name">{source.name}</div>
          </div>
        ))}
      </div>
      
      <h2 className="section-title">Recommended</h2>
      <div className="recommended-option">
        <div className="icon-large">🔍</div>
        <div className="option-name">Getting started</div>
      </div>
    </div>
  );

  const renderOutputArea = () => (
    <div className="output-workspace">
      {outputItems.length === 0 ? (
        <div className="empty-output">
          <p>No visualizations or data to display</p>
          <p>Use the chat or import data to get started</p>
        </div>
      ) : (
        outputItems.map(item => (
          <DraggableResizableItem
            key={item.id}
            item={item}
            onMove={(position) => onItemMove(item.id, position)}
            onResize={(size) => onItemResize(item.id, size)}
            onRemove={() => onItemRemove(item.id)}
          />
        ))
      )}
    </div>
  );

  return (
    <div className="main-content">
      {!selectedDataSource ? renderDataSourceSelection() : renderOutputArea()}
    </div>
  );
}

function DraggableResizableItem({ item, onMove, onResize, onRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const itemRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.className.includes('resize-handle') || e.target.className.includes('item-close')) return;
    
    setIsDragging(true);
    const rect = itemRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const containerRect = itemRef.current.parentElement.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragOffset.x;
      const newY = e.clientY - containerRect.top - dragOffset.y;
      
      onMove({ 
        x: Math.max(0, Math.min(newX, containerRect.width - item.size.width)), 
        y: Math.max(0, Math.min(newY, containerRect.height - item.size.height)) 
      });
    } else if (isResizing) {
      const containerRect = itemRef.current.parentElement.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left - item.position.x;
      const newHeight = e.clientY - containerRect.top - item.position.y;
      
      onResize({ 
        width: Math.max(100, Math.min(newWidth, containerRect.width - item.position.x)), 
        height: Math.max(100, Math.min(newHeight, containerRect.height - item.position.y)) 
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  const renderContent = () => {
    if (item.type === 'image') {
      return <img src={item.content} alt={item.title} />;
    } else if (item.type === 'table') {
      return (
        <table className="data-table">
          <thead>
            <tr>
              {Object.keys(item.content[0]).map(key => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.content.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else {
      return <div>{item.content}</div>;
    }
  };

  return (
    <div 
      ref={itemRef}
      className={`draggable-item ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        left: `${item.position.x}px`,
        top: `${item.position.y}px`,
        width: `${item.size.width}px`,
        height: `${item.size.height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="item-header">
        <div className="item-title">{item.title}</div>
        <button className="item-close" onClick={onRemove}>×</button>
      </div>
      <div className="item-content">
        {renderContent()}
      </div>
      <div 
        className="resize-handle"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}

export default App;
