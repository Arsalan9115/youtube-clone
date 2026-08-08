import { useEffect, useState } from "react";

export default function Comments({ videoId }: { videoId: string }) {
  const [text, setText] = useState("");
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!videoId) return;
    fetch(`/api/comment?videoId=${videoId}`)
     .then(res => res.json())
     .then(setList);
  }, [videoId]);

  const send = async () => {
    if (!text.trim()) return;
    await fetch("/api/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, text }),
    });
    setList([...list, { id: Date.now(), text, author: "Guest" }]);
    setText("");
  };

  return (
    <div style={{ marginTop: 20, color: 'white' }}>
      <h3>{list.length} Comments</h3>
      <div style={{ display: 'flex', gap: 10, margin: '10px 0' }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." style={{flex: 1, padding: 10, background: '#222', border: '1px solid #444', color: 'white'}}/>
        <button onClick={send} style={{padding: '10px 20px', background: 'red', border: 'none', color: 'white', cursor: 'pointer'}}>Comment</button>
      </div>
      {list.map(c => <div key={c.id} style={{padding: '10px 0', borderBottom: '1px solid #333'}}><b>{c.author}</b><p>{c.text}</p></div>)}
    </div>
  );
}