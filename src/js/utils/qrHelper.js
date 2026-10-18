import QRCode from 'qrcode';

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
