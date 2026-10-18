export const chartHelper = {
  // Render Elo progression line chart
  renderEloChart(canvasEl, historyData = []) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const width = (canvasEl.width = canvasEl.parentElement ? canvasEl.parentElement.clientWidth : 600);
    const height = (canvasEl.height = 240);

    ctx.clearRect(0, 0, width, height);

    if (!historyData || historyData.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Chưa có lịch sử biến động Elo', width / 2, height / 2);
      return;
    }

    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minElo = Math.floor(Math.min(...historyData) / 100) * 100 - 100;
    const maxElo = Math.ceil(Math.max(...historyData) / 100) * 100 + 100;
    const eloRange = maxElo - minElo || 1;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      const val = Math.round(maxElo - (eloRange / gridLines) * i);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(val.toString(), padding.left - 10, y + 4);
    }

    // Points calculation
    const points = historyData.map((val, idx) => {
      const x = padding.left + (chartW / (historyData.length - 1 || 1)) * idx;
      const y = padding.top + chartH - ((val - minElo) / eloRange) * chartH;
      return { x, y, val };
    });

    if (points.length < 2) return;

    // Gradient fill under curve
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(212, 175, 55, 0.45)');
    gradient.addColorStop(1, 'rgba(212, 175, 55, 0.01)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
    }
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.lineTo(points[0].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw curve line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw dots
    points.forEach((p, idx) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === points.length - 1 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = idx === points.length - 1 ? '#f59e0b' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0b1329';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bottom label
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(`T${idx + 1}`, p.x, height - padding.bottom + 20);
    });
  },

  // Render Attendance Bar Chart
  renderBarChart(canvasEl, labels = [], values = []) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const width = (canvasEl.width = canvasEl.parentElement ? canvasEl.parentElement.clientWidth : 500);
    const height = (canvasEl.height = 220);

    ctx.clearRect(0, 0, width, height);

    if (!values || values.length === 0 || values.every((v) => v === 0)) {
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Chưa có dữ liệu điểm danh trong giai đoạn này', width / 2, height / 2);
      return;
    }

    const padding = { top: 25, right: 20, bottom: 35, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...values, 10);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      const v = Math.round(maxVal - (maxVal / 4) * i);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(v.toString(), padding.left - 8, y + 4);
    }

    const barWidth = Math.min(38, chartW / values.length - 16);
    const step = chartW / values.length;

    values.forEach((val, idx) => {
      const x = padding.left + step * idx + (step - barWidth) / 2;
      const barH = (val / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      const barGrad = ctx.createLinearGradient(0, y, 0, y + barH);
      barGrad.addColorStop(0, '#38bdf8');
      barGrad.addColorStop(1, '#0284c7');

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]) : ctx.rect(x, y, barWidth, barH);
      ctx.fill();

      // Top value text
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(val.toString(), x + barWidth / 2, y - 6);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.font = '11px monospace';
      ctx.fillText(labels[idx] || `T${idx + 1}`, x + barWidth / 2, height - padding.bottom + 18);
    });
  },

  // Render Donut Chart for Class or Breakdown (Zero sample fallback)
  renderDonutChart(canvasEl, segments = null, totalMembersCount = 0) {
    if (!canvasEl) return;

    const dataSegments = (segments && segments.length) ? segments : [];
    const ctx = canvasEl.getContext('2d');
    const containerWidth = canvasEl.parentElement ? canvasEl.parentElement.clientWidth : 600;
    const width = (canvasEl.width = containerWidth);

    const isMobile = width < 560;
    const height = (canvasEl.height = isMobile ? Math.max(220, 190 + dataSegments.length * 28) : 240);

    ctx.clearRect(0, 0, width, height);

    if (dataSegments.length === 0 || totalMembersCount === 0) {
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Chưa có thành viên nào để phân bố dữ liệu lớp', width / 2, height / 2);
      return;
    }

    const totalCount = dataSegments.reduce((sum, s) => sum + (s.count !== undefined ? s.count : s.value || 0), 0) || totalMembersCount || 1;
    let currentAngle = -Math.PI / 2;

    const centerX = isMobile ? width / 2 : Math.max(120, Math.min(width * 0.28, 160));
    const centerY = isMobile ? 85 : height / 2;
    const radius = isMobile ? 65 : Math.min(centerX - 15, centerY - 20, 85);
    const innerRadius = radius * 0.58;

    dataSegments.forEach((seg) => {
      const sliceVal = seg.count !== undefined ? seg.count : seg.value;
      const sliceAngle = (sliceVal / totalCount) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      currentAngle += sliceAngle;
    });

    // Center total text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${totalCount}`, centerX, centerY + 2);
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('kỳ thủ', centerX, centerY + 18);

    // Legend on the right (or bottom on mobile)
    const legendX = isMobile ? 24 : centerX + radius + 35;
    let legendY = isMobile ? 180 : Math.max(30, (height - dataSegments.length * 30) / 2 + 15);
    ctx.textAlign = 'left';

    dataSegments.forEach((seg) => {
      const sliceVal = seg.count !== undefined ? seg.count : seg.value;
      const pct = Math.round((sliceVal / totalCount) * 100);

      // Color swatch dot
      ctx.beginPath();
      ctx.arc(legendX, legendY, 5, 0, Math.PI * 2);
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(seg.label, legendX + 14, legendY + 4);

      // Value & percentage
      const labelW = ctx.measureText(seg.label).width + 10;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 12px monospace';
      const textVal = `${sliceVal} (${pct}%)`;
      ctx.fillText(textVal, legendX + 14 + labelW, legendY + 4);

      legendY += 30;
    });
  }
};
