import React, { useState } from "react";
import "./styles.css";

function App() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [text, setText] = useState("Кукусики 😎");
  const [fontSize, setFontSize] = useState(32);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newImages.push(ev.target.result);
        if (newImages.length === files.length) {
          setImages((prev) => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  return (
    <div className="carousel-container">
      <h1>Моя карусель</h1>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
      />

      <div className="controls">
        <input
          type="text"
          placeholder="Введите текст"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          type="range"
          min="24"
          max="72"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
        />
      </div>

      {images.length > 0 && (
        <div className="carousel">
          <button onClick={prevSlide}>⬅</button>
          <div className="slide">
            <img src={images[currentIndex]} alt="slide" />
            <p style={{ fontSize: `${fontSize}px` }}>{text}</p>
          </div>
          <button onClick={nextSlide}>➡</button>
        </div>
      )}
    </div>
  );
}

export default App;
