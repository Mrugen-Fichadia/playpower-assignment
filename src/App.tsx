import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ✅ Vite-friendly worker setup
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  citations?: { page: number; score: number }[];
}

const App: React.FC = () => {
  const [docId, setDocId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

  // Handle PDF upload and indexing
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setLoading(true);
      setUploadError(null);
      setPdfLoadError(null);
      setOriginalFile(file);
      const localUrl = URL.createObjectURL(file);
      setPdfFile(localUrl);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/.netlify/functions/upload', {
          method: 'POST',
          body: formData,
        });

        const text = await response.text();
        if (!response.ok) throw new Error(`Upload failed: ${text}`);

        const data = JSON.parse(text);
        setDocId(data.docId);
      } catch (err) {
        setUploadError((err as Error).message);
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please upload a valid PDF file.');
    }
  }, []);

  // Clean up Blob URL
  useEffect(() => {
    return () => {
      if (pdfFile) URL.revokeObjectURL(pdfFile);
    };
  }, [pdfFile]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'application/pdf': ['.pdf'] },
  });

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPdfLoadError(null);
  }

  function onDocumentLoadError(error: Error) {
    setPdfLoadError('Failed to load PDF: ' + error.message);
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !docId) {
      if (!docId) alert('Please wait for the PDF to finish uploading.');
      return;
    }

    const newHistory = [...chatHistory, { role: 'user' as const, content: message }];
    setChatHistory(newHistory);
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, message, history: newHistory }),
      });
      if (!response.ok) throw new Error(`Chat request failed: ${await response.text()}`);

      const data = await response.json();
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai' as const, content: data.text, citations: data.citations },
      ]);
    } catch (err) {
      alert('Chat failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!pdfFile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9f9f9' }}>
        <div
          {...getRootProps()}
          style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            textAlign: 'center',
            cursor: 'pointer',
            width: '300px',
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: '24px', color: '#6f42c1', marginBottom: '10px' }}>↑</div>
          <h2 style={{ margin: '0 0 10px' }}>Upload PDF to start chatting</h2>
          <p style={{ color: '#666' }}>Click or drag and drop your file here</p>
          {loading && <p>Uploading...</p>}
          {uploadError && <p style={{ color: 'red' }}>Error: {uploadError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9f9f9' }}>
      {/* Left: Chat */}
      <div style={{ width: '50%', padding: '20px', overflowY: 'auto' }}>
        <h2 style={{ color: '#6f42c1' }}>{docId ? 'Your document is ready!' : 'Document is uploading...'}</h2>
        {docId ? <p>You can now ask questions about your document.</p> : <p>Waiting for server...</p>}
        {uploadError && <p style={{ color: 'red' }}>Upload error: {uploadError}</p>}

        <div style={{ marginTop: '20px', height: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          {chatHistory.map((item, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              {item.role === 'user' && <p><strong>User:</strong> {item.content}</p>}
              {item.role === 'ai' && (
                <p>
                  <strong>AI:</strong> {item.content}
                  {item.citations && item.citations.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      {' (Refs: ' + item.citations.map(c => `Page ${c.page} [score: ${c.score.toFixed(2)}]`).join(', ') + ')'}
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6f42c1' }}>
              <span className="hourglass">⏳</span>
              <span>AI is thinking...</span>
            </div>
          )}
        </div>

        <div style={{ position: 'fixed', bottom: '20px', left: '20px', width: 'calc(50% - 40px)', display: 'flex' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about the document..."
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={!docId}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !docId}
            style={{ marginLeft: '10px', padding: '10px 20px', backgroundColor: docId ? '#6f42c1' : '#ccc', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Right: PDF Viewer */}
      <div style={{ width: '50%', overflowY: 'auto', backgroundColor: 'white', padding: '20px' }}>
        {originalFile ? (
          <Document
            file={originalFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<p style={{ color: '#888' }}>Loading PDF...</p>}
          >
            {numPages > 0 ? (
              Array.from({ length: numPages }, (_, index) => (
                <div key={`page_${index + 1}`} style={{ marginBottom: '20px' }}>
                  <Page pageNumber={index + 1} />
                </div>
              ))
            ) : (
              <p style={{ color: '#888' }}>Loading pages...</p>
            )}
          </Document>
        ) : (
          <p style={{ color: '#888' }}>No PDF loaded</p>
        )}
        {pdfLoadError && <p style={{ color: 'red' }}>PDF Load Error: {pdfLoadError}</p>}
      </div>
    </div>
  );
};

export default App;
