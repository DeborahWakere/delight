import React from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, Check, ClipboardPaste, FileImage, LoaderCircle, Search, Sparkles, X } from "lucide-react";
import type { DelightResult } from "@delight/shared";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const examples = [
  "What is in this image?",
  "Turn this into a clear todo list.",
  "Extract all the text and organize it.",
  "Find useful webpages about what is shown here."
];

function App() {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [command, setCommand] = React.useState("");
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<DelightResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const selectFile = React.useCallback((next?: File) => {
    if (!next || !next.type.startsWith("image/")) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setResult(null);
    setError(null);
  }, []);

  React.useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.items || []).find(item => item.type.startsWith("image/"));
      if (image) selectFile(image.getAsFile() || undefined);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [selectFile]);

  async function createJob() {
    if (!file) { setError("Add an image first — paste, drop, or browse."); return; }
    if (!command.trim()) { setError("Tell Delight what you want it to do."); return; }
    setError(null); setResult(null); setStatus("Uploading image…");
    const body = new FormData(); body.append("image", file); body.append("command", command.trim());
    try {
      const response = await fetch(`${API}/api/jobs`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start Delight.");
      setJobId(data.jobId);
      setStatus("Delight is working…");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus(null);
    }
  }

  React.useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    const poll = async () => {
      const response = await fetch(`${API}/api/jobs/${jobId}`);
      const data = await response.json();
      if (stopped) return;
      if (data.status === "SUCCESS") { setResult(data.result); setStatus(null); setJobId(null); return; }
      if (data.status === "ERROR") { setError(data.error || "Delight could not finish the request."); setStatus(null); setJobId(null); return; }
      setStatus("Delight is thinking…");
      setTimeout(poll, 1200);
    };
    poll().catch(e => { if (!stopped) setError(e instanceof Error ? e.message : "Could not check job."); });
    return () => { stopped = true; };
  }, [jobId]);

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setResult(null); setError(null);
  }

  return <div className="page">
    <nav className="nav"><div className="brand"><span>delight</span></div><div className="nav-right"><span>visual command agent</span><span className="status-dot" /></div></nav>

    <main>
      <section className="hero">
        <h1>Show it.<br/><em>Ask it. Whatever you want using command language.</em></h1>
        <p>Delight helps you interact with images through natural language commands.</p>
      </section>

      <section className="command-shell">
        <div className="shell-top"><span>YOUR INPUT</span><span>01</span></div>
        <div className="input-grid">
          <div className={`dropzone ${dragging ? "dragging" : ""}`} onDragEnter={e=>{e.preventDefault();setDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);selectFile(e.dataTransfer.files[0])}}>
            {preview ? <><img src={preview} alt="Selected image"/><button className="remove-image" onClick={e=>{e.preventDefault();clearImage()}} aria-label="Remove image"><X size={16}/></button></> : <>
              <div className="upload-symbol"><FileImage size={24}/></div>
              <strong>Drop an image here</strong>
              <span>Ctrl + V to paste · drag & drop · or browse files</span>
              <label className="browse">Choose image<input type="file" accept="image/*" onChange={e=>selectFile(e.target.files?.[0])}/></label>
            </>}
          </div>

          <div className="command-pane">
            <div className="command-label"><span>02</span><span>COMMAND</span></div>
            <textarea value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter")createJob()}} placeholder="What should Delight do with this image?" />
            <div className="examples">{examples.map(example=><button key={example} onClick={()=>setCommand(example)}>{example}</button>)}</div>
            <button className="run" onClick={createJob} disabled={!!status}><Sparkles size={18}/>{status || "Ask Delight"}<ArrowUpRight size={17}/></button>
            {error && <div className="error">{error}</div>}
          </div>
        </div>
      </section>

      {(result || status) && <section className="result-shell">
        {status ? <div className="loading"><LoaderCircle className="spin" size={25}/><div><strong>{status}</strong><span>Working from your image and command.</span></div></div> : result && <>
          <div className="result-head"><div><div className="eyebrow small"><Sparkles size={12}/> DELIGHT RESULT</div><h2>{result.title}</h2><p>{result.summary}</p></div><span className="result-number">03</span></div>
          <div className="answer">{result.answer.split("\n").map((line,i)=><p key={i}>{line || "\u00a0"}</p>)}</div>
          {result.items.length > 0 && <div className="result-items">{result.items.map(item=><div className="result-item" key={item.id}><div className="item-icon"><Check size={15}/></div><div><strong>{item.label || "Result"}</strong><span>{item.value}</span>{item.meta && <small>{item.meta}</small>}</div></div>)}</div>}
          {result.sources.length > 0 && <div className="sources"><div className="section-title"><Search size={14}/> WEB SOURCES</div>{result.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer"><div><strong>{source.title}</strong><span>{source.snippet || source.url}</span></div><ArrowUpRight size={15}/></a>)}</div>}
          {result.notes.length > 0 && <div className="notes">{result.notes.map((note,i)=><span key={i}>• {note}</span>)}</div>}
        </>}
      </section>}
    </main>
    <footer><span>delight</span> · one image, one command, whatever comes next.</footer>
  </div>
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
