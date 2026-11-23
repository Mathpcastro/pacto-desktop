// Orientações EXIF 5 a 8 trocam os eixos da foto na renderização do navegador.
function swapsExifAxes(bytes, start, end) {
  if (end - start < 14 || bytes.slice(start, start + 6) !== 'Exif\0\0') return false;
  const tiff = start + 6;
  const order = bytes.slice(tiff, tiff + 2);
  if (order !== 'II' && order !== 'MM') return false;
  const read = (offset, length) => {
    let value = 0;
    for (let i = 0; i < length; i++) {
      value = value * 256 + bytes.charCodeAt(offset + (order === 'II' ? length - 1 - i : i));
    }
    return value;
  };
  if (read(tiff + 2, 2) !== 42) return false;
  const directory = tiff + read(tiff + 4, 4);
  if (directory + 2 > end) return false;
  const count = read(directory, 2);
  for (let i = 0, entry = directory + 2; i < count && entry + 12 <= end; i++, entry += 12) {
    if (read(entry, 2) !== 0x0112 || read(entry + 2, 2) !== 3 || read(entry + 4, 4) !== 1) continue;
    const orientation = read(entry + 8, 2);
    return orientation >= 5 && orientation <= 8;
  }
  return false;
}

// Lê os cabeçalhos sem depender do DOM, tanto na prévia quanto na exportação.
export function imageDimensions(dataUrl) {
  const header = /^data:image\/(png|jpeg|webp);base64,/.exec(dataUrl);
  if (!header) return null;
  const encoded = dataUrl.slice(header[0].length);
  const kind = header[1];
  let bytes;
  try {
    bytes = atob(kind === 'jpeg' ? encoded : encoded.slice(0, 40));
  } catch {
    return null;
  }
  const byte = (offset) => bytes.charCodeAt(offset);
  const be16 = (offset) => byte(offset) * 256 + byte(offset + 1);
  const be32 = (offset) => be16(offset) * 65536 + be16(offset + 2);
  const le16 = (offset) => byte(offset) + byte(offset + 1) * 256;
  const le24 = (offset) => le16(offset) + byte(offset + 2) * 65536;
  const size = (width, height) => width > 0 && height > 0 ? { width, height } : null;

  if (kind === 'png' && bytes.slice(12, 16) === 'IHDR') {
    return size(be32(16), be32(20));
  }
  if (kind === 'jpeg' && be16(0) === 0xffd8) {
    let dimensions = null;
    let rotated = false;
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (byte(offset++) !== 0xff) break;
      while (byte(offset) === 0xff) offset++;
      const marker = byte(offset++);
      const length = be16(offset);
      if (marker === 0xda || marker === 0xd9 || length < 2 || offset + length > bytes.length) break;
      if (marker === 0xe1) rotated ||= swapsExifAxes(bytes, offset + 2, offset + length);
      // SOF contém altura e largura. DHT, JPG e DAC intercalam a faixa de marcadores SOF.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
        dimensions = size(be16(offset + 5), be16(offset + 3));
      }
      offset += length;
    }
    if (rotated && dimensions) return { width: dimensions.height, height: dimensions.width };
    return dimensions;
  }
  if (kind === 'webp' && bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP' && bytes.length >= 25) {
    const chunk = bytes.slice(12, 16);
    if (chunk === 'VP8X') return size(1 + le24(24), 1 + le24(27));
    if (chunk === 'VP8 ' && bytes.length >= 30) return size(le16(26) & 0x3fff, le16(28) & 0x3fff);
    if (chunk === 'VP8L' && byte(20) === 0x2f) {
      const packed = le16(21) + le16(23) * 65536;
      return size(1 + (packed & 0x3fff), 1 + ((packed >>> 14) & 0x3fff));
    }
  }
  return null;
}
