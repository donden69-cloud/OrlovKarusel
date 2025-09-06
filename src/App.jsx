import React, { useRef, useState } from "react";
import "./styles.css";

export default function App() {
  const [slides, setSlides] = useState([]); // [{img, caption}]
  const [idx, setIdx] = useState(0);

  const [fontSize, setFontSize] = useState(36);
  const [yPos, setYPos] = useState(90); // 0–100, где 100 — у самого низа
  const fileRef = useRef(null);

  // загрузка 1 или нескольких картинок
  const onUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const readers = files.map(
      (f) =>
        new Promise((res) => {
          const r = new FileReader();
          r.onload = (ev) => res(ev.target.result);
          r.readAsDataURL(f);
        })
    );

    Promise.all(readers).then((dataURLs) => {
      setSlides((prev) => [
        ...prev,
        ...dataURLs.map((url) => ({ img: url, caption: "Текст..." })),
      ]);
      if (slides.length === 0) setIdx(0);
      e.target.value = ""; // очистить инпут, чтобы можно было выбрать те же файлы
    });
  };

  const setCaption = (value) => {
    setSlides((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], caption: value };
      return copy;
    });
  };

  const removeCurrent = () => {
    setSlides((prev) => {
      const copy = prev.slice();
      copy.splice(idx, 1);
      const next = Math.max(0, Math.min(idx, copy.length - 1));
      setIdx(next);
      return copy;
    });
  };

  const prev = () => setIdx((p) => (p <= 0 ? slides.length - 1 : p - 1));
  const next = () => setIdx((p) => (p >= slides.length - 1 ? 0 : p + 1));

  const exportPNG = async () => {
    // простой экспорт через canvas без сторонних библиотек
    const s = slides[idx];
    if (!s) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = s.img;
    img.onload = () => {
      const W = 1080, H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");

      // фон
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // вписываем изображение без обрезки (contain)
      const r = Math.min(W / img.width, H / img.height);
      const w = img.width * r;
      const h = img.height * r;
      const x = (W - w) / 2;
      const y = (H - h) / 2;
      ctx.drawImage(img, x, y, w, h);

      // текст
      ctx.font = `700 ${fontSize}px Arial`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,.8)";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(0,0,0,.6)";

      const lines = s.caption.split("\n");
      const baseY = (yPos / 100) * H; // позиция относительно высоты
      const lineH = fontSize * 1.25;
      const startY = baseY - lineH * (lines.length - 1);

      lines.forEach((line, i) => {
        const yy = startY + i * lineH;
        ctx.strokeText(line, W / 2, yy);
        ctx.fillText(line, W / 2, yy);
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `slide-${idx + 1}.png`;
      a.click();
    };
  };

  return (
    <div className="wrap-app">
      <h1>Моя карусель</h1>

      <div className="top-row">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onUpload}
        />
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Добавить фото
        </button>

        <div className="spacer" />

        <button className="btn" disabled={!slides.length} onClick={exportPNG}>
          Экспорт PNG
        </button>
        <button className="btn danger" disabled={!slides.length} onClick={removeCurrent}>
          Удалить слайд
        </button>
      </div>

      <div className="controls-row">
        <input
          className="text-input"
          type="text"
          placeholder="Подпись к слайду"
          value={slides[idx]?.caption || ""}
          onChange={(e) => setCaption(e.target.value)}
        />
        <label>Размер шрифта: {fontSize}px</label>
        <input
          type="range"
          min="20"
          max="96"
          value={fontSize}
          onChange={(e) => setFontSize(+e.target.value)}
        />
        <label>Положение по вертикали: {yPos}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={yPos}
          onChange={(e) => setYPos(+e.target.value)}
        />
      </div>

      <div className="viewer">
        <button className="nav" onClick={prev} disabled={slides.length <= 1}>⟵</button>

        <div className="slide-box">
          {slides[idx] ? (
            <>
              <img className="slide-img" src={slides[idx].img} alt="" />
              <div
                className="caption"
                style={{ fontSize: `${fontSize}px`, top: `${yPos}%` }}
              >
                {slides[idx].caption}
              </div>
            </>
          ) : (
            <div className="placeholder">Загрузите фото</div>
          )}
        </div>

        <button className="nav" onClick={next} disabled={slides.length <= 1}>⟶</button>
      </div>

      {Boolean(slides.length) && (
        <div className="thumbs">
          {slides.map((s, i) => (
            <button
              key={i}
              className={`thumb ${i === idx ? "active" : ""}`}
              onClick={() => setIdx(i)}
            >
              <img src={s.img} alt="" />
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
