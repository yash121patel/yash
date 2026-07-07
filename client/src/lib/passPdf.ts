import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PassExportData {
  tokenNumber: number;
  name: string;
  village: string;
  mobile: string;
  registrationTime: string;
  photoUrl?: string;
  logoUrl: string;
  qrDataUrl: string;
}

async function loadAsDataUrl(src: string, maxSize = 240): Promise<string> {
  if (!src) throw new Error('Missing image source');
  if (src.startsWith('data:')) {
    return resizeDataUrl(src, maxSize);
  }

  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${src}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(objectUrl);
    return drawImageToDataUrl(image, maxSize);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function drawImageToDataUrl(image: HTMLImageElement, maxSize: number): string {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function resizeDataUrl(dataUrl: string, maxSize: number): Promise<string> {
  const image = await loadImage(dataUrl);
  return drawImageToDataUrl(image, maxSize);
}

function setStyles(element: HTMLElement, styles: Record<string, string>) {
  Object.assign(element.style, styles);
}

function createText(
  text: string,
  styles: Record<string, string> = {}
): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = text;
  setStyles(span, styles);
  return span;
}

function createRow(
  label: string,
  value: string,
  valueColor: string,
  bold = false,
  border = true
): HTMLDivElement {
  const rowEl = document.createElement('div');
  setStyles(rowEl, {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    paddingBottom: border ? '6px' : '0',
    marginBottom: border ? '6px' : '0',
    borderBottom: border ? '1px solid rgba(255,255,255,0.08)' : 'none',
  });

  rowEl.appendChild(createText(label, { color: 'rgba(255,255,255,0.55)' }));
  rowEl.appendChild(
    createText(value, {
      color: valueColor,
      fontWeight: bold ? '700' : '600',
      textAlign: 'right',
    })
  );
  return rowEl;
}

function createImage(src: string, styles: Record<string, string>): HTMLImageElement {
  const image = document.createElement('img');
  image.src = src;
  image.alt = '';
  setStyles(image, { display: 'block', ...styles });
  return image;
}

function buildPassElement(
  data: PassExportData,
  logoDataUrl: string,
  photoDataUrl: string,
  qrDataUrl: string
): HTMLDivElement {
  const timeLabel = new Date(data.registrationTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const token = data.tokenNumber.toString().padStart(3, '0');

  const root = document.createElement('div');
  setStyles(root, {
    width: '360px',
    padding: '28px 24px',
    background: '#121015',
    color: '#ffffff',
    border: '2px solid #d4af37',
    borderRadius: '20px',
    fontFamily: 'Inter, "Noto Sans Gujarati", system-ui, sans-serif',
    boxSizing: 'border-box',
  });

  const header = document.createElement('div');
  setStyles(header, { textAlign: 'center', marginBottom: '18px' });
  header.appendChild(
    createImage(logoDataUrl, {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      objectFit: 'cover',
      border: '1px solid rgba(212,175,55,0.4)',
      margin: '0 auto',
    })
  );

  const title = document.createElement('div');
  title.textContent = 'TIGER CHEHAR RAJ UVASAD';
  setStyles(title, {
    color: '#D4AF37',
    fontWeight: '700',
    fontSize: '13px',
    marginTop: '10px',
    letterSpacing: '1px',
  });
  header.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.textContent = 'DIVINE DARSHAN ENTRY PASS';
  setStyles(subtitle, {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '8px',
    fontWeight: '700',
    letterSpacing: '2px',
    marginTop: '4px',
  });
  header.appendChild(subtitle);

  const card = document.createElement('div');
  setStyles(card, {
    border: '1px solid rgba(212,175,55,0.25)',
    borderRadius: '16px',
    padding: '16px',
    background: 'rgba(0,0,0,0.4)',
  });

  const photoWrap = document.createElement('div');
  setStyles(photoWrap, {
    width: '80px',
    height: '80px',
    margin: '0 auto 14px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(212,175,55,0.2)',
  });
  photoWrap.appendChild(
    createImage(photoDataUrl, { width: '80px', height: '80px', objectFit: 'cover' })
  );

  const qrWrap = document.createElement('div');
  setStyles(qrWrap, {
    width: '112px',
    height: '112px',
    margin: '0 auto 14px',
    background: '#ffffff',
    padding: '8px',
    borderRadius: '12px',
    border: '1px solid rgba(212,175,55,0.2)',
  });
  qrWrap.appendChild(createImage(qrDataUrl, { width: '96px', height: '96px' }));

  const details = document.createElement('div');
  setStyles(details, { fontSize: '12px', lineHeight: '1.8' });
  details.appendChild(createRow('ટોકન (Token ID):', token, '#F4C430', true));
  details.appendChild(createRow('નામ (Devotee):', data.name, '#ffffff', true));
  details.appendChild(createRow('ગામ (Village):', data.village, '#ffffff'));
  details.appendChild(createRow('મોબાઈલ (Mobile):', data.mobile, '#ffffff'));
  details.appendChild(createRow('નોંધણી સમય:', timeLabel, '#ffffff', false, false));

  card.appendChild(photoWrap);
  card.appendChild(qrWrap);
  card.appendChild(details);
  root.appendChild(header);
  root.appendChild(card);

  return root;
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

function scaleCanvas(source: HTMLCanvasElement, maxWidth = 1600): HTMLCanvasElement {
  if (source.width <= maxWidth) return source;

  const scale = maxWidth / source.width;
  const scaled = document.createElement('canvas');
  scaled.width = maxWidth;
  scaled.height = Math.round(source.height * scale);
  const ctx = scaled.getContext('2d');
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0, scaled.width, scaled.height);
  return scaled;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadPassPdf(data: PassExportData, fileName: string): Promise<void> {
  const [logoDataUrl, photoDataUrl, qrDataUrl] = await Promise.all([
    loadAsDataUrl(data.logoUrl, 96),
    loadAsDataUrl(data.photoUrl || data.logoUrl, 160),
    resizeDataUrl(data.qrDataUrl, 128),
  ]);

  const exportNode = buildPassElement(data, logoDataUrl, photoDataUrl, qrDataUrl);
  setStyles(exportNode, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    opacity: '1',
    pointerEvents: 'none',
    zIndex: '1',
  });
  document.body.appendChild(exportNode);

  let canvas: HTMLCanvasElement | null = null;

  try {
    await waitForImages(exportNode);
    await new Promise((resolve) => setTimeout(resolve, 300));

    canvas = scaleCanvas(
      await html2canvas(exportNode, {
        scale: 2,
        backgroundColor: '#121015',
        logging: false,
        useCORS: true,
        allowTaint: true,
      })
    );

    if (!canvas.width || !canvas.height) {
      throw new Error('Pass image capture failed');
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const targetWidth = pdfWidth * 0.82;
      const targetHeight = targetWidth / ratio;
      const x = (pdfWidth - targetWidth) / 2;
      const y = Math.max(12, (pdfHeight - targetHeight) / 2);

      pdf.addImage(canvas, 'JPEG', x, y, targetWidth, targetHeight);
      pdf.save(fileName);
      return;
    } catch (pdfError) {
      console.warn('PDF save failed, falling back to PNG download', pdfError);
    }

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas!.toBlob((blob) => resolve(blob), 'image/png', 1);
    });

    if (pngBlob) {
      downloadBlob(pngBlob, fileName.replace('.pdf', '.png'));
      return;
    }

    throw new Error('Could not create pass file');
  } finally {
    document.body.removeChild(exportNode);
  }
}
