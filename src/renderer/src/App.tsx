import { useState, useEffect } from 'react'

function App(): JSX.Element {
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    // Listen for new uploads
    // @ts-ignore
    window.api.onUploadSuccess((link) => {
      setHistory((prev) => [link, ...prev])
    })
  }, [])

  return (
    <div className="container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>QuickDrop</h1>
      <p>Status: <strong>Active</strong>. Monitoring clipboard...</p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Recent Uploads</h2>
        {history.length === 0 ? (
          <p style={{ color: '#888' }}>No uploads yet. Take a screenshot to start!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {history.map((link, i) => (
              <li key={i} style={{ padding: '10px', background: '#f5f5f5', marginBottom: '5px', borderRadius: '4px' }}>
                <a href={link} target="_blank" rel="noreferrer" style={{ color: '#007bff', textDecoration: 'none' }}>
                  {link}
                </a>
                <span style={{ float: 'right', color: '#888', fontSize: '12px' }}>Just now</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App