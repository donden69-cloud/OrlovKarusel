import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const slides = text.split(/\n+/).filter(Boolean);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Instagram Carousel Creator</h1>
      <textarea
        rows="6"
        style={{ width: '100%', marginBottom: '20px' }}
        placeholder="Вставьте текст, каждый абзац = новый слайд"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {slides.map((slide, i) => (
          <div key={i} style={{
            width: '200px',
            height: '250px',
            border: '1px solid #ccc',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
}
