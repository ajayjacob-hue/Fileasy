import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
  FileImage, FileText, File as FileIcon, MonitorPlay,
  Merge, Minimize2, Lock, Unlock, ArrowLeft, Upload,
  Download, Trash2, GripVertical, X
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_BASE = 'http://localhost:8000';

const TOOLS = [
  { id: 'img2pdf', title: 'Image to PDF', desc: 'Convert images (JPG, PNG) to PDF instantly.', icon: <FileImage size={32} />, multi: true },
  { id: 'pdf2word', title: 'PDF to Word', desc: 'Convert PDF files to editable Word docs.', icon: <FileText size={32} /> },
  { id: 'word2pdf', title: 'Word to PDF', desc: 'Convert Word documents to PDF.', icon: <FileIcon size={32} /> },
  { id: 'ppt2pdf', title: 'PPT to PDF', desc: 'Convert PowerPoint slides to PDF.', icon: <MonitorPlay size={32} /> },
  { id: 'merge', title: 'Merge PDF', desc: 'Combine multiple PDFs in custom order.', icon: <Merge size={32} />, multi: true },
  { id: 'compress', title: 'Compress PDF', desc: 'Reduce PDF file size significantly.', icon: <Minimize2 size={32} /> },
  { id: 'protect', title: 'Protect PDF', desc: 'Add password protection to a PDF.', icon: <Lock size={32} /> },
  { id: 'unlock', title: 'Unlock PDF', desc: 'Remove password from a PDF.', icon: <Unlock size={32} /> }
];

export default function App() {
  const [activeTool, setActiveTool] = useState(null);

  return (
    <div className="app-container">
      <header>
        <h1>Fileasy</h1>
        <p>The sleek, local toolkit for all your document needs.</p>
      </header>

      {!activeTool ? (
        <div className="tool-grid">
          {TOOLS.map((tool) => (
            <div key={tool.id} className="tool-card" onClick={() => setActiveTool(tool)}>
              <div className="tool-icon">{tool.icon}</div>
              <h3 className="tool-title">{tool.title}</h3>
              <p className="tool-desc">{tool.desc}</p>
            </div>
          ))}
        </div>
      ) : (
        <ToolWorkspace tool={activeTool} onBack={() => setActiveTool(null)} />
      )}
    </div>
  );
}

function SortableFileItem({ id, file, onRemove, index, isImage }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    justifyContent: isImage ? 'center' : 'space-between',
    flexDirection: isImage ? 'column' : 'row',
    background: 'rgba(255, 255, 255, 0.05)', 
    padding: '1rem',
    borderRadius: '8px', 
    border: '1px solid var(--border-light)',
    marginBottom: isImage ? '0' : '0.5rem',
    width: isImage ? '160px' : 'auto',
    position: 'relative'
  };

  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <div ref={setNodeRef} style={style}>
      {isImage ? (
         <>
           <button onClick={() => onRemove(id)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'none', border:'none', color: 'red', cursor:'pointer', zIndex: 10 }}>
             <X size={14} />
           </button>
           <div {...attributes} {...listeners} style={{ cursor: 'grab', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             {previewUrl && (
               <img src={previewUrl} alt="preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }} />
             )}
             <span style={{ fontWeight: 'bold', color: 'var(--accent-secondary)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{index + 1}.</span>
             <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontSize: '0.8rem' }} title={file.name}>
               {file.name}
             </span>
           </div>
         </>
      ) : (
         <>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
             <button {...attributes} {...listeners} style={{ background: 'none', border: 'none', cursor: 'grab', color: 'var(--text-muted)' }}>
               <GripVertical size={20} />
             </button>
             <span style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{index + 1}.</span>
             <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
               {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
             </span>
           </div>
           <button onClick={() => onRemove(id)} style={{ background: 'none', border:'none', color: 'var(--error)', cursor:'pointer' }}>
             <Trash2 size={20} />
           </button>
         </>
      )}
    </div>
  );
}

function ToolWorkspace({ tool, onBack }) {
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [autoCompress, setAutoCompress] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [outputFilename, setOutputFilename] = useState('');
  const [customFilename, setCustomFilename] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      // Assign custom unique IDs for dnd-kit tracking without mutating original File
      const newFiles = acceptedFiles.map(f => ({
        id: `${f.name}-${new Date().getTime()}-${Math.random()}`,
        file: f
      }));
      setFiles(tool.multi ? [...files, ...newFiles] : [newFiles[0]]);
    },
    multiple: tool.multi,
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeFile = (idToRemove) => {
    setFiles(files.filter(f => f.id !== idToRemove));
  };

  const getAcceptLabel = () => {
    if(tool.id === 'img2pdf') return 'Drop Images here';
    if(tool.id.includes('pdf')) return 'Drop PDF here';
    if(tool.id === 'word2pdf') return 'Drop Word document here';
    if(tool.id === 'ppt2pdf') return 'Drop PowerPoint here';
    return 'Drop file here';
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    setError(null);

    try {
      const rawFiles = files.map(f => f.file); // Extract actual File objects
      
      let computedOutName = `Fileasy_Output_${new Date().getTime()}.pdf`;
      const baseName = rawFiles[0].name.replace(/\.[^/.]+$/, "");

      const extensionMap = {
        'pdf2word': '.docx',
        'word2pdf': '.pdf',
        'ppt2pdf': '.pdf',
        'img2pdf': '.pdf',
        'merge': '.pdf',
        'compress': '.pdf',
        'protect': '.pdf',
        'unlock': '.pdf'
      };
      const targetExt = extensionMap[tool.id] || '.pdf';

      if (customFilename.trim()) {
        computedOutName = customFilename.trim();
        if (!computedOutName.toLowerCase().endsWith(targetExt)) {
          computedOutName += targetExt;
        }
      } else {
        if (tool.id === 'img2pdf') {
          computedOutName = 'Images_Converted.pdf';
        } else if (tool.id === 'merge') {
          computedOutName = `merged_${baseName}.pdf`;
        } else if (tool.id === 'pdf2word') {
          computedOutName = `${baseName}.docx`;
        } else if (tool.id === 'word2pdf' || tool.id === 'ppt2pdf') {
          computedOutName = `${baseName}.pdf`;
        } else if (tool.id === 'compress') {
          computedOutName = `${baseName}_compressed.pdf`;
        } else if (tool.id === 'protect') {
          computedOutName = `${baseName}_protected.pdf`;
        } else if (tool.id === 'unlock') {
          computedOutName = `${baseName}_unlocked.pdf`;
        }
      }

      setOutputFilename(computedOutName);
      
      let finalBlob = null;

      if (tool.id === 'img2pdf') {
        const pdfDoc = await PDFDocument.create();
        for (const file of rawFiles) {
          const imgBytes = await file.arrayBuffer();
          let image;
          if (file.type === 'image/jpeg') image = await pdfDoc.embedJpg(imgBytes);
          else if (file.type === 'image/png') image = await pdfDoc.embedPng(imgBytes);
          else continue;
          
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        const pdfBytes = await pdfDoc.save();
        finalBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      } 
      else if (tool.id === 'merge') {
        const mergedPdf = await PDFDocument.create();
        for (const file of rawFiles) {
          const buf = await file.arrayBuffer();
          const doc = await PDFDocument.load(buf);
          const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
        }
        const bytes = await mergedPdf.save();
        finalBlob = new Blob([bytes], { type: 'application/pdf' });
      }
      else {
        // Backend API calls
        const formData = new FormData();
        rawFiles.forEach(f => formData.append('file', f));
        if (password) formData.append('password', password);

        const endpointMap = {
          'pdf2word': '/api/pdf-to-word',
          'word2pdf': '/api/word-to-pdf',
          'ppt2pdf': '/api/ppt-to-pdf',
          'compress': '/api/compress',
          'protect': '/api/protect',
          'unlock': '/api/unlock',
        };

        const res = await axios.post(`${API_BASE}${endpointMap[tool.id]}`, formData, { responseType: 'blob' });
        finalBlob = res.data;
      }

      // Post-compression logic
      if (autoCompress && tool.id !== 'compress' && tool.id !== 'pdf2word' && finalBlob.size > 4 * 1024 * 1024) {
          const compressData = new FormData();
          compressData.append('file', new File([finalBlob], 'temp.pdf', { type: 'application/pdf' }));
          const compRes = await axios.post(`${API_BASE}/api/compress`, compressData, { responseType: 'blob' });
          finalBlob = compRes.data;
      }

      setResultUrl(URL.createObjectURL(finalBlob));
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data instanceof Blob) {
         try {
           const text = await err.response.data.text();
           const json = JSON.parse(text);
           setError(json.detail || err.message);
         } catch (_) {
           setError("Failed to parse error: " + err.message);
         }
      } else {
         setError(err.response?.data?.detail || err.message || 'An error occurred during conversion');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="active-tool-view">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} /> Back to Toolkit
      </button>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{tool.title}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{tool.desc}</p>
      </div>

      {!resultUrl ? (
        <>
          <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <Upload className="upload-icon" />
            <h3>{getAcceptLabel()}</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {tool.multi ? 'Drag & drop multiple files, or click to select.' : 'Drop a file here or click to select.'}
            </p>
          </div>

          {files.length > 0 && (
            <div className="file-list" style={{ marginTop: '2rem' }}>
              {tool.multi ? (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Drag the handles to reorder the files before processing.
                  </p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={files.map(f => f.id)} strategy={tool.id === 'img2pdf' ? rectSortingStrategy : verticalListSortingStrategy}>
                      <div style={{ 
                        display: tool.id === 'img2pdf' ? 'flex' : 'block', 
                        flexWrap: tool.id === 'img2pdf' ? 'wrap' : 'nowrap', 
                        gap: tool.id === 'img2pdf' ? '1rem' : '0',
                        justifyContent: tool.id === 'img2pdf' ? 'center' : 'flex-start'
                      }}>
                        {files.map((fileObj, index) => (
                          <SortableFileItem 
                            key={fileObj.id} 
                            id={fileObj.id} 
                            file={fileObj.file} 
                            index={index}
                            onRemove={removeFile} 
                            isImage={tool.id === 'img2pdf'}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              ) : (
                <div className="file-item">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                    {files[0].file.name} ({(files[0].file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button onClick={() => removeFile(files[0].id)} style={{ background: 'none', border:'none', color: 'var(--error)', cursor:'pointer' }}>
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <input 
              type="text" 
              placeholder="Custom output filename (Optional)" 
              value={customFilename} 
              onChange={(e) => setCustomFilename(e.target.value)} 
              style={{ marginBottom: '1rem' }}
            />

            {tool.id === 'protect' && (
              <input 
                type="password" 
                placeholder="Enter new Password to Protect" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            )}
            
            {tool.id === 'unlock' && (
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            )}

            {tool.id !== 'compress' && (
              <label className="setting-row">
                <input 
                  type="checkbox" 
                  checked={autoCompress} 
                  onChange={(e) => setAutoCompress(e.target.checked)} 
                />
                Ensure output size is &lt; 4MB (Compress if needed)
              </label>
            )}

            <button 
              className="btn" 
              onClick={handleProcess}
              disabled={files.length === 0 || isProcessing || (tool.id === 'protect' && !password)}
            >
              {isProcessing ? <span className="spinner"></span> : `Processing ${tool.title}`}
            </button>

            {error && (
              <div style={{ color: 'var(--error)', marginTop: '1rem', textAlign: 'center', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                {error}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ color: 'var(--success)', marginBottom: '2rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
            🎉 Success! Your file is ready.
          </div>
          <a href={resultUrl} download={outputFilename || `Fileasy_Output_${new Date().getTime()}`} style={{textDecoration: 'none'}}>
            <button className="btn" style={{ maxWidth: '300px' }}>
              <Download size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Download Result
            </button>
          </a>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'block', margin: '2rem auto 0', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setResultUrl(null); setFiles([]); setPassword(''); setImgPdfFilename(''); }}>
            Process another file
          </button>
        </div>
      )}
    </div>
  );
}
