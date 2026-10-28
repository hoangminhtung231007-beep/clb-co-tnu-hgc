import QRCode from 'qrcode';

export function removeVietnameseAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildFundTransferSyntax(syntaxPrefix, member) {
  const prefix = syntaxPrefix || 'QUY T10';
  const nameClean = removeVietnameseAccents(member?.name || '').toUpperCase();
  const studentIdClean = (member?.studentId || member?.phone || member?.id || 'KYTHU')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return `${prefix} ${nameClean} ${studentIdClean}`.replace(/\s+/g, ' ').trim();
}

export const qrHelper = {
  // Generate QR payload string for a member
  generatePayload(member) {
    if (!member) return '';
    // Format: TNU-HGC:{member_id}:{hash_or_code}:{name}
    const safeName = encodeURIComponent(member.name.replace(/\s+/g, '_'));
    return `TNU-HGC:${member.id}:${member.studentId || 'PASS'}:${safeName}`;
  },

  // Render QR to a canvas element
  async renderToCanvas(canvasEl, payload, options = {}) {
    if (!canvasEl || !payload) return;
    try {
      await QRCode.toCanvas(canvasEl, payload, {
        width: options.width || 220,
        margin: options.margin || 2,
        color: {
          dark: options.dark || '#0f172a',
          light: options.light || '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
    } catch (err) {
      console.error('Failed to render QR Code', err);
    }
  },

  // Generate Data URL for image tag or download
  async toDataURL(payload, options = {}) {
    try {
      return await QRCode.toDataURL(payload, {
        width: options.width || 300,
        margin: options.margin || 2,
        color: {
          dark: options.dark || '#0f172a',
          light: options.light || '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
    } catch (err) {
      console.error('Failed to generate QR data URL', err);
      return '';
    }
  }
};
