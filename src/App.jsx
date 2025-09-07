import React, { useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "./styles.css";

const RATIO_PRESETS = {
  "1:1": { w: 1080, h: 1080, css: 1 / 1 },
  "4:5": { w: 1080, h: 1350, css: 4 / 5 },
  "9:16": { w: 1080, h: 1920, css: 9 / 16 }
};

export default function App() {
  // [{img, caption}]
  const [slides, setSlides] = useState([]);
  const [idx, setIdx] = useState(0);

  // текст
  const [caption, setCaption] = useState("Текст...");
  const [fontSize, setFontSize] = useState(40);
  const [yPos, setYPos] = useState(92); // проценты по высоте
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontColor, setFontColor] = useState("#ffffff");
  const [fontWeight, setFontWeight] = useState("700");
  const [isItalic, setIsItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("center");
  const [strokeWidth, setStrokeWidth] = useState(6);

  // плашка под текст
  const [useBox, setUseBox] = useState(false);
  const [boxColor, setBoxColor] = useState("#000000");
  const [boxOpacity, setBoxOpacity] = useState(0.35);
  const [boxPadding, setBoxPadding] = useState(8);

  // соотношение сторон
  const [ratioKey, setRatioKey] = useState("4:5");

  const fileRef = useRef(null);
  const jsonRef = useRef(null);

  // загрузка изображений (защита от дублей)
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
      setSlides((prev) => {
        const set = new Set(prev.map((s) => s.img));
        const toAdd = dataURLs
          .filter((u) => !set.has(u)) // не добавляем одинаковые
          .map((url) => ({ img: url, caption: "Текст..." }));
        const next = [...prev, ...toAdd];
        if (next.length && idx >= next.length) setIdx(next.length - 1);
        return next;
      });
      e.target.value = "";
    });
  };

  // синхронизация подписи текущего слайда
  const applyCaptionToCurrent = (value) => {
    setCaption(value);
    setSlides((prev) => {
      if (!prev[idx]) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], caption: value };
      return copy;
    });
  };

  const selectSlide = (i) => {
    setIdx(i);
    setCaption(slides[i]?.caption ?? "Текст...");
  };

  const removeCurrent = () => {
    setSlides((prev) => {
      const copy = prev.slice();
      copy.splice(idx, 1);
      const nextIdx = Math.max(0, Math.min(idx, copy.length - 1));
      setIdx(nextIdx);
      setCaption(copy[nextIdx]?.caption ?? "Текст...");
      return copy;
    });
  };

  const prev = () => selectSlide(idx <= 0 ? slides.length - 1 : idx - 1);
  const next = () => selectSlide(idx >= slides.length - 1 ? 0 : idx + 1);

  // отрисовка одного слайда на Canvas
  const renderSlideToCanvas = (slide) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slide.img;

      const { w: W, h: H } = RATIO_PRESETS[ratioKey];

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");

        // фон
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        // изображение contain
        const r = Math.min(W / img.width, H / img.height);
        const w = img.width * r;
        const h = img.height * r;
        const x = (W - w) / 2;
        const y = (H - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        // подпись (плашка + текст)
        const lines = (slide.caption || "").split("\n");
        ctx.font = `${isItalic ? "italic " : ""}${fontWeight} ${fontSize}px "${fontFamily}", Arial, sans-serif`;

        const metrics = (text) => {
          const m = ctx.measureText(text);
          return { w: m.width, h: fontSize * 1.25 };
        };

        const baseY = (yPos / 100) * H;
        const lineH = fontSize * 1.25;
        const startY = baseY - lineH * (lines.length - 1);

        // размеры блока для плашки
        let maxW = 0;
        lines.forEach((l) => (maxW = Math.max(maxW, metrics(l).w)));
        const boxW = maxW + boxPadding * 2;
        const boxH = lineH * lines.length + boxPadding * 2;

        // координата X в зависимости от выравнивания
        const anchorX =
          textAlign === "left" ? boxW / 2 + 20 :
          textAlign === "right" ? W - boxW / 2 - 20 :
          W / 2;

        // плашка
        if (useBox) {
          ctx.fillStyle = hexToRgba(boxColor, boxOpacity);
          roundRect(ctx, anchorX - boxW / 2, startY - lineH - boxPadding + lineH, boxW, boxH, 12);
          ctx.fill();
        }

        // тени/обводка
        ctx.textAlign = textAlign;
        ctx.shadowColor = "rgba(0,0,0,.85)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = "rgba(0,0,0,.55)";
        ctx.fillStyle = fontColor;

        lines.forEach((line, i) => {
          const yy = startY + i * lineH;
          const tx =
            textAlign === "left" ? 20 + boxPadding :
            textAlign === "right" ? W - 20 - boxPadding :
            W / 2;
          ctx.strokeText(line, tx, yy);
          ctx.fillText(line, tx, yy);
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

  // сохранить/загрузить проект
  const saveProject = () => {
    const data = {
      slides,
      settings: {
        fontSize, yPos, fontFamily, fontColor, fontWeight, isItalic,
        textAlign, strokeWidth, useBox, boxColor, boxOpacity, boxPadding,
        ratioKey
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    saveAs(blob, "project.json");
  };

  const loadProject = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setSlides(data.slides || []);
        const s = data.settings || {};
        setFontSize(s.fontSize ?? 40);
        setYPos(s.yPos ?? 92);
        setFontFamily(s.fontFamily ?? "Inter");
        setFontColor(s.fontColor ?? "#ffffff");
        setFontWeight(s.fontWeight ?? "700");
        setIsItalic(Boolean(s.isItalic));
        setTextAlign(s.textAlign ?? "center");
        setStrokeWidth(s.strokeWidth ?? 6);
        setUseBox(Boolean(s.useBox));
        setBoxColor(s.boxColor ?? "#000000");
        setBoxOpacity(s.boxOpacity ?? 0.35);
        setBoxPadding(s.boxPadding ?? 8);
        setRatioKey(s.ratioKey ?? "4:5");
        setIdx(0);
        setCaption((data.slides?.[0]?.caption) ?? "Текст...");
      } catch (err) {
        alert("Не удалось прочитать проект (JSON).");
      }
    };
    r.readAsText(file);
    e.target.value = "";
  };

  const currentRatio = RATIO_PRESETS[ratioKey].css;

  return (
    <div className="wrap-app">
      <h1>Моя карусель</h1>

      <div className="top-row">
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onUpload} />
        <button className="btn" onClick={() => fileRef.current?.click()}>Добавить фото</button>

        <div className="spacer" />

        <button className="btn" disabled={!slides.length} onClick={exportCurrentPNG}>Экспорт PNG (текущий)</button>
        <button className="btn" disabled={!slides.length} onClick={exportAll}>Скачать все (ZIP)</button>
        <button className="btn" onClick={saveProject}>Сохранить проект</button>
        <input ref={jsonRef} type="file" accept="application/json" style={{ display: "none" }} onChange={loadProject} />
        <button className="btn" onClick={() => jsonRef.current?.click()}>Загрузить проект</button>
        <button className="btn danger" disabled={!slides.length} onClick={removeCurrent}>Удалить слайд</button>
      </div>

      <div className="controls-row">
        <input
          className="text-input"
          type="text"
          placeholder="Подпись к слайду"
          value={caption}
          onChange={(e) => applyCaptionToCurrent(e.target.value)}
        />

        <label>Шрифт</label>
        <select className="select" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
          <option value="Inter">Inter</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Roboto">Roboto</option>
          <option value="PT Sans">PT Sans</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
        </select>

        <label>Цвет</label>
        <input className="color" type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} />

        <label>Жирность</label>
        <select className="select" value={fontWeight} onChange={(e) => setFontWeight(e.target.value)}>
          <option value="400">400</option>
          <option value="700">700</option>
          <option value="800">800</option>
        </select>

        <label><input type="checkbox" checked={isItalic} onChange={(e) => setIsItalic(e.target.checked)} /> Курсив</label>

        <label>Выравнивание</label>
        <select className="select" value={textAlign} onChange={(e) => setTextAlign(e.target.value)}>
          <option value="center">По центру</option>
          <option value="left">Слева</option>
          <option value="right">Справа</option>
        </select>

        <label>Обводка: {strokeWidth}px</label>
        <input type="range" min="0" max="12" value={strokeWidth} onChange={(e) => setStrokeWidth(+e.target.value)} />

        <label>Размер: {fontSize}px</label>
        <input type="range" min="20" max="110" value={fontSize} onChange={(e) => setFontSize(+e.target.value)} />

        <label>Положение по вертикали: {yPos}%</label>
        <input type="range" min="0" max="100" value={yPos} onChange={(e) => setYPos(+e.target.value)} />

        <label>Соотношение</label>
        <select className="select" value={ratioKey} onChange={(e) => setRatioKey(e.target.value)}>
          <option value="1:1">1:1</option>
          <option value="4:5">4:5</option>
          <option value="9:16">9:16</option>
        </select>

        <label><input type="checkbox" checked={useBox} onChange={(e) => setUseBox(e.target.checked)} /> Плашка под текст</label>
        <input className="color" type="color" value={boxColor} onChange={(e) => setBoxColor(e.target.value)} />
        <label>Прозрачность: {Math.round(boxOpacity * 100)}%</label>
        <input type="range" min="0" max="1" step="0.01" value={boxOpacity} onChange={(e) => setBoxOpacity(+e.target.value)} />
        <label>Внутр. отступ: {boxPadding}px</label>
        <input type="range" min="0" max="24" value={boxPadding} onChange={(e) => setBoxPadding(+e.target.value)} />
      </div>

      <div className="viewer">
        <button className="nav" onClick={prev} disabled={slides.length <= 1}>⟵</button>

        <div className="slide-box" style={{ "--ratio": currentRatio }}>
          {slides[idx] ? (
            <>
              <img className="slide-img" src={slides[idx].img} alt="" />
              <div
                className="caption"
                style={{
                  top: `${yPos}%`,
                  fontSize: `${fontSize}px`,
                  color: fontColor,
                  fontWeight,
                  fontStyle: isItalic ? "italic" : "normal",
                  fontFamily: `"${fontFamily}", Arial, sans-serif`,
                  textAlign
                }}
              >
                {/* плашка */}
                {useBox && (
                  <div
                    className="caption-box"
                    style={{
                      backgroundColor: hexToRgba(boxColor, boxOpacity),
                      padding: `${boxPadding}px`
                    }}
                  />
                )}
                <span className="caption-text" style={{ WebkitTextStroke: `${strokeWidth}px rgba(0,0,0,.55)` }}>
                  {slides[idx].caption}
                </span>
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
            <button key={i} className={`thumb ${i === idx ? "active" : ""}`} onClick={() => selectSlide(i)}>
              <img src={s.img} alt="" />
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- helpers --- */
function hexToRgba(hex, a = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx, x, y, width, height, radius) {
  let r = radius;
  if (width < 2 * r) r = width / 2;
  if (height < 2 * r) r = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
                }
