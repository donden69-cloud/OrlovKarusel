import React, { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

// 1 абзац (разделён пустой строкой) = 1 слайд
function splitToSlides(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function App() {
  const [raw, setRaw] = useState(
    "Заголовок\n\nВторой слайд — тезисы\n— Пункт 1\n— Пункт 2\n\nТретий слайд: призыв к действию"
  );
  const slides = useMemo(() => splitToSlides(raw), [raw]);

  // Настройки текста/компоновки
  const [fontSize, setFontSize] = useState(64);
  const [lineHeight, setLineHeight] = useState(1.2);
  const [padding, setPadding] = useState(72);

  const [textAlign, setTextAlign] = useState("center"); // left / center / right
  const [vAlign, setVAlign] = useState("center");       // top / center / bottom

  const [textColor, setTextColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#111111");
  const [overlayColor, setOverlayColor] = useState("#000000");
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);

  // Фото
  const [fitMode, setFitMode] = useState("cover"); // cover (без полос) / contain (вся картинка)
  const [images, setImages] = useState({}); // {index: dataURL}
  const refs = useRef([]); // узлы слайдов для экспорта

  const handleImage = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImages((p) => ({ ...p, [idx]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const clearImage = (idx) =>
    setImages((p) => {
      const n = { ...p };
      delete n[idx];
      return n;
    });

  const exportSlide = async (idx) => {
    const node = refs.current[idx];
    if (!node) return alert("Нет превью для экспорта");
    try {
      const dataUrl = await toPng(node, { width: 1080, height: 1350, pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `slide-${idx + 1}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Ошибка при экспорте PNG");
    }
  };

  const exportAll = async () => {
    for (let i = 0; i < slides.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await exportSlide(i);
    }
  };

  const hJustify =
    textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center";
  const vAlignItems =
    vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "flex-end" : "center";

  return (
    <div className="container">
      <header>
        <h1>Insta Carousel Creator</h1>
        <p>Один абзац = один слайд. Пустая строка между абзацами создаёт новый слайд.</p>
      </header>

      <main className="grid">
        {/* Панель настроек */}
        <section className="editor">
          <label>Текст → Слайды</label>
          <textarea
            rows={10}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Один абзац = один слайд"
          />

          <div className="controls">
            <div className="control">
              <span>Размер шрифта: {fontSize}px</span>
              <input
                type="range"
                min="24"
                max="120"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(+e.target.value)}
              />
            </div>

            <div className="control">
              <span>Межстрочный интервал: {lineHeight.toFixed(2)}</span>
              <input
                type="range"
                min="1"
                max="2"
                step="0.01"
                value={lineHeight}
                onChange={(e) => setLineHeight(+e.target.value)}
              />
            </div>

            <div className="control">
              <span>Внутренние отступы: {padding}px</span>
              <input
                type="range"
                min="24"
                max="160"
                step="1"
                value={padding}
                onChange={(e) => setPadding(+e.target.value)}
              />
            </div>

            <div className="row">
              <label>Гор. выравнивание</label>
              <select value={textAlign} onChange={(e) => setTextAlign(e.target.value)}>
                <option value="left">Влево</option>
                <option value="center">По центру</option>
                <option value="right">Вправо</option>
              </select>

              <label>Вертикаль</label>
              <select value={vAlign} onChange={(e) => setVAlign(e.target.value)}>
                <option value="top">Сверху</option>
                <option value="center">По центру</option>
                <option value="bottom">Внизу</option>
              </select>

              <label>Фото</label>
              <select value={fitMode} onChange={(e) => setFitMode(e.target.value)}>
                <option value="cover">Без полос (cover)</option>
                <option value="contain">Вся картинка (contain)</option>
              </select>
            </div>

            <div className="row">
              <label>Цвет текста</label>
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              <label>Цвет фона</label>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              <label>Цвет оверлея</label>
              <input
                type="color"
                value={overlayColor}
                onChange={(e) => setOverlayColor(e.target.value)}
              />
              <label>Прозрачность: {overlayOpacity.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(+e.target.value)}
              />
            </div>

            <div className="row space">
              <div>Слайдов: <b>{slides.length}</b></div>
              <button className="primary" onClick={exportAll}>Скачать все (PNG)</button>
            </div>
          </div>
        </section>

        {/* Превью */}
        <section className="previews">
          {slides.length === 0 && <div className="card">Добавьте текст слева</div>}

          <div className="wrap">
            {slides.map((t, idx) => (
              <div className="card" key={idx}>
                <div className="card-header">Слайд {idx + 1}</div>

                <div className="card-controls">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImage(idx, e.target.files?.[0])}
                  />
                  {images[idx] && <button onClick={() => clearImage(idx)}>Убрать фото</button>}
                  <button onClick={() => exportSlide(idx)}>PNG</button>
                </div>

                <div className="preview">
                  <div
                    className="slide"
                    ref={(el) => (refs.current[idx] = el)}
                    style={{
                      width: 1080,
                      height: 1350,
                      backgroundColor: bgColor,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {images[idx] && (
                      <img
                        className="bg"
                        src={images[idx]}
                        alt="bg"
                        style={{ objectFit: fitMode, width: "100%", height: "100%" }}
                      />
                    )}

                    <div
                      className="overlay"
                      style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
                    />

                    <div
                      className="textWrap"
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        justifyContent: hJustify,
                        alignItems: vAlignItems,
                        padding,
                      }}
                    >
                      <div
                        className="text"
                        style={{
                          color: textColor,
                          textAlign,
                          fontSize: `${fontSize}px`,
                          lineHeight,
                          textShadow: "0 2px 4px rgba(0,0,0,.5), 0 8px 24px rgba(0,0,0,.35)",
                        }}
                      >
                        {t}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        Экспорт 1080×1350 PNG. Если браузер блокирует множественные загрузки — скачивайте по одному.
      </footer>
    </div>
  );
}
