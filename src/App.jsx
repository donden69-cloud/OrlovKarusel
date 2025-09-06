import React, { useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "./styles.css";

export default function App() {
  // [{img: dataURL, caption: string}]
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);

  // настройки текста
  const [fontSize, setFontSize] = useState(40);
  const [yPos, setYPos] = useState(92); // 0..100 (в % от высоты), по умолчанию низ
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontColor, setFontColor] = useState("#ffffff");

  const fileRef = useRef(null);

  // загрузка картинок
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
      e.target.value = "";
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

  // Экспорт одного слайда (через Canvas, 1080x1350, без кропа)
  const renderSlideToCanvas = (slide) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slide.img;

      img.onload = () => {
        const W = 1080,
          H = 1350;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");

        // фон
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        // вписываем изображение целиком (contain)
        const r = Math.min(W / img.width, H / img.height);
        const w = img.width * r;
        const h = img.height * r;
        const x = (W - w) / 2;
        const y = (H - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        // текст
        ctx.font = `700 ${fontSize}px "${fontFamily}", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = fontColor;
        ctx.shadowColor = "rgba(0,0,0,.85)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0,0,0,.55)";

        const lines = (slide.caption || "").split("\n");
        const baseY = (yPos / 100) * H;
        const lineH = fontSize * 1.25;
        const startY = baseY - lineH * (lines.length - 1);

        lines.forEach((line, i) => {
          const yy = startY + i * lineH;
          ctx.strokeText(line, W / 2, yy);
          ctx.fillText(line, W / 2, yy);
        });

        canvas.toBlob((blob) => resolve(blob), "image/png");
      };
    });

  const exportCurrentPNG = async () => {
    const slide = slides[idx];
    if (!slide) return;
    const blob = await renderSlideToCanvas(slide);
    saveAs(blob, `slide-${idx + 1}.png`);
  };

  // Экспорт ВСЕХ слайдов разом в ZIP
  const exportAll = async () => {
    if (!slides.length) return;
    const zip = new JSZip();

    for (let i = 0; i < slides.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const blob = await renderSlideToCanvas(slides[i]);
      zip.file(`slide-${i + 1}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "slides.zip");
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

        <button className="btn" disabled={!slides.length} onClick={exportCurrentPNG}>
          Экспорт PNG (текущий)
        </button>
        <button className="btn" disabled={!slides.length} onClick={exportAll}>
          Скачать все (ZIP)
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

        <label>Шрифт</label>
        <select
          className="select"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
        >
          <option value="Inter">Inter</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Roboto">Roboto</option>
          <option value="PT Sans">PT Sans</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
        </select>

        <label>Цвет</label>
        <input
          className="color"
          type="color"
          value={fontColor}
          onChange={(e) => setFontColor(e.target.value)}
        />

        <label>Размер: {fontSize}px</label>
        <input
          type="range"
          min="20"
          max="100"
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
        <button className="nav" onClick={prev} disabled={slides.length <= 1}>
          ⟵
        </button>

        <div className="slide-box">
          {slides[idx] ? (
            <>
              <img className="slide-img" src={slides[idx].img} alt="" />
              <div
                className="caption"
                style={{
                  fontSize: `${fontSize}px`,
                  top: `${yPos}%`,
                  color: fontColor,
                  fontFamily: `"${fontFamily}", Arial, sans-serif`
                }}
              >
                {slides[idx].caption}
              </div>
            </>
          ) : (
            <div className="placeholder">Загрузите фото</div>
          )}
        </div>

        <button className="nav" onClick={next} disabled={slides.length <= 1}>
          ⟶
        </button>
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
