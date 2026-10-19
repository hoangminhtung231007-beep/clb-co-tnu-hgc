import { store } from '../state/store.js';
import { sound } from '../utils/audio.js';
import confetti from 'canvas-confetti';

export class SmartQRScanner {
  constructor(containerEl, onScanSuccess) {
    this.container = containerEl;
    this.onScanSuccess = onScanSuccess;
    this.videoStream = null;
    this.scanning = false;
    this.barcodeDetector = null;
    this.animFrameId = null;

    const state = store.getState();
    const activeEvt = state.events.find((e) => e.checkinActive);
    if (activeEvt) {
      this.checkInMode = activeEvt.type === 'tournament' ? 'tournament' : 'activity';
      this.selectedEventId = activeEvt.id;
    } else {
      this.checkInMode = 'session';
      this.selectedEventId = '';
    }

    if ('BarcodeDetector' in window) {
      try {
        this.barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('BarcodeDetector format not supported', e);
      }
    }

    this.render();
  }

  getModeLabel() {
    if (this.checkInMode === 'session') return '☕ Sinh Hoạt Định Kỳ (+1 Buổi Sinh Hoạt)';
    if (this.checkInMode === 'tournament') return '🏆 Giải Đấu (+1 Số Giải)';
    return '🎯 Hoạt Động (+1 Hoạt Động Tham Gia)';
  }

  renderTargetDetailHtml(state) {
    const todayVN = new Date().toLocaleDateString('vi-VN');
    if (this.checkInMode === 'session') {
      return `
        <div class="d-flex justify-between align-center flex-wrap gap-2 p-3" style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); border-radius: 8px;">
          <div class="d-flex align-center gap-3">
            <span class="pulse-indicator"></span>
            <div>
              <div class="text-xs text-muted">Phiên điểm danh tự động:</div>
              <strong class="text-white text-sm">Buổi Sinh Hoạt Định Kỳ CLB • Hôm nay (${todayVN})</strong>
              <div class="text-xs text-muted mt-0.5">Bật máy quét là ghi nhận ngay cho mọi thành viên tham gia sinh hoạt hôm nay</div>
            </div>
          </div>
          <div>
            <span class="badge badge-gold" style="font-size: 0.82rem; padding: 6px 14px; font-weight: 700;">
              ⚡ Tác động: +1 Buổi Sinh Hoạt
            </span>
          </div>
        </div>
      `;
    }

    if (this.checkInMode === 'activity') {
      const activities = state.events.filter((e) => e.type === 'activity' || e.type !== 'tournament');
      if (!this.selectedEventId || !activities.some((a) => a.id === this.selectedEventId)) {
        this.selectedEventId = activities.length > 0 ? activities[0].id : '';
      }
      const currentActivity = activities.find((a) => a.id === this.selectedEventId);
      const currentTitle = currentActivity ? currentActivity.title : 'Chưa có hoạt động nào trong danh sách';

      return `
        <div class="p-3" style="background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.28); border-radius: 8px;">
          <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2">
            <div class="d-flex align-center gap-3">
              <span class="pulse-indicator" style="background: var(--accent-cyan); box-shadow: 0 0 10px var(--accent-cyan);"></span>
              <div>
                <div class="text-xs text-muted">Hoạt động đang diễn ra:</div>
                <strong class="text-white text-sm" id="scannerCurrentActivityTitle">
                  ${currentTitle}
                </strong>
              </div>
            </div>
            <div>
              <span class="badge badge-cyan" style="font-size: 0.82rem; padding: 6px 14px; font-weight: 700;">
                ⚡ Tác động: +1 Hoạt Động Tham Gia
              </span>
            </div>
          </div>
          <div class="form-group mb-0">
            <label class="form-label text-xs text-dim">Chọn hoạt động cụ thể:</label>
            <select id="scannerEventSelect" class="form-select form-select-sm">
              ${activities.length > 0 ? activities.map((a) => `
                <option value="${a.id}" ${a.id === this.selectedEventId ? 'selected' : ''}>
                  ${a.title} (${a.status === 'ongoing' ? '🟢 Đang diễn ra' : a.status === 'completed' ? '🏁 Đã kết thúc' : '⏰ Sắp diễn ra'})
                </option>
              `).join('') : '<option value="">(Chưa có hoạt động nào trong danh sách)</option>'}
            </select>
          </div>
        </div>
      `;
    }

    // Tournament
    const tournaments = state.events.filter((e) => e.type === 'tournament');
    if (!this.selectedEventId || !tournaments.some((t) => t.id === this.selectedEventId)) {
      this.selectedEventId = tournaments.length > 0 ? tournaments[0].id : '';
    }
    const currentTournament = tournaments.find((t) => t.id === this.selectedEventId);
    const currentTourTitle = currentTournament ? currentTournament.title : 'Chưa có giải đấu nào trong danh sách';

    return `
      <div class="p-3" style="background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.28); border-radius: 8px;">
        <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2">
          <div class="d-flex align-center gap-3">
            <span class="pulse-indicator" style="background: var(--accent-rose); box-shadow: 0 0 10px var(--accent-rose);"></span>
            <div>
              <div class="text-xs text-muted">Giải đấu đang diễn ra:</div>
              <strong class="text-white text-sm" id="scannerCurrentTournamentTitle">
                ${currentTourTitle}
              </strong>
            </div>
          </div>
          <div>
            <span class="badge badge-rose" style="font-size: 0.82rem; padding: 6px 14px; font-weight: 700;">
              ⚡ Tác động: +1 Số Giải Tham Gia
            </span>
          </div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label text-xs text-dim">Chọn giải đấu cụ thể:</label>
          <select id="scannerEventSelect" class="form-select form-select-sm">
            ${tournaments.length > 0 ? tournaments.map((t) => `
              <option value="${t.id}" ${t.id === this.selectedEventId ? 'selected' : ''}>
                ${t.title} (${t.status === 'ongoing' ? '🟢 Đang diễn ra' : t.status === 'completed' ? '🏁 Đã kết thúc' : '⏰ Sắp diễn ra'})
              </option>
            `).join('') : '<option value="">(Chưa có giải đấu nào trong danh sách)</option>'}
          </select>
        </div>
      </div>
    `;
  }

  render() {
    const state = store.getState();

    this.container.innerHTML = `
      <div class="qr-scanner-widget">
        <!-- Check-in Mode Selector Banner -->
        <div class="card mb-3" style="background: linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid var(--border-gold); padding: 16px 20px;">
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
            <div>
              <span class="badge badge-gold">MÁY QUÉT ĐIỂM DANH THÔNG MINH</span>
              <h3 class="text-base font-bold text-white mt-1">Chọn Mục Tiêu Điểm Danh</h3>
              <p class="text-xs text-muted">Chọn loại hình điểm danh để hệ thống tự động cộng đúng chỉ số cho kỳ thủ</p>
            </div>
            <!-- 3 Mode Buttons -->
            <div class="d-flex gap-2 flex-wrap" id="checkInModeTabGroup">
              <button type="button" class="btn btn-sm btn-checkin-mode ${this.checkInMode === 'session' ? 'btn-gold' : 'btn-outline'}" data-mode="session">
                ☕ Sinh Hoạt Định Kỳ
              </button>
              <button type="button" class="btn btn-sm btn-checkin-mode ${this.checkInMode === 'activity' ? 'btn-cyan' : 'btn-outline'}" data-mode="activity">
                🎯 Hoạt Động
              </button>
              <button type="button" class="btn btn-sm btn-checkin-mode ${this.checkInMode === 'tournament' ? 'btn-rose' : 'btn-outline'}" data-mode="tournament">
                🏆 Giải Đấu
              </button>
            </div>
          </div>

          <!-- Dynamic Active Target Detail -->
          <div id="checkInTargetDetailArea">
            ${this.renderTargetDetailHtml(state)}
          </div>
        </div>

        <!-- Camera Scanner Area -->
        <div class="scanner-viewport-box">
          <div class="scanner-viewfinder">
            <video id="scannerVideo" playsinline muted style="display:none;"></video>
            <canvas id="scannerCanvas"></canvas>
            
            <div class="viewfinder-overlay">
              <div class="viewfinder-corner top-left"></div>
              <div class="viewfinder-corner top-right"></div>
              <div class="viewfinder-corner bottom-left"></div>
              <div class="viewfinder-corner bottom-right"></div>
              <div class="viewfinder-laser" id="viewfinderLaser"></div>
              <div class="viewfinder-hint" id="scannerStatusText">
                <span class="icon-camera">📷</span> Nhấn "Bật Camera" hoặc dùng "Quét Giả Lập" bên dưới
              </div>
            </div>
          </div>

          <!-- Camera Controls -->
          <div class="scanner-controls-row">
            <button id="btnToggleCamera" class="btn btn-primary btn-sm">
              <span class="btn-icon">📹</span> Bật Camera Quét Thật
            </button>
            <label class="btn btn-outline btn-sm file-input-label">
              <span class="btn-icon">📁</span> Tải ảnh QR
              <input type="file" id="scannerFileInput" accept="image/*" style="display:none;">
            </label>
          </div>
        </div>

        <!-- Feedback alert area -->
        <div id="scannerAlertArea" class="scanner-alert-area"></div>

        <!-- Manual Code Input -->
        <div class="card mt-3" style="background: rgba(14,23,46,0.85); border: 1px solid rgba(255,255,255,0.08); padding: 14px 18px;">
          <div class="d-flex align-center gap-2 mb-2">
            <span>⌨️</span>
            <span class="text-xs font-bold text-dim">NHẬP MÃ THẺ HOẶC MSSV ĐIỂM DANH THỦ CÔNG:</span>
          </div>
          <div class="d-flex gap-2">
            <input type="text" id="manualQrInput" class="form-input form-input-sm" placeholder="Nhập mã thẻ hoặc MSSV (VD: MSSV hoặc mã thẻ)..." style="flex: 1;">
            <button id="btnManualSubmit" class="btn btn-gold btn-sm" style="white-space: nowrap; font-weight: 600;">
              <span>✓</span> <span>Xác Nhận Điểm Danh</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btnToggleCamera = this.container.querySelector('#btnToggleCamera');
    const fileInput = this.container.querySelector('#scannerFileInput');
    const manualInput = this.container.querySelector('#manualQrInput');
    const btnManualSubmit = this.container.querySelector('#btnManualSubmit');

    // Bind mode tabs
    this.container.querySelectorAll('.btn-checkin-mode').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.checkInMode = btn.dataset.mode;
        this.selectedEventId = '';
        this.updateModeUi();
      });
    });

    this.bindEventSelect();

    if (btnToggleCamera) {
      btnToggleCamera.addEventListener('click', () => {
        sound.playClick();
        if (this.scanning) {
          this.stopCamera();
        } else {
          this.startCamera();
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileScan(e));
    }

    if (btnManualSubmit && manualInput) {
      btnManualSubmit.addEventListener('click', () => {
        sound.playClick();
        const val = manualInput.value.trim();
        if (val) {
          this.executeCheckIn(val, 'Nhập thủ công');
          manualInput.value = '';
        }
      });
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          btnManualSubmit.click();
        }
      });
    }
  }

  updateModeUi() {
    const state = store.getState();
    // Update button active states
    this.container.querySelectorAll('.btn-checkin-mode').forEach((btn) => {
      const mode = btn.dataset.mode;
      btn.className = `btn btn-sm btn-checkin-mode ${mode === this.checkInMode ? (mode === 'session' ? 'btn-gold' : mode === 'activity' ? 'btn-cyan' : 'btn-rose') : 'btn-outline'}`;
    });

    const targetDetailArea = this.container.querySelector('#checkInTargetDetailArea');
    if (targetDetailArea) {
      targetDetailArea.innerHTML = this.renderTargetDetailHtml(state);
      this.bindEventSelect();
    }
  }

  bindEventSelect() {
    const eventSelect = this.container.querySelector('#scannerEventSelect');
    if (eventSelect) {
      eventSelect.addEventListener('change', (e) => {
        this.selectedEventId = e.target.value;
        const currentTitleEl = this.checkInMode === 'activity' 
          ? this.container.querySelector('#scannerCurrentActivityTitle') 
          : this.container.querySelector('#scannerCurrentTournamentTitle');
        if (currentTitleEl) {
          const state = store.getState();
          const found = state.events.find((ev) => ev.id === e.target.value);
          if (found) {
            currentTitleEl.textContent = found.title;
          } else {
            currentTitleEl.textContent = this.checkInMode === 'activity' 
              ? 'Chưa có hoạt động nào trong danh sách' 
              : 'Chưa có giải đấu nào trong danh sách';
          }
        }
      });
    }
  }

  async startCamera() {
    const video = this.container.querySelector('#scannerVideo');
    const btn = this.container.querySelector('#btnToggleCamera');
    const statusText = this.container.querySelector('#scannerStatusText');
    const laser = this.container.querySelector('#viewfinderLaser');

    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = this.videoStream;
      video.setAttribute('playsinline', 'true');
      await video.play();

      this.scanning = true;
      if (btn) btn.innerHTML = '<span class="btn-icon">⏹</span> Dừng Camera';
      if (laser) laser.classList.add('active');
      if (statusText) statusText.innerHTML = '🟢 Camera đang hoạt động. Hướng mã QR vào khung ngắm...';

      this.scanLoop();
    } catch (err) {
      console.warn('Camera access denied or unavailable', err);
      if (statusText) {
        statusText.innerHTML = '⚠️ Không thể mở camera. Vui lòng cấp quyền camera hoặc nhập mã thẻ/MSSV thủ công bên dưới!';
      }
      this.showFeedback({
        success: false,
        message: 'Không thể truy cập camera. Vui lòng cấp quyền camera hoặc nhập mã thẻ/MSSV thủ công bên dưới.'
      });
    }
  }

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = null;
    }
    this.scanning = false;
    cancelAnimationFrame(this.animFrameId);

    const btn = this.container.querySelector('#btnToggleCamera');
    const statusText = this.container.querySelector('#scannerStatusText');
    const laser = this.container.querySelector('#viewfinderLaser');

    if (btn) btn.innerHTML = '<span class="btn-icon">📹</span> Bật Camera Quét Thật';
    if (laser) laser.classList.remove('active');
    if (statusText) statusText.innerHTML = '<span class="icon-camera">📷</span> Camera đã tắt. Sẵn sàng quét.';
  }

  async scanLoop() {
    if (!this.scanning) return;

    const video = this.container.querySelector('#scannerVideo');
    if (video && video.readyState === video.HAVE_ENOUGH_DATA && this.barcodeDetector) {
      try {
        const barcodes = await this.barcodeDetector.detect(video);
        if (barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          this.executeCheckIn(rawValue, 'QR Camera Trực tiếp');
          // Pause slightly before next scan to prevent instant re-trigger
          await new Promise((r) => setTimeout(r, 1600));
        }
      } catch (e) {
        // Continue detection loop
      }
    }

    this.animFrameId = requestAnimationFrame(() => this.scanLoop());
  }

  async handleFileScan(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (this.barcodeDetector) {
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        const barcodes = await this.barcodeDetector.detect(img);
        if (barcodes.length > 0) {
          this.executeCheckIn(barcodes[0].rawValue, 'Tải ảnh QR');
        } else {
          this.showFeedback({
            success: false,
            message: 'Không phát hiện thấy mã QR hợp lệ trong ảnh tải lên!'
          });
        }
      } catch (err) {
        this.showFeedback({
          success: false,
          message: 'Lỗi khi xử lý ảnh QR: ' + err.message
        });
      }
    } else {
      this.showFeedback({
        success: false,
        message: 'Trình duyệt hiện tại chưa hỗ trợ quét ảnh trực tiếp. Vui lòng bật camera trực tiếp hoặc nhập mã thẻ thủ công bên dưới!'
      });
    }
    e.target.value = '';
  }

  executeCheckIn(qrPayload, method = 'QR Camera') {
    const target = {
      mode: this.checkInMode,
      eventId: this.selectedEventId
    };

    const result = store.processCheckIn(qrPayload, target, method);

    if (result.success) {
      sound.playSuccess();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Confetti fallback
      }
    } else {
      sound.playWarning();
    }

    this.showFeedback(result);

    if (typeof this.onScanSuccess === 'function') {
      this.onScanSuccess(result);
    }
  }

  showFeedback(result) {
    const alertArea = this.container.querySelector('#scannerAlertArea');
    if (!alertArea) return;

    if (result.success) {
      alertArea.innerHTML = `
        <div class="scanner-alert alert-success animate-pop">
          <div class="alert-icon-wrap success-glow">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="alert-content">
            <h4 class="alert-heading">ĐIỂM DANH THÀNH CÔNG!</h4>
            <p class="alert-detail">
              <strong>${result.member.name}</strong> (${result.member.id}) • MSSV: ${result.member.studentId}
            </p>
            <div class="d-flex align-center gap-2 mt-1 mb-1">
              <span class="badge ${result.category === 'session' ? 'badge-gold' : result.category === 'tournament' ? 'badge-rose' : 'badge-cyan'}" style="font-weight: 700; font-size: 0.85rem; padding: 4px 10px;">
                ⚡ ĐÃ GHI NHẬN: ${result.impactText} (Tổng: ${result.currentCount})
              </span>
            </div>
            <p class="alert-meta">
              🏫 ${result.member.university || result.member.class} • Chức vụ: <strong>${result.member.roleTitle}</strong> • Giờ vào: <em>${result.log.timestamp}</em>
            </p>
          </div>
        </div>
      `;
    } else {
      const isDuplicate = result.type === 'DUPLICATE';
      alertArea.innerHTML = `
        <div class="scanner-alert ${isDuplicate ? 'alert-warning' : 'alert-danger'} animate-shake">
          <div class="alert-icon-wrap ${isDuplicate ? 'warning-glow' : 'danger-glow'}">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5">
              ${isDuplicate 
                ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'
                : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
              }
            </svg>
          </div>
          <div class="alert-content">
            <h4 class="alert-heading">${isDuplicate ? 'CẢNH BÁO: TRÙNG LẶP ĐIỂM DANH' : 'ĐIỂM DANH THẤT BẠI'}</h4>
            <p class="alert-detail">${result.message}</p>
            ${result.existingTime ? `<p class="alert-meta">Lần quét trước: <strong>${result.existingTime}</strong>. Hệ thống tự động từ chối ghi nhận lần 2!</p>` : ''}
          </div>
        </div>
      `;
    }

    // Auto clear alert after 7 seconds
    setTimeout(() => {
      if (alertArea) alertArea.innerHTML = '';
    }, 7000);
  }

  destroy() {
    this.stopCamera();
  }
}
