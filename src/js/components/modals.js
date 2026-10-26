import { store } from '../state/store.js';
import { sound } from '../utils/audio.js';
import { qrHelper } from '../utils/qrHelper.js';
import { memberCardComponent } from './memberCard.js';

export const modalManager = {
  // Generic modal opener
  open(title, contentHtml, onConfirm = null, confirmText = 'Lưu thay đổi') {
    let modalEl = document.getElementById('globalAppModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'globalAppModal';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-dialog animate-scaleUp">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button type="button" class="modal-close-btn" id="modalCloseBtn">&times;</button>
        </div>
        <div class="modal-body">
          ${contentHtml}
        </div>
        ${onConfirm ? `
          <div class="modal-footer">
            <button type="button" class="btn btn-outline btn-sm" id="modalCancelBtn">Hủy bỏ</button>
            <button type="button" class="btn btn-gold btn-sm" id="modalConfirmBtn">${confirmText}</button>
          </div>
        ` : ''}
      </div>
    `;

    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const dialogEl = modalEl.querySelector('.modal-dialog');
    if (contentHtml.includes('cms-editor-modal-wrap')) {
      dialogEl.style.maxWidth = '860px';
    } else if (contentHtml.includes('member-modal-content')) {
      dialogEl.style.maxWidth = '780px';
    } else if (contentHtml.includes('eval-modal-content')) {
      dialogEl.style.maxWidth = '1020px';
    } else if (contentHtml.includes('swiss-setup-modal') || contentHtml.includes('swiss-admin-modal') || contentHtml.includes('swiss-public-modal')) {
      dialogEl.style.maxWidth = '980px';
      dialogEl.style.width = '96%';
    } else if (contentHtml.includes('change-avatar-modal-wrap')) {
      dialogEl.style.maxWidth = '640px';
      dialogEl.style.width = '95%';
    } else {
      dialogEl.style.maxWidth = '';
    }

    const close = () => {
      sound.playClick();
      modalEl.style.display = 'none';
      document.body.style.overflow = '';
    };

    const closeBtn = modalEl.querySelector('#modalCloseBtn');
    const cancelBtn = modalEl.querySelector('#modalCancelBtn');
    const confirmBtn = modalEl.querySelector('#modalConfirmBtn');

    if (closeBtn) closeBtn.onclick = close;
    if (cancelBtn) cancelBtn.onclick = close;

    if (confirmBtn && onConfirm) {
      confirmBtn.onclick = () => {
        sound.playClick();
        const shouldClose = onConfirm(modalEl);
        if (shouldClose !== false) {
          close();
        }
      };
    }

    modalEl.onclick = (e) => {
      if (e.target === modalEl) close();
    };
  },

  close() {
    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.style.display = 'none';
      document.body.style.overflow = '';
    }
  },

  // Custom Alert Modal (Replaces browser "localhost:3000 cho biết" with luxury themed dialog)
  showAlert(message, title = 'THÔNG BÁO TỪ CLB CỜ TNU - HGC', onOk = null) {
    sound.playSuccess();
    let alertEl = document.getElementById('globalAppAlertModal');
    if (!alertEl) {
      alertEl = document.createElement('div');
      alertEl.id = 'globalAppAlertModal';
      alertEl.className = 'modal-backdrop';
      alertEl.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.78); backdrop-filter:blur(10px); z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px;';
      document.body.appendChild(alertEl);
    }

    const safeMsg = String(message || '');
    alertEl.innerHTML = `
      <div class="modal-dialog animate-scaleUp" style="max-width: 520px; width: 100%; background: radial-gradient(circle at 50% 0%, rgba(212,175,55,0.2) 0%, rgba(14,23,46,0.98) 100%); border: 1px solid var(--border-gold); box-shadow: 0 25px 65px rgba(0,0,0,0.9), 0 0 35px rgba(212,175,55,0.3); border-radius: 16px; overflow: hidden; padding: 0;">
        <div style="padding: 16px 20px; background: rgba(212,175,55,0.08); border-bottom: 1px solid rgba(212,175,55,0.25); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.35rem;">👑</span>
            <span style="font-size: 0.88rem; font-weight: 800; letter-spacing: 0.05em; color: #facc15; text-transform: uppercase;">${title}</span>
          </div>
          <button type="button" id="alertModalCloseX" style="background: none; border: none; color: #94a3b8; font-size: 1.6rem; line-height: 1; cursor: pointer; padding: 0 4px; transition: color 0.2s;" title="Đóng">&times;</button>
        </div>

        <div style="padding: 22px 20px 18px; color: #f8fafc; font-size: 0.94rem; line-height: 1.65; white-space: pre-wrap; word-break: break-word; max-height: 65vh; overflow-y: auto;">${safeMsg}</div>

        <div style="padding: 14px 20px 18px; display: flex; justify-content: flex-end; background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.06);">
          <button type="button" class="btn btn-gold btn-sm" id="btnAlertModalOk" style="min-width: 130px; font-weight: 700; padding: 9px 24px; font-size: 0.88rem; border-radius: 8px; box-shadow: 0 4px 15px rgba(212,175,55,0.35);">
            ✦ Đã hiểu ✦
          </button>
        </div>
      </div>
    `;

    alertEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const closeAlert = () => {
      sound.playClick();
      alertEl.style.display = 'none';
      const mainModal = document.getElementById('globalAppModal');
      if (!mainModal || mainModal.style.display === 'none') {
        document.body.style.overflow = '';
      }
      if (typeof onOk === 'function') onOk();
    };

    const okBtn = alertEl.querySelector('#btnAlertModalOk');
    const closeX = alertEl.querySelector('#alertModalCloseX');
    if (okBtn) okBtn.onclick = closeAlert;
    if (closeX) closeX.onclick = closeAlert;

    alertEl.onclick = (e) => {
      if (e.target === alertEl) closeAlert();
    };

    setTimeout(() => {
      okBtn && okBtn.focus();
    }, 50);
  },

  // Custom Confirm Modal (Replaces browser "localhost:3000 cho biết" confirm with luxury themed dialog)
  showConfirm(message, onConfirm, onCancel = null, options = {}) {
    if (typeof window !== 'undefined' && window.showCustomConfirm) {
      window.showCustomConfirm(message, onConfirm, onCancel, options);
      return;
    }
    sound.playWarning && sound.playWarning();
    let confirmEl = document.getElementById('globalAppConfirmModal');
    if (!confirmEl) {
      confirmEl = document.createElement('div');
      confirmEl.id = 'globalAppConfirmModal';
      confirmEl.className = 'modal-backdrop';
      confirmEl.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.82); backdrop-filter:blur(10px); z-index:9999999; display:flex; align-items:center; justify-content:center; padding:16px;';
      document.body.appendChild(confirmEl);
    }

    const isDanger = options.danger !== false;
    const title = options.title || 'XÁC NHẬN THAO TÁC';
    const confirmText = options.confirmText || 'Đồng ý thực hiện';
    const icon = options.icon || (isDanger ? '⚠️' : '👑');
    const safeMsg = String(message || '');

    confirmEl.innerHTML = `
      <div class="modal-dialog animate-scaleUp" style="max-width: 520px; width: 100%; background: radial-gradient(circle at 50% 0%, ${isDanger ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.2)'} 0%, rgba(14,23,46,0.98) 100%); border: 1px solid ${isDanger ? 'rgba(239,68,68,0.5)' : 'var(--border-gold)'}; box-shadow: 0 25px 65px rgba(0,0,0,0.9), 0 0 35px ${isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(212,175,55,0.3)'}; border-radius: 16px; overflow: hidden; padding: 0;">
        <div style="padding: 16px 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.35rem;">${icon}</span>
            <span style="font-size: 0.88rem; font-weight: 800; letter-spacing: 0.05em; color: ${isDanger ? '#f87171' : '#facc15'}; text-transform: uppercase;">${title}</span>
          </div>
          <button type="button" id="confirmModalCloseX" style="background: none; border: none; color: #94a3b8; font-size: 1.6rem; line-height: 1; cursor: pointer; padding: 0 4px;" title="Đóng">&times;</button>
        </div>

        <div style="padding: 22px 20px 18px; color: #f8fafc; font-size: 0.94rem; line-height: 1.65; white-space: pre-wrap; word-break: break-word; max-height: 65vh; overflow-y: auto;">${safeMsg}</div>

        <div style="padding: 14px 20px 18px; display: flex; justify-content: flex-end; gap: 12px; background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.06);">
          <button type="button" class="btn btn-outline btn-sm" id="btnConfirmCancel" style="padding: 8px 18px; font-size: 0.88rem; border-radius: 8px;">
            Hủy bỏ
          </button>
          <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-gold'} btn-sm" id="btnConfirmOk" style="font-weight: 700; padding: 8px 22px; font-size: 0.88rem; border-radius: 8px; ${isDanger ? 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #fff;' : ''}">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    confirmEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const closeConfirm = (confirmed) => {
      sound.playClick();
      confirmEl.style.display = 'none';
      const mainModal = document.getElementById('globalAppModal');
      if (!mainModal || mainModal.style.display === 'none') {
        document.body.style.overflow = '';
      }
      if (confirmed && typeof onConfirm === 'function') onConfirm();
      else if (!confirmed && typeof onCancel === 'function') onCancel();
    };

    const okBtn = confirmEl.querySelector('#btnConfirmOk');
    const cancelBtn = confirmEl.querySelector('#btnConfirmCancel');
    const closeX = confirmEl.querySelector('#confirmModalCloseX');
    if (okBtn) okBtn.onclick = () => closeConfirm(true);
    if (cancelBtn) cancelBtn.onclick = () => closeConfirm(false);
    if (closeX) closeX.onclick = () => closeConfirm(false);

    confirmEl.onclick = (e) => {
      if (e.target === confirmEl) closeConfirm(false);
    };
  },

  // 1. Add / Edit Member Modal
  openMemberModal(memberToEdit = null) {
    const isEdit = !!memberToEdit;
    const m = memberToEdit || {};
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    let currentRawSrc = m.avatar || defaultAvatar;
    const currentBdhTitle = m.role === 'bdh' ? (m.roleTitle || 'Chủ nhiệm') : 'Chủ nhiệm';

    const contentHtml = `
      <form id="memberForm" class="app-form member-modal-content">
        <!-- Họ tên & MSSV -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Họ và tên kỳ thủ *</label>
            <input type="text" id="mName" class="form-input" required value="${m.name || ''}" placeholder="Nguyễn Văn A">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Mã số sinh viên (MSSV) *</label>
            <input type="text" id="mStudentId" class="form-input" required value="${m.studentId || ''}" placeholder="DTC225101001">
          </div>
        </div>

        <!-- Khoa, Lớp & Niên khóa -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Khoa</label>
            <input type="text" id="mFaculty" class="form-input" value="${m.faculty || ''}" placeholder="VD: Khoa Sư phạm, Khoa Tự nhiên...">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Lớp *</label>
            <input type="text" id="mClass" class="form-input" required value="${m.class || m.major || ''}" placeholder="VD: K22 Sư phạm - CNTT">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Niên khóa</label>
            <input type="text" id="mCohort" class="form-input" value="${m.cohort || ''}" placeholder="VD: 2024 - 2028">
          </div>
        </div>

        <!-- Ngày sinh & Giới tính -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Ngày sinh</label>
            <input type="date" id="mDob" class="form-input" value="${m.dob || '2005-01-01'}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Giới tính</label>
            <select id="mGender" class="form-select">
              <option value="Nam" ${m.gender === 'Nam' || !m.gender ? 'selected' : ''}>Nam</option>
              <option value="Nữ" ${m.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
            </select>
          </div>
        </div>

        <!-- Phân quyền vai trò -->
        <div class="form-group">
          <label class="form-label">Phân quyền vai trò</label>
          <select id="mRole" class="form-select">
            <option value="member" ${m.role === 'member' || !m.role ? 'selected' : ''}>Thành viên</option>
            <option value="bdh" ${m.role === 'bdh' ? 'selected' : ''}>Ban Điều Hành (BĐH)</option>
          </select>
        </div>

        <!-- Bảng chọn & nhập chức vụ Ban Điều Hành (Hiện lên khi chọn BĐH) -->
        <div class="form-group" id="bdhRoleTitleContainer" style="display: ${m.role === 'bdh' ? 'block' : 'none'}; background: rgba(212,175,55,0.08); border: 1.5px solid rgba(212,175,55,0.3); border-radius: 10px; padding: 14px; margin-top: -6px; margin-bottom: 16px;">
          <div class="d-flex justify-between align-center mb-1 flex-wrap gap-1">
            <label class="form-label font-bold text-gold mb-0" style="display:flex; align-items:center; gap:6px;">
              <span>🎖️</span> <span>Chức vụ / Vị trí trong Ban Điều Hành *</span>
            </label>
            <span class="text-xs text-muted">Bấm chọn 1 trong 8 vị trí chuẩn hoặc tự nhập</span>
          </div>
          
          <!-- Nút chọn nhanh 8 vị trí Ban Điều Hành -->
          <div class="d-flex gap-1 flex-wrap my-2" id="bdhPresetButtons" style="gap: 6px;">
            <button type="button" class="btn ${currentBdhTitle === 'Chủ nhiệm' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Chủ nhiệm">👑 1. Chủ nhiệm</button>
            <button type="button" class="btn ${currentBdhTitle === 'Phó chủ nhiệm Chuyên môn' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Phó chủ nhiệm Chuyên môn">⭐ 2. Phó chủ nhiệm Chuyên môn</button>
            <button type="button" class="btn ${currentBdhTitle === 'Phó chủ nhiệm Nội bộ' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Phó chủ nhiệm Nội bộ">⭐ 3. Phó chủ nhiệm Nội bộ</button>
            <button type="button" class="btn ${currentBdhTitle === 'Trưởng ban Chuyên môn Cờ vua' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Trưởng ban Chuyên môn Cờ vua">♟️ 4. Trưởng ban Chuyên môn Cờ vua</button>
            <button type="button" class="btn ${currentBdhTitle === 'Trưởng ban Chuyên môn Cờ tướng' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Trưởng ban Chuyên môn Cờ tướng">🏮 5. Trưởng ban Chuyên môn Cờ tướng</button>
            <button type="button" class="btn ${currentBdhTitle === 'Trưởng ban Truyền thông - Đối ngoại' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Trưởng ban Truyền thông - Đối ngoại">📢 6. Trưởng ban Truyền thông - Đối ngoại</button>
            <button type="button" class="btn ${currentBdhTitle === 'Trưởng ban Sự kiện' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Trưởng ban Sự kiện">🎪 7. Trưởng ban Sự kiện</button>
            <button type="button" class="btn ${currentBdhTitle === 'Trưởng ban Tài chính - Hậu cần' ? 'btn-gold' : 'btn-outline'} btn-sm text-xs btn-preset-title" data-title="Trưởng ban Tài chính - Hậu cần">💰 8. Trưởng ban Tài chính - Hậu cần</button>
          </div>

          <input type="text" id="mBdhRoleTitle" class="form-input" 
                 value="${currentBdhTitle}" 
                 placeholder="VD: Chủ nhiệm, Phó chủ nhiệm Chuyên môn, Trưởng ban...">
          <small class="text-xs text-muted mt-1" style="display:block;">* Chức vụ này sẽ hiển thị trang trọng trên thẻ thành viên và trang cơ cấu Ban Điều Hành CLB.</small>
        </div>

        <!-- Số điện thoại (Đã xóa Email trường) -->
        <div class="form-group">
          <label class="form-label">Số điện thoại</label>
          <input type="tel" id="mPhone" class="form-input" value="${m.phone || ''}" placeholder="0987.123.456">
        </div>

        <!-- Chọn ảnh & Sửa bố cục ảnh thủ công -->
        <div class="form-group mt-3" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
          <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
            <label class="form-label font-bold text-white mb-0" style="display:flex; align-items:center; gap:6px;">
              <span>📸</span> <span>Ảnh đại diện & Chỉnh sửa bố cục ảnh thủ công</span>
            </label>
            <span class="text-xs text-muted">Kéo thả ảnh hoặc dùng thanh trượt để căn khung thẻ</span>
          </div>

          <!-- Nút chọn file & Ô nhập URL -->
          <div class="d-flex gap-2 mb-3 flex-wrap align-center">
            <label class="btn btn-gold btn-sm" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin: 0;">
              <span>📁 Tải ảnh từ thiết bị</span>
              <input type="file" id="mAvatarFileInput" accept="image/*" style="display: none;">
            </label>
            <span class="text-xs text-muted">hoặc dán liên kết ảnh:</span>
            <input type="url" id="mAvatarUrlInput" class="form-input form-input-sm flex-1" style="min-width: 220px;" 
                   value="${m.avatar && !m.avatar.startsWith('data:') ? m.avatar : ''}" placeholder="https://images.unsplash.com/...">
          </div>

          <!-- Khung Studio chỉnh sửa bố cục -->
          <div style="background: radial-gradient(circle at 50% 50%, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%); border: 1.5px dashed rgba(212,175,55,0.4); border-radius: 12px; padding: 16px;">
            <div style="display: flex; gap: 20px; align-items: center; justify-content: center; flex-wrap: wrap;">
              
              <!-- Khung Canvas tương tác -->
              <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                <div id="avatarViewportFrame" style="position: relative; width: 190px; height: 190px; border-radius: 50%; overflow: hidden; border: 3px solid var(--border-gold); box-shadow: 0 4px 20px rgba(0,0,0,0.6); background: #0b1120; cursor: grab; user-select: none;">
                  <canvas id="avatarCropCanvas" width="300" height="300" style="width: 190px; height: 190px; display: block;"></canvas>
                  <div style="position: absolute; inset: 0; pointer-events: none; border: 1px dashed rgba(212,175,55,0.45); border-radius: 50%;"></div>
                  <span style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; background: rgba(0,0,0,0.7); color: #f8fafc; padding: 2px 8px; border-radius: 10px; pointer-events: none; white-space: nowrap;">👆 Kéo để di chuyển</span>
                </div>
                <span class="text-xs text-dim">Bố cục hiển thị trên thẻ</span>
              </div>

              <!-- Bảng điều khiển bố cục thủ công -->
              <div style="flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <div class="d-flex justify-between text-xs mb-1">
                    <span class="text-white font-medium">🔍 Thu phóng (Zoom):</span>
                    <span id="zoomValueLabel" class="text-gold font-mono font-bold">1.00x</span>
                  </div>
                  <input type="range" id="avatarZoomSlider" min="0.5" max="3" step="0.05" value="1" class="form-range" style="width: 100%; accent-color: var(--gold-color);">
                </div>

                <div>
                  <div class="d-flex justify-between text-xs mb-1">
                    <span class="text-white font-medium">↔️ Dịch chuyển ngang (Trục X):</span>
                    <span id="posXValueLabel" class="text-cyan font-mono font-bold">0px</span>
                  </div>
                  <input type="range" id="avatarPosXSlider" min="-150" max="150" step="1" value="0" class="form-range" style="width: 100%; accent-color: var(--cyan-color);">
                </div>

                <div>
                  <div class="d-flex justify-between text-xs mb-1">
                    <span class="text-white font-medium">↕️ Dịch chuyển dọc (Trục Y):</span>
                    <span id="posYValueLabel" class="text-cyan font-mono font-bold">0px</span>
                  </div>
                  <input type="range" id="avatarPosYSlider" min="-150" max="150" step="1" value="0" class="form-range" style="width: 100%; accent-color: var(--cyan-color);">
                </div>

                <div class="d-flex gap-2 pt-1">
                  <button type="button" id="btnFitAvatar" class="btn btn-outline btn-sm text-xs flex-1">📐 Căn vừa khung</button>
                  <button type="button" id="btnResetAvatarFraming" class="btn btn-outline btn-sm text-xs flex-1">🔄 Đặt lại bố cục</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </form>
    `;

    let finalAvatarExport = currentRawSrc;

    this.open(isEdit ? `Chỉnh sửa hồ sơ kỳ thủ: ${m.name}` : 'Thêm thành viên kỳ thủ mới', contentHtml, (modal) => {
      const name = modal.querySelector('#mName').value.trim();
      const studentId = modal.querySelector('#mStudentId').value.trim();
      if (!name || !studentId) {
        modalManager.showAlert('Vui lòng điền đủ Họ tên và MSSV!');
        return false;
      }

      const mClassVal = modal.querySelector('#mClass')?.value.trim() || '';
      if (!mClassVal) {
        modalManager.showAlert('Vui lòng nhập Lớp!');
        return false;
      }

      const dobVal = modal.querySelector('#mDob')?.value || '2005-01-01';
      const genderVal = modal.querySelector('#mGender')?.value || 'Nam';
      const facultyVal = modal.querySelector('#mFaculty')?.value.trim() || 'K22';
      const cohortVal = modal.querySelector('#mCohort')?.value.trim() || '2024 - 2028';
      const disciplineVal = m.discipline || 'Cả hai';
      const roleVal = modal.querySelector('#mRole')?.value || 'member';
      let roleTitleVal = 'Thành viên';
      if (roleVal === 'bdh') {
        const customTitle = modal.querySelector('#mBdhRoleTitle')?.value.trim();
        roleTitleVal = customTitle || 'Chủ nhiệm';
      }
      const phoneVal = modal.querySelector('#mPhone')?.value.trim() || '';

      const data = {
        name,
        studentId,
        gender: genderVal,
        dob: dobVal,
        university: m.university || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang',
        major: mClassVal,
        class: mClassVal,
        cohort: cohortVal,
        faculty: facultyVal,
        discipline: disciplineVal,
        role: roleVal,
        roleTitle: roleTitleVal,
        eloChess: m.eloChess || 1500,
        eloXiangqi: m.eloXiangqi || 1500,
        phone: phoneVal,
        email: m.email || '',
        avatar: finalAvatarExport || currentRawSrc
      };

      if (isEdit) {
        store.updateMember(m.id, data);
        modalManager.showAlert(`Đã cập nhật thành công hồ sơ kỳ thủ [${name}]!`);
      } else {
        store.addMember(data);
        modalManager.showAlert(`Đã thêm mới kỳ thủ [${name}] thành công!`);
      }
      return true;
    }, isEdit ? 'Cập nhật hồ sơ' : 'Thêm mới kỳ thủ');

    // Setup manual framing studio
    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      // Setup dynamic BĐH position box toggle & preset clicks
      const roleSelect = modalEl.querySelector('#mRole');
      const bdhContainer = modalEl.querySelector('#bdhRoleTitleContainer');
      const bdhInput = modalEl.querySelector('#mBdhRoleTitle');

      const updatePresetButtonsHighlight = (activeTitle) => {
        modalEl.querySelectorAll('.btn-preset-title').forEach((b) => {
          if (b.getAttribute('data-title') === activeTitle) {
            b.classList.remove('btn-outline');
            b.classList.add('btn-gold');
          } else {
            b.classList.remove('btn-gold');
            b.classList.add('btn-outline');
          }
        });
      };

      if (roleSelect && bdhContainer) {
        roleSelect.addEventListener('change', () => {
          if (roleSelect.value === 'bdh') {
            bdhContainer.style.display = 'block';
            if (bdhInput && (!bdhInput.value || bdhInput.value === 'Thành viên')) {
              bdhInput.value = 'Chủ nhiệm';
            }
            updatePresetButtonsHighlight(bdhInput ? bdhInput.value.trim() : 'Chủ nhiệm');
          } else {
            bdhContainer.style.display = 'none';
          }
        });
      }

      modalEl.querySelectorAll('.btn-preset-title').forEach((pBtn) => {
        pBtn.addEventListener('click', () => {
          sound.playClick();
          const title = pBtn.getAttribute('data-title');
          if (bdhInput && title) {
            bdhInput.value = title;
            updatePresetButtonsHighlight(title);
          }
        });
      });

      if (bdhInput) {
        bdhInput.addEventListener('input', () => {
          updatePresetButtonsHighlight(bdhInput.value.trim());
        });
      }

      const canvas = modalEl.querySelector('#avatarCropCanvas');
      const ctx = canvas ? canvas.getContext('2d') : null;
      const fileInput = modalEl.querySelector('#mAvatarFileInput');
      const urlInput = modalEl.querySelector('#mAvatarUrlInput');
      const zoomSlider = modalEl.querySelector('#avatarZoomSlider');
      const posXSlider = modalEl.querySelector('#avatarPosXSlider');
      const posYSlider = modalEl.querySelector('#avatarPosYSlider');
      const zoomLabel = modalEl.querySelector('#zoomValueLabel');
      const posXLabel = modalEl.querySelector('#posXValueLabel');
      const posYLabel = modalEl.querySelector('#posYValueLabel');
      const resetBtn = modalEl.querySelector('#btnResetAvatarFraming');
      const fitBtn = modalEl.querySelector('#btnFitAvatar');
      const viewport = modalEl.querySelector('#avatarViewportFrame');

      let img = new Image();
      img.crossOrigin = 'anonymous';
      let zoom = 1.0;
      let offsetX = 0;
      let offsetY = 0;
      let isDragging = false;
      let startDragX = 0;
      let startDragY = 0;

      const updateFinalExport = () => {
        try {
          if (canvas && img.complete && img.naturalWidth) {
            const expCanvas = document.createElement('canvas');
            expCanvas.width = 400;
            expCanvas.height = 400;
            const ectx = expCanvas.getContext('2d');
            const cw = 400;
            const ch = 400;
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const aspect = nw / nh;
            let baseW = aspect > 1 ? ch * aspect : cw;
            let baseH = aspect > 1 ? ch : cw / aspect;
            const scaleDpi = 400 / canvas.width;
            const drawW = baseW * zoom;
            const drawH = baseH * zoom;
            const drawX = (cw - drawW) / 2 + (offsetX * scaleDpi);
            const drawY = (ch - drawH) / 2 + (offsetY * scaleDpi);
            ectx.fillStyle = '#0f172a';
            ectx.fillRect(0, 0, cw, ch);
            ectx.drawImage(img, drawX, drawY, drawW, drawH);
            finalAvatarExport = expCanvas.toDataURL('image/jpeg', 0.92);
          }
        } catch (e) {
          finalAvatarExport = currentRawSrc;
        }
      };

      const draw = () => {
        if (!ctx || !img.complete || !img.naturalWidth) return;
        const cw = canvas.width;
        const ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, cw, ch);

        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const aspect = nw / nh;
        let baseW = aspect > 1 ? ch * aspect : cw;
        let baseH = aspect > 1 ? ch : cw / aspect;

        const drawW = baseW * zoom;
        const drawH = baseH * zoom;
        const drawX = (cw - drawW) / 2 + offsetX;
        const drawY = (ch - drawH) / 2 + offsetY;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        updateFinalExport();
      };

      const updateControls = () => {
        if (zoomSlider) zoomSlider.value = zoom;
        if (posXSlider) posXSlider.value = Math.round(offsetX);
        if (posYSlider) posYSlider.value = Math.round(offsetY);
        if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(2)}x`;
        if (posXLabel) posXLabel.textContent = `${Math.round(offsetX)}px`;
        if (posYLabel) posYLabel.textContent = `${Math.round(offsetY)}px`;
      };

      const loadSource = (src) => {
        currentRawSrc = src;
        finalAvatarExport = src;
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          zoom = 1.0;
          offsetX = 0;
          offsetY = 0;
          updateControls();
          draw();
        };
        img.onerror = () => {
          img = new Image();
          img.onload = () => {
            zoom = 1.0;
            offsetX = 0;
            offsetY = 0;
            updateControls();
            draw();
          };
          img.src = src;
        };
        img.src = src;
      };

      // Drag interaction
      if (viewport) {
        const onStart = (cx, cy) => {
          isDragging = true;
          startDragX = cx - offsetX;
          startDragY = cy - offsetY;
          viewport.style.cursor = 'grabbing';
        };
        const onMove = (cx, cy) => {
          if (!isDragging) return;
          offsetX = Math.max(-150, Math.min(150, cx - startDragX));
          offsetY = Math.max(-150, Math.min(150, cy - startDragY));
          updateControls();
          draw();
        };
        const onEnd = () => {
          if (isDragging) {
            isDragging = false;
            viewport.style.cursor = 'grab';
          }
        };

        viewport.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', onEnd);

        viewport.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
          if (isDragging && e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchend', onEnd);

        viewport.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.08 : -0.08;
          zoom = Math.max(0.5, Math.min(3.0, zoom + delta));
          updateControls();
          draw();
        }, { passive: false });
      }

      // Slider events
      zoomSlider?.addEventListener('input', (e) => {
        zoom = parseFloat(e.target.value);
        if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(2)}x`;
        draw();
      });
      posXSlider?.addEventListener('input', (e) => {
        offsetX = parseFloat(e.target.value);
        if (posXLabel) posXLabel.textContent = `${Math.round(offsetX)}px`;
        draw();
      });
      posYSlider?.addEventListener('input', (e) => {
        offsetY = parseFloat(e.target.value);
        if (posYLabel) posYLabel.textContent = `${Math.round(offsetY)}px`;
        draw();
      });
      resetBtn?.addEventListener('click', () => {
        zoom = 1.0;
        offsetX = 0;
        offsetY = 0;
        updateControls();
        draw();
      });
      fitBtn?.addEventListener('click', () => {
        zoom = 1.15;
        offsetX = 0;
        offsetY = 0;
        updateControls();
        draw();
      });

      // File input
      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            if (urlInput) urlInput.value = '';
            loadSource(re.target.result);
          };
          reader.readAsDataURL(file);
        }
      });

      // URL input
      urlInput?.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && (val.startsWith('http') || val.startsWith('data:'))) {
          loadSource(val);
        }
      });

      // Load initial image
      loadSource(currentRawSrc);
    }
  },

  // 2. Event Registration Modal
  openRegisterEventModal(event) {
    const activeMember = store.getActiveMember();
    if (!activeMember) {
      modalManager.showAlert('Bạn cần có tài khoản thành viên trong CLB để đăng ký tham gia sự kiện. Vui lòng vào Buồng Lái Quản Trị để thêm thành viên trước!');
      return;
    }

    const contentHtml = `
      <div class="event-reg-modal-content">
        <div class="reg-event-badge">ĐĂNG KÝ THAM GIA HOẠT ĐỘNG</div>
        <h3 class="reg-event-title">${event.title}</h3>
        <p class="text-muted text-sm mb-4">📍 ${event.location} • ⏰ ${event.dateTime}</p>

        <div class="reg-profile-preview">
          <img src="${activeMember.avatar}" alt="${activeMember.name}" class="reg-avatar">
          <div>
            <div class="font-bold">${activeMember.name} (${activeMember.id})</div>
            <div class="text-xs text-muted">MSSV: ${activeMember.studentId} • ${activeMember.class ? 'Lớp: ' + activeMember.class : activeMember.university}</div>
          </div>
        </div>

        <div class="form-group mt-3">
          <label class="form-label">Ghi chú cho Ban Tổ Chức (nếu có)</label>
          <textarea id="regNote" class="form-textarea" rows="2" placeholder="VD: Em đăng ký tham gia bảng Tân sinh viên..."></textarea>
        </div>
      </div>
    `;

    this.open(`Đăng ký giải: ${event.title}`, contentHtml, () => {
      const res = store.registerForEvent(event.id, activeMember.id);
      modalManager.showAlert(res.message);
      return true;
    }, 'Xác nhận đăng ký');
  },

  // 3. Feedback Collector Modal
  openFeedbackModal(event) {
    const activeMember = store.getActiveMember();
    const contentHtml = `
      <div class="feedback-modal-content">
        <p class="text-sm text-muted mb-3">
          Đóng góp ý kiến của bạn về sự kiện: <strong>${event.title}</strong> giúp CLB hoàn thiện khâu tổ chức tốt hơn!
        </p>
        <div class="form-group mb-3">
          <label class="form-label">Đánh giá chất lượng khâu tổ chức</label>
          <div class="rating-stars-input" id="starSelector">
            <span class="star-btn active" data-val="5">⭐⭐⭐⭐⭐ (Xuất sắc)</span>
          </div>
          <select id="fbRating" class="form-select mt-2">
            <option value="5">⭐⭐⭐⭐⭐ 5/5 - Rất hài lòng, giải đấu tuyệt vời</option>
            <option value="4">⭐⭐⭐⭐ 4/5 - Hài lòng, tổ chức chu đáo</option>
            <option value="3">⭐⭐⭐ 3/5 - Bình thường, cần cải thiện thêm</option>
            <option value="2">⭐⭐ 2/5 - Chưa hài lòng một số khâu</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nhận xét chi tiết - Góp ý cải tiến</label>
          <textarea id="fbComment" class="form-textarea" rows="4" required placeholder="Bàn cờ, trọng tài, thời gian thi đấu, điểm danh QR..."></textarea>
        </div>
      </div>
    `;

    this.open('Gửi phản hồi sự kiện', contentHtml, (modal) => {
      const comment = modal.querySelector('#fbComment').value.trim();
      const rating = modal.querySelector('#fbRating').value;
      if (!comment) {
        modalManager.showAlert('Vui lòng nhập nhận xét của bạn!');
        return false;
      }
      store.addEventFeedback(event.id, activeMember?.name || 'Kỳ thủ ẩn danh', rating, comment);
      modalManager.showAlert('Cảm ơn bạn! Phản hồi đã được chuyển thẳng tới Ban Điều Hành CLB.');
      return true;
    }, 'Gửi phản hồi');
  },

  // 3b. Event Evaluation & Member Scoring Modal
  openEventEvaluationModal(event, onComplete) {
    const state = store.getState();
    const members = state.members || [];
    if (members.length === 0) {
      modalManager.showAlert('Chưa có thành viên nào trong danh sách CLB để đánh giá hoặc trao giải!');
      return;
    }
    let isTournament = event.type === 'tournament' || event.type === 'Giải Đấu';

    // Find who checked in for this event
    const checkedInMemberIds = new Set(
      (state.attendanceLogs || [])
        .filter((log) => log.eventId === event.id && log.status === 'success')
        .map((log) => log.memberId)
    );

    // CHỈ ghi nhận và đánh giá những kỳ thủ ĐÃ quét mã QR điểm danh
    const attendedMembers = members.filter((m) => checkedInMemberIds.has(m.id));

    // Điểm đánh giá ban đầu: Mặc định 50% (Bình thường) cho người có mặt
    // BDH có toàn quyền chấm các mức:
    //   - 🌟 100%: Xuất sắc (đóng góp nổi bật, thành tích cao)
    //   - 🟢 75%: Năng nổ (nhiệt tình, giao lưu tốt)
    //   - 🟡 50%: Bình thường (mặc định cho người có mặt)
    //   - 🟠 30%: Chưa tích cực (đến muộn, bỏ về giữa chừng, ít năng nổ)
    const currentScores = {};
    attendedMembers.forEach((m) => {
      currentScores[m.id] = 50;
    });

    const checkedInCount = attendedMembers.length;

    // Track medal awards for tournaments (supports multiple medals per category, e.g. 2 gold, 4 silver, 5 bronze):
    const selectedMedals = { gold: [], silver: [], bronze: [] };

    const renderMedalList = (type, colorClass, borderColor, badgeIcon, badgeTitle) => {
      const list = selectedMedals[type] || [];
      return `
        <div style="background: rgba(0,0,0,0.25); border: 1px solid ${borderColor}; border-radius: 8px; padding: 10px; display: flex; flex-direction: column;">
          <div class="d-flex justify-between align-center mb-2">
            <label class="form-label ${colorClass} font-bold text-xs" style="margin-bottom:0;">
              ${badgeIcon} ${badgeTitle} <span class="badge" style="background:rgba(255,255,255,0.1); color:#fff; font-size:0.7rem; padding:1px 6px;">${list.length}</span>
            </label>
          </div>

          <div class="medal-tags-list" style="min-height: 40px; max-height: 85px; overflow-y: auto; margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;">
            ${list.length === 0 ? `
              <div class="text-xs text-muted" style="font-style: italic; padding: 8px 4px;">Chưa trao giải nào</div>
            ` : list.map((mId, index) => {
              const mem = members.find((m) => m.id === mId);
              return `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:4px 8px; background:rgba(255,255,255,0.06); border:1px solid ${borderColor}; border-radius:6px; font-size:0.75rem;">
                  <span class="text-white font-medium text-truncate" style="max-width: 170px;" title="${mem ? mem.name : mId}">
                    ${badgeIcon} <strong>${mem ? mem.name : mId}</strong> <span class="text-dim text-xs font-mono">(${mem ? (mem.studentId || mem.id) : mId})</span>
                  </span>
                  <button type="button" class="btn-remove-medal-item" data-type="${type}" data-index="${index}" style="background:none; border:none; color:#f87171; cursor:pointer; font-weight:bold; font-size:1.1rem; line-height:1; padding:0 3px;" title="Gỡ huy chương này">&times;</button>
                </div>
              `;
            }).join('')}
          </div>

          <div>
            <select class="form-select form-select-sm select-add-medal" data-type="${type}" style="background:#0b1329; color:#f8fafc; border-color:${borderColor}; font-size:0.76rem; width:100%;">
              <option value="">+ Chọn kỳ thủ nhận ${badgeIcon}...</option>
              ${attendedMembers.length > 0 
                ? attendedMembers.map((m) => `<option value="${m.id}">${m.name} (${m.studentId || m.id})</option>`).join('')
                : '<option value="" disabled>(Chưa có kỳ thủ nào quét mã điểm danh)</option>'
              }
            </select>
          </div>
        </div>
      `;
    };

    const renderMedalColumns = () => `
      ${renderMedalList('gold', 'text-gold', 'rgba(212,175,55,0.5)', '🥇', 'Huy Chương Vàng')}
      ${renderMedalList('silver', 'text-cyan', 'rgba(56,189,248,0.5)', '🥈', 'Huy Chương Bạc')}
      ${renderMedalList('bronze', 'text-rose', 'rgba(251,113,133,0.5)', '🥉', 'Huy Chương Đồng')}
    `;

    let searchQuery = '';

    const renderTableRows = () => {
      const filtered = attendedMembers.filter((m) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (m.name && m.name.toLowerCase().includes(q)) ||
                 (m.studentId && m.studentId.toLowerCase().includes(q)) ||
                 (m.id && m.id.toLowerCase().includes(q));
        }
        return true;
      });

      if (filtered.length === 0) {
        return `
          <tr>
            <td colspan="4" class="text-center text-muted p-4">
              ${attendedMembers.length === 0 
                ? '⚠️ Chưa có kỳ thủ nào quét mã điểm danh cho sự kiện này! Vui lòng dùng máy quét QR điểm danh trước khi kết thúc.' 
                : 'Không tìm thấy kỳ thủ phù hợp với từ khóa tìm kiếm.'}
            </td>
          </tr>
        `;
      }

      return filtered.map((m, idx) => {
        const score = currentScores[m.id] !== undefined ? currentScores[m.id] : 50;

        let medalBadge = '';
        if (isTournament) {
          const gCount = selectedMedals.gold.filter((id) => id === m.id).length;
          const sCount = selectedMedals.silver.filter((id) => id === m.id).length;
          const bCount = selectedMedals.bronze.filter((id) => id === m.id).length;

          const badges = [];
          if (gCount > 0) {
            badges.push(`<span class="badge badge-gold" style="font-size:0.72rem; padding: 2px 7px; font-weight:800; border-radius:4px;">🥇 ${gCount > 1 ? `${gCount}x ` : ''}HCV</span>`);
          }
          if (sCount > 0) {
            badges.push(`<span class="badge badge-cyan" style="font-size:0.72rem; padding: 2px 7px; font-weight:800; border-radius:4px;">🥈 ${sCount > 1 ? `${sCount}x ` : ''}HCB</span>`);
          }
          if (bCount > 0) {
            badges.push(`<span class="badge badge-rose" style="font-size:0.72rem; padding: 2px 7px; font-weight:800; border-radius:4px;">🥉 ${bCount > 1 ? `${bCount}x ` : ''}HCĐ</span>`);
          }
          medalBadge = badges.join(' ');
        }

        const log = (state.attendanceLogs || []).find((l) => l.eventId === event.id && l.memberId === m.id && l.status === 'success');
        const checkInTime = log && log.timestamp ? log.timestamp.split(' ')[1] : '';

        return `
          <tr data-member-id="${m.id}">
            <td style="width: 50px;" class="text-center font-mono text-dim font-bold">${idx + 1}</td>
            <td>
              <div class="member-cell">
                <img src="${m.avatar}" alt="${m.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                <div>
                  <div class="font-bold text-white text-sm d-flex align-center gap-1.5 flex-wrap">
                    <span>${m.name}</span>
                    ${medalBadge}
                  </div>
                  <div class="text-xs text-dim font-mono">${m.studentId || ''} • ${m.class || m.major || 'K22'}</div>
                </div>
              </div>
            </td>
            <td style="width: 150px; text-align: center;">
              <span class="badge badge-emerald" style="font-size:0.75rem;">🟢 Đã Quét QR ${checkInTime ? `<small>(${checkInTime})</small>` : ''}</span>
            </td>
            <td>
              <div class="eval-pill-group" data-member-id="${m.id}" style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="eval-pill ${score === 100 ? 'active' : ''}" data-score="100" title="Xuất sắc, đóng góp nổi bật hoặc đoạt giải">
                  🌟 100% Xuất Sắc
                </button>
                <button type="button" class="eval-pill ${score === 75 ? 'active' : ''}" data-score="75" title="Tham gia đầy đủ, nhiệt tình">
                  🟢 75% Năng Nổ
                </button>
                <button type="button" class="eval-pill ${score === 50 ? 'active' : ''}" data-score="50" title="Có mặt đầy đủ (Mặc định)">
                  🟡 50% Bình Thường
                </button>
                <button type="button" class="eval-pill ${score === 30 ? 'active' : ''}" data-score="30" title="Đến muộn, bỏ dở giữa chừng, ít tích cực">
                  🟠 30% Chưa Tích Cực
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    };

    const contentHtml = `
      <div class="eval-modal-content">
        <!-- Header Info Card -->
        <div class="mb-3 p-3" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.12) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1px solid var(--border-gold); border-radius: 12px;">
          <div class="d-flex justify-between align-center flex-wrap gap-2">
            <div>
              <div class="d-flex align-center gap-2 mb-1 flex-wrap">
                <span class="badge ${isTournament ? 'badge-gold' : 'badge-cyan'}" id="evalTypeBadge" style="font-size:0.75rem; font-weight:700;">
                  🏁 KẾT THÚC ${isTournament ? 'GIẢI ĐẤU & TRAO HUY CHƯƠNG' : 'HOẠT ĐỘNG & ĐÁNH GIÁ THÁI ĐỘ'}
                </span>
                <button type="button" class="btn btn-outline btn-xs" id="btnToggleEvalMode" style="font-size:0.72rem; padding:2px 10px; border-color:rgba(212,175,55,0.5); color:#facc15; font-weight:600;" title="Bấm để chuyển đổi giữa Giải Đấu và Hoạt Động Thường">
                  🔄 ${isTournament ? 'Đổi sang Hoạt Động Thường' : 'Đổi sang Giải Đấu (Mở Trao Huy Chương)'}
                </button>
              </div>
              <h3 class="font-bold text-white text-base mt-1 mb-0.5">${event.title}</h3>
              <p class="text-xs text-muted mb-0">📅 ${event.dateTime || 'Hôm nay'} • 📍 ${event.location || 'CLB Cờ TNU - HGC'}</p>
            </div>
            <div class="d-flex align-center gap-3">
              <div style="text-align: center; padding: 6px 18px; background: rgba(16,185,129,0.15); border-radius: 8px; border: 1.5px solid rgba(16,185,129,0.4);">
                <div class="text-xs text-muted">Đã Quét QR Điểm Danh</div>
                <div class="text-lg font-bold text-emerald">${attendedMembers.length} Kỳ thủ</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Trao Huy Chương Giải Đấu (Chỉ hiển thị cho Giải Đấu) -->
        <div id="evalMedalSectionWrapper" style="display: ${isTournament ? 'block' : 'none'};">
          <div class="card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 70%), linear-gradient(135deg, rgba(14,23,46,0.98) 0%, rgba(26,42,82,0.9) 100%); border: 1.5px solid var(--border-gold); border-radius: 12px;">
            <div class="d-flex justify-between align-center mb-2 flex-wrap gap-1">
              <span class="badge badge-gold" style="font-size:0.75rem; font-weight:800;">🏆 TRAO HUY CHƯƠNG GIẢI ĐẤU (TỰ ĐỘNG CỘNG VÀO HỒ SƠ KỲ THỦ)</span>
              <span class="text-xs text-dim">Trao không giới hạn số lượng (2 Vàng, 4 Bạc, 5 Đồng...)</span>
            </div>
            <div id="evalMedalColumnsGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
              ${renderMedalColumns()}
            </div>
          </div>
        </div>

        <!-- Section Title for Evaluation Table -->
        <div class="d-flex justify-between align-center mb-1.5 mt-2">
          <span class="text-xs font-bold text-gold uppercase" style="letter-spacing: 0.5px;">
            📋 BẢNG CHẤM ĐIỂM THÁI ĐỘ & TỶ LỆ TÍCH CỰC CHO NGƯỜI THAM GIA:
          </span>
          <span class="text-xs text-muted">
            (Bấm chọn mức % tương ứng cho từng kỳ thủ có mặt bên dưới)
          </span>
        </div>

        <!-- Quick Set Toolbar & Search -->
        <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2.5 p-2.5" style="background: rgba(15,23,42,0.6); border: 1px solid var(--border-subtle); border-radius: 8px;">
          <div class="d-flex align-center gap-2 flex-wrap">
            <span class="text-xs text-muted">Thao tác nhanh cho người có mặt:</span>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet50" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(234,179,8,0.4); color: #facc15;">
              🟡 Đặt lại 50% (Bình Thường)
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet75" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(16,185,129,0.4); color: #34d399;">
              🟢 Đặt tất cả 75% (Năng Nổ)
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet100" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(245,158,11,0.4); color: #fbbf24;">
              🌟 Đặt tất cả 100% (Xuất Sắc)
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet30" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(249,115,22,0.4); color: #fb923c;">
              🟠 Đặt tất cả 30% (Chưa Tích Cực)
            </button>
          </div>

          <div class="d-flex align-center gap-2 flex-wrap">
            <span class="badge badge-emerald font-bold" style="font-size:0.78rem; padding: 5px 12px;">
              🟢 Đã Quét QR: ${attendedMembers.length} Kỳ thủ
            </span>
            <input type="text" id="evalSearchInput" placeholder="Tìm tên/MSSV..." class="form-input form-input-sm" autocomplete="off" style="width: 150px; font-size:0.78rem; padding:4px 8px; background:#0b1329;">
          </div>
        </div>

        <!-- Scrollable Table with Guaranteed Height -->
        <div class="table-responsive" style="width: 100%; min-height: 250px; max-height: 400px; overflow-y: auto; border: 1.5px solid var(--border-subtle); border-radius: 8px; background: rgba(11,19,41,0.7); box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);">
          <table class="data-table" style="font-size: 0.84rem; width: 100%; margin-bottom: 0;">
            <thead>
              <tr style="position: sticky; top: 0; z-index: 5; background: #0f172a; border-bottom: 2px solid var(--border-subtle);">
                <th style="width: 50px; text-align: center;">STT</th>
                <th style="min-width: 180px;">Kỳ Thủ</th>
                <th style="width: 160px; text-align: center;">Trạng Thái</th>
                <th style="min-width: 380px;">Thái Độ Sinh Hoạt (BĐH Chấm Tỷ Lệ Tích Cực)</th>
              </tr>
            </thead>
            <tbody id="evalTableBody">
              ${renderTableRows()}
            </tbody>
          </table>
        </div>

        <!-- Note info below table -->
        <div class="mt-2 text-xs text-muted" style="line-height: 1.5;">
          💡 <em>Ghi chú: Danh sách chỉ ghi nhận những kỳ thủ đã quét mã QR điểm danh tham gia. Mặc định tính 50% (Bình thường), BĐH có thể nâng lên 75%, 100% hoặc hạ xuống 30% (Chưa tích cực). ${isTournament ? 'Kỳ thủ được trao huy chương sẽ tự động được ghi nhận 100% và cộng huy chương vào hồ sơ cá nhân.' : ''} Tỷ Lệ Tích Cực sẽ tự động cập nhật trên Bảng Xếp Hạng.</em>
        </div>
      </div>
    `;

    this.open(`Chấm Điểm & Kết Thúc: ${event.title}`, contentHtml, () => {
      const medalsToSave = isTournament ? selectedMedals : { gold: [], silver: [], bronze: [] };
      store.saveEventEvaluation(event.id, currentScores, medalsToSave);

      const totalMedals = (selectedMedals.gold.length || 0) + (selectedMedals.silver.length || 0) + (selectedMedals.bronze.length || 0);
      let alertMsg = `Đã lưu bảng đánh giá cho ${isTournament ? 'giải đấu' : 'hoạt động'} [${event.title}] thành công!\nTrạng thái hoạt động đã chuyển sang "ĐÃ KẾT THÚC" 🏁 và Tỷ lệ chuyên cần trên Bảng Xếp Hạng đã được tự động cập nhật!`;

      if (isTournament && totalMedals > 0) {
        alertMsg += `\n\n🏆 KẾT QUẢ TRAO HUY CHƯƠNG GIẢI ĐẤU (Tổng: ${totalMedals} huy chương):\n`;
        if (selectedMedals.gold.length > 0) {
          alertMsg += `🥇 ${selectedMedals.gold.length} Huy Chương Vàng:\n` +
            selectedMedals.gold.map((id) => {
              const m = members.find((x) => x.id === id);
              return `   • ${m ? m.name : id} (${m?.studentId || id})`;
            }).join('\n') + '\n';
        }
        if (selectedMedals.silver.length > 0) {
          alertMsg += `🥈 ${selectedMedals.silver.length} Huy Chương Bạc:\n` +
            selectedMedals.silver.map((id) => {
              const m = members.find((x) => x.id === id);
              return `   • ${m ? m.name : id} (${m?.studentId || id})`;
            }).join('\n') + '\n';
        }
        if (selectedMedals.bronze.length > 0) {
          alertMsg += `🥉 ${selectedMedals.bronze.length} Huy Chương Đồng:\n` +
            selectedMedals.bronze.map((id) => {
              const m = members.find((x) => x.id === id);
              return `   • ${m ? m.name : id} (${m?.studentId || id})`;
            }).join('\n') + '\n';
        }
        alertMsg += `\n✅ Toàn bộ huy chương đã được tự động cộng dồn vào hồ sơ cá nhân của các kỳ thủ!`;
      }

      modalManager.showAlert(alertMsg);
      if (onComplete) onComplete();
      return true;
    }, '💾 Lưu Đánh Giá & Hoàn Tất Kết Thúc');

    // Bind event handlers inside modal
    const modalEl = document.getElementById('globalAppModal');
    if (!modalEl) return;

    const tableBody = modalEl.querySelector('#evalTableBody');

    const bindPillClicks = () => {
      if (!tableBody) return;
      tableBody.querySelectorAll('.eval-pill').forEach((pill) => {
        pill.onclick = (e) => {
          e.preventDefault();
          sound.playClick();
          const group = pill.closest('.eval-pill-group');
          const memberId = group?.getAttribute('data-member-id');
          if (!memberId) return;
          const newScore = parseInt(pill.getAttribute('data-score'), 10);
          currentScores[memberId] = newScore;

          // Update active state in this group
          group.querySelectorAll('.eval-pill').forEach((p) => p.classList.remove('active'));
          pill.classList.add('active');
        };
      });
    };

    bindPillClicks();

    // Bind multi-medal selector events
    const bindMedalEvents = () => {
      const grid = modalEl.querySelector('#evalMedalColumnsGrid');
      if (!grid) return;

      // Add medal select change
      grid.querySelectorAll('.select-add-medal').forEach((sel) => {
        sel.onchange = () => {
          const type = sel.getAttribute('data-type');
          const mId = sel.value;
          if (!mId || !type) return;

          sound.playClick();
          selectedMedals[type].push(mId);
          currentScores[mId] = 100; // Tự động đạt 100% Xuất sắc

          grid.innerHTML = renderMedalColumns();
          bindMedalEvents();
          if (tableBody) tableBody.innerHTML = renderTableRows();
          bindPillClicks();
        };
      });

      // Remove medal button click
      grid.querySelectorAll('.btn-remove-medal-item').forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();
          sound.playClick();
          const type = btn.getAttribute('data-type');
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          if (type && !isNaN(idx) && selectedMedals[type]) {
            selectedMedals[type].splice(idx, 1);
            grid.innerHTML = renderMedalColumns();
            bindMedalEvents();
            if (tableBody) tableBody.innerHTML = renderTableRows();
            bindPillClicks();
          }
        };
      });
    };

    bindMedalEvents();

    // Mode toggle button (Giải đấu <-> Hoạt động thường)
    const toggleBtn = modalEl.querySelector('#btnToggleEvalMode');
    const medalWrap = modalEl.querySelector('#evalMedalSectionWrapper');
    const typeBadge = modalEl.querySelector('#evalTypeBadge');

    toggleBtn?.addEventListener('click', () => {
      sound.playClick();
      isTournament = !isTournament;
      event.type = isTournament ? 'tournament' : 'session';
      if (medalWrap) medalWrap.style.display = isTournament ? 'block' : 'none';
      if (typeBadge) {
        typeBadge.className = `badge ${isTournament ? 'badge-gold' : 'badge-cyan'}`;
        typeBadge.textContent = `🏁 KẾT THÚC ${isTournament ? 'GIẢI ĐẤU & TRAO HUY CHƯƠNG' : 'HOẠT ĐỘNG & ĐÁNH GIÁ THÁI ĐỘ'}`;
      }
      toggleBtn.textContent = `🔄 ${isTournament ? 'Đổi sang Hoạt Động Thường' : 'Đổi sang Giải Đấu (Mở Trao Huy Chương)'}`;
      if (tableBody) tableBody.innerHTML = renderTableRows();
      bindPillClicks();
    });

    // Quick set buttons
    modalEl.querySelector('#btnQuickSet50')?.addEventListener('click', () => {
      sound.playClick();
      attendedMembers.forEach((m) => {
        currentScores[m.id] = 50;
      });
      if (tableBody) tableBody.innerHTML = renderTableRows();
      bindPillClicks();
    });

    modalEl.querySelector('#btnQuickSet75')?.addEventListener('click', () => {
      sound.playClick();
      attendedMembers.forEach((m) => {
        currentScores[m.id] = 75;
      });
      if (tableBody) tableBody.innerHTML = renderTableRows();
      bindPillClicks();
    });

    modalEl.querySelector('#btnQuickSet100')?.addEventListener('click', () => {
      sound.playClick();
      attendedMembers.forEach((m) => {
        currentScores[m.id] = 100;
      });
      if (tableBody) tableBody.innerHTML = renderTableRows();
      bindPillClicks();
    });

    modalEl.querySelector('#btnQuickSet30')?.addEventListener('click', () => {
      sound.playClick();
      attendedMembers.forEach((m) => {
        currentScores[m.id] = 30;
      });
      if (tableBody) tableBody.innerHTML = renderTableRows();
      bindPillClicks();
    });

    // Search input
    modalEl.querySelector('#evalSearchInput')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (tableBody) tableBody.innerHTML = renderTableRows();
      bindPillClicks();
    });
  },

  // 4. CMS Rich Visual Editor Modal (Two-Part: Outer Card Preview & Inner Content + Photo Gallery)
  openCmsArticleModal(articleToEdit = null) {
    const isEdit = !!articleToEdit;
    const a = articleToEdit || {};
    let currentThumbnail = a.thumbnail || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80';
    let currentLayout = a.imageLayout || 'center';
    let galleryImages = Array.isArray(a.gallery) ? [...a.gallery] : [];

    const todayDate = new Date().toISOString().split('T')[0];

    const contentHtml = `
      <div class="cms-editor-modal-wrap">
        <!-- Two-Part Navigation Tabs -->
        <div class="cms-tabs-nav mb-3">
          <button type="button" class="cms-nav-tab-btn active" id="btnCmsTab1">
            <span class="tab-number">1</span>
            <span class="tab-label">
              <strong>Phần 1: Hiển thị bên ngoài</strong>
              <small class="text-muted d-block" style="font-size:11px;">Thẻ bài viết trang tin (như Ảnh 1)</small>
            </span>
          </button>
          <button type="button" class="cms-nav-tab-btn" id="btnCmsTab2">
            <span class="tab-number">2</span>
            <span class="tab-label">
              <strong>Phần 2: Nội dung bên trong & Thư viện ảnh</strong>
              <small class="text-muted d-block" style="font-size:11px;">Chi tiết bài viết & Album ảnh (như Ảnh 2)</small>
            </span>
            <span class="badge badge-gold ml-2" id="tabGalleryBadge" style="${galleryImages.length > 0 ? '' : 'display:none;'} font-size:10px;">
              ${galleryImages.length} ảnh
            </span>
          </button>
        </div>

        <!-- ========================================== -->
        <!-- PHẦN 1: THIẾT LẬP HIỂN THỊ BÊN NGOÀI (CARD) -->
        <!-- ========================================== -->
        <div id="cmsSectionPart1" class="cms-section-view animate-fadeIn">
          <div class="card p-3 mb-3" style="background:rgba(212,175,55,0.03); border:1px solid rgba(212,175,55,0.2);">
            <div class="d-flex align-center gap-2 mb-3">
              <span class="badge badge-gold">BƯỚC 1 / 2</span>
              <span class="text-xs text-dim">Nhập thông tin xuất hiện trên thẻ hiển thị ngoài trang chủ & mục Tin tức</span>
            </div>

            <!-- Tiêu đề & Chuyên mục -->
            <div class="form-row">
              <div class="form-group flex-2">
                <label class="form-label font-bold text-white">Tiêu đề bài viết *</label>
                <input type="text" id="artTitle" class="form-input" required value="${a.title || ''}" placeholder="Nhập tiêu đề hiển thị ngoài thẻ...">
              </div>
              <div class="form-group flex-1">
                <label class="form-label font-bold text-white">Chuyên mục * (Tự viết)</label>
                <input type="text" id="artCategory" class="form-input" value="${a.category || 'Tin hoạt động'}" placeholder="VD: Khai cuộc, Tin giải đấu...">
              </div>
            </div>

            <!-- Tóm tắt ngắn ngoài thẻ -->
            <div class="form-group mb-3">
              <label class="form-label font-bold text-white d-flex justify-between">
                <span>Đoạn mô tả / Tóm tắt ngắn ngoài thẻ *</span>
                <span class="text-xs text-muted">Hiển thị ở mặt thẻ bài viết như Ảnh 1</span>
              </label>
              <textarea id="artSummary" class="form-input" rows="2" style="resize:vertical;" placeholder="Viết 1-2 câu tóm tắt nội dung hấp dẫn để hiển thị ngoài thẻ...">${a.summary || ''}</textarea>
            </div>

            <!-- Ảnh bìa ngoài thẻ & Tác giả -->
            <div class="form-row">
              <div class="form-group flex-2">
                <label class="form-label font-bold text-white">Ảnh bìa thẻ bài viết *</label>
                <input type="file" id="artThumbnailFile" accept="image/*" style="display:none;">
                <div class="d-flex gap-2 align-center mb-2">
                  <button type="button" class="btn btn-gold btn-sm" id="btnChooseImage">
                    📁 Chọn tệp ảnh từ máy tính
                  </button>
                  <span id="fileNameDisplay" class="text-xs text-muted" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:210px;">
                    ${a.thumbnail ? 'Đang dùng ảnh hiện tại' : 'Chưa chọn file mới'}
                  </span>
                </div>
                <div id="imgPreviewWrapper" style="padding:4px; border-radius:8px; border:1px dashed rgba(212,175,55,0.3); background:rgba(0,0,0,0.3); height:110px; display:flex; justify-content:center; align-items:center; overflow:hidden;">
                  <img id="artThumbnailPreview" src="${currentThumbnail}" alt="Preview" style="height:100%; width:100%; object-fit:cover; border-radius:6px;">
                </div>
              </div>

              <div class="form-group flex-1">
                <label class="form-label font-bold text-white">Người viết</label>
                <input type="text" id="artAuthor" class="form-input" value="CLB Cờ TNU - HGC" readonly style="background:rgba(255,255,255,0.06); color:var(--gold-light); font-weight:700;">
              </div>
            </div>
          </div>

          <!-- Live Card Preview Matching Ảnh 1 -->
          <div class="p-3 mb-3 card" style="background:rgba(10,16,32,0.7); border:1px solid rgba(255,255,255,0.08);">
            <div class="d-flex justify-between align-center mb-2">
              <span class="text-xs text-gold font-bold">👁️ XEM TRƯỚC THẺ BÀI VIẾT (Sẽ hiển thị bên ngoài như Ảnh 1):</span>
              <span class="text-xs text-muted">Cập nhật trực tiếp</span>
            </div>
            <div class="article-card" style="max-width:380px; margin:0 auto; pointer-events:none; box-shadow:0 10px 30px rgba(0,0,0,0.6);">
              <div style="height:160px; overflow:hidden; position:relative;">
                <img id="prevCardThumb" src="${currentThumbnail}" alt="Card preview" class="article-thumb" style="width:100%; height:100%; object-fit:cover;">
                <span id="prevCardGalleryBadge" class="badge" style="position:absolute; bottom:8px; right:8px; background:rgba(10,16,32,0.85); backdrop-filter:blur(4px); font-size:0.7rem; border:1px solid rgba(212,175,55,0.35); color:var(--gold-light); ${galleryImages.length > 0 ? '' : 'display:none;'}">
                  📸 <span id="prevCardGalleryCount">${galleryImages.length}</span> ảnh
                </span>
              </div>
              <div class="article-content-body" style="padding:14px;">
                <div class="d-flex justify-between align-center mb-2">
                  <span class="badge badge-gold" id="prevCardCategory">${a.category || 'Tin hoạt động'}</span>
                  <span class="text-xs text-muted" id="prevCardDate">${todayDate}</span>
                </div>
                <h3 class="font-bold text-white text-sm mb-2" id="prevCardTitle" style="min-height:20px;">${a.title || 'Tiêu đề bài viết...'}</h3>
                <p class="text-xs text-muted flex-1" id="prevCardSummary" style="min-height:36px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${a.summary || 'Đoạn tóm tắt nội dung bài viết sẽ hiển thị ở đây...'}</p>
                <div class="d-flex justify-between align-center mt-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.06);">
                  <span class="text-xs text-dim">✍️ CLB Cờ TNU - HGC</span>
                  <span class="text-xs text-gold font-bold">Xem bài viết →</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Chuyển sang phần 2 -->
          <div class="d-flex justify-end">
            <button type="button" class="btn btn-gold btn-sm" id="btnGoToPart2">
              Tiếp tục: Soạn nội dung bên trong & Thư viện ảnh (Phần 2) ➔
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- PHẦN 2: NỘI DUNG CHI TIẾT BÊN TRONG & THƯ VIỆN ẢNH (MODAL)  -->
        <!-- ============================================================ -->
        <div id="cmsSectionPart2" class="cms-section-view animate-fadeIn" style="display:none;">
          <div class="card p-3 mb-3" style="background:rgba(212,175,55,0.03); border:1px solid rgba(212,175,55,0.2);">
            <div class="d-flex align-center justify-between flex-wrap gap-2 mb-2">
              <div class="d-flex align-center gap-2">
                <span class="badge badge-gold">BƯỚC 2 / 2</span>
                <span class="text-xs text-dim">Soạn thảo bài viết đầy đủ khi mở xem chi tiết (như Ảnh 2)</span>
              </div>
              <!-- Bố cục ảnh bìa -->
              <div class="d-flex align-center gap-2">
                <label class="text-xs text-muted mb-0 font-bold">Bố cục ảnh chính:</label>
                <select id="artImageLayout" class="form-select form-select-sm" style="width:190px;">
                  <option value="center" ${currentLayout === 'center' ? 'selected' : ''}>Căn giữa (Tiêu chuẩn)</option>
                  <option value="left" ${currentLayout === 'left' ? 'selected' : ''}>Căn trái (Chữ bao quanh)</option>
                  <option value="right" ${currentLayout === 'right' ? 'selected' : ''}>Căn phải (Chữ bao quanh)</option>
                  <option value="cover" ${currentLayout === 'cover' ? 'selected' : ''}>Toàn cảnh Banner (16:9)</option>
                </select>
              </div>
            </div>

            <!-- Rich WYSIWYG Toolbar -->
            <label class="form-label font-bold text-white mb-1">Nội dung chi tiết bài viết *</label>
            <div class="wysiwyg-toolbar">
              <button type="button" class="toolbar-btn" data-cmd="bold" title="In đậm (Bold)"><b>B</b></button>
              <button type="button" class="toolbar-btn" data-cmd="italic" title="In nghiêng (Italic)"><i>I</i></button>
              <button type="button" class="toolbar-btn" data-cmd="underline" title="Gạch chân (Underline)"><u>U</u></button>
              <span class="toolbar-divider"></span>
              <button type="button" class="toolbar-btn" data-cmd="formatBlock" data-val="h2" title="Tiêu đề H2">H2</button>
              <button type="button" class="toolbar-btn" data-cmd="formatBlock" data-val="h3" title="Tiêu đề H3">H3</button>
              <button type="button" class="toolbar-btn" data-cmd="insertUnorderedList" title="Danh sách chấm">• List</button>
              <button type="button" class="toolbar-btn" data-cmd="insertOrderedList" title="Danh sách số">1. List</button>
              <span class="toolbar-divider"></span>
              <button type="button" class="toolbar-btn" data-cmd="formatBlock" data-val="blockquote" title="Trích dẫn">" Quote</button>
            </div>

            <!-- Editable content container -->
            <div id="wysiwygContentArea" class="wysiwyg-editor-area" contenteditable="true" style="min-height:160px; max-height:260px;">
              ${a.content ? (a.content.includes('<') ? a.content : a.content.replace(/\n/g, '<br>')) : '<p>Viết nội dung bài viết chuyên môn hoặc thông báo giải đấu tại đây...</p>'}
            </div>
          </div>

          <!-- Thư viện ảnh bài viết (Multiple Photo Gallery) -->
          <div class="card p-3 mb-3" style="background:rgba(15,23,42,0.85); border:1px solid rgba(212,175,55,0.3);">
            <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2">
              <div>
                <h4 class="text-sm font-bold text-white d-flex align-center gap-2 mb-1">
                  <span class="text-gold">📸 Thư viện ảnh bài viết (Photo Gallery)</span>
                  <span class="badge badge-gold" id="galleryCountLabel">${galleryImages.length} ảnh</span>
                </h4>
                <p class="text-xs text-muted mb-0">Tải lên nhiều ảnh từ máy tính để làm album / bộ sưu tập ảnh cho bài viết</p>
              </div>
              <div class="d-flex gap-2">
                <input type="file" id="artGalleryFiles" multiple accept="image/*" style="display:none;">
                <button type="button" class="btn btn-gold btn-sm" id="btnAddGalleryImages">
                  ➕ Thêm nhiều ảnh vào thư viện
                </button>
                <button type="button" class="btn btn-danger btn-sm" id="btnClearGallery" style="${galleryImages.length > 0 ? '' : 'display:none;'}">
                  🗑️ Xóa hết ảnh
                </button>
              </div>
            </div>

            <!-- Gallery Upload Preview Grid -->
            <div id="galleryUploadGrid" class="cms-gallery-preview-grid">
              <!-- Rendered dynamically -->
            </div>
            <div id="galleryEmptyNotice" class="text-center py-3 text-xs text-muted" style="${galleryImages.length > 0 ? 'display:none;' : ''} border:1px dashed rgba(255,255,255,0.12); border-radius:8px;">
              Chưa có ảnh nào trong thư viện bài viết. Bấm nút <strong>"➕ Thêm nhiều ảnh vào thư viện"</strong> để tải ảnh lên.
            </div>
          </div>

          <!-- Nút quay lại phần 1 -->
          <div class="d-flex justify-between align-center">
            <button type="button" class="btn btn-outline btn-sm" id="btnBackToPart1">
              ⬅️ Quay lại Phần 1: Hiển thị bên ngoài
            </button>
            <span class="text-xs text-muted">Nhấn "Xuất bản bài viết" ở góc dưới để hoàn tất!</span>
          </div>
        </div>
      </div>
    `;

    this.open(isEdit ? 'Chỉnh sửa bài viết' : 'Biên tập bài viết mới (CMS)', contentHtml, (modal) => {
      const title = modal.querySelector('#artTitle').value.trim();
      const contentEl = modal.querySelector('#wysiwygContentArea');
      const content = contentEl.innerText.trim();

      if (!title) {
        modalManager.showAlert('Vui lòng nhập tiêu đề bài viết ở Phần 1!');
        const btnTab1 = modal.querySelector('#btnCmsTab1');
        if (btnTab1) btnTab1.click();
        modal.querySelector('#artTitle')?.focus();
        return false;
      }

      if (!content) {
        modalManager.showAlert('Vui lòng nhập nội dung chi tiết bài viết ở Phần 2!');
        const btnTab2 = modal.querySelector('#btnCmsTab2');
        if (btnTab2) btnTab2.click();
        contentEl?.focus();
        return false;
      }

      const summaryInput = modal.querySelector('#artSummary').value.trim();
      const summary = summaryInput || (content.length > 150 ? content.slice(0, 150) + '...' : content);

      const data = {
        title,
        category: modal.querySelector('#artCategory').value.trim() || 'Tin hoạt động',
        summary,
        author: 'CLB Cờ TNU - HGC',
        thumbnail: currentThumbnail,
        imageLayout: modal.querySelector('#artImageLayout').value,
        content: contentEl.innerHTML,
        gallery: galleryImages,
        status: 'published'
      };

      store.addArticle(data);
      modalManager.showAlert('Đã lưu và xuất bản bài viết thành công!');
      return true;
    }, 'Xuất bản bài viết');

    // Setup interactive handlers inside modal
    setTimeout(() => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;

      const btnTab1 = modalEl.querySelector('#btnCmsTab1');
      const btnTab2 = modalEl.querySelector('#btnCmsTab2');
      const secPart1 = modalEl.querySelector('#cmsSectionPart1');
      const secPart2 = modalEl.querySelector('#cmsSectionPart2');
      const btnGoTo2 = modalEl.querySelector('#btnGoToPart2');
      const btnBackTo1 = modalEl.querySelector('#btnBackToPart1');

      // Tab switching
      const switchTab = (tabIndex) => {
        sound.playClick();
        if (tabIndex === 1) {
          btnTab1.classList.add('active');
          btnTab2.classList.remove('active');
          secPart1.style.display = 'block';
          secPart2.style.display = 'none';
        } else {
          btnTab2.classList.add('active');
          btnTab1.classList.remove('active');
          secPart2.style.display = 'block';
          secPart1.style.display = 'none';
        }
      };

      if (btnTab1) btnTab1.onclick = () => switchTab(1);
      if (btnTab2) btnTab2.onclick = () => switchTab(2);
      if (btnGoTo2) btnGoTo2.onclick = () => switchTab(2);
      if (btnBackTo1) btnBackTo1.onclick = () => switchTab(1);

      // Live Card Preview Binding
      const titleInput = modalEl.querySelector('#artTitle');
      const catInput = modalEl.querySelector('#artCategory');
      const summInput = modalEl.querySelector('#artSummary');

      const prevTitle = modalEl.querySelector('#prevCardTitle');
      const prevCat = modalEl.querySelector('#prevCardCategory');
      const prevSumm = modalEl.querySelector('#prevCardSummary');
      const prevThumb = modalEl.querySelector('#prevCardThumb');
      const prevGalleryBadge = modalEl.querySelector('#prevCardGalleryBadge');
      const prevGalleryCount = modalEl.querySelector('#prevCardGalleryCount');

      const updateCardPreview = () => {
        if (prevTitle && titleInput) prevTitle.textContent = titleInput.value.trim() || 'Tiêu đề bài viết...';
        if (prevCat && catInput) prevCat.textContent = catInput.value.trim() || 'Tin hoạt động';
        if (prevSumm && summInput) prevSumm.textContent = summInput.value.trim() || 'Đoạn tóm tắt nội dung bài viết sẽ hiển thị ở đây...';
      };

      [titleInput, catInput, summInput].forEach((inp) => {
        if (inp) inp.addEventListener('input', updateCardPreview);
      });

      // Thumbnail file selection
      const btnChoose = modalEl.querySelector('#btnChooseImage');
      const thumbFileInput = modalEl.querySelector('#artThumbnailFile');
      const thumbPreviewImg = modalEl.querySelector('#artThumbnailPreview');
      const fileNameDisplay = modalEl.querySelector('#fileNameDisplay');

      if (btnChoose && thumbFileInput) {
        btnChoose.onclick = () => {
          sound.playClick();
          thumbFileInput.click();
        };
      }

      if (thumbFileInput) {
        thumbFileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              currentThumbnail = loadEvt.target.result;
              if (thumbPreviewImg) thumbPreviewImg.src = currentThumbnail;
              if (prevThumb) prevThumb.src = currentThumbnail;
              if (fileNameDisplay) fileNameDisplay.textContent = file.name;
            };
            reader.readAsDataURL(file);
          }
        });
      }

      // Gallery Multi-Image Uploading
      const btnAddGallery = modalEl.querySelector('#btnAddGalleryImages');
      const galleryFileInput = modalEl.querySelector('#artGalleryFiles');
      const galleryGrid = modalEl.querySelector('#galleryUploadGrid');
      const galleryEmptyNotice = modalEl.querySelector('#galleryEmptyNotice');
      const galleryCountLabel = modalEl.querySelector('#galleryCountLabel');
      const tabGalleryBadge = modalEl.querySelector('#tabGalleryBadge');
      const btnClearGallery = modalEl.querySelector('#btnClearGallery');

      const renderGalleryGrid = () => {
        if (!galleryGrid) return;
        const count = galleryImages.length;
        if (galleryCountLabel) galleryCountLabel.textContent = `${count} ảnh`;
        if (tabGalleryBadge) {
          tabGalleryBadge.textContent = `${count} ảnh`;
          tabGalleryBadge.style.display = count > 0 ? '' : 'none';
        }
        if (prevGalleryBadge && prevGalleryCount) {
          prevGalleryCount.textContent = count;
          prevGalleryBadge.style.display = count > 0 ? '' : 'none';
        }
        if (galleryEmptyNotice) galleryEmptyNotice.style.display = count > 0 ? 'none' : 'block';
        if (btnClearGallery) btnClearGallery.style.display = count > 0 ? 'inline-flex' : 'none';

        galleryGrid.innerHTML = galleryImages.map((img, idx) => `
          <div class="cms-gallery-thumb-card">
            <img src="${img}" alt="Ảnh ${idx + 1}">
            <span class="thumb-badge">#${idx + 1}</span>
            <button type="button" class="btn-remove-thumb" data-index="${idx}" title="Xóa ảnh này">&times;</button>
          </div>
        `).join('');

        // Bind delete buttons
        galleryGrid.querySelectorAll('.btn-remove-thumb').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            sound.playClick();
            const idx = parseInt(btn.getAttribute('data-index'), 10);
            galleryImages.splice(idx, 1);
            renderGalleryGrid();
          });
        });
      };

      if (btnAddGallery && galleryFileInput) {
        btnAddGallery.onclick = () => {
          sound.playClick();
          galleryFileInput.click();
        };
      }

      if (galleryFileInput) {
        galleryFileInput.addEventListener('change', (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          let loaded = 0;
          files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              galleryImages.push(loadEvt.target.result);
              loaded++;
              if (loaded === files.length) {
                renderGalleryGrid();
              }
            };
            reader.readAsDataURL(file);
          });
          galleryFileInput.value = '';
        });
      }

      if (btnClearGallery) {
        btnClearGallery.onclick = () => {
          modalManager.showConfirm(
            'Bạn có chắc chắn muốn xóa toàn bộ ảnh trong thư viện bài viết?',
            () => {
              sound.playClick();
              galleryImages = [];
              renderGalleryGrid();
            },
            null,
            { title: 'XÁC NHẬN XÓA TOÀN BỘ ẢNH', confirmText: '🗑️ Xóa toàn bộ ảnh', danger: true }
          );
        };
      }

      // Initial render if article already has gallery
      renderGalleryGrid();

      // WYSIWYG commands
      const buttons = modalEl.querySelectorAll('.toolbar-btn');
      buttons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          sound.playClick();
          const cmd = btn.getAttribute('data-cmd');
          const val = btn.getAttribute('data-val') || null;
          document.execCommand(cmd, false, val);
        });
      });
    }, 50);
  },

  // 5. Article Detail Viewer Modal (Matching Image 2 + Photo Gallery & Lightbox)
  openArticleDetailModal(article) {
    const authorName = article.author || 'CLB Cờ TNU - HGC';
    const layout = article.imageLayout || 'center';
    const gallery = Array.isArray(article.gallery) ? article.gallery : [];

    let imgStyle = 'max-height:360px; border-radius:12px; margin-bottom:16px; box-shadow:0 8px 24px rgba(0,0,0,0.4); transition:all 0.2s ease; cursor:zoom-in;';
    if (layout === 'left') {
      imgStyle += ' float:left; margin-right:20px; max-width:48%; object-fit:cover;';
    } else if (layout === 'right') {
      imgStyle += ' float:right; margin-left:20px; max-width:48%; object-fit:cover;';
    } else if (layout === 'cover') {
      imgStyle += ' width:100%; height:260px; object-fit:cover; display:block;';
    } else {
      // center
      imgStyle += ' display:block; margin-left:auto; margin-right:auto; max-width:100%; object-fit:contain;';
    }

    const contentHtml = `
      <div class="article-detail-modal">
        <div class="article-meta-row mb-3 d-flex justify-between align-center flex-wrap gap-2">
          <span class="badge badge-gold">${article.category}</span>
          <span class="text-muted text-xs">📅 ${article.publishDate} • ✍️ ${authorName}</span>
        </div>
        <div class="article-modal-img-container" style="overflow:hidden; margin-bottom:16px;">
          <img src="${article.thumbnail}" alt="${article.title}" class="article-modal-hero-img article-zoomable-img" style="${imgStyle}" title="Nhấn để xem phóng to">
        </div>
        <div class="article-modal-body mt-3" style="clear:both; line-height:1.75;">
          ${article.content.includes('<') ? article.content : `<p>${article.content.replace(/\n/g, '</p><p>')}</p>`}
        </div>

        ${gallery.length > 0 ? `
          <div class="article-gallery-section mt-4 pt-4" style="border-top:1px solid rgba(212,175,55,0.25);">
            <div class="d-flex justify-between align-center mb-3">
              <h4 class="text-sm font-bold text-white d-flex align-center gap-2 mb-0">
                <span class="text-gold">📸 Thư viện ảnh bài viết</span>
                <span class="badge badge-gold" style="font-size:0.7rem;">${gallery.length} ảnh</span>
              </h4>
              <span class="text-xs text-muted">Nhấn vào ảnh để xem phóng to</span>
            </div>
            <div class="article-gallery-grid">
              ${gallery.map((img, idx) => `
                <div class="gallery-photo-card article-zoomable-img" data-img="${img}" title="Xem ảnh ${idx + 1}">
                  <img src="${img}" alt="Ảnh ${idx + 1}" loading="lazy">
                  <div class="gallery-photo-overlay">
                    <span>🔍 Xem to</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.open(article.title, contentHtml, null);

    // Bind image zoom / lightbox click handlers
    setTimeout(() => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;

      const heroImg = modalEl.querySelector('.article-modal-hero-img');
      if (heroImg) {
        heroImg.onclick = () => this.openLightbox(article.thumbnail, article.title);
      }

      const galleryCards = modalEl.querySelectorAll('.gallery-photo-card');
      galleryCards.forEach((card) => {
        card.onclick = () => {
          const imgSrc = card.getAttribute('data-img');
          if (imgSrc) this.openLightbox(imgSrc, article.title);
        };
      });
    }, 50);
  },

  // 6. Fullscreen Image Lightbox
  openLightbox(imgSrc, title = '') {
    sound.playClick();
    let lb = document.getElementById('appLightboxBackdrop');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'appLightboxBackdrop';
      lb.className = 'app-lightbox-backdrop';
      document.body.appendChild(lb);
    }
    lb.innerHTML = `
      <div class="app-lightbox-content animate-scaleUp">
        <button type="button" class="app-lightbox-close" id="lightboxCloseBtn" title="Đóng">&times;</button>
        <img src="${imgSrc}" alt="${title}" class="app-lightbox-img">
      </div>
    `;
    lb.style.display = 'flex';

    const closeLb = () => {
      sound.playClick();
      lb.style.display = 'none';
    };

    lb.querySelector('#lightboxCloseBtn').onclick = closeLb;
    lb.onclick = (e) => {
      if (e.target === lb) closeLb();
    };
  },

  // 7. Add Alumni Board Member Modal
  // 7. Add / Edit Alumni Board Member Modal
  openAddAlumniBoardModal(itemToEdit = null) {
    const isEdit = !!itemToEdit;
    const m = itemToEdit || {};
    const contentHtml = `
      <form id="alumniBoardForm" class="app-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Họ và tên *</label>
            <input type="text" id="abName" class="form-input" required placeholder="Nguyễn Văn A" value="${m.name || ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Nhiệm kỳ *</label>
            <input type="text" id="abTerm" class="form-input" required placeholder="Nhiệm kỳ 2024 - 2025" value="${m.term || 'Nhiệm kỳ 2024 - 2025'}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Chức vụ tiền nhiệm *</label>
            <input type="text" id="abRoleTitle" class="form-input" required placeholder="Cựu Chủ nhiệm CLB / Cựu Phó Chủ nhiệm" value="${m.roleTitle || ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Khóa / Lớp / Chuyên ngành</label>
            <input type="text" id="abMajor" class="form-input" placeholder="Công nghệ Thông tin K55" value="${m.major || 'K55'}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Bộ môn cờ thế mạnh</label>
            <select id="abDiscipline" class="form-select">
              <option value="Cả hai" ${m.discipline === 'Cả hai' ? 'selected' : ''}>Cả hai môn (Cờ vua & Cờ tướng)</option>
              <option value="Cờ vua" ${m.discipline === 'Cờ vua' ? 'selected' : ''}>Cờ vua</option>
              <option value="Cờ tướng" ${m.discipline === 'Cờ tướng' ? 'selected' : ''}>Cờ tướng</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Danh hiệu / Thành tựu nổi bật</label>
            <input type="text" id="abAchievement" class="form-input" placeholder="VD: Kiện tướng Cờ vua, Gắn bó 3 năm" value="${m.achievement || ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Lời nhắn nhủ cho thế hệ kế tiếp</label>
          <textarea id="abMessage" class="form-textarea" rows="2" placeholder="Chúc CLB luôn giữ vững ngọn lửa đam mê, đoàn kết và ngày càng phát triển!">${m.message || m.bio || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Link ảnh đại diện (Tùy chọn)</label>
          <input type="url" id="abAvatar" class="form-input" placeholder="https://images.unsplash.com/photo-..." value="${m.avatar || ''}">
        </div>
      </form>
    `;

    this.open(isEdit ? `Chỉnh Sửa Cựu BĐH: ${m.name}` : 'Thêm Cựu Ban Điều Hành Mới', contentHtml, (modal) => {
      const name = modal.querySelector('#abName').value.trim();
      const roleTitle = modal.querySelector('#abRoleTitle').value.trim();
      if (!name || !roleTitle) {
        modalManager.showAlert('Vui lòng điền đủ Họ tên và Chức vụ tiền nhiệm!');
        return false;
      }

      const payload = {
        name,
        roleTitle,
        term: modal.querySelector('#abTerm').value.trim() || 'Nhiệm kỳ 2024 - 2025',
        major: modal.querySelector('#abMajor').value.trim() || 'K55',
        discipline: modal.querySelector('#abDiscipline').value,
        achievement: modal.querySelector('#abAchievement').value.trim() || 'Đóng góp tích cực cho phong trào cờ',
        message: modal.querySelector('#abMessage').value.trim() || 'Chúc CLB ngày càng lớn mạnh!',
        bio: modal.querySelector('#abAchievement').value.trim() || 'Đóng góp tích cực cho phong trào cờ',
        avatar: modal.querySelector('#abAvatar').value.trim()
      };

      if (isEdit) {
        store.updateAlumniBoard(m.id, payload);
        modalManager.showAlert(`Đã cập nhật thông tin Cựu BĐH [${name}] thành công!`);
      } else {
        store.addAlumniBoard(payload);
        modalManager.showAlert(`Đã thêm Cựu BĐH [${name}] vào danh sách thành công!`);
      }
      return true;
    }, isEdit ? 'Lưu Thay Đổi' : 'Thêm Cựu Ban Điều Hành');
  },

  // 8. Add / Edit Alumni Member Modal
  openAddAlumniMemberModal(itemToEdit = null) {
    const isEdit = !!itemToEdit;
    const m = itemToEdit || {};
    const contentHtml = `
      <form id="alumniMemberForm" class="app-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Họ và tên cựu thành viên *</label>
            <input type="text" id="amName" class="form-input" required placeholder="Nguyễn Văn B" value="${m.name || ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Niên khóa / Khóa tốt nghiệp *</label>
            <input type="text" id="amGraduationYear" class="form-input" required placeholder="Khóa 2021 - 2025" value="${m.graduationYear || 'Khóa 2021 - 2025'}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Lớp / Chuyên ngành</label>
            <input type="text" id="amMajor" class="form-input" placeholder="Sư phạm Toán học K53" value="${m.major || 'K53'}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Danh hiệu vinh danh</label>
            <input type="text" id="amBadge" class="form-input" placeholder="Kiện Tướng Vinh Danh" value="${m.badge || 'Kiện Tướng Vinh Danh'}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Huy chương Vàng</label>
            <input type="number" id="amGold" class="form-input" min="0" value="${m.goldMedals ?? 0}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Huy chương Bạc</label>
            <input type="number" id="amSilver" class="form-input" min="0" value="${m.silverMedals ?? 0}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Huy chương Đồng</label>
            <input type="number" id="amBronze" class="form-input" min="0" value="${m.bronzeMedals ?? 0}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Đóng góp / Thành tích nổi bật</label>
          <textarea id="amBio" class="form-textarea" rows="2" placeholder="Đóng góp tích cực cho phong trào cờ Phân hiệu.">${m.bio || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Link ảnh đại diện (Tùy chọn)</label>
          <input type="url" id="amAvatar" class="form-input" placeholder="https://images.unsplash.com/photo-..." value="${m.avatar || ''}">
        </div>
      </form>
    `;

    this.open(isEdit ? `Chỉnh Sửa Cựu Thành Viên: ${m.name}` : 'Thêm Cựu Thành Viên Mới', contentHtml, (modal) => {
      const name = modal.querySelector('#amName').value.trim();
      if (!name) {
        modalManager.showAlert('Vui lòng điền Họ tên cựu thành viên!');
        return false;
      }

      const payload = {
        name,
        graduationYear: modal.querySelector('#amGraduationYear').value.trim() || 'Khóa 2021 - 2025',
        major: modal.querySelector('#amMajor').value.trim() || 'K53',
        badge: modal.querySelector('#amBadge').value.trim() || 'Kiện Tướng Vinh Danh',
        goldMedals: parseInt(modal.querySelector('#amGold').value) || 0,
        silverMedals: parseInt(modal.querySelector('#amSilver').value) || 0,
        bronzeMedals: parseInt(modal.querySelector('#amBronze').value) || 0,
        bio: modal.querySelector('#amBio').value.trim() || 'Đóng góp tích cực cho phong trào cờ Phân hiệu.',
        avatar: modal.querySelector('#amAvatar').value.trim()
      };

      if (isEdit) {
        store.updateAlumniMember(m.id, payload);
        modalManager.showAlert(`Đã cập nhật thông tin Cựu thành viên [${name}] thành công!`);
      } else {
        store.addAlumniMember(payload);
        modalManager.showAlert(`Đã thêm Cựu thành viên [${name}] vào danh sách tri ân thành công!`);
      }
      return true;
    }, isEdit ? 'Lưu Thay Đổi' : 'Thêm Cựu Thành Viên');
  },

  // 8a. Ghi danh Cựu Ban Điều Hành từ thành viên đang sinh hoạt (Vẫn giữ lại sinh hoạt)
  openRecordToAlumniBoardModal(member, onComplete) {
    const contentHtml = `
      <form id="recordAlumniBoardForm" class="app-form">
        <div class="p-3 mb-3" style="background: rgba(212,175,55,0.1); border: 1px solid var(--border-gold); border-radius: 10px;">
          <div class="d-flex align-center gap-3">
            <img src="${member.avatar}" alt="${member.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold-primary);">
            <div>
              <div class="font-bold text-white text-base">${member.name}</div>
              <div class="text-xs text-dim">${member.studentId} • ${member.class || member.major || 'K22'}</div>
              <div class="text-xs text-gold font-medium mt-0.5">Vai trò hiện tại: ${member.roleTitle || 'Thành viên BĐH'}</div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Nhiệm kỳ đã điều hành *</label>
            <input type="text" id="rabTerm" class="form-input" required placeholder="Nhiệm kỳ 2024 - 2025" value="Nhiệm kỳ 2024 - 2025">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Chức vụ tiền nhiệm ghi danh *</label>
            <input type="text" id="rabRoleTitle" class="form-input" required placeholder="Cựu Chủ nhiệm CLB / Cựu Phó Chủ nhiệm" value="${member.roleTitle && member.roleTitle !== 'Hội viên' ? 'Cựu ' + member.roleTitle : 'Cựu Thành viên Ban Điều Hành'}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Thành tựu & Đóng góp nổi bật trong nhiệm kỳ</label>
          <input type="text" id="rabAchievement" class="form-input" placeholder="VD: Dẫn dắt CLB đoạt giải Nhì Cờ vua sinh viên, chuẩn hóa điều lệ..." value="${member.badge ? member.badge + ' - Đóng góp tích cực xây dựng CLB' : 'Đóng góp tích cực cho phong trào cờ'}">
        </div>

        <div class="form-group">
          <label class="form-label">Lời nhắn nhủ cho thế hệ kế tiếp <span class="text-xs text-muted font-normal">(để trống sẽ tự động chọn câu chúc ý nghĩa)</span></label>
          <textarea id="rabMessage" class="form-textarea" rows="2" placeholder="Tự động gán câu truyền lửa nếu để trống..."></textarea>
        </div>

        <div class="p-2.5 text-xs text-muted" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; line-height: 1.5;">
          ✅ <strong>Lưu ý:</strong> Kỳ thủ <strong>${member.name}</strong> sẽ được vinh danh trên trang <em>Cựu Ban Điều Hành</em> và <strong>VẪN TIẾP TỤC NẰM TRONG DANH SÁCH THÀNH VIÊN</strong> để tham gia sinh hoạt, giao lưu và thi đấu bình thường.
        </div>
      </form>
    `;

    this.open(`Ghi Danh Cựu BĐH: ${member.name}`, contentHtml, (modal) => {
      const term = modal.querySelector('#rabTerm').value.trim();
      const roleTitle = modal.querySelector('#rabRoleTitle').value.trim();
      if (!term || !roleTitle) {
        modalManager.showAlert('Vui lòng điền đủ Nhiệm kỳ và Chức vụ tiền nhiệm!');
        return false;
      }

      store.recordMemberToAlumniBoard(member.id, {
        term,
        roleTitle,
        achievement: modal.querySelector('#rabAchievement').value.trim() || 'Đóng góp tích cực cho phong trào cờ',
        message: modal.querySelector('#rabMessage').value.trim() || 'Chúc CLB ngày càng lớn mạnh!'
      });

      modalManager.showAlert(`Đã ghi danh kỳ thủ [${member.name}] vào Cựu Ban Điều Hành thành công!\nKỳ thủ vẫn giữ nguyên tên trong danh sách sinh hoạt CLB.`);
      onComplete && onComplete();
      return true;
    }, '🏛️ Xác Nhận Ghi Danh Cựu BĐH');
  },

  // 8b. Chuyển tốt nghiệp sang Cựu Thành Viên (LOẠI BỎ KHỎI DANH SÁCH SINH HOẠT)
  openGraduateToAlumniMemberModal(member, onComplete) {
    const gold = member.goldMedals || 0;
    const silver = member.silverMedals || 0;
    const bronze = member.bronzeMedals || 0;
    const cohortStr = member.studentId && member.studentId.length >= 5
      ? `Khóa 20${member.studentId.slice(3, 5)} - 20${parseInt(member.studentId.slice(3, 5)) + 4}`
      : 'Khóa 2021 - 2025';

    const contentHtml = `
      <form id="graduateAlumniForm" class="app-form">
        <div class="p-3 mb-3" style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 10px;">
          <div class="d-flex align-center gap-3">
            <img src="${member.avatar}" alt="${member.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;">
            <div>
              <div class="font-bold text-white text-base">${member.name}</div>
              <div class="text-xs text-dim">${member.studentId} • ${member.class || member.major || 'K22'}</div>
              <div class="d-flex gap-2 mt-1">
                <span class="badge badge-gold" style="font-size:0.72rem;">🥇 ${gold} HCV</span>
                <span class="badge badge-cyan" style="font-size:0.72rem;">🥈 ${silver} HCB</span>
                <span class="badge badge-rose" style="font-size:0.72rem;">🥉 ${bronze} HCĐ</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Niên khóa tốt nghiệp *</label>
            <input type="text" id="gamGraduationYear" class="form-input" required placeholder="Khóa 2021 - 2025" value="${cohortStr}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Danh hiệu vinh danh</label>
            <input type="text" id="gamBadge" class="form-input" placeholder="Kiện Tướng Vinh Danh" value="${member.badge || 'Kiện Tướng Tri Ân'}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Đóng góp / Dấu ấn nổi bật trong quá trình sinh hoạt</label>
          <textarea id="gamBio" class="form-textarea" rows="2" placeholder="Đóng góp tích cực cho phong trào cờ Phân hiệu trong suốt những năm đại học.">${member.bio || 'Đóng góp tích cực cho phong trào cờ Phân hiệu trong suốt những năm đại học.'}</textarea>
        </div>

        <div class="p-3 text-xs" style="background: rgba(239,68,68,0.12); border: 1.5px solid rgba(239,68,68,0.4); border-radius: 8px; color: #fca5a5; line-height: 1.5;">
          ⚠️ <strong>LƯU Ý QUAN TRỌNG:</strong> Khi xác nhận tốt nghiệp, kỳ thủ <strong>${member.name}</strong> sẽ được chuyển trang trọng sang <em>Không Gian Tri Ân Cựu Thành Viên</em> và sẽ <strong>KHÔNG CÒN XUẤT HIỆN TRONG DANH SÁCH SINH HOẠT</strong> hay bảng xếp hạng thi đua hiện tại của CLB!
        </div>
      </form>
    `;

    this.open(`Công Nhận Tốt Nghiệp: ${member.name}`, contentHtml, (modal) => {
      const graduationYear = modal.querySelector('#gamGraduationYear').value.trim();
      if (!graduationYear) {
        modalManager.showAlert('Vui lòng điền Niên khóa tốt nghiệp!');
        return false;
      }

      store.graduateMemberToAlumni(member.id, {
        graduationYear,
        badge: modal.querySelector('#gamBadge').value.trim() || 'Kiện Tướng Tri Ân',
        bio: modal.querySelector('#gamBio').value.trim() || 'Đóng góp tích cực cho phong trào cờ Phân hiệu.'
      });

      modalManager.showAlert(`Đã công nhận tốt nghiệp cho kỳ thủ [${member.name}] thành công!\nHồ sơ đã được lưu giữ vào Không Gian Tri Ân Cựu Thành Viên và chuyển ra khỏi danh sách sinh hoạt thường niên.`);
      onComplete && onComplete();
      return true;
    }, '🎓 Xác Nhận Tốt Nghiệp & Tri Ân');
  },

  // Helper verify DOB as password for members
  verifyMemberDobPassword(inputPass, member) {
    if (!inputPass || !member) return false;
    const cleanInput = inputPass.trim().replace(/\s+/g, '');
    
    // Custom password override if set
    if (member.password && cleanInput === String(member.password).trim()) {
      return true;
    }

    if (!member.dob) {
      return true;
    }

    const rawDob = String(member.dob).trim();
    let y = '', m = '', d = '';

    if (rawDob.includes('-')) {
      const parts = rawDob.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          y = parts[0];
          m = parts[1].padStart(2, '0');
          d = parts[2].padStart(2, '0');
        } else {
          d = parts[0].padStart(2, '0');
          m = parts[1].padStart(2, '0');
          y = parts[2];
        }
      }
    } else if (rawDob.includes('/')) {
      const parts = rawDob.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          d = parts[0].padStart(2, '0');
          m = parts[1].padStart(2, '0');
          y = parts[2];
        } else {
          y = parts[0];
          m = parts[1].padStart(2, '0');
          d = parts[2].padStart(2, '0');
        }
      }
    } else if (/^\d{8}$/.test(rawDob)) {
      if (parseInt(rawDob.slice(0, 4), 10) > 1900) {
        y = rawDob.slice(0, 4);
        m = rawDob.slice(4, 6);
        d = rawDob.slice(6, 8);
      } else {
        d = rawDob.slice(0, 2);
        m = rawDob.slice(2, 4);
        y = rawDob.slice(4, 8);
      }
    }

    if (y && m && d) {
      const dNum = parseInt(d, 10);
      const mNum = parseInt(m, 10);

      const validList = [
        `${d}${m}${y}`,              // 23102007
        `${d}/${m}/${y}`,            // 23/10/2007
        `${d}-${m}-${y}`,            // 23-10-2007
        `${d}.${m}.${y}`,            // 23.10.2007
        `${y}-${m}-${d}`,            // 2007-10-23
        `${y}/${m}/${d}`,            // 2007/10/23
        `${y}${m}${d}`,              // 20071023
        `${dNum}${mNum}${y}`,        // without leading zero
        `${dNum}/${mNum}/${y}`,
        `${dNum}-${mNum}-${y}`,
        `${dNum}.${mNum}.${y}`
      ];

      if (validList.includes(cleanInput)) return true;

      // Also compare bare digits
      const inputDigits = cleanInput.replace(/\D/g, '');
      const dobDigitsDMY = `${d}${m}${y}`;
      const dobDigitsYMD = `${y}${m}${d}`;
      if (inputDigits === dobDigitsDMY || inputDigits === dobDigitsYMD) return true;
    } else {
      const cleanRaw = rawDob.replace(/\s+/g, '');
      if (cleanInput === cleanRaw) return true;
      if (cleanInput.replace(/\D/g, '') === cleanRaw.replace(/\D/g, '')) return true;
    }

    return false;
  },

  // 9. Login Modal (Member / Admin)
  openLoginModal(defaultTab = 'member') {
    const state = store.getState();
    const members = state.members || [];

    const contentHtml = `
      <div class="login-modal-wrap" style="padding: 6px 2px;">
        <div class="d-flex gap-2 mb-4" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
          <button type="button" class="btn btn-sm ${defaultTab === 'member' ? 'btn-gold' : 'btn-outline'}" id="tabLoginMember" style="flex: 1; font-weight: 600; padding: 8px 12px;">
            💳 Thành Viên CLB
          </button>
          <button type="button" class="btn btn-sm ${defaultTab === 'admin' ? 'btn-gold' : 'btn-outline'}" id="tabLoginAdmin" style="flex: 1; font-weight: 600; padding: 8px 12px;">
            👑 Quản Trị Viên (Admin)
          </button>
        </div>

        <!-- Tab 1: Member Login -->
        <div id="loginMemberSection" style="display: ${defaultTab === 'member' ? 'block' : 'none'};">
          <div class="form-group mb-3">
            <label class="form-label" for="loginMemberInput">Mã Thẻ hoặc MSSV:</label>
            <input type="text" id="loginMemberInput" class="form-input" placeholder="Nhập Mã thẻ hoặc MSSV..." value="" autocomplete="username">
          </div>

          <div class="form-group mb-4">
            <label class="form-label" for="loginMemberPass">Mật khẩu (Ngày tháng năm sinh):</label>
            <input type="password" id="loginMemberPass" class="form-input" placeholder="Nhập ngày tháng năm sinh (VD: 23102007)..." value="" autocomplete="current-password">
          </div>

          <button type="button" class="btn btn-gold btn-md" id="btnSubmitMemberLogin" style="width: 100%; font-weight: 700; padding: 11px;">
            Đăng Nhập Thành Viên
          </button>

          <div class="text-center mt-3 text-xs text-muted">
            Chưa có thẻ thành viên? 
            <a href="#" id="linkOpenRegisterFromLogin" class="text-gold font-bold" style="text-decoration: underline;">Đăng ký tham gia CLB ngay</a>
          </div>
        </div>

        <!-- Tab 2: Admin Login -->
        <div id="loginAdminSection" style="display: ${defaultTab === 'admin' ? 'block' : 'none'};">
          <div class="form-group mb-3">
            <label class="form-label">Tài khoản Quản trị viên:</label>
            <input type="text" id="loginAdminUser" class="form-input" placeholder="admin" value="admin">
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Mật khẩu Quản trị viên:</label>
            <input type="password" id="loginAdminPass" class="form-input" placeholder="Nhập mật khẩu quản trị..." value="">
          </div>
          <button type="button" class="btn btn-gold btn-md" id="btnSubmitAdminLogin" style="width: 100%; font-weight: 700; padding: 10px;">
            Đăng Nhập Quản Trị Hệ Thống
          </button>
        </div>
      </div>
    `;

    this.open('Đăng Nhập Hệ Thống CLB', contentHtml, null, null);

    setTimeout(() => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;

      const tabMember = modalEl.querySelector('#tabLoginMember');
      const tabAdmin = modalEl.querySelector('#tabLoginAdmin');
      const secMember = modalEl.querySelector('#loginMemberSection');
      const secAdmin = modalEl.querySelector('#loginAdminSection');
      const memberSelect = modalEl.querySelector('#loginMemberSelect');
      const memberInput = modalEl.querySelector('#loginMemberInput');
      const memberPassInput = modalEl.querySelector('#loginMemberPass');
      const adminPassInput = modalEl.querySelector('#loginAdminPass');

      if (memberSelect && memberInput) {
        memberSelect.onchange = () => {
          memberInput.value = memberSelect.value;
          if (memberPassInput) {
            memberPassInput.value = '';
            memberPassInput.focus();
          }
        };
      }

      if (tabMember && tabAdmin) {
        tabMember.onclick = () => {
          sound.playClick();
          tabMember.className = 'btn btn-sm btn-gold';
          tabAdmin.className = 'btn btn-sm btn-outline';
          secMember.style.display = 'block';
          secAdmin.style.display = 'none';
        };
        tabAdmin.onclick = () => {
          sound.playClick();
          tabAdmin.className = 'btn btn-sm btn-gold';
          tabMember.className = 'btn btn-sm btn-outline';
          secAdmin.style.display = 'block';
          secMember.style.display = 'none';
        };
      }

      const linkReg = modalEl.querySelector('#linkOpenRegisterFromLogin');
      if (linkReg) {
        linkReg.onclick = (e) => {
          e.preventDefault();
          this.close();
          this.openClubRegistrationModal();
        };
      }

      const btnSubMember = modalEl.querySelector('#btnSubmitMemberLogin');
      if (btnSubMember) {
        btnSubMember.onclick = () => {
          sound.playClick();
          const rawInput = (memberInput ? memberInput.value : '').trim();
          if (!rawInput) {
            modalManager.showAlert('Vui lòng nhập Mã thẻ CLB hoặc Mã số sinh viên (MSSV)!');
            memberInput && memberInput.focus();
            return;
          }

          // Smart dual lookup: accepts either Member Card ID or Student ID (MSSV)
          const found = store.getMemberById(rawInput);

          if (!found) {
            modalManager.showAlert('Không tìm thấy kỳ thủ với Mã thẻ hoặc MSSV này! Vui lòng kiểm tra lại thông tin.');
            memberInput && memberInput.focus();
            return;
          }

          const inputPass = (memberPassInput ? memberPassInput.value : '').trim();
          if (!inputPass) {
            modalManager.showAlert('Vui lòng nhập Mật khẩu (Ngày tháng năm sinh của kỳ thủ)!');
            memberPassInput && memberPassInput.focus();
            return;
          }

          if (!this.verifyMemberDobPassword(inputPass, found)) {
            modalManager.showAlert('Mật khẩu không chính xác! Mật khẩu đăng nhập là Ngày tháng năm sinh của bạn (Ví dụ: 23102007 hoặc 23/10/2007).');
            memberPassInput && memberPassInput.focus();
            return;
          }

          store.setActiveMember(found.id);
          store.setRole('member');
          this.close();
          const idInfo = found.studentId ? `Mã thẻ: ${found.id} • MSSV: ${found.studentId}` : `Mã thẻ: ${found.id}`;
          modalManager.showAlert(`Đăng nhập thành công! Chào mừng ${found.name} (${idInfo}).`);
          if (window.app) window.app.navigateTo('member-pass');
        };
      }

      memberPassInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          btnSubMember?.click();
        }
      });
      memberInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (memberPassInput && !memberPassInput.value) {
            memberPassInput.focus();
          } else {
            btnSubMember?.click();
          }
        }
      });

      const btnSubAdmin = modalEl.querySelector('#btnSubmitAdminLogin');
      if (btnSubAdmin) {
        btnSubAdmin.onclick = () => {
          sound.playClick();
          const u = modalEl.querySelector('#loginAdminUser').value.trim();
          const p = modalEl.querySelector('#loginAdminPass').value.trim();
          const correctPass = localStorage.getItem('TNU_HGC_ADMIN_PASSWORD') || 'admin123456';
          if ((u === 'admin' || u === 'bch' || u === 'bhd') && p === correctPass) {
            store.setRole('admin');
            this.close();
            modalManager.showAlert('Đăng nhập Quản trị viên (Admin) thành công!');
            if (window.app) {
              const isMobile = window.innerWidth <= 768;
              const subView = isMobile ? 'admin-checkin' : 'admin-overview';
              window.app.adminSubView = subView;
              window.app.navigateTo('admin', subView);
            }
          } else {
            modalManager.showAlert('Tài khoản hoặc mật khẩu không chính xác! Vui lòng nhập đúng mật khẩu quản trị.');
          }
        };
      }

      adminPassInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          btnSubAdmin?.click();
        }
      });
    }, 50);
  },

  // 10. Club Registration Modal (Đăng Ký Tham Gia CLB Cờ TNU - HGC)
  openClubRegistrationModal() {
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    let currentRawSrc = defaultAvatar;
    let finalAvatarExport = defaultAvatar;

    const contentHtml = `
      <form id="clubRegisterForm" class="app-form member-modal-content">
        <div style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.25); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;">
          <h4 class="text-gold font-bold text-sm mb-1">Đơn Đăng Ký Gia Nhập CLB Cờ TNU - HGC</h4>
          <p class="text-xs text-muted" style="margin: 0; line-height: 1.5;">
            Chào mừng bạn đến với CLB Cờ TNU - HGC, Đại học Thái Nguyên Phân hiệu tại Hà Giang! Vui lòng điền đầy đủ thông tin để Ban Điều Hành tiếp nhận và hướng dẫn quy trình tham gia.
          </p>
        </div>

        <!-- Họ tên & MSSV -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Họ và tên sinh viên *</label>
            <input type="text" id="crName" class="form-input" required placeholder="VD: Nguyễn Văn A">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Mã số sinh viên (MSSV) *</label>
            <input type="text" id="crStudentId" class="form-input" required placeholder="VD: HGC2251010088">
          </div>
        </div>

        <!-- Khoa, Lớp & Niên khóa -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Khoa</label>
            <input type="text" id="crFaculty" class="form-input" placeholder="VD: Khoa Sư phạm, Khoa Tự nhiên...">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Lớp *</label>
            <input type="text" id="crClass" class="form-input" required placeholder="VD: K22 Sư phạm - CNTT">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Niên khóa</label>
            <input type="text" id="crCohort" class="form-input" placeholder="VD: 2024 - 2028">
          </div>
        </div>

        <!-- Ngày sinh & Giới tính -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Ngày sinh</label>
            <input type="date" id="crDob" class="form-input" value="2005-01-01">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Giới tính</label>
            <select id="crGender" class="form-select">
              <option value="Nam" selected>Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>
        </div>

        <!-- Số điện thoại / Zalo -->
        <div class="form-group">
          <label class="form-label">Số điện thoại / Zalo *</label>
          <input type="tel" id="crPhone" class="form-input" required placeholder="VD: 0346.578.422">
        </div>

        <!-- Chọn ảnh & Sửa bố cục ảnh thủ công -->
        <div class="form-group mt-3" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
          <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
            <label class="form-label font-bold text-white mb-0" style="display:flex; align-items:center; gap:6px;">
              <span>📸</span> <span>Ảnh chân dung & Chỉnh sửa bố cục ảnh thẻ</span>
            </label>
            <span class="text-xs text-muted">Kéo thả ảnh hoặc dùng thanh trượt để căn khung thẻ</span>
          </div>

          <!-- Nút chọn file & Ô nhập URL -->
          <div class="d-flex gap-2 mb-3 flex-wrap align-center">
            <label class="btn btn-gold btn-sm" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin: 0;">
              <span>📁 Tải ảnh từ thiết bị</span>
              <input type="file" id="crAvatarFileInput" accept="image/*" style="display: none;">
            </label>
            <span class="text-xs text-muted">hoặc dán liên kết ảnh:</span>
            <input type="url" id="crAvatarUrlInput" class="form-input form-input-sm flex-1" style="min-width: 220px;" placeholder="https://images.unsplash.com/...">
          </div>

          <!-- Khung Studio chỉnh sửa bố cục -->
          <div style="background: radial-gradient(circle at 50% 50%, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%); border: 1.5px dashed rgba(212,175,55,0.4); border-radius: 12px; padding: 16px;">
            <div style="display: flex; gap: 20px; align-items: center; justify-content: center; flex-wrap: wrap;">
              
              <!-- Khung Canvas tương tác -->
              <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                <div id="crAvatarViewportFrame" style="position: relative; width: 190px; height: 190px; border-radius: 50%; overflow: hidden; border: 3px solid var(--border-gold); box-shadow: 0 4px 20px rgba(0,0,0,0.6); background: #0b1120; cursor: grab; user-select: none;">
                  <canvas id="crAvatarCropCanvas" width="300" height="300" style="width: 190px; height: 190px; display: block;"></canvas>
                  <div style="position: absolute; inset: 0; pointer-events: none; border: 1px dashed rgba(212,175,55,0.45); border-radius: 50%;"></div>
                  <span style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; background: rgba(0,0,0,0.7); color: #f8fafc; padding: 2px 8px; border-radius: 10px; pointer-events: none; white-space: nowrap;">👆 Kéo để di chuyển</span>
                </div>
                <span class="text-xs text-dim">Bố cục ảnh hiển thị trên thẻ</span>
              </div>

              <!-- Bảng điều khiển bố cục thủ công -->
              <div style="flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <div class="d-flex justify-between text-xs mb-1">
                    <span class="text-white font-medium">🔍 Thu phóng (Zoom):</span>
                    <span id="crZoomValueLabel" class="text-gold font-mono font-bold">1.00x</span>
                  </div>
                  <input type="range" id="crAvatarZoomSlider" min="0.5" max="3" step="0.05" value="1" class="form-range" style="width: 100%; accent-color: var(--gold-color);">
                </div>

                <div>
                  <div class="d-flex justify-between text-xs mb-1">
                    <span class="text-white font-medium">↔️ Dịch chuyển ngang (Trục X):</span>
                    <span id="crPosXValueLabel" class="text-cyan font-mono font-bold">0px</span>
                  </div>
                  <input type="range" id="crAvatarPosXSlider" min="-150" max="150" step="1" value="0" class="form-range" style="width: 100%; accent-color: var(--cyan-color);">
                </div>

                <div>
                  <div class="d-flex justify-between text-xs mb-1">
                    <span class="text-white font-medium">↕️ Dịch chuyển dọc (Trục Y):</span>
                    <span id="crPosYValueLabel" class="text-cyan font-mono font-bold">0px</span>
                  </div>
                  <input type="range" id="crAvatarPosYSlider" min="-150" max="150" step="1" value="0" class="form-range" style="width: 100%; accent-color: var(--cyan-color);">
                </div>

                <div class="d-flex gap-2 pt-1">
                  <button type="button" id="btnCrFitAvatar" class="btn btn-outline btn-sm text-xs flex-1">📐 Căn vừa khung</button>
                  <button type="button" id="btnCrResetAvatarFraming" class="btn btn-outline btn-sm text-xs flex-1">🔄 Đặt lại bố cục</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </form>
    `;

    this.open('Đăng Ký Tham Gia CLB Cờ TNU - HGC', contentHtml, (modal) => {
      const name = modal.querySelector('#crName').value.trim();
      const studentId = modal.querySelector('#crStudentId').value.trim();
      const className = modal.querySelector('#crClass').value.trim();
      const phone = modal.querySelector('#crPhone').value.trim();

      if (!name || !studentId) {
        modalManager.showAlert('Vui lòng điền đủ Họ và tên và Mã số sinh viên (MSSV)!');
        return false;
      }

      if (!className) {
        modalManager.showAlert('Vui lòng nhập Lớp của bạn!');
        return false;
      }

      if (!phone) {
        modalManager.showAlert('Vui lòng nhập Số điện thoại hoặc Zalo để Ban Điều Hành liên hệ!');
        return false;
      }

      const faculty = modal.querySelector('#crFaculty')?.value.trim() || 'Khoa Sư phạm';
      const cohort = modal.querySelector('#crCohort')?.value.trim() || '2024 - 2028';
      const dob = modal.querySelector('#crDob')?.value || '2005-01-01';
      const gender = modal.querySelector('#crGender')?.value || 'Nam';

      const newApp = store.addApplication({
        name,
        studentId,
        faculty,
        class: className,
        cohort,
        dob,
        gender,
        phone,
        avatar: finalAvatarExport || currentRawSrc
      });

      // Mở modal chúc mừng thành công kèm mã QR & link Zalo
      setTimeout(() => {
        modalManager.openRegistrationSuccessModal(newApp);
      }, 100);

      return true;
    }, 'Gửi Đơn Đăng Ký');

    // Setup interactive canvas crop studio for registration
    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      const canvas = modalEl.querySelector('#crAvatarCropCanvas');
      const ctx = canvas ? canvas.getContext('2d') : null;
      const fileInput = modalEl.querySelector('#crAvatarFileInput');
      const urlInput = modalEl.querySelector('#crAvatarUrlInput');
      const zoomSlider = modalEl.querySelector('#crAvatarZoomSlider');
      const posXSlider = modalEl.querySelector('#crAvatarPosXSlider');
      const posYSlider = modalEl.querySelector('#crAvatarPosYSlider');
      const zoomLabel = modalEl.querySelector('#crZoomValueLabel');
      const posXLabel = modalEl.querySelector('#crPosXValueLabel');
      const posYLabel = modalEl.querySelector('#crPosYValueLabel');
      const resetBtn = modalEl.querySelector('#btnCrResetAvatarFraming');
      const fitBtn = modalEl.querySelector('#btnCrFitAvatar');
      const viewport = modalEl.querySelector('#crAvatarViewportFrame');

      let img = new Image();
      img.crossOrigin = 'anonymous';
      let zoom = 1.0;
      let offsetX = 0;
      let offsetY = 0;
      let isDragging = false;
      let startDragX = 0;
      let startDragY = 0;

      const updateFinalExport = () => {
        try {
          if (canvas && img.complete && img.naturalWidth) {
            const expCanvas = document.createElement('canvas');
            expCanvas.width = 400;
            expCanvas.height = 400;
            const ectx = expCanvas.getContext('2d');
            const cw = 400;
            const ch = 400;
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            const aspect = nw / nh;
            let baseW = aspect > 1 ? ch * aspect : cw;
            let baseH = aspect > 1 ? ch : cw / aspect;
            const scaleDpi = 400 / canvas.width;
            const drawW = baseW * zoom;
            const drawH = baseH * zoom;
            const drawX = (cw - drawW) / 2 + (offsetX * scaleDpi);
            const drawY = (ch - drawH) / 2 + (offsetY * scaleDpi);
            ectx.fillStyle = '#0f172a';
            ectx.fillRect(0, 0, cw, ch);
            ectx.drawImage(img, drawX, drawY, drawW, drawH);
            finalAvatarExport = expCanvas.toDataURL('image/jpeg', 0.92);
          }
        } catch (e) {
          finalAvatarExport = currentRawSrc;
        }
      };

      const draw = () => {
        if (!ctx || !img.complete || !img.naturalWidth) return;
        const cw = canvas.width;
        const ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, cw, ch);

        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const aspect = nw / nh;
        let baseW = aspect > 1 ? ch * aspect : cw;
        let baseH = aspect > 1 ? ch : cw / aspect;

        const drawW = baseW * zoom;
        const drawH = baseH * zoom;
        const drawX = (cw - drawW) / 2 + offsetX;
        const drawY = (ch - drawH) / 2 + offsetY;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        updateFinalExport();
      };

      const updateControls = () => {
        if (zoomSlider) zoomSlider.value = zoom;
        if (posXSlider) posXSlider.value = Math.round(offsetX);
        if (posYSlider) posYSlider.value = Math.round(offsetY);
        if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(2)}x`;
        if (posXLabel) posXLabel.textContent = `${Math.round(offsetX)}px`;
        if (posYLabel) posYLabel.textContent = `${Math.round(offsetY)}px`;
      };

      const loadSource = (src) => {
        currentRawSrc = src;
        finalAvatarExport = src;
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          zoom = 1.0;
          offsetX = 0;
          offsetY = 0;
          updateControls();
          draw();
        };
        img.onerror = () => {
          img = new Image();
          img.onload = () => {
            zoom = 1.0;
            offsetX = 0;
            offsetY = 0;
            updateControls();
            draw();
          };
          img.src = src;
        };
        img.src = src;
      };

      // Drag interaction
      if (viewport) {
        const onStart = (cx, cy) => {
          isDragging = true;
          startDragX = cx - offsetX;
          startDragY = cy - offsetY;
          viewport.style.cursor = 'grabbing';
        };
        const onMove = (cx, cy) => {
          if (!isDragging) return;
          offsetX = Math.max(-150, Math.min(150, cx - startDragX));
          offsetY = Math.max(-150, Math.min(150, cy - startDragY));
          updateControls();
          draw();
        };
        const onEnd = () => {
          isDragging = false;
          if (viewport) viewport.style.cursor = 'grab';
        };

        viewport.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', onEnd);

        viewport.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
          if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchend', onEnd);
      }

      // Sliders
      if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
          zoom = parseFloat(e.target.value) || 1.0;
          if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(2)}x`;
          draw();
        });
      }
      if (posXSlider) {
        posXSlider.addEventListener('input', (e) => {
          offsetX = parseFloat(e.target.value) || 0;
          if (posXLabel) posXLabel.textContent = `${Math.round(offsetX)}px`;
          draw();
        });
      }
      if (posYSlider) {
        posYSlider.addEventListener('input', (e) => {
          offsetY = parseFloat(e.target.value) || 0;
          if (posYLabel) posYLabel.textContent = `${Math.round(offsetY)}px`;
          draw();
        });
      }

      // Reset & Fit
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          zoom = 1.0;
          offsetX = 0;
          offsetY = 0;
          updateControls();
          draw();
        });
      }
      if (fitBtn) {
        fitBtn.addEventListener('click', () => {
          if (!img.naturalWidth) return;
          const cw = canvas.width;
          const ch = canvas.height;
          const nw = img.naturalWidth;
          const nh = img.naturalHeight;
          const aspect = nw / nh;
          let baseW = aspect > 1 ? ch * aspect : cw;
          let baseH = aspect > 1 ? ch : cw / aspect;
          zoom = Math.max(cw / baseW, ch / baseH);
          offsetX = 0;
          offsetY = 0;
          updateControls();
          draw();
        });
      }

      // File input
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => loadSource(re.target.result);
            reader.readAsDataURL(file);
          }
        });
      }

      // URL input
      if (urlInput) {
        urlInput.addEventListener('change', (e) => {
          const url = e.target.value.trim();
          if (url) loadSource(url);
        });
      }

      // Load initial
      loadSource(defaultAvatar);
    }
  },

  // 10B. Registration Success Modal (Thông báo gửi đơn thành công & Mã QR/Link Nhóm Zalo)
  openRegistrationSuccessModal(application) {
    if (!application) return;
    const zaloLink = store.getState().clubInfo?.zaloGroupLink || 'https://zalo.me/g/ugejmj655';

    const contentHtml = `
      <div class="reg-success-container" style="text-align: center; padding: 10px 4px 16px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); border: 2px solid #22c55e; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 1.8rem;">
          ✅
        </div>
        
        <h3 style="color: #f8fafc; font-size: 1.2rem; font-weight: 700; margin-bottom: 6px;">
          ĐÃ GỬI ĐƠN ĐĂNG KÝ THÀNH CÔNG!
        </h3>

        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 20px; padding: 5px 16px; margin-bottom: 14px;">
          <span class="text-xs text-muted">Mã hồ sơ:</span>
          <strong class="text-gold font-mono font-bold">${application.id}</strong>
          <span style="color: rgba(255,255,255,0.25);">•</span>
          <span class="badge badge-amber text-xs" style="padding: 2px 8px; font-weight: 600;">⏳ Chờ BĐH xét duyệt</span>
        </div>

        <p class="text-muted text-sm" style="max-width: 500px; margin: 0 auto 18px; line-height: 1.6;">
          Hồ sơ của bạn <strong>${application.name}</strong> (MSSV: ${application.studentId} • Lớp: ${application.class}) đã được gửi tới Ban Điều Hành CLB Cờ TNU - HGC.
        </p>

        <!-- Zalo Card -->
        <div style="background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(14, 165, 233, 0.45); border-radius: 14px; padding: 18px 16px; max-width: 440px; margin: 0 auto 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.45);">
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 1.25rem;">💬</span>
            <h4 style="margin: 0; color: #38bdf8; font-size: 0.98rem; font-weight: 700;">NHÓM ZALO TIẾP NHẬN ỨNG VIÊN</h4>
          </div>

          <p class="text-xs text-dim mb-3" style="line-height: 1.5; margin: 0 0 12px 0;">
            Quét mã QR hoặc nhấn nút bên dưới để tham gia ngay nhóm Zalo CLB. Ban Chủ Nhiệm sẽ hướng dẫn lịch giao lưu thử kỳ lực và thông báo kết quả duyệt thành viên chính thức.
          </p>

          <!-- QR Image from Zalo Group -->
          <div style="background: #ffffff; padding: 10px; border-radius: 14px; display: inline-block; margin-bottom: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.35);">
            <a href="${zaloLink}" target="_blank" rel="noopener noreferrer" title="Nhấn để tham gia nhóm Zalo CLB" style="display: block; text-decoration: none;">
              <img id="regSuccessZaloQrImg" src="/zalo-qr.png" alt="Mã QR Nhóm Zalo CLB Cờ TNU - HGC" style="width: 175px; height: 175px; display: block; border-radius: 6px; object-fit: contain;">
              <canvas id="regSuccessZaloQrCanvas" width="175" height="175" style="width: 175px; height: 175px; display: none;"></canvas>
            </a>
          </div>

          <div style="margin-bottom: 14px;">
            <a href="/zalo-qr-full.png" target="_blank" rel="noopener noreferrer" class="text-xs text-dim hover-gold" style="font-size: 11.5px; text-decoration: none;">
              🔍 Xem ảnh thẻ Zalo gốc
            </a>
          </div>

          <div>
            <a href="${zaloLink}" target="_blank" rel="noopener noreferrer" class="btn btn-cyan w-100" style="display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 10px 16px; text-decoration: none; border-radius: 8px; font-size: 0.92rem;">
              <span>🚀</span> <span>Tham Gia Nhóm Zalo CLB Ngay</span>
            </a>
          </div>
        </div>

        <div class="text-xs text-muted" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>Hotline / Zalo Ban Điều Hành:</span>
          <a href="tel:0346578422" class="text-gold font-bold">0346.578.422</a>
        </div>
      </div>
    `;

    this.open('Xác Nhận Đơn Đăng Ký', contentHtml, () => {
      return true;
    }, 'Đã Hiểu & Đóng');

    // Fallback QR canvas renderer if image fails to load
    setTimeout(() => {
      const qrImg = document.getElementById('regSuccessZaloQrImg');
      if (qrImg) {
        qrImg.onerror = () => {
          const canvas = document.getElementById('regSuccessZaloQrCanvas');
          if (canvas && qrHelper) {
            qrImg.style.display = 'none';
            canvas.style.display = 'block';
            qrHelper.renderToCanvas(canvas, zaloLink, { width: 175, margin: 1 });
          }
        };
      }
    }, 50);
  },

  // 10C. View Application Detail Modal (Dành cho Ban Điều Hành xem chi tiết đơn)
  openApplicationDetailModal(app, onApprove = null, onReject = null) {
    if (!app) return;
    const contentHtml = `
      <div class="app-detail-modal">
        <div style="display: flex; gap: 18px; align-items: center; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px;">
          <img src="${app.avatar}" alt="${app.name}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--border-gold);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <h3 style="color: #fff; font-size: 1.15rem; font-weight: 700; margin: 0;">${app.name}</h3>
              <span class="badge badge-amber text-xs">⏳ Chờ duyệt</span>
            </div>
            <div class="text-xs text-gold font-mono font-bold">${app.id}</div>
            <div class="text-xs text-muted">Ngày nộp đơn: ${app.createdAt ? new Date(app.createdAt).toLocaleString('vi-VN') : 'Mới nộp'}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 0.85rem;">
          <div><span class="text-muted">MSSV:</span> <strong class="text-white font-mono">${app.studentId}</strong></div>
          <div><span class="text-muted">Khoa:</span> <strong class="text-white">${app.faculty || 'Chưa cập nhật'}</strong></div>
          <div><span class="text-muted">Lớp:</span> <strong class="text-white">${app.class || 'Chưa cập nhật'}</strong></div>
          <div><span class="text-muted">Niên khóa:</span> <strong class="text-white">${app.cohort || 'Chưa cập nhật'}</strong></div>
          <div><span class="text-muted">Giới tính:</span> <strong class="text-white">${app.gender || 'Nam'}</strong></div>
          <div><span class="text-muted">Ngày sinh:</span> <strong class="text-white">${app.dob || '—'}</strong></div>
          <div style="grid-column: span 2;"><span class="text-muted">Số điện thoại / Zalo:</span> <a href="tel:${app.phone}" class="text-cyan font-bold">${app.phone || 'Chưa có'}</a></div>
        </div>

        <div style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
          <span class="text-xs text-gold font-bold">💬 Phương Châm Thi Đấu:</span>
          <span class="text-xs text-muted" style="margin-left: 6px;">Hệ thống sẽ tự động gán tuần hoàn 1 câu trong kho 1.000 Châm Ngôn Triết Lý Cờ của CLB khi duyệt kết nạp.</span>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" class="btn btn-danger btn-sm" id="btnDetailRejectApp">🗑️ Từ chối / Xóa đơn</button>
          <button type="button" class="btn btn-gold btn-sm" id="btnDetailApproveApp">✅ Duyệt vào CLB chính thức</button>
        </div>
      </div>
    `;

    this.open(`Chi Tiết Đơn Đăng Ký • ${app.name} (${app.id})`, contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnDetailApproveApp')?.addEventListener('click', () => {
        this.close();
        if (typeof onApprove === 'function') onApprove(app.id);
      });
      modalEl.querySelector('#btnDetailRejectApp')?.addEventListener('click', () => {
        this.close();
        if (typeof onReject === 'function') onReject(app.id);
      });
    }
  },

  // 11. View Member Card Modal
  openMemberCardModal(member) {
    if (!member) return;
    const contentHtml = `
      <div class="member-card-modal-content" style="max-width: 720px; margin: 0 auto; padding: 4px 0;">
        <div id="modalMemberCardMount"></div>
      </div>
    `;

    this.open(`Thẻ Điện Tử Smart QR Key • ${member.name} (${member.id})`, contentHtml, null, null);

    setTimeout(() => {
      const mount = document.getElementById('modalMemberCardMount');
      if (mount) {
        memberCardComponent.render(mount, member);
      }
    }, 60);
  },

  // 12. Swiss Tournament Admin Management Modal
  openSwissTournamentAdminModal(event, onUpdate) {
    if (!event) return;
    const state = store.getState();
    const members = state.members || [];

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    // Khởi tạo danh sách người tham gia
    let currentParticipants = [];
    if (Array.isArray(event.swissParticipants) && event.swissParticipants.length > 0) {
      currentParticipants = JSON.parse(JSON.stringify(event.swissParticipants));
    } else if (Array.isArray(event.registeredMembers) && event.registeredMembers.length > 0) {
      currentParticipants = event.registeredMembers.map((mId, idx) => {
        const m = members.find((x) => x.id === mId) || {};
        return {
          id: m.id || `P-${Date.now().toString().slice(-4)}-${idx + 1}`,
          stt: idx + 1,
          name: m.name || m.fullName || `Kỳ thủ ${idx + 1}`,
          gender: m.gender || 'Nam',
          unit: m.university || m.faculty || m.class || 'CLB Cờ TNU',
          phone: m.phone || '',
          active: true
        };
      });
    } else if (members.length > 0) {
      currentParticipants = members.slice(0, 16).map((m, idx) => ({
        id: m.id || `P-${Date.now().toString().slice(-4)}-${idx + 1}`,
        stt: idx + 1,
        name: m.name || m.fullName || '',
        gender: m.gender || 'Nam',
        unit: m.university || m.faculty || m.class || 'CLB Cờ TNU',
        phone: m.phone || '',
        active: true
      }));
    } else {
      currentParticipants = [
        { id: `P-1`, stt: 1, name: '', gender: 'Nam', unit: '', phone: '', active: true },
        { id: `P-2`, stt: 2, name: '', gender: 'Nam', unit: '', phone: '', active: true },
        { id: `P-3`, stt: 3, name: '', gender: 'Nam', unit: '', phone: '', active: true },
        { id: `P-4`, stt: 4, name: '', gender: 'Nam', unit: '', phone: '', active: true }
      ];
    }

    // Hàm đồng bộ dữ liệu người dùng gõ trên bảng vào currentParticipants
    const syncInputsFromDOM = (modalEl) => {
      if (!modalEl) return;
      const rows = modalEl.querySelectorAll('.swiss-player-row');
      rows.forEach((row, idx) => {
        const id = row.getAttribute('data-id');
        let p = currentParticipants.find((x) => String(x.id) === String(id));
        if (!p) {
          p = { id, active: true };
          currentParticipants.push(p);
        }
        const nameInput = row.querySelector('.swiss-p-name');
        const genderSelect = row.querySelector('.swiss-p-gender');
        const unitInput = row.querySelector('.swiss-p-unit');
        const phoneInput = row.querySelector('.swiss-p-phone');
        const activeChk = row.querySelector('.swiss-p-active');
        if (nameInput) p.name = nameInput.value;
        if (genderSelect) p.gender = genderSelect.value;
        if (unitInput) p.unit = unitInput.value;
        if (phoneInput) p.phone = phoneInput.value;
        if (activeChk) p.active = activeChk.checked;
        p.stt = idx + 1;
      });
      event.swissParticipants = currentParticipants;
    };

    // Hàm phân tích dữ liệu CSV hoặc Paste từ Excel
    const parseParticipantText = (rawText) => {
      if (!rawText || typeof rawText !== 'string') return [];
      const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      const parsed = [];

      lines.forEach((line) => {
        let cols = [];
        if (line.includes('\t')) {
          cols = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        } else if (line.includes(';') && !line.includes(',')) {
          cols = line.split(';').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        } else {
          cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
        }

        if (cols.length === 0) return;

        // Bỏ qua dòng tiêu đề nếu có
        const firstCol = (cols[0] || '').toLowerCase();
        const secondCol = (cols[1] || '').toLowerCase();
        if (
          firstCol.includes('stt') ||
          firstCol.includes('họ') ||
          firstCol.includes('tên') ||
          firstCol.includes('name') ||
          secondCol.includes('họ') ||
          secondCol.includes('tên')
        ) {
          return;
        }

        let name = '';
        let gender = 'Nam';
        let unit = '';
        let phone = '';

        // Nếu cột 1 là số thứ tự (STT) thì dịch cột
        if (/^\d+$/.test(cols[0]) && cols.length > 1) {
          name = cols[1] || '';
          gender = cols[2] || 'Nam';
          unit = cols[3] || '';
          phone = cols[4] || '';
        } else {
          name = cols[0] || '';
          gender = cols[1] || 'Nam';
          unit = cols[2] || '';
          phone = cols[3] || '';
        }

        if (!name || !name.trim()) return;

        const gLower = gender.toLowerCase();
        if (gLower.includes('nữ') || gLower.includes('nu') || gLower.includes('female') || gLower === 'f') {
          gender = 'Nữ';
        } else {
          gender = 'Nam';
        }

        parsed.push({
          id: `P-${Date.now().toString().slice(-5)}-${parsed.length + 1}`,
          stt: parsed.length + 1,
          name: name.trim(),
          gender: gender,
          unit: unit ? unit.trim() : '',
          phone: phone ? phone.trim() : '',
          active: true
        });
      });

      return parsed;
    };

    // Hàm tải file mẫu CSV có BOM UTF-8
    const downloadParticipantTemplate = () => {
      const headers = 'STT,Họ và tên,Giới tính,Đơn vị,SĐT/Zalo\r\n';
      const sampleRows = [
        '1,Nguyễn Văn An,Nam,K58 CNTT - ĐH CNTT&TT,0912345678',
        '2,Trần Thị Mai,Nữ,K59 Kinh Tế - ĐH Kinh Tế & QTKD,0987654321',
        '3,Lê Hoàng Nam,Nam,K60 Sư Phạm - ĐH Sư Phạm,0971122334',
        '4,Phạm Quốc Bảo,Nam,K57 Kỹ Thuật Công Nghiệp,0903344556',
        '5,Vũ Thị Hằng,Nữ,K58 Đa Khoa - ĐH Y Dược,0965566778',
        '6,Đặng Minh Quang,Nam,K59 Nông Lâm - ĐH Nông Lâm,0942233445'
      ].join('\r\n');

      const csvContent = '\uFEFF' + headers + sampleRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mau_Danh_Sach_Ky_Thu_Tham_Gia.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Hàm xuất bảng xếp hạng ra CSV
    const exportSwissStandingsCsv = (swissData, tournamentTitle) => {
      const standings = swissData?.standings || [];
      let csv = '\uFEFFHạng,Họ và tên,Giới tính,Đơn vị,Điểm (Pts),Hệ số Buchholz,Số ván thắng\r\n';
      standings.forEach((p, idx) => {
        const row = [
          idx + 1,
          `"${(p.name || '').replace(/"/g, '""')}"`,
          p.gender || 'Nam',
          `"${(p.unit || '').replace(/"/g, '""')}"`,
          p.score,
          p.buchholz,
          p.wins || 0
        ].join(',');
        csv += row + '\r\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (tournamentTitle || 'Giai_Co').replace(/[^\w\d-_]/g, '_');
      a.download = `Bang_Xep_Hang_${cleanTitle}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Hàm render HTML từng hàng của bảng danh sách kỳ thủ
    const renderTableRowsHtml = () => {
      if (currentParticipants.length === 0) {
        return `
          <tr>
            <td colspan="7" class="text-center text-muted p-4">
              Chưa có kỳ thủ nào. Bấm <strong>➕ Thêm kỳ thủ</strong>, <strong>👥 Lấy từ CLB</strong> hoặc <strong>📤 Đẩy Dữ Liệu Vào</strong>.
            </td>
          </tr>
        `;
      }

      return currentParticipants.map((p, idx) => `
        <tr class="swiss-player-row" data-id="${p.id}">
          <td style="text-align: center; vertical-align: middle;">
            <input type="checkbox" class="swiss-p-active" ${p.active !== false ? 'checked' : ''} title="Tham gia thi đấu" style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--gold-primary);">
          </td>
          <td style="text-align: center; vertical-align: middle;" class="font-bold text-gold swiss-p-stt">${idx + 1}</td>
          <td style="vertical-align: middle;">
            <input type="text" class="form-control form-control-sm swiss-p-name text-white font-medium" value="${escapeHtml(p.name || '')}" placeholder="Họ và tên kỳ thủ..." style="font-size: 0.8rem; padding: 5px 8px; background: rgba(0,0,0,0.3);">
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <select class="form-control form-control-sm swiss-p-gender" style="font-size: 0.8rem; padding: 5px 6px; background: rgba(0,0,0,0.3);">
              <option value="Nam" ${p.gender === 'Nam' ? 'selected' : ''}>Nam</option>
              <option value="Nữ" ${p.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
            </select>
          </td>
          <td style="vertical-align: middle;">
            <input type="text" class="form-control form-control-sm swiss-p-unit" value="${escapeHtml(p.unit || '')}" placeholder="Khoa / Lớp / Trường..." style="font-size: 0.8rem; padding: 5px 8px; background: rgba(0,0,0,0.3);">
          </td>
          <td style="vertical-align: middle;">
            <input type="text" class="form-control form-control-sm swiss-p-phone" value="${escapeHtml(p.phone || '')}" placeholder="SĐT / Zalo..." style="font-size: 0.8rem; padding: 5px 8px; background: rgba(0,0,0,0.3);">
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <button type="button" class="btn btn-outline btn-xs btn-del-player-row" data-id="${p.id}" title="Xóa dòng" style="padding: 2px 7px; color: #fb7185; border-color: rgba(244,63,94,0.3);">✕</button>
          </td>
        </tr>
      `).join('');
    };

    const renderModalContent = () => {
      const curEvent = store.getState().events.find((e) => e.id === event.id) || event;
      const swiss = curEvent.swissData;

      if (!swiss) {
        const activeCount = currentParticipants.filter((p) => p.active !== false && p.name && p.name.trim()).length;

        return `
          <div class="swiss-setup-modal p-2">
            <div class="mb-3 d-flex justify-between align-start flex-wrap gap-2">
              <div>
                <span class="badge badge-gold">CẤU HÌNH HỆ THỤY SĨ (SWISS SYSTEM)</span>
                <h3 class="text-lg font-bold text-white mt-1">${escapeHtml(curEvent.title)}</h3>
                <p class="text-xs text-muted mb-0">Hệ Thụy Sĩ FIDE chuẩn: không loại trực tiếp, bốc thăm theo điểm số, cân bằng màu quân Trắng/Đen.</p>
              </div>
              <div class="d-flex gap-1.5 flex-wrap">
                <button type="button" class="btn btn-outline btn-xs" id="btnDownloadSwissTemplate" style="border-color: #38bdf8; color: #38bdf8; font-weight: 600;" title="Tải file mẫu Excel (.csv) để nhập thông tin kỳ thủ">
                  📥 Tải Bảng Mẫu Excel/CSV
                </button>
                <label class="btn btn-outline btn-xs mb-0" style="border-color: #34d399; color: #34d399; font-weight: 600; cursor: pointer;" title="Đẩy file CSV đã nhập danh sách kỳ thủ vào bảng">
                  📤 Đẩy Dữ Liệu Vào
                  <input type="file" id="swissImportFileInput" accept=".csv, .txt, .tsv" style="display: none;">
                </label>
                <button type="button" class="btn btn-outline btn-xs" id="btnTogglePasteArea" style="border-color: #fbbf24; color: #fbbf24; font-weight: 600;" title="Dán trực tiếp từ bảng tính Excel / Google Sheets">
                  📋 Dán Từ Excel
                </button>
              </div>
            </div>

            <!-- Khung dán dữ liệu trực tiếp từ Excel -->
            <div id="swissPasteContainer" class="card p-3 mb-3" style="display: none; background: rgba(56, 189, 248, 0.06); border: 1px dashed rgba(56, 189, 248, 0.4);">
              <label class="form-label text-xs font-bold text-cyan mb-1">
                📋 Dán Trực Tiếp Từ Excel hoặc Google Sheets (Copy các cột: STT, Họ và tên, Giới tính, Đơn vị, SĐT):
              </label>
              <textarea id="swissPasteInput" class="form-control font-mono mb-2" rows="4" placeholder="Dán nội dung sao chép từ Excel/Sheets vào đây...&#10;Ví dụ:&#10;1	Nguyễn Văn An	Nam	K58 CNTT	0912345678&#10;2	Trần Thị Mai	Nữ	K59 Kinh Tế	0987654321" style="font-size: 0.8rem;"></textarea>
              <div class="d-flex justify-between align-center flex-wrap gap-2">
                <span class="text-xs text-muted">Hỗ trợ nhận dạng tự động dấu Tab, Dấu phẩy (,) hoặc Chấm phẩy (;)</span>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-xs btn-outline" id="btnClosePasteArea">Hủy</button>
                  <button type="button" class="btn btn-xs btn-cyan" id="btnApplyPasteData">✅ Nạp Vào Bảng</button>
                </div>
              </div>
            </div>

            <!-- Cấu hình tổng số vòng đấu -->
            <div class="card p-3 mb-3" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.2);">
              <div class="form-group mb-1">
                <label class="form-label text-gold font-bold text-xs d-flex align-center gap-1.5">
                  <span>✍️ Tổng Số Vòng Đấu (Trọng tài tự viết số ván):</span>
                </label>
                <div class="d-flex align-center gap-2 mb-2">
                  <input type="number" class="form-control font-mono font-bold text-gold" id="swissTotalRoundsInput" value="5" min="1" max="50" step="1" style="width: 130px; font-size: 1.15rem; padding: 6px 12px;" placeholder="VD: 5">
                  <span class="text-xs text-muted">Ván / Vòng đấu (Trọng tài nhập số ván tùy chỉnh theo điều lệ giải)</span>
                </div>
                <div class="d-flex gap-1.5 flex-wrap align-center">
                  <span class="text-xs text-dim mr-1">Gợi ý nhanh:</span>
                  <button type="button" class="btn btn-outline btn-xs btn-preset-rounds" data-rounds="3">3 ván</button>
                  <button type="button" class="btn btn-outline btn-xs btn-preset-rounds" data-rounds="5">5 ván</button>
                  <button type="button" class="btn btn-outline btn-xs btn-preset-rounds" data-rounds="7">7 ván</button>
                  <button type="button" class="btn btn-outline btn-xs btn-preset-rounds" data-rounds="9">9 ván</button>
                </div>
              </div>
            </div>

            <!-- Bảng danh sách kỳ thủ tham gia -->
            <div class="card p-3 mb-3" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
              <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
                <div class="d-flex align-center gap-2">
                  <label class="form-label text-white font-bold text-xs mb-0">
                    📋 Danh Sách Kỳ Thủ Tham Gia (<span id="swissActiveCount" class="text-gold font-bold">${activeCount}</span> / <span id="swissTotalCount">${currentParticipants.length}</span> kỳ thủ thi đấu)
                  </label>
                </div>
                <div class="d-flex gap-1.5 flex-wrap">
                  <button type="button" class="btn btn-xs btn-outline" id="btnSwissToggleAll">Chọn tất cả</button>
                  <button type="button" class="btn btn-xs btn-outline" id="btnSwissAddRow" style="color: #38bdf8; border-color: rgba(56,189,248,0.3);">➕ Thêm kỳ thủ</button>
                  <button type="button" class="btn btn-xs btn-outline" id="btnSwissLoadClubMembers" title="Nạp danh sách từ hội viên CLB">👥 Lấy từ CLB</button>
                  <button type="button" class="btn btn-xs btn-outline" id="btnSwissClearAll" style="color: #fb7185; border-color: rgba(244,63,94,0.3);">🗑️ Xóa hết</button>
                </div>
              </div>

              <div class="table-responsive" style="max-height: 380px; overflow-y: auto; overflow-x: auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;">
                <table class="data-table swiss-participants-table" style="font-size: 0.8rem; margin-bottom: 0;">
                  <thead style="position: sticky; top: 0; background: #181c24; z-index: 5; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                    <tr>
                      <th style="width: 45px; text-align: center;">Đấu</th>
                      <th style="width: 45px; text-align: center;">STT</th>
                      <th style="min-width: 170px;">Họ và tên</th>
                      <th style="width: 90px; text-align: center;">Giới tính</th>
                      <th style="min-width: 160px;">Đơn vị (Khoa/Lớp/Trường)</th>
                      <th style="min-width: 130px;">SĐT / Zalo</th>
                      <th style="width: 45px; text-align: center;">Xóa</th>
                    </tr>
                  </thead>
                  <tbody id="swissParticipantsTableBody">
                    ${renderTableRowsHtml()}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="d-flex justify-between align-center flex-wrap gap-2">
              <span class="text-xs text-muted">💡 Trọng tài có thể chỉnh sửa trực tiếp trên từng ô hoặc bấm "Đẩy Dữ Liệu Vào" từ file Excel/CSV.</span>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline btn-sm" id="btnCancelSwiss">Đóng</button>
                <button type="button" class="btn btn-gold btn-sm font-bold" id="btnStartSwissTournament">
                  ⚔️ Bắt Đầu & Bốc Thăm Vòng 1
                </button>
              </div>
            </div>
          </div>
        `;
      }

      const curRoundData = (swiss.rounds || []).find((r) => r.roundNumber === swiss.currentRound);
      const isFinished = swiss.status === 'completed' || (swiss.currentRound >= swiss.totalRounds && (curRoundData?.matches || []).every((m) => m.result !== null));

      return `
        <div class="swiss-admin-modal p-2">
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
            <div>
              <div class="d-flex align-center gap-2 flex-wrap mb-1">
                <span class="badge ${isFinished ? 'badge-emerald' : 'badge-gold'}">
                  ${isFinished ? '🏁 GIẢI ĐẤU ĐÃ HOÀN TẤT' : `🟢 VÒNG ${swiss.currentRound} / ${swiss.totalRounds}`}
                </span>
                <button type="button" class="btn btn-outline btn-xs" id="btnEditSwissTotalRoundsMid" title="Trọng tài chỉnh sửa tổng số ván đấu của giải" style="font-size: 11px; padding: 2px 8px;">
                  ✏️ Sửa Số Ván (${swiss.totalRounds})
                </button>
              </div>
              <h3 class="text-lg font-bold text-white mt-1">${escapeHtml(curEvent.title)}</h3>
            </div>
            <div class="d-flex gap-2">
              ${!isFinished && swiss.currentRound < swiss.totalRounds ? `
                <button type="button" class="btn btn-gold btn-sm" id="btnNextSwissRound">
                  🔄 Bốc Thăm Vòng ${swiss.currentRound + 1}
                </button>
              ` : ''}
              <button type="button" class="btn btn-outline btn-sm" id="btnResetSwissData" title="Khởi tạo lại giải đấu này" style="color: #fb7185; border-color: rgba(244,63,94,0.3);">
                🗑️ Đặt Lại
              </button>
            </div>
          </div>

          <div class="card p-3 mb-3" style="background: rgba(255,255,255,0.03);">
            <div class="d-flex justify-between align-center mb-2">
              <h4 class="font-bold text-white text-xs" style="letter-spacing: 0.5px;">
                ⚔️ CẶP ĐẤU VÒNG ${swiss.currentRound} (${(curRoundData?.matches || []).length} bàn)
              </h4>
              <span class="text-xs text-muted">Nhấn kết quả để ghi nhận điểm</span>
            </div>

            <div class="table-responsive">
              <table class="data-table" style="font-size: 0.8rem;">
                <thead>
                  <tr>
                    <th style="width: 50px;">Bàn</th>
                    <th>Quân Trắng (White)</th>
                    <th style="text-align: center; width: 170px;">Kết Quả Ván Đấu</th>
                    <th>Quân Đen (Black)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(curRoundData?.matches || []).map((m) => `
                    <tr>
                      <td class="font-bold text-gold">${m.isBye ? 'BYE' : `Bàn ${m.board}`}</td>
                      <td>
                        <span class="font-bold text-white">${escapeHtml(m.whiteName)}</span>
                        ${m.whiteUnit ? `<span class="text-xs text-dim ml-1">(${escapeHtml(m.whiteUnit)})</span>` : ''}
                        <span class="badge" style="background: #ffffff; color: #000; font-size: 10px; margin-left: 4px; padding: 1px 4px;">Trắng</span>
                      </td>
                      <td style="text-align: center;">
                        ${m.isBye ? `
                          <span class="badge badge-emerald">Miễn đấu (+1đ)</span>
                        ` : `
                          <div class="d-flex justify-center gap-1">
                            <button type="button" class="btn btn-xs ${m.result === '1-0' ? 'btn-gold' : 'btn-outline'} btn-swiss-res" data-match-id="${m.id}" data-res="1-0" title="Trắng thắng">1 - 0</button>
                            <button type="button" class="btn btn-xs ${m.result === '0.5-0.5' ? 'btn-gold' : 'btn-outline'} btn-swiss-res" data-match-id="${m.id}" data-res="0.5-0.5" title="Hòa ván">½ - ½</button>
                            <button type="button" class="btn btn-xs ${m.result === '0-1' ? 'btn-gold' : 'btn-outline'} btn-swiss-res" data-match-id="${m.id}" data-res="0-1" title="Đen thắng">0 - 1</button>
                          </div>
                        `}
                      </td>
                      <td>
                        ${m.isBye ? `<span class="text-muted font-italic">Nghỉ ván</span>` : `
                          <span class="font-bold text-white">${escapeHtml(m.blackName)}</span>
                          ${m.blackUnit ? `<span class="text-xs text-dim ml-1">(${escapeHtml(m.blackUnit)})</span>` : ''}
                          <span class="badge" style="background: #1e293b; color: #cbd5e1; border: 1px solid #475569; font-size: 10px; margin-left: 4px; padding: 1px 4px;">Đen</span>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card p-3" style="background: rgba(255,255,255,0.02);">
            <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
              <div>
                <h4 class="font-bold text-gold text-xs mb-0" style="letter-spacing: 0.5px;">
                  📊 BẢNG XẾP HẠNG HỆ THỤY SĨ (BUCHHOLZ STANDINGS)
                </h4>
                <span class="text-xs text-muted">Xếp theo: Điểm số ➔ Hệ số Buchholz ➔ Số ván thắng</span>
              </div>
              <button type="button" class="btn btn-outline btn-xs" id="btnExportSwissStandings" style="font-size: 11px; border-color: #38bdf8; color: #38bdf8;">
                📥 Xuất Bảng Xếp Hạng (CSV)
              </button>
            </div>

            <div class="table-responsive">
              <table class="data-table" style="font-size: 0.78rem;">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">Hạng</th>
                    <th>Họ và tên</th>
                    <th style="text-align: center; width: 75px;">Giới tính</th>
                    <th>Đơn vị</th>
                    <th style="text-align: center; width: 80px;">Điểm</th>
                    <th style="text-align: center; width: 85px;">Buchholz</th>
                    <th style="text-align: center; width: 65px;">Thắng</th>
                  </tr>
                </thead>
                <tbody>
                  ${(swiss.standings || []).map((p, idx) => `
                    <tr>
                      <td class="font-bold text-center ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-cyan' : idx === 2 ? 'text-emerald' : 'text-muted'}">
                        ${idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : (idx + 1)}
                      </td>
                      <td>
                        <strong class="text-white">${escapeHtml(p.name)}</strong>
                      </td>
                      <td style="text-align: center;">
                        <span class="badge ${p.gender === 'Nữ' ? 'badge-pink' : 'badge-outline'}" style="font-size: 10px;">${escapeHtml(p.gender || 'Nam')}</span>
                      </td>
                      <td class="text-dim" style="font-size: 0.75rem;">
                        ${escapeHtml(p.unit || '-')}
                      </td>
                      <td style="text-align: center;">
                        <span class="badge badge-gold font-bold" style="font-size: 0.82rem;">${p.score}</span>
                      </td>
                      <td style="text-align: center; color: var(--accent-cyan); font-weight: 600;">
                        ${p.buchholz}
                      </td>
                      <td style="text-align: center;">${p.wins || 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    };

    const bindModalEvents = () => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;

      const updateCounts = () => {
        const activeCount = currentParticipants.filter((p) => p.active !== false && p.name && p.name.trim()).length;
        const totalCount = currentParticipants.length;
        const countSpan = modalEl.querySelector('#swissActiveCount');
        const totalSpan = modalEl.querySelector('#swissTotalCount');
        if (countSpan) countSpan.textContent = activeCount;
        if (totalSpan) totalSpan.textContent = totalCount;
      };

      const refreshTableBody = () => {
        const tbody = modalEl.querySelector('#swissParticipantsTableBody');
        if (tbody) {
          tbody.innerHTML = renderTableRowsHtml();
          updateCounts();
        }
      };

      // Tải bảng mẫu CSV
      modalEl.querySelector('#btnDownloadSwissTemplate')?.addEventListener('click', () => {
        sound.playClick();
        downloadParticipantTemplate();
      });

      // Nhập file CSV/TXT
      modalEl.querySelector('#swissImportFileInput')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        sound.playClick();
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const content = evt.target.result;
            const parsed = parseParticipantText(content);
            if (parsed.length === 0) {
              modalManager.showAlert('Không tìm thấy dữ liệu kỳ thủ hợp lệ trong file!');
              return;
            }
            syncInputsFromDOM(modalEl);
            currentParticipants = parsed;
            refreshTableBody();
            modalManager.showAlert(`✅ Đã nạp thành công ${parsed.length} kỳ thủ từ file "${file.name}"!`);
          } catch (err) {
            modalManager.showAlert('Lỗi đọc file: ' + err.message);
          }
        };
        reader.readAsText(file, 'utf-8');
        e.target.value = '';
      });

      // Bật/tắt khung dán từ Excel
      modalEl.querySelector('#btnTogglePasteArea')?.addEventListener('click', () => {
        sound.playClick();
        const pasteContainer = modalEl.querySelector('#swissPasteContainer');
        if (pasteContainer) {
          pasteContainer.style.display = pasteContainer.style.display === 'none' ? 'block' : 'none';
        }
      });

      modalEl.querySelector('#btnClosePasteArea')?.addEventListener('click', () => {
        sound.playClick();
        const pasteContainer = modalEl.querySelector('#swissPasteContainer');
        if (pasteContainer) pasteContainer.style.display = 'none';
      });

      // Áp dụng dữ liệu dán từ Excel
      modalEl.querySelector('#btnApplyPasteData')?.addEventListener('click', () => {
        sound.playClick();
        const pasteInput = modalEl.querySelector('#swissPasteInput');
        const text = pasteInput?.value || '';
        if (!text.trim()) {
          modalManager.showAlert('Vui lòng dán dữ liệu sao chép từ Excel hoặc Google Sheets trước khi bấm nạp!');
          return;
        }
        const parsed = parseParticipantText(text);
        if (parsed.length === 0) {
          modalManager.showAlert('Không nhận dạng được thông tin kỳ thủ từ nội dung dán. Vui lòng kiểm tra lại!');
          return;
        }
        syncInputsFromDOM(modalEl);
        currentParticipants = parsed;
        refreshTableBody();
        const pasteContainer = modalEl.querySelector('#swissPasteContainer');
        if (pasteContainer) pasteContainer.style.display = 'none';
        modalManager.showAlert(`✅ Đã nạp thành công ${parsed.length} kỳ thủ từ dữ liệu dán!`);
      });

      // Chọn / bỏ chọn tất cả
      modalEl.querySelector('#btnSwissToggleAll')?.addEventListener('click', () => {
        sound.playClick();
        syncInputsFromDOM(modalEl);
        const anyUnchecked = currentParticipants.some((p) => p.active === false);
        currentParticipants.forEach((p) => (p.active = anyUnchecked));
        refreshTableBody();
      });

      // Thêm kỳ thủ mới (dòng trống)
      modalEl.querySelector('#btnSwissAddRow')?.addEventListener('click', () => {
        sound.playClick();
        syncInputsFromDOM(modalEl);
        currentParticipants.push({
          id: `P-${Date.now().toString().slice(-5)}-${currentParticipants.length + 1}`,
          stt: currentParticipants.length + 1,
          name: '',
          gender: 'Nam',
          unit: '',
          phone: '',
          active: true
        });
        refreshTableBody();
        const rows = modalEl.querySelectorAll('.swiss-player-row');
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
          const inp = lastRow.querySelector('.swiss-p-name');
          if (inp) inp.focus();
        }
      });

      // Nạp danh sách từ hội viên CLB
      modalEl.querySelector('#btnSwissLoadClubMembers')?.addEventListener('click', () => {
        sound.playClick();
        syncInputsFromDOM(modalEl);
        if (members.length === 0) {
          modalManager.showAlert('CLB hiện chưa có thành viên nào trong danh bạ.');
          return;
        }
        modalManager.showConfirm(
          `Nạp toàn bộ ${members.length} thành viên CLB vào danh sách thi đấu?`,
          () => {
            currentParticipants = members.map((m, idx) => ({
              id: m.id || `P-${Date.now().toString().slice(-4)}-${idx + 1}`,
              stt: idx + 1,
              name: m.name || m.fullName || '',
              gender: m.gender || 'Nam',
              unit: m.university || m.faculty || m.class || 'CLB Cờ TNU',
              phone: m.phone || '',
              active: true
            }));
            refreshTableBody();
            modalManager.showAlert(`✅ Đã nạp ${currentParticipants.length} thành viên từ CLB!`);
          }
        );
      });

      // Xóa tất cả các dòng
      modalEl.querySelector('#btnSwissClearAll')?.addEventListener('click', () => {
        sound.playClick();
        modalManager.showConfirm(
          'Bạn có chắc chắn muốn xóa toàn bộ danh sách kỳ thủ trong bảng?',
          () => {
            currentParticipants = [
              { id: `P-1`, stt: 1, name: '', gender: 'Nam', unit: '', phone: '', active: true },
              { id: `P-2`, stt: 2, name: '', gender: 'Nam', unit: '', phone: '', active: true }
            ];
            refreshTableBody();
          },
          null,
          { title: 'XÓA TOÀN BỘ DANH SÁCH', confirmText: 'Xóa danh sách', danger: true }
        );
      });

      // Xử lý nút xóa từng dòng
      modalEl.querySelector('#swissParticipantsTableBody')?.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-del-player-row');
        if (delBtn) {
          sound.playClick();
          syncInputsFromDOM(modalEl);
          const pId = delBtn.getAttribute('data-id');
          currentParticipants = currentParticipants.filter((x) => String(x.id) !== String(pId));
          currentParticipants.forEach((p, i) => (p.stt = i + 1));
          refreshTableBody();
        }
      });

      // Lắng nghe thay đổi checkbox tích chọn thi đấu
      modalEl.querySelector('#swissParticipantsTableBody')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('swiss-p-active')) {
          syncInputsFromDOM(modalEl);
          updateCounts();
        }
      });

      // Gợi ý số vòng đấu
      modalEl.querySelectorAll('.btn-preset-rounds').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const val = btn.getAttribute('data-rounds');
          const input = modalEl.querySelector('#swissTotalRoundsInput');
          if (input) input.value = val;
        });
      });

      // Bắt đầu giải đấu & bốc thăm Vòng 1
      modalEl.querySelector('#btnStartSwissTournament')?.addEventListener('click', () => {
        sound.playClick();
        syncInputsFromDOM(modalEl);
        const rounds = parseInt(modalEl.querySelector('#swissTotalRoundsInput')?.value);
        if (isNaN(rounds) || rounds < 1) {
          modalManager.showAlert('Vui lòng nhập tổng số vòng đấu hợp lệ (ít nhất 1 ván)!');
          return;
        }

        const activePlayers = currentParticipants
          .filter((p) => p.active !== false && p.name && p.name.trim() !== '')
          .map((p, idx) => ({
            id: p.id || `P-${Date.now().toString().slice(-4)}-${idx + 1}`,
            name: p.name.trim(),
            gender: p.gender || 'Nam',
            unit: p.unit ? p.unit.trim() : 'CLB Cờ TNU',
            phone: p.phone ? p.phone.trim() : '',
            studentId: p.phone ? p.phone.trim() : '',
            elo: 1200
          }));

        if (activePlayers.length < 2) {
          modalManager.showAlert('Vui lòng nhập họ tên và tích chọn ít nhất 2 kỳ thủ để bắt đầu giải đấu!');
          return;
        }

        try {
          event.swissParticipants = currentParticipants;
          store.initSwissTournament(event.id, { totalRounds: rounds, playersList: activePlayers });
          modalManager.showAlert(`✅ Đã khởi tạo giải đấu ${rounds} ván với ${activePlayers.length} kỳ thủ và bốc thăm Vòng 1 thành công!`);
          if (typeof onUpdate === 'function') onUpdate();
          this.open(`Quản Trị Thi Đấu Hệ Thụy Sĩ • ${event.title}`, renderModalContent(), null, null);
          bindModalEvents();
        } catch (err) {
          modalManager.showAlert('Lỗi: ' + err.message);
        }
      });

      // Trọng tài sửa số ván giữa chừng
      modalEl.querySelector('#btnEditSwissTotalRoundsMid')?.addEventListener('click', () => {
        sound.playClick();
        const curEv = store.getState().events.find((e) => e.id === event.id);
        const curRounds = curEv?.swissData?.totalRounds || 3;
        const curRoundNum = curEv?.swissData?.currentRound || 1;
        
        const newRoundsStr = prompt(`✍️ TRỌNG TÀI SỬA TỔNG SỐ VÁN ĐẤU:\n\nNhập số ván mới cho giải đấu (Hiện tại: ${curRounds} ván, đã bốc thăm đến vòng ${curRoundNum}):`, curRounds);
        if (newRoundsStr === null) return;
        const newRounds = parseInt(newRoundsStr);
        if (isNaN(newRounds) || newRounds < 1) {
          modalManager.showAlert('Số ván phải là số nguyên dương lớn hơn 0!');
          return;
        }
        if (newRounds < curRoundNum) {
          modalManager.showAlert(`Không thể giảm số ván xuống ${newRounds} vì giải đã bốc thăm đến vòng ${curRoundNum}!`);
          return;
        }

        try {
          store.updateSwissTotalRounds(event.id, newRounds);
          modalManager.showAlert(`✅ Đã cập nhật tổng số ván đấu thành ${newRounds} ván thành công!`);
          if (typeof onUpdate === 'function') onUpdate();
          this.open(`Quản Trị Thi Đấu Hệ Thụy Sĩ • ${event.title}`, renderModalContent(), null, null);
          bindModalEvents();
        } catch (err) {
          modalManager.showAlert('Lỗi: ' + err.message);
        }
      });

      // Nhập kết quả ván đấu
      modalEl.querySelectorAll('.btn-swiss-res').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const matchId = btn.getAttribute('data-match-id');
          const res = btn.getAttribute('data-res');
          const curEv = store.getState().events.find((e) => e.id === event.id);
          const roundNum = curEv?.swissData?.currentRound;

          if (roundNum && matchId && res) {
            store.recordSwissMatchResult(event.id, roundNum, matchId, res);
            if (typeof onUpdate === 'function') onUpdate();
            this.open(`Quản Trị Thi Đấu Hệ Thụy Sĩ • ${event.title}`, renderModalContent(), null, null);
            bindModalEvents();
          }
        });
      });

      // Bốc thăm vòng tiếp theo
      modalEl.querySelector('#btnNextSwissRound')?.addEventListener('click', () => {
        sound.playClick();
        try {
          store.generateNextSwissRound(event.id);
          modalManager.showAlert('✅ Bốc thăm Vòng tiếp theo thành công!');
          if (typeof onUpdate === 'function') onUpdate();
          this.open(`Quản Trị Thi Đấu Hệ Thụy Sĩ • ${event.title}`, renderModalContent(), null, null);
          bindModalEvents();
        } catch (err) {
          modalManager.showAlert('Chưa thể bốc thăm: ' + err.message);
        }
      });

      // Xuất bảng xếp hạng ra file CSV
      modalEl.querySelector('#btnExportSwissStandings')?.addEventListener('click', () => {
        sound.playClick();
        const curEv = store.getState().events.find((e) => e.id === event.id);
        if (curEv?.swissData) {
          exportSwissStandingsCsv(curEv.swissData, curEv.title);
        }
      });

      // Đặt lại giải đấu
      modalEl.querySelector('#btnResetSwissData')?.addEventListener('click', () => {
        sound.playClick();
        modalManager.showConfirm(
          'Bạn có chắc chắn muốn đặt lại giải đấu này về trạng thái ban đầu? Lịch sử các vòng đấu sẽ bị xóa.',
          () => {
            const ev = store.getState().events.find((e) => e.id === event.id);
            if (ev) {
              delete ev.swissData;
              store.notify();
              if (typeof onUpdate === 'function') onUpdate();
              this.open(`Quản Trị Thi Đấu Hệ Thụy Sĩ • ${event.title}`, renderModalContent(), null, null);
              bindModalEvents();
            }
          },
          null,
          { title: 'ĐẶT LẠI GIẢI ĐẤU', confirmText: 'Đặt lại dữ liệu', danger: true }
        );
      });

      // Đóng modal
      modalEl.querySelector('#btnCancelSwiss')?.addEventListener('click', () => {
        this.close();
      });
    };

    this.open(`Quản Trị Thi Đấu Hệ Thụy Sĩ • ${event.title}`, renderModalContent(), null, null);
    bindModalEvents();
  },

  // 13. Public / Member View Swiss Tournament Modal
  openSwissTournamentPublicModal(event) {
    if (!event || !event.swissData) {
      modalManager.showAlert('Giải đấu này chưa có dữ liệu ghép cặp Hệ Thụy Sĩ.');
      return;
    }
    const swiss = event.swissData;
    const activeMember = store.getActiveMember();
    const curRoundData = (swiss.rounds || []).find((r) => r.roundNumber === swiss.currentRound);
    const isFinished = swiss.status === 'completed' || (swiss.currentRound >= swiss.totalRounds && (curRoundData?.matches || []).every((m) => m.result !== null));

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const contentHtml = `
      <div class="swiss-public-modal p-2">
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <span class="badge ${isFinished ? 'badge-emerald' : 'badge-gold'}">
              ${isFinished ? '🏁 GIẢI ĐẤU ĐÃ HOÀN TẤT' : `🟢 VÒNG ${swiss.currentRound} / ${swiss.totalRounds}`}
            </span>
            <h3 class="text-lg font-bold text-white mt-1">${escapeHtml(event.title)}</h3>
          </div>
          <span class="text-xs text-muted">Hệ Thụy Sĩ FIDE Chuẩn</span>
        </div>

        <div class="card p-3 mb-3" style="background: rgba(255,255,255,0.03);">
          <h4 class="font-bold text-white text-xs mb-2">⚔️ CẶP ĐẤU VÒNG ${swiss.currentRound}</h4>
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.8rem;">
              <thead>
                <tr>
                  <th style="width: 50px;">Bàn</th>
                  <th>Quân Trắng</th>
                  <th style="text-align: center; width: 100px;">Tỉ Số</th>
                  <th>Quân Đen</th>
                </tr>
              </thead>
              <tbody>
                ${(curRoundData?.matches || []).map((m) => {
                  const isUserMatch = activeMember && (m.whiteId === activeMember.id || m.blackId === activeMember.id);
                  return `
                    <tr style="${isUserMatch ? 'background: rgba(212,175,55,0.12); border-left: 3px solid var(--gold-primary);' : ''}">
                      <td class="font-bold text-gold">${m.isBye ? 'BYE' : `Bàn ${m.board}`}</td>
                      <td>
                        <strong class="${m.whiteId === activeMember?.id ? 'text-gold' : 'text-white'}">${escapeHtml(m.whiteName)}</strong>
                        ${m.whiteUnit ? `<span class="text-xs text-dim ml-1">(${escapeHtml(m.whiteUnit)})</span>` : ''}
                        <span class="badge" style="background: #ffffff; color: #000; font-size: 10px; margin-left: 4px; padding: 1px 4px;">Trắng</span>
                      </td>
                      <td style="text-align: center;">
                        <span class="badge ${m.result ? 'badge-emerald' : 'badge-outline'}" style="font-size: 0.8rem; font-weight: 700;">
                          ${m.result === '1-0' ? '1 - 0' : m.result === '0-1' ? '0 - 1' : m.result === '0.5-0.5' ? '½ - ½' : 'Chưa đấu'}
                        </span>
                      </td>
                      <td>
                        ${m.isBye ? `<span class="text-muted font-italic">Nghỉ ván (+1đ)</span>` : `
                          <strong class="${m.blackId === activeMember?.id ? 'text-gold' : 'text-white'}">${escapeHtml(m.blackName)}</strong>
                          ${m.blackUnit ? `<span class="text-xs text-dim ml-1">(${escapeHtml(m.blackUnit)})</span>` : ''}
                          <span class="badge" style="background: #1e293b; color: #cbd5e1; border: 1px solid #475569; font-size: 10px; margin-left: 4px; padding: 1px 4px;">Đen</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card p-3" style="background: rgba(255,255,255,0.02);">
          <h4 class="font-bold text-gold text-xs mb-2">📊 BẢNG XẾP HẠNG HỆ THỤY SĨ</h4>
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.78rem;">
              <thead>
                <tr>
                  <th style="width: 45px; text-align: center;">Hạng</th>
                  <th>Kỳ Thủ</th>
                  <th style="text-align: center; width: 75px;">Giới tính</th>
                  <th>Đơn vị</th>
                  <th style="text-align: center; width: 80px;">Điểm</th>
                  <th style="text-align: center; width: 85px;">Buchholz</th>
                  <th style="text-align: center; width: 65px;">Thắng</th>
                </tr>
              </thead>
              <tbody>
                ${(swiss.standings || []).map((p, idx) => {
                  const isUser = activeMember && p.id === activeMember.id;
                  return `
                    <tr style="${isUser ? 'background: rgba(212,175,55,0.12);' : ''}">
                      <td class="font-bold text-center ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-cyan' : idx === 2 ? 'text-emerald' : 'text-muted'}">
                        ${idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : (idx + 1)}
                      </td>
                      <td>
                        <strong class="${isUser ? 'text-gold' : 'text-white'}">${escapeHtml(p.name)}</strong>
                        ${isUser ? '<span class="badge badge-gold" style="font-size:9px; margin-left:4px;">Bạn</span>' : ''}
                      </td>
                      <td style="text-align: center;">
                        <span class="badge ${p.gender === 'Nữ' ? 'badge-pink' : 'badge-outline'}" style="font-size: 10px;">${escapeHtml(p.gender || 'Nam')}</span>
                      </td>
                      <td class="text-dim" style="font-size: 0.75rem;">
                        ${escapeHtml(p.unit || '-')}
                      </td>
                      <td style="text-align: center;">
                        <span class="badge badge-gold font-bold">${p.score}</span>
                      </td>
                      <td style="text-align: center; color: var(--accent-cyan); font-weight:600;">
                        ${p.buchholz}
                      </td>
                      <td style="text-align: center;">${p.wins || 0}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.open(`Lịch Đấu & Xếp Hạng Hệ Thụy Sĩ • ${event.title}`, contentHtml, null, null);
  },

  // 14. Add Fund Payment Modal
  openFundRecordModal(onComplete) {
    const state = store.getState();
    const members = state.members || [];

    const contentHtml = `
      <div class="fund-record-modal p-2">
        <div class="mb-3">
          <span class="badge badge-emerald">QUỸ & HỘI PHÍ CLB CỜ</span>
          <h3 class="text-base font-bold text-white mt-1">Ghi Nhận Đóng Quỹ Thành Viên</h3>
          <p class="text-xs text-muted">Xác nhận thu quỹ và gửi thông báo biên nhận về thẻ thành viên.</p>
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-gold font-bold text-xs">Chọn Kỳ Thủ Đóng Quỹ</label>
          <select class="form-control" id="fundMemberSelect">
            ${members.map((m) => `
              <option value="${m.id}">${m.name} (${m.studentId || 'Kỳ thủ'})</option>
            `).join('')}
          </select>
        </div>

        <div class="d-flex gap-2 mb-3">
          <div class="flex-1">
            <label class="form-label text-white text-xs">Số Tiền Đóng (VNĐ)</label>
            <input type="number" class="form-control" id="fundAmountInput" value="50000" step="10000">
          </div>
          <div class="flex-1">
            <label class="form-label text-white text-xs">Kỳ Đóng Quỹ</label>
            <input type="text" class="form-control" id="fundTermInput" value="Học kỳ I (2026 - 2027)">
          </div>
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-white text-xs">Ghi chú (Tùy chọn)</label>
          <input type="text" class="form-control" id="fundNoteInput" placeholder="VD: Đã nộp qua chuyển khoản / tiền mặt">
        </div>

        <div class="d-flex justify-end gap-2">
          <button type="button" class="btn btn-outline btn-sm" id="btnCancelFund">Hủy</button>
          <button type="button" class="btn btn-gold btn-sm" id="btnConfirmFund">
            ✅ Xác Nhận Đã Thu Quỹ
          </button>
        </div>
      </div>
    `;

    this.open('Xác Nhận Thu Quỹ Thành Viên', contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnCancelFund')?.addEventListener('click', () => this.close());
      modalEl.querySelector('#btnConfirmFund')?.addEventListener('click', () => {
        sound.playClick();
        const memberId = modalEl.querySelector('#fundMemberSelect')?.value;
        const amount = parseInt(modalEl.querySelector('#fundAmountInput')?.value) || 50000;
        const term = modalEl.querySelector('#fundTermInput')?.value || 'Học kỳ I (2026 - 2027)';
        const note = modalEl.querySelector('#fundNoteInput')?.value || 'Đóng hội phí CLB Cờ';

        if (!memberId) {
          modalManager.showAlert('Vui lòng chọn kỳ thủ!');
          return;
        }

        store.addFundRecord({
          memberId,
          amount,
          term,
          note,
          confirmedBy: 'Ban Quản Trị'
        });

        this.close();
        modalManager.showAlert(`✅ Đã xác nhận thu quỹ ${amount.toLocaleString('vi-VN')}đ thành công! Hệ thống đã gửi thông báo đến kỳ thủ.`);
        if (typeof onComplete === 'function') onComplete();
      });
    }
  },

  // 15. Create Fund Campaign Modal (Tạo đợt thu quỹ theo tháng / sự kiện)
  openCreateFundCampaignModal(onComplete) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const defaultDeadline = nextMonth.toISOString().slice(0, 10);

    const contentHtml = `
      <div class="fund-campaign-modal p-2" style="max-width: 620px;">
        <div class="mb-3">
          <span class="badge badge-gold">ĐỢT THU QUỸ MỚI</span>
          <h3 class="text-lg font-bold text-white mt-1">Tạo Đợt Thu Quỹ Theo Tháng / Sự Kiện</h3>
          <p class="text-xs text-muted">Thiết lập định mức thu theo từng tháng hoặc giải đấu. Hệ thống sẽ tự sinh mã VietQR động để thành viên thanh toán tự động ghi nhận.</p>
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-gold font-bold text-xs">Tên Đợt Thu Quỹ *</label>
          <input type="text" class="form-control" id="campTitleInput" placeholder="VD: Quỹ Sinh Hoạt Tháng 11/2026, Quỹ Giải Cờ Thu Đông..." value="Quỹ Sinh Hoạt Tháng ${(new Date().getMonth() + 1)}/${new Date().getFullYear()}">
        </div>

        <div class="mb-3">
          <label class="form-label text-gold font-bold text-xs">Định Mức Đóng Mỗi Kỳ Thủ (VNĐ) *</label>
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-outline btn-xs btn-preset-amount" data-amount="20000">20.000đ</button>
            <button type="button" class="btn btn-outline btn-xs btn-preset-amount" data-amount="30000">30.000đ</button>
            <button type="button" class="btn btn-outline btn-xs btn-preset-amount" data-amount="50000">50.000đ</button>
            <button type="button" class="btn btn-outline btn-xs btn-preset-amount" data-amount="100000">100.000đ</button>
          </div>
          <input type="number" class="form-control font-mono font-bold" id="campAmountInput" value="30000" step="5000" style="color: #10b981; font-size: 1.1rem;">
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-white text-xs">Hạn Chót Đóng Tiền</label>
          <input type="date" class="form-control" id="campDeadlineInput" value="${defaultDeadline}">
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-white text-xs">Mục Đích Thu & Kế Hoạch Chi Tiêu</label>
          <textarea class="form-control text-xs" id="campDescInput" rows="2" placeholder="VD: Mua bàn cờ mới, tiền nước uống sinh hoạt hàng tuần và khen thưởng...">Tiền nước uống sinh hoạt hàng tuần, mua sắm bổ sung quân cờ và quỹ khen thưởng hoạt động tháng.</textarea>
        </div>

        <div class="card p-3 mb-3" style="background: rgba(14,23,46,0.6); border: 1px solid rgba(212,175,55,0.3);">
          <div class="text-xs font-bold text-gold mb-2">💳 Tài Khoản Ngân Hàng Nhận Tiền (Tạo mã VietQR tự động)</div>
          <div class="row g-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="form-label text-dim text-xs">Ngân hàng</label>
              <select class="form-control text-xs" id="campBankCodeSelect">
                <option value="MB" selected>MB Bank (Quân Đội)</option>
                <option value="VCB">Vietcombank</option>
                <option value="CTG">VietinBank</option>
                <option value="BIDV">BIDV</option>
                <option value="TCB">Techcombank</option>
                <option value="ACB">ACB</option>
                <option value="TPB">TPBank</option>
                <option value="VPB">VPBank</option>
              </select>
            </div>
            <div>
              <label class="form-label text-dim text-xs">Số tài khoản nhận</label>
              <input type="text" class="form-control text-xs font-mono" id="campBankAccountInput" value="80402233445566">
            </div>
          </div>
          <div class="mt-2">
            <label class="form-label text-dim text-xs">Tên chủ tài khoản (Viết hoa không dấu)</label>
            <input type="text" class="form-control text-xs" id="campBankOwnerInput" value="HOANG MINH TUNG">
          </div>
        </div>

        <div class="d-flex justify-end gap-2">
          <button type="button" class="btn btn-outline btn-sm" id="btnCancelCamp">Hủy bỏ</button>
          <button type="button" class="btn btn-gold btn-sm" id="btnSaveCamp">
            🎯 Tạo & Công Bố Đợt Thu
          </button>
        </div>
      </div>
    `;

    this.open('Tạo Đợt Thu Quỹ CLB Mới', contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelectorAll('.btn-preset-amount').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const amt = btn.getAttribute('data-amount');
          const input = modalEl.querySelector('#campAmountInput');
          if (input) input.value = amt;
        });
      });

      modalEl.querySelector('#btnCancelCamp')?.addEventListener('click', () => this.close());
      modalEl.querySelector('#btnSaveCamp')?.addEventListener('click', () => {
        sound.playClick();
        const title = modalEl.querySelector('#campTitleInput')?.value?.trim();
        const amount = parseInt(modalEl.querySelector('#campAmountInput')?.value) || 0;
        const deadline = modalEl.querySelector('#campDeadlineInput')?.value;
        const description = modalEl.querySelector('#campDescInput')?.value?.trim();
        const bankCode = modalEl.querySelector('#campBankCodeSelect')?.value || 'MB';
        const bankAccount = modalEl.querySelector('#campBankAccountInput')?.value?.trim() || '80402233445566';
        const bankOwner = modalEl.querySelector('#campBankOwnerInput')?.value?.trim() || 'HOANG MINH TUNG';

        if (!title) {
          modalManager.showAlert('Vui lòng nhập tên đợt thu quỹ!');
          return;
        }
        if (amount <= 0) {
          modalManager.showAlert('Số tiền định mức phải lớn hơn 0đ!');
          return;
        }

        store.addFundCampaign({
          title,
          amount,
          deadline,
          description,
          bankCode,
          bankAccount,
          bankOwner
        });

        this.close();
        modalManager.showAlert(`✅ Đã tạo đợt thu quỹ "${title}" với mức ${amount.toLocaleString('vi-VN')}đ thành công! Kỳ thủ có thể quét mã VietQR tự động thanh toán ngay.`);
        if (typeof onComplete === 'function') onComplete();
      });
    }
  },

  // 16. VietQR Payment Modal (Thành viên quét QR tự động ghi nhận vào quỹ)
  openVietQRPaymentModal(campaign, member, onComplete) {
    if (!campaign) return;
    const activeMember = member || store.getActiveMember();
    if (!activeMember) {
      modalManager.showAlert('Vui lòng đăng nhập thẻ thành viên để đóng quỹ!');
      return;
    }

    const bankCode = campaign.bankCode || 'MB';
    const bankAccount = campaign.bankAccount || '80402233445566';
    const bankOwner = campaign.bankOwner || 'HOANG MINH TUNG';
    const amount = campaign.amount || 30000;
    const studentIdClean = (activeMember.studentId || activeMember.phone || activeMember.id || 'KYTHU').replace(/[^a-zA-Z0-9]/g, '');
    const transferNote = `CLBCO ${campaign.id} ${studentIdClean}`;

    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(bankOwner)}`;

    const contentHtml = `
      <div class="vietqr-modal-content p-2" style="max-width: 680px;">
        <div class="text-center mb-3">
          <span class="badge badge-emerald">⚡ CƠ CHẾ ĐÓNG QUỸ TỰ ĐỘNG KHÔNG CẦN NHẬP TAY</span>
          <h3 class="text-lg font-bold text-white mt-1">Quét VietQR Đóng: ${campaign.title}</h3>
          <p class="text-xs text-muted">Mã QR đã gắn sẵn chính xác số tiền và mã định danh của bạn. Sau khi chuyển khoản, bấm nút xác nhận để hệ thống tự động ghi sổ.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; align-items: center;" class="mb-3">
          <!-- QR Card -->
          <div class="text-center p-3" style="background: #fff; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <img src="${qrUrl}" alt="VietQR Napas 247" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 8px;">
            <div style="color: #0f172a; font-size: 11px; font-weight: bold; margin-top: 8px;">
              🛡️ NAPAS 24/7 • VIETQR CHUẨN QUỐC GIA
            </div>
          </div>

          <!-- Transaction Info -->
          <div>
            <div class="card p-3 mb-3" style="background: rgba(14,23,46,0.8); border: 1px solid var(--border-gold);">
              <div class="d-flex justify-between align-center mb-2 pb-2" style="border-bottom: 1px dashed rgba(212,175,55,0.2);">
                <span class="text-xs text-muted">Số tiền cần đóng:</span>
                <span class="font-bold text-emerald font-mono" style="font-size: 1.25rem;">${amount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div class="d-flex justify-between align-center mb-2 pb-2" style="border-bottom: 1px dashed rgba(212,175,55,0.2);">
                <span class="text-xs text-muted">Ngân hàng:</span>
                <span class="font-bold text-white text-xs">${bankCode} Bank</span>
              </div>
              <div class="d-flex justify-between align-center mb-2 pb-2" style="border-bottom: 1px dashed rgba(212,175,55,0.2);">
                <span class="text-xs text-muted">Số tài khoản:</span>
                <span class="d-flex align-center gap-1">
                  <strong class="font-mono text-gold text-xs">${bankAccount}</strong>
                  <button type="button" class="btn btn-outline btn-xs py-0 px-1 btn-copy-field" data-copy="${bankAccount}" title="Sao chép">📋</button>
                </span>
              </div>
              <div class="d-flex justify-between align-center mb-2 pb-2" style="border-bottom: 1px dashed rgba(212,175,55,0.2);">
                <span class="text-xs text-muted">Chủ tài khoản:</span>
                <span class="font-bold text-white text-xs">${bankOwner}</span>
              </div>
              <div class="d-flex justify-between align-center mb-1">
                <span class="text-xs text-muted">Nội dung CK:</span>
                <span class="d-flex align-center gap-1">
                  <strong class="font-mono text-gold text-xs">${transferNote}</strong>
                  <button type="button" class="btn btn-outline btn-xs py-0 px-1 btn-copy-field" data-copy="${transferNote}" title="Sao chép">📋</button>
                </span>
              </div>
            </div>

            <div class="p-2 mb-3" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px;">
              <div class="text-xs text-emerald font-bold mb-1">💡 Hướng Dẫn Nộp Quỹ Nhanh:</div>
              <div class="text-xs text-muted" style="line-height: 1.4;">
                1. Mở App Ngân hàng (MB, VCB, Momo, Techcombank...) quét mã QR trên.<br>
                2. App sẽ tự động điền đúng số tiền và nội dung.<br>
                3. Bấm xác nhận chuyển khoản trên App.<br>
                4. Nhấn nút <strong>"⚡ Tôi Đã Chuyển Khoản Xong"</strong> bên dưới để hệ thống tự động ghi nhận ngay!
              </div>
            </div>

            <button type="button" class="btn btn-gold w-100 py-2 font-bold" id="btnConfirmMemberPaid">
              ⚡ Tôi Đã Chuyển Khoản Xong (Tự Động Ghi Nhận)
            </button>
          </div>
        </div>

        <div class="text-center">
          <button type="button" class="btn btn-outline btn-xs" id="btnCloseVietQRModal">Đóng lại</button>
        </div>
      </div>
    `;

    this.open('Thanh Toán Quỹ CLB Bằng VietQR Tự Động', contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnCloseVietQRModal')?.addEventListener('click', () => this.close());

      modalEl.querySelectorAll('.btn-copy-field').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const text = btn.getAttribute('data-copy');
          navigator.clipboard.writeText(text);
          btn.textContent = '✅';
          setTimeout(() => (btn.textContent = '📋'), 1500);
        });
      });

      modalEl.querySelector('#btnConfirmMemberPaid')?.addEventListener('click', () => {
        sound.playClick();
        try {
          const rec = store.memberSelfPayFund({
            campaignId: campaign.id,
            memberId: activeMember.id,
            note: `Tự động đối soát qua VietQR [${transferNote}]`,
            method: 'VietQR Chuyển Khoản'
          });

          this.close();
          sound.playSuccess();
          modalManager.showAlert(
            `🎉 Chúc mừng ${activeMember.name}!\n\nHệ thống đã tự động ghi nhận thành công số tiền ${amount.toLocaleString('vi-VN')}đ cho đợt [${campaign.title}].\n\nMã biên nhận điện tử: ${rec.id}\nBan Quản Trị xin chân thành cảm ơn đóng góp của bạn!`
          );
          if (typeof onComplete === 'function') onComplete();
        } catch (err) {
          modalManager.showAlert(err.message || 'Lỗi xử lý đóng quỹ!');
        }
      });
    }
  },

  // 17. Campaign VietQR General Modal (Mã QR tổng quát cho cả CLB dán Zalo)
  openCampaignVietQRGeneralModal(campaign) {
    if (!campaign) return;
    const bankCode = campaign.bankCode || 'MB';
    const bankAccount = campaign.bankAccount || '80402233445566';
    const bankOwner = campaign.bankOwner || 'HOANG MINH TUNG';
    const amount = campaign.amount || 30000;
    const generalNote = `CLBCO ${campaign.id} MASV`;

    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(generalNote)}&accountName=${encodeURIComponent(bankOwner)}`;

    const contentHtml = `
      <div class="general-vietqr-modal p-2 text-center" style="max-width: 500px;">
        <span class="badge badge-gold">MÃ QR ĐỢT THU CHO TOÀN BỘ CLB</span>
        <h3 class="text-base font-bold text-white mt-1">${campaign.title}</h3>
        <p class="text-xs text-muted mb-3">Tải ảnh hoặc sao chép mã gửi vào Nhóm Zalo để tất cả kỳ thủ quét nộp.</p>

        <div class="p-3 mb-3" style="background: #fff; border-radius: 12px; display: inline-block;">
          <img src="${qrUrl}" alt="VietQR" style="max-width: 280px; width: 100%; height: auto; border-radius: 8px;">
        </div>

        <div class="card p-3 text-left mb-3" style="background: rgba(14,23,46,0.8); border: 1px solid var(--border-gold); font-size: 12px;">
          <div>💰 <strong>Định mức:</strong> ${(campaign.amount || 0).toLocaleString('vi-VN')} đ / người</div>
          <div>🏦 <strong>STK:</strong> <span class="font-mono text-gold">${bankAccount}</span> (${bankCode})</div>
          <div>👤 <strong>Chủ TK:</strong> ${bankOwner}</div>
          <div>📝 <strong>Cú pháp CK:</strong> <span class="font-mono text-gold">${generalNote}</span> (Thay MASV bằng mã sinh viên của kỳ thủ)</div>
        </div>

        <div class="d-flex justify-center gap-2">
          <a href="${qrUrl}" download="VietQR_${campaign.id}.png" target="_blank" class="btn btn-gold btn-sm">
            📥 Tải Ảnh QR Xuống
          </a>
          <button type="button" class="btn btn-outline btn-sm" id="btnCopyZaloTemplate">
            📋 Sao Chép Cú Pháp Zalo
          </button>
        </div>
      </div>
    `;

    this.open('Mã VietQR Đợt Thu Quỹ', contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnCopyZaloTemplate')?.addEventListener('click', () => {
        sound.playClick();
        const text = `📢 THÔNG BÁO NỘP QUỸ: ${campaign.title}\n💰 Định mức: ${(campaign.amount || 0).toLocaleString('vi-VN')}đ / người\n🗓️ Hạn chót: ${campaign.deadline || 'Sớm nhất'}\n🏦 Ngân hàng: ${bankCode} - STK: ${bankAccount}\n👤 Chủ TK: ${bankOwner}\n📝 Cú pháp chuyển khoản: CLBCO ${campaign.id} [MÃ_SINH_VIÊN]\n(Hệ thống website sẽ tự động ghi sổ và cấp biên nhận số ngay khi chuyển khoản)`;
        navigator.clipboard.writeText(text);
        modalManager.showAlert('✅ Đã sao chép nội dung thông báo vào bộ nhớ tạm! Bạn có thể dán ngay vào Nhóm Zalo CLB.');
      });
    }
  },

  // 18. Campaign Member Status Modal (Chi tiết ai đã đóng / ai chưa đóng)
  openCampaignMemberStatusModal(campaign, onComplete) {
    if (!campaign) return;
    const state = store.getState();
    const members = state.members || [];
    const fundRecords = state.fundRecords || [];

    const paidRecordsMap = new Map();
    fundRecords.forEach((r) => {
      if (r.campaignId === campaign.id || r.term === campaign.title) {
        paidRecordsMap.set(r.memberId, r);
      }
    });

    const paidMembers = [];
    const unpaidMembers = [];

    members.forEach((m) => {
      const record = paidRecordsMap.get(m.id);
      if (record) {
        paidMembers.push({ member: m, record });
      } else {
        unpaidMembers.push({ member: m });
      }
    });

    const totalCollected = paidMembers.reduce((sum, item) => sum + (parseInt(item.record.amount) || campaign.amount), 0);
    const expectedTotal = members.length * campaign.amount;
    const progressPercent = members.length > 0 ? Math.round((paidMembers.length / members.length) * 100) : 0;

    const renderList = (filterType = 'all') => {
      let filtered = [];
      if (filterType === 'all') {
        filtered = members.map((m) => ({ member: m, record: paidRecordsMap.get(m.id) }));
      } else if (filterType === 'unpaid') {
        filtered = unpaidMembers.map((item) => ({ member: item.member, record: null }));
      } else if (filterType === 'paid') {
        filtered = paidMembers;
      }

      if (filtered.length === 0) {
        return `<div class="p-4 text-center text-muted">Không có kỳ thủ nào trong danh mục này.</div>`;
      }

      return `
        <div class="table-responsive" style="max-height: 340px; overflow-y: auto;">
          <table class="data-table text-xs">
            <thead>
              <tr>
                <th>Họ & Tên</th>
                <th>Mã SV</th>
                <th>Lớp / Khoa</th>
                <th>Trạng Thái</th>
                <th style="text-align: right;">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(({ member, record }) => `
                <tr>
                  <td><strong>${member.name}</strong></td>
                  <td><span class="font-mono text-muted">${member.studentId || '---'}</span></td>
                  <td><span class="text-dim">${member.class || member.cohort || '---'}</span></td>
                  <td>
                    ${record ? `
                      <span class="badge badge-emerald">
                        ✅ Đã nộp ${(parseInt(record.amount) || campaign.amount).toLocaleString('vi-VN')}đ (${record.date})
                      </span>
                    ` : `
                      <span class="badge badge-warning">⏳ Chưa nộp</span>
                    `}
                  </td>
                  <td style="text-align: right;">
                    ${record ? `
                      <span class="text-xs text-muted font-mono">${record.id}</span>
                    ` : `
                      <button type="button" class="btn btn-gold btn-xs btn-quick-cash-pay" data-member-id="${member.id}" title="Ghi nhận nộp tiền mặt">
                        💵 Đã thu tiền mặt
                      </button>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    const contentHtml = `
      <div class="campaign-status-modal p-2" style="max-width: 760px;">
        <div class="mb-3">
          <span class="badge badge-gold">TIẾN ĐỘ THU QUỸ THEO ĐỢT</span>
          <h3 class="text-lg font-bold text-white mt-1">${campaign.title}</h3>
          <p class="text-xs text-muted">Định mức: <strong>${(campaign.amount || 0).toLocaleString('vi-VN')} đ / kỳ thủ</strong> • Hạn chót: <strong>${campaign.deadline || 'Không giới hạn'}</strong></p>
        </div>

        <!-- Metric KPI -->
        <div class="row g-2 mb-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
          <div class="card p-2 text-center" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);">
            <div class="text-xs text-muted">ĐÃ HOÀN THÀNH</div>
            <div class="text-xl font-bold text-emerald">${paidMembers.length} / ${members.length} kỳ thủ</div>
            <div class="text-xs text-dim">${progressPercent}% đạt chỉ tiêu</div>
          </div>
          <div class="card p-2 text-center" style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3);">
            <div class="text-xs text-muted">CHƯA ĐÓNG QUỸ</div>
            <div class="text-xl font-bold text-gold">${unpaidMembers.length} kỳ thủ</div>
            <div class="text-xs text-dim">Cần nhắc nhở</div>
          </div>
          <div class="card p-2 text-center" style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3);">
            <div class="text-xs text-muted">TỔNG TIỀN THU ĐƯỢC</div>
            <div class="text-xl font-bold text-cyan">${totalCollected.toLocaleString('vi-VN')} đ</div>
            <div class="text-xs text-dim">Mục tiêu: ${expectedTotal.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <!-- Filter tabs & Action -->
        <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
          <div class="d-flex gap-1" id="filterStatusGroup">
            <button type="button" class="btn btn-gold btn-xs btn-status-filter" data-filter="all">Tất cả (${members.length})</button>
            <button type="button" class="btn btn-outline btn-xs btn-status-filter" data-filter="unpaid">Chưa nộp (${unpaidMembers.length})</button>
            <button type="button" class="btn btn-outline btn-xs btn-status-filter" data-filter="paid">Đã nộp (${paidMembers.length})</button>
          </div>
          <button type="button" class="btn btn-outline btn-xs" id="btnCopyUnpaidZaloReminder">
            📢 Sao chép DS chưa nộp để gửi Zalo
          </button>
        </div>

        <!-- Member list container -->
        <div id="campaignMemberListContainer" class="card mb-3 p-1">
          ${renderList('all')}
        </div>

        <div class="d-flex justify-end">
          <button type="button" class="btn btn-outline btn-sm" id="btnCloseStatusModal">Đóng lại</button>
        </div>
      </div>
    `;

    this.open('Danh Sách Kỳ Thủ Đóng Quỹ', contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnCloseStatusModal')?.addEventListener('click', () => this.close());

      const listContainer = modalEl.querySelector('#campaignMemberListContainer');

      const bindActions = () => {
        listContainer.querySelectorAll('.btn-quick-cash-pay').forEach((btn) => {
          btn.addEventListener('click', () => {
            sound.playClick();
            const memberId = btn.getAttribute('data-member-id');
            const targetMember = members.find((m) => m.id === memberId);
            if (!targetMember) return;

            store.addFundRecord({
              memberId: targetMember.id,
              amount: campaign.amount,
              term: campaign.title,
              note: `Thu tiền mặt trực tiếp đợt [${campaign.title}]`,
              confirmedBy: 'Ban Quản Trị'
            });

            sound.playSuccess();
            modalManager.showAlert(`✅ Đã ghi nhận thu tiền mặt từ kỳ thủ ${targetMember.name}!`);
            this.close();
            this.openCampaignMemberStatusModal(campaign, onComplete);
            if (typeof onComplete === 'function') onComplete();
          });
        });
      };

      bindActions();

      modalEl.querySelectorAll('.btn-status-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          modalEl.querySelectorAll('.btn-status-filter').forEach((b) => {
            b.classList.remove('btn-gold');
            b.classList.add('btn-outline');
          });
          btn.classList.remove('btn-outline');
          btn.classList.add('btn-gold');
          const filter = btn.getAttribute('data-filter');
          listContainer.innerHTML = renderList(filter);
          bindActions();
        });
      });

      modalEl.querySelector('#btnCopyUnpaidZaloReminder')?.addEventListener('click', () => {
        sound.playClick();
        if (unpaidMembers.length === 0) {
          modalManager.showAlert('🎉 Tuyệt vời! Toàn bộ kỳ thủ đã hoàn thành đóng quỹ đợt này.');
          return;
        }

        const lines = unpaidMembers.map((item, idx) => `${idx + 1}. ${item.member.name} (${item.member.studentId || 'Kỳ thủ'})`).join('\n');
        const text = `📢 NHẮC NỘP TIỀN QUỸ: ${campaign.title}\n💰 Định mức: ${(campaign.amount || 0).toLocaleString('vi-VN')}đ | Hạn chót: ${campaign.deadline || 'Sớm nhất'}\n⚠️ Danh sách kỳ thủ chưa nộp (${unpaidMembers.length} bạn):\n${lines}\n\n👉 Vui lòng chuyển khoản về STK: ${campaign.bankAccount} (${campaign.bankCode}) - Cú pháp: CLBCO ${campaign.id} [MÃ_SINH_VIÊN]\nHoặc vào website mục Thẻ Thành Viên bấm "Đóng Quỹ" để quét mã VietQR tự động nhé!`;
        navigator.clipboard.writeText(text);
        modalManager.showAlert('✅ Đã sao chép danh sách các kỳ thủ chưa nộp! Hãy dán vào Nhóm Zalo CLB để nhắc nhở.');
      });
    }
  },

  // 19. Fund Automation Guide Modal
  openFundAutomationGuideModal() {
    const contentHtml = `
      <div class="fund-automation-guide p-2" style="max-width: 640px;">
        <div class="mb-3">
          <span class="badge badge-emerald">CƠ CHẾ VẬN HÀNH THÔNG MINH</span>
          <h3 class="text-lg font-bold text-white mt-1">Cơ Chế Tự Động Ghi Nhận Quỹ Không Cần Nhập Tay</h3>
          <p class="text-xs text-muted">Giải pháp giúp Ban Quản Trị không phải đối soát số dư hay gõ tay từng hóa đơn biên nhận.</p>
        </div>

        <div class="card p-3 mb-3" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3);">
          <div class="d-flex align-center gap-2 mb-2">
            <span style="font-size: 1.5rem;">📱</span>
            <div>
              <strong class="text-emerald text-sm">Cơ Chế 1: VietQR Động + Tự Xác Nhận Đối Soát Cú Pháp (Đang Hoạt Động)</strong>
              <div class="text-xs text-dim">Miễn phí 100% • Không cần cài thêm máy chủ</div>
            </div>
          </div>
          <div class="text-xs text-muted" style="line-height: 1.5;">
            • Khi Admin tạo đợt thu mới, hệ thống tự động sinh ra mã <strong>VietQR Napas 24/7</strong> theo chuẩn quốc gia.<br>
            • Khi thành viên quét mã trên website, số tài khoản, số tiền và <strong>cú pháp định danh (VD: CLBCO CAMP-1026 K2155...)</strong> được điền chính xác 100%.<br>
            • Thành viên bấm <em>"Tôi đã chuyển khoản"</em>, hệ thống tự động lưu vào Sổ Quỹ, cấp mã biên nhận số [FND-xxx] và gửi thông báo chuông 🔔 đến điện thoại kỳ thủ. Admin không cần gõ phím.
          </div>
        </div>

        <div class="card p-3 mb-3" style="background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.3);">
          <div class="d-flex align-center gap-2 mb-2">
            <span style="font-size: 1.5rem;">⚡</span>
            <div>
              <strong class="text-cyan text-sm">Cơ Chế 2: Tự Động 100% Không Cần Bấm (Tích Hợp Webhook SePay / Casso)</strong>
              <div class="text-xs text-dim">Tiền về tài khoản ("ting ting") là website tự gạch nợ tức thì</div>
            </div>
          </div>
          <div class="text-xs text-muted" style="line-height: 1.5;">
            • Kết nối tài khoản MB Bank / Vietcombank của CLB với cổng miễn phí <strong>SePay.vn</strong> hoặc <strong>Casso.vn</strong>.<br>
            • Khi có tiền vào tài khoản đúng cú pháp, ngân hàng sẽ bắn tín hiệu Webhook về hệ thống.<br>
            • Hệ thống sẽ tự động gạch tên thành viên đã nộp mà cả Admin lẫn thành viên không cần bấm bất kỳ nút nào!
          </div>
        </div>

        <div class="d-flex justify-end">
          <button type="button" class="btn btn-gold btn-sm" id="btnCloseGuideModal">Đã Hiểu</button>
        </div>
      </div>
    `;

    this.open('Hướng Dẫn Tự Động Hóa Quỹ CLB', contentHtml, null, null);
    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnCloseGuideModal')?.addEventListener('click', () => this.close());
    }
  },

  // 20. Live Fund Settings Modal (Thiết lập tháng & số tiền thu của tháng đó)
  openFundSettingsModal(onComplete) {
    const settings = store.getFundSettings();

    const contentHtml = `
      <div class="fund-settings-modal p-2" style="max-width: 540px;">
        <div class="mb-3">
          <span class="badge badge-gold">CÀI ĐẶT THU QUỸ SINH HOẠT</span>
          <h3 class="text-lg font-bold text-white mt-1">Thiết Lập Tháng & Số Tiền Thu</h3>
          <p class="text-xs text-muted">Mỗi tháng CLB có thể thu một số tiền khác nhau. Mã QR để bàn và mã QR của thành viên sẽ tự động cập nhật theo cài đặt này.</p>
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-gold font-bold text-xs">Tháng Thu Quỹ (Định dạng MM/YYYY) *</label>
          <input type="text" class="form-control" id="fundSettingMonth" value="${settings.month || '10/2026'}" placeholder="VD: 10/2026, 11/2026...">
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-gold font-bold text-xs">Tên Đợt Thu Quỹ *</label>
          <input type="text" class="form-control" id="fundSettingTitle" value="${settings.title || 'Quỹ Sinh Hoạt Tháng 10/2026'}" placeholder="VD: Quỹ Sinh Hoạt Tháng 10/2026">
        </div>

        <div class="mb-3">
          <label class="form-label text-gold font-bold text-xs">Số Tiền Cần Đóng Của Tháng Đó (VNĐ) *</label>
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-outline btn-xs btn-preset-fund-amt" data-amount="20000">20.000đ</button>
            <button type="button" class="btn btn-outline btn-xs btn-preset-fund-amt" data-amount="30000">30.000đ</button>
            <button type="button" class="btn btn-outline btn-xs btn-preset-fund-amt" data-amount="50000">50.000đ</button>
            <button type="button" class="btn btn-outline btn-xs btn-preset-fund-amt" data-amount="100000">100.000đ</button>
          </div>
          <input type="number" class="form-control font-mono font-bold" id="fundSettingAmount" value="${settings.amount || 30000}" step="5000" style="color: #10b981; font-size: 1.15rem;">
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-white text-xs">Cú Pháp Chuyển Khoản Mặc Định</label>
          <input type="text" class="form-control font-mono text-xs" id="fundSettingSyntax" value="${settings.syntaxPrefix || 'QUY T10'}" placeholder="VD: QUY T10">
          <small class="text-dim text-xs mt-1 d-block">Hệ thống sẽ tự nối thêm Mã SV của kỳ thủ (VD: QUY T10 2155...)</small>
        </div>

        <div class="card p-3 mb-3" style="background: rgba(14,23,46,0.6); border: 1px solid rgba(212,175,55,0.25);">
          <div class="text-xs font-bold text-gold mb-2">💳 Tài Khoản Ngân Hàng Nhận Quỹ</div>
          <div class="row g-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="form-label text-dim text-xs">Ngân hàng</label>
              <select class="form-control text-xs" id="fundSettingBankCode">
                <option value="MB" ${settings.bankCode === 'MB' ? 'selected' : ''}>MB Bank (Quân Đội)</option>
                <option value="VCB" ${settings.bankCode === 'VCB' ? 'selected' : ''}>Vietcombank</option>
                <option value="CTG" ${settings.bankCode === 'CTG' ? 'selected' : ''}>VietinBank</option>
                <option value="BIDV" ${settings.bankCode === 'BIDV' ? 'selected' : ''}>BIDV</option>
                <option value="TCB" ${settings.bankCode === 'TCB' ? 'selected' : ''}>Techcombank</option>
                <option value="ACB" ${settings.bankCode === 'ACB' ? 'selected' : ''}>ACB</option>
                <option value="TPB" ${settings.bankCode === 'TPB' ? 'selected' : ''}>TPBank</option>
                <option value="VPB" ${settings.bankCode === 'VPB' ? 'selected' : ''}>VPBank</option>
              </select>
            </div>
            <div>
              <label class="form-label text-dim text-xs">Số tài khoản nhận</label>
              <input type="text" class="form-control text-xs font-mono" id="fundSettingBankAccount" value="${settings.bankAccount || '80402233445566'}">
            </div>
          </div>
          <div class="mt-2">
            <label class="form-label text-dim text-xs">Chủ tài khoản (Viết hoa)</label>
            <input type="text" class="form-control text-xs" id="fundSettingBankOwner" value="${settings.bankOwner || 'HOANG MINH TUNG'}">
          </div>
        </div>

        <div class="d-flex justify-end gap-2">
          <button type="button" class="btn btn-outline btn-sm" id="btnCancelFundSettings">Hủy</button>
          <button type="button" class="btn btn-gold btn-sm" id="btnSaveFundSettings">
            💾 Lưu Cài Đặt
          </button>
        </div>
      </div>
    `;

    this.open('Cài Đặt Tháng & Số Tiền Thu Quỹ', contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelectorAll('.btn-preset-fund-amt').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const amt = btn.getAttribute('data-amount');
          const input = modalEl.querySelector('#fundSettingAmount');
          if (input) input.value = amt;
        });
      });

      modalEl.querySelector('#btnCancelFundSettings')?.addEventListener('click', () => this.close());
      modalEl.querySelector('#btnSaveFundSettings')?.addEventListener('click', () => {
        sound.playClick();
        const month = modalEl.querySelector('#fundSettingMonth')?.value?.trim() || '10/2026';
        const title = modalEl.querySelector('#fundSettingTitle')?.value?.trim() || `Quỹ Sinh Hoạt Tháng ${month}`;
        const amount = parseInt(modalEl.querySelector('#fundSettingAmount')?.value) || 30000;
        const syntaxPrefix = modalEl.querySelector('#fundSettingSyntax')?.value?.trim() || 'QUY';
        const bankCode = modalEl.querySelector('#fundSettingBankCode')?.value || 'MB';
        const bankAccount = modalEl.querySelector('#fundSettingBankAccount')?.value?.trim() || '80402233445566';
        const bankOwner = modalEl.querySelector('#fundSettingBankOwner')?.value?.trim() || 'HOANG MINH TUNG';

        store.updateFundSettings({
          month,
          title,
          amount,
          syntaxPrefix,
          bankCode,
          bankAccount,
          bankOwner
        });

        this.close();
        sound.playSuccess();
        modalManager.showAlert(`✅ Đã cập nhật quỹ ${title} với định mức ${amount.toLocaleString('vi-VN')}đ! Mã VietQR thu trực tiếp đã được làm mới.`);
        if (typeof onComplete === 'function') onComplete();
      });
    }
  },

  // 21. Member Personal Live Fund QR Modal (Mã QR riêng cho từng kỳ thủ kèm mã SV)
  openMemberPersonalFundQRModal(member, onComplete) {
    if (!member) return;
    const settings = store.getFundSettings();
    const amount = settings.amount || 30000;
    const studentIdClean = (member.studentId || member.phone || member.id || 'KYTHU').replace(/[^a-zA-Z0-9]/g, '');
    const transferNote = `${settings.syntaxPrefix || 'QUY'} ${studentIdClean}`;
    const qrUrl = `https://img.vietqr.io/image/${settings.bankCode || 'MB'}-${settings.bankAccount || '80402233445566'}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(settings.bankOwner || 'HOANG MINH TUNG')}`;

    const contentHtml = `
      <div class="member-fund-qr-modal p-2 text-center" style="max-width: 480px;">
        <span class="badge badge-emerald">THU QUỸ TRỰC TIẾP TẠI BUỔI SINH HOẠT</span>
        <h3 class="text-lg font-bold text-white mt-1">Mã VietQR Cho Kỳ Thủ: ${member.name}</h3>
        <p class="text-xs text-muted mb-3">Mã đã tích hợp sẵn số tiền <strong>${amount.toLocaleString('vi-VN')} đ</strong> và cú pháp <strong>${transferNote}</strong></p>

        <div class="p-3 mb-3" style="background: #ffffff; border-radius: 14px; display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 290px; width: 100%;">
          <div class="d-flex justify-between align-center mb-2 px-1" style="border-bottom: 1.5px solid #f1f5f9; padding-bottom: 6px;">
            <span style="color: #0033a0; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">🏦 MB BANK</span>
            <span style="font-weight: 800; font-size: 12px;"><span style="color: #e11d48;">Viet</span><span style="color: #0033a0;">QR</span></span>
          </div>
          <img src="${qrUrl}" alt="Mã VietQR Riêng Kỳ Thủ" style="max-width: 230px; width: 100%; aspect-ratio: 1/1; border-radius: 6px; display: block; margin: 0 auto;">
          <div style="color: #0f172a; font-size: 11px; font-weight: 800; margin-top: 8px;">
            ⚡ QUÉT TỰ ĐỘNG ĐIỀN ĐỊNH DANH
          </div>
        </div>

        <div class="card p-3 text-left mb-3" style="background: rgba(14,23,46,0.8); border: 1px solid var(--border-gold); font-size: 12px;">
          <div class="d-flex justify-between align-center mb-1">
            <span class="text-muted">Kỳ thủ:</span>
            <strong class="text-white">${member.name} (${member.studentId || 'Kỳ thủ'})</strong>
          </div>
          <div class="d-flex justify-between align-center mb-1">
            <span class="text-muted">Số tiền cần đóng:</span>
            <strong class="text-emerald font-mono font-bold" style="font-size: 1.1rem;">${amount.toLocaleString('vi-VN')} đ</strong>
          </div>
          <div class="d-flex justify-between align-center mb-1">
            <span class="text-muted">STK & Ngân hàng:</span>
            <span class="font-mono text-gold">${settings.bankAccount} (${settings.bankCode})</span>
          </div>
          <div class="d-flex justify-between align-center">
            <span class="text-muted">Nội dung CK:</span>
            <span class="font-mono text-gold font-bold">${transferNote}</span>
          </div>
        </div>

        <div class="d-flex gap-2.5 justify-center align-center pt-2">
          <button type="button" class="btn btn-outline btn-sm" id="btnCloseMemberQRModal" style="flex: 1; padding: 10px 16px; border-radius: 10px; font-weight: 600; color: #94a3b8; border-color: rgba(255,255,255,0.15);">
            Đóng lại
          </button>
          <button type="button" class="btn btn-gold btn-sm" id="btnConfirmDirectSelfPay" style="flex: 2; padding: 10px 20px; font-weight: 700; border-radius: 10px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 16px rgba(212,175,55,0.35);">
            <span style="font-size: 1.1rem;">⚡</span> Đã Thu
          </button>
        </div>
      </div>
    `;

    this.open('Mã VietQR Đóng Quỹ', contentHtml, null, null);

    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnCloseMemberQRModal')?.addEventListener('click', () => this.close());
      modalEl.querySelector('#btnConfirmDirectSelfPay')?.addEventListener('click', () => {
        sound.playClick();
        try {
          const rec = store.recordDirectFundPayment(member.id, 'VietQR Chuyển Khoản');
          this.close();
          sound.playSuccess();
          modalManager.showAlert(`🎉 Đã tự động ghi nhận thành công ${amount.toLocaleString('vi-VN')}đ từ kỳ thủ ${member.name} vào Danh Sách Đã Nộp! (Mã biên nhận: ${rec.id})`);
          if (typeof onComplete === 'function') onComplete();
        } catch (err) {
          modalManager.showAlert(err.message || 'Lỗi xử lý!');
        }
      });
    }
  },

  // 22. Fullscreen Live Fund QR Modal (Chế độ chiếu bảng QR đặt tại bàn sinh hoạt)
  openFullscreenLiveFundQRModal() {
    const settings = store.getFundSettings();
    const amount = settings.amount || 30000;
    const generalNote = `${settings.syntaxPrefix || 'QUY T10'} [MÃ_SV]`;
    const qrUrl = settings.qrImage || '/vietqr-fund.png';

    const contentHtml = `
      <div class="fullscreen-fund-qr p-4 text-center" style="max-width: 650px;">
        <div style="font-size: 11px; letter-spacing: 2px; color: var(--gold-light); font-weight: 700; margin-bottom: 4px;">
          CLB CỜ TNU - HGC • ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU HÀ GIANG
        </div>
        <h2 class="text-2xl font-bold text-white mb-1">BÀN THU QUỸ SINH HOẠT TRỰC TIẾP</h2>
        <div class="badge badge-emerald font-bold mb-3" style="font-size: 0.95rem; padding: 6px 18px;">
          ${settings.title || 'Quỹ Sinh Hoạt Tháng ' + settings.month}
        </div>

        <div class="p-3 mb-3" style="background: #ffffff; border-radius: 18px; display: inline-block; box-shadow: 0 15px 45px rgba(0,0,0,0.8); border: 3px solid var(--border-gold); max-width: 360px; width: 100%;">
          <div class="d-flex justify-between align-center mb-2 px-2" style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
            <span style="color: #0033a0; font-weight: 900; font-size: 15px; letter-spacing: 0.5px;">🏦 MB BANK</span>
            <span style="font-weight: 800; font-size: 14px; letter-spacing: 0.5px;"><span style="color: #e11d48;">Viet</span><span style="color: #0033a0;">QR</span></span>
          </div>
          <img src="${qrUrl}" alt="VietQR Napas" style="max-width: 300px; width: 100%; aspect-ratio: 1/1; border-radius: 8px; display: block; margin: 0 auto;">
          <div style="color: #0f172a; font-size: 12px; font-weight: 800; margin-top: 10px; letter-spacing: 0.3px;">
            🛡️ QUÉT BẰNG BẤT KỲ APP NGÂN HÀNG HOẶC MOMO NÀO
          </div>
        </div>

        <div class="card p-3 text-left mb-3" style="background: rgba(14,23,46,0.9); border: 1px solid var(--border-gold); max-width: 460px; margin: 0 auto 16px;">
          <div class="d-flex justify-between align-center mb-1">
            <span class="text-muted text-xs">Số tiền cần đóng:</span>
            <strong class="font-mono text-emerald font-bold" style="font-size: 1.4rem;">${amount.toLocaleString('vi-VN')} đ</strong>
          </div>
          <div class="d-flex justify-between align-center mb-1 text-xs">
            <span class="text-muted">Cú pháp chuyển khoản:</span>
            <strong class="font-mono text-gold font-bold" style="font-size: 1rem;">${generalNote}</strong>
          </div>
          <div class="d-flex justify-between align-center text-xs">
            <span class="text-muted">Tài khoản nhận:</span>
            <span class="font-mono text-white">${settings.bankAccount} (${settings.bankCode}) - ${settings.bankOwner}</span>
          </div>
        </div>

        <div class="d-flex justify-center gap-2">
          <button type="button" class="btn btn-outline btn-sm" id="btnCloseFullscreenQR">
            ✖ Đóng Chế Độ Chiếu
          </button>
        </div>
      </div>
    `;

    this.open('Mã VietQR Để Bàn Sinh Hoạt', contentHtml, null, null);
    const modalEl = document.getElementById('globalAppModal');
    if (modalEl) {
      modalEl.querySelector('#btnCloseFullscreenQR')?.addEventListener('click', () => this.close());
    }
  },

  openPwaInstallGuideModal() {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const initialTab = isIos ? 'ios' : 'android';

    const contentHtml = `
      <div class="pwa-guide-modal" style="padding: 4px 0;">
        <div class="text-center mb-3">
          <img src="/logo.png" alt="Logo CLB" style="width: 60px; height: 60px; border-radius: 14px; margin-bottom: 8px; box-shadow: 0 4px 15px rgba(212,175,55,0.25);">
          <h3 class="text-base font-bold text-white">Thêm CLB Cờ Vào Màn Hình Điện Thoại</h3>
          <p class="text-xs text-muted mt-1">Cài đặt ứng dụng trực tiếp từ trình duyệt — mở toàn màn hình, truy cập cực nhanh và nhận thông báo tức thì!</p>
        </div>

        <div class="d-flex gap-2 mb-3" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
          <button type="button" class="btn btn-sm ${initialTab === 'ios' ? 'btn-gold' : 'btn-outline'}" id="tabPwaIos" style="flex: 1; font-weight: 600;">
            🍎 iPhone / iPad (Safari)
          </button>
          <button type="button" class="btn btn-sm ${initialTab === 'android' ? 'btn-gold' : 'btn-outline'}" id="tabPwaAndroid" style="flex: 1; font-weight: 600;">
            🤖 Android (Chrome)
          </button>
        </div>

        <!-- Section 1: iOS -->
        <div id="secPwaIos" style="display: ${initialTab === 'ios' ? 'block' : 'none'};">
          <div class="d-flex flex-column gap-2.5">
            <div class="p-2.5" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-gold" style="font-weight: 700; font-size: 0.72rem;">Bước 1</span>
                <strong class="text-white text-xs">Mở website bằng trình duyệt Safari</strong>
              </div>
              <p class="text-xs text-muted mb-0">
                Hãy chắc chắn bạn đang mở bằng trình duyệt <strong>Safari</strong> trên iPhone.
              </p>
            </div>

            <div class="p-2.5" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-gold" style="font-weight: 700; font-size: 0.72rem;">Bước 2</span>
                <strong class="text-white text-xs">Bấm nút "Chia sẻ" (Share 📤)</strong>
              </div>
              <p class="text-xs text-muted mb-0">
                Ở thanh công cụ dưới cùng của màn hình Safari, bấm vào biểu tượng <strong>hình vuông có mũi tên chỉ lên (📤)</strong>.
              </p>
            </div>

            <div class="p-2.5" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-gold" style="font-weight: 700; font-size: 0.72rem;">Bước 3</span>
                <strong class="text-white text-xs">Chọn "Thêm vào MH chính" (Add to Home Screen ➕)</strong>
              </div>
              <p class="text-xs text-muted mb-0">
                Cuộn xuống danh sách tùy chọn, bấm <strong>"Thêm vào MH chính"</strong> rồi bấm <strong>"Thêm" (Add)</strong> ở góc trên bên phải.
              </p>
            </div>

            <div class="p-2.5" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px;">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-emerald" style="font-weight: 700; font-size: 0.72rem;">Bước 4: Bật Thông Báo</span>
                <strong class="text-white text-xs">Mở App từ màn hình chính</strong>
              </div>
              <p class="text-xs text-muted mb-0">
                Sau khi thêm ra màn hình chính, hãy bấm mở icon <strong>CLB Cờ HGC</strong> -> Bấm hình Quả chuông 🔔 -> Chọn <strong>"Bật thông báo thiết bị"</strong> và nhấn <strong>Cho phép (Allow)</strong>!
              </p>
            </div>
          </div>
        </div>

        <!-- Section 2: Android -->
        <div id="secPwaAndroid" style="display: ${initialTab === 'android' ? 'block' : 'none'};">
          <div class="d-flex flex-column gap-2.5">
            <div class="p-2.5" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-gold" style="font-weight: 700; font-size: 0.72rem;">Cách 1</span>
                <strong class="text-white text-xs">Cài Đặt Tự Động Ngay</strong>
              </div>
              <p class="text-xs text-muted mb-2">
                Bấm nút bên dưới để trình duyệt tự động hiển thị hộp thoại thêm App:
              </p>
              <button type="button" class="btn btn-gold btn-sm w-100" id="btnTriggerNativeInstall" style="font-weight: 700; padding: 8px;">
                📲 Cài Đặt App Vào Màn Hình
              </button>
            </div>

            <div class="p-2.5" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-gold" style="font-weight: 700; font-size: 0.72rem;">Cách 2</span>
                <strong class="text-white text-xs">Cài qua Menu Trình Duyệt Chrome</strong>
              </div>
              <p class="text-xs text-muted mb-0">
                1. Bấm biểu tượng <strong>3 dấu chấm (⋮)</strong> ở góc trên bên phải Chrome.<br>
                2. Chọn <strong>"Thêm vào màn hình chính"</strong> hoặc <strong>"Cài đặt ứng dụng"</strong>.<br>
                3. Bấm <strong>"Cài đặt" / "Thêm"</strong>.
              </p>
            </div>

            <div class="p-2.5" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px;">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-emerald" style="font-weight: 700; font-size: 0.72rem;">Bật Thông Báo</span>
                <strong class="text-white text-xs">Nhận tin lịch sinh hoạt & giải đấu</strong>
              </div>
              <p class="text-xs text-muted mb-2">
                Bấm nút bên dưới và chọn <strong>Cho phép (Allow)</strong>:
              </p>
              <button type="button" class="btn btn-outline btn-sm w-100" id="btnTriggerNotifFromModal" style="padding: 7px;">
                🔔 Bật Thông Báo Trên Thiết Bị
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.open('Thêm Vào Màn Hình & Bật Thông Báo', contentHtml, null, null);

    setTimeout(() => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;

      const tabIos = modalEl.querySelector('#tabPwaIos');
      const tabAndroid = modalEl.querySelector('#tabPwaAndroid');
      const secIos = modalEl.querySelector('#secPwaIos');
      const secAndroid = modalEl.querySelector('#secPwaAndroid');

      if (tabIos && tabAndroid) {
        tabIos.onclick = () => {
          sound.playClick();
          tabIos.className = 'btn btn-sm btn-gold';
          tabAndroid.className = 'btn btn-sm btn-outline';
          secIos.style.display = 'block';
          secAndroid.style.display = 'none';
        };
        tabAndroid.onclick = () => {
          sound.playClick();
          tabAndroid.className = 'btn btn-sm btn-gold';
          tabIos.className = 'btn btn-sm btn-outline';
          secAndroid.style.display = 'block';
          secIos.style.display = 'none';
        };
      }

      const btnNativeInstall = modalEl.querySelector('#btnTriggerNativeInstall');
      if (btnNativeInstall) {
        btnNativeInstall.onclick = async () => {
          sound.playClick();
          if (window.app && window.app.deferredInstallPrompt) {
            window.app.deferredInstallPrompt.prompt();
            const { outcome } = await window.app.deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
              modalManager.showAlert('Cài đặt thành công! Biểu tượng CLB Cờ đã xuất hiện trên màn hình chính.');
              this.close();
            }
            window.app.deferredInstallPrompt = null;
          } else {
            modalManager.showAlert('Trình duyệt đang sẵn sàng! Hãy làm theo Cách 2: Bấm menu 3 chấm (⋮) góc trên của Chrome -> Chọn "Thêm vào màn hình chính".');
          }
        };
      }

      const btnNotifModal = modalEl.querySelector('#btnTriggerNotifFromModal');
      if (btnNotifModal) {
        btnNotifModal.onclick = async () => {
          sound.playClick();
          if (window.app) {
            await window.app.requestDeviceNotificationPermission();
          }
        };
      }
    }, 50);
  },

  // 17. Studio Đổi Ảnh Thẻ Thành Viên Chuẩn Tỷ Lệ
  openChangeAvatarModal(member, onComplete = null) {
    if (!member) return;
    const latestMember = store.getMemberById(member.id) || member;
    let currentRawSrc = latestMember.avatar || '/logo.png';
    let finalAvatarExport = currentRawSrc;

    const contentHtml = `
      <div class="change-avatar-modal-wrap" style="max-width: 620px; margin: 0 auto;">
        <!-- Banner hướng dẫn -->
        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; display: flex; gap: 10px; align-items: center;">
          <div style="font-size: 24px; flex-shrink: 0;">📸</div>
          <div class="text-xs text-muted" style="line-height: 1.5;">
            Khung ảnh chuẩn tỷ lệ thẻ thành viên (125 × 152 px). Bạn có thể tải ảnh từ điện thoại/máy tính hoặc dán link, sau đó <strong class="text-white">kéo thả / cuộn chuột</strong> để căn chỉnh góc đẹp nhất.
          </div>
        </div>

        <!-- Chọn ảnh từ thiết bị hoặc URL -->
        <div class="d-flex gap-2 mb-3 flex-wrap align-center">
          <label class="btn btn-gold btn-sm" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin: 0;">
            <span>📁 Chọn ảnh từ thiết bị</span>
            <input type="file" id="changeAvatarFileInput" accept="image/*" style="display: none;">
          </label>
          <span class="text-xs text-muted">hoặc dán liên kết:</span>
          <input type="url" id="changeAvatarUrlInput" class="form-input form-input-sm flex-1" style="min-width: 200px;" 
                 value="${currentRawSrc && !currentRawSrc.startsWith('data:') ? currentRawSrc : ''}" placeholder="https://images.unsplash.com/...">
        </div>

        <!-- Khung Studio Cắt / Căn Chỉnh Ảnh Thẻ -->
        <div style="background: radial-gradient(circle at 50% 50%, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%); border: 1.5px dashed rgba(212,175,55,0.45); border-radius: 14px; padding: 16px;">
          <div style="display: flex; gap: 20px; align-items: center; justify-content: center; flex-wrap: wrap;">
            
            <!-- Khung Canvas tương tác chuẩn tỷ lệ thẻ 125x152 -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <div id="changeAvatarViewportFrame" style="position: relative; width: 150px; height: 182px; border-radius: 14px; overflow: hidden; border: 2.5px solid var(--border-gold); box-shadow: 0 6px 24px rgba(0,0,0,0.7); background: #0b1120; cursor: grab; user-select: none;">
                <canvas id="changeAvatarCropCanvas" width="375" height="456" style="width: 150px; height: 182px; display: block;"></canvas>
                <div style="position: absolute; inset: 0; pointer-events: none; border: 1px dashed rgba(212,175,55,0.4); border-radius: 14px;"></div>
                <span style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; background: rgba(0,0,0,0.75); color: #f8fafc; padding: 2px 8px; border-radius: 10px; pointer-events: none; white-space: nowrap;">👆 Kéo để di chuyển</span>
              </div>
              <span class="badge badge-gold text-xs" style="font-size: 0.7rem; font-weight: 600;">Chuẩn khung thẻ 125 × 152</span>
            </div>

            <!-- Thanh trượt điều khiển Zoom, Trục X, Trục Y -->
            <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 10px;">
              <div>
                <div class="d-flex justify-between text-xs mb-1">
                  <span class="text-white font-medium">🔍 Thu phóng (Zoom):</span>
                  <span id="changeAvatarZoomVal" class="text-gold font-mono font-bold">1.00x</span>
                </div>
                <input type="range" id="changeAvatarZoomSlider" min="0.5" max="3" step="0.02" value="1" class="form-range" style="width: 100%; accent-color: var(--gold-color);">
              </div>

              <div>
                <div class="d-flex justify-between text-xs mb-1">
                  <span class="text-white font-medium">↔️ Dịch chuyển ngang (Trục X):</span>
                  <span id="changeAvatarPosXVal" class="text-cyan font-mono font-bold">0px</span>
                </div>
                <input type="range" id="changeAvatarPosXSlider" min="-180" max="180" step="1" value="0" class="form-range" style="width: 100%; accent-color: var(--cyan-color);">
              </div>

              <div>
                <div class="d-flex justify-between text-xs mb-1">
                  <span class="text-white font-medium">↕️ Dịch chuyển dọc (Trục Y):</span>
                  <span id="changeAvatarPosYVal" class="text-cyan font-mono font-bold">0px</span>
                </div>
                <input type="range" id="changeAvatarPosYSlider" min="-180" max="180" step="1" value="0" class="form-range" style="width: 100%; accent-color: var(--cyan-color);">
              </div>

              <div class="d-flex gap-2 pt-1">
                <button type="button" id="btnFitChangeAvatar" class="btn btn-outline btn-sm text-xs flex-1">📐 Căn vừa khung</button>
                <button type="button" id="btnResetChangeAvatar" class="btn btn-outline btn-sm text-xs flex-1">🔄 Đặt lại góc</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    this.open(`📸 Đổi Ảnh Thẻ Thành Viên: ${latestMember.name}`, contentHtml, () => {
      if (finalAvatarExport) {
        const updated = store.updateMember(latestMember.id, { avatar: finalAvatarExport });
        sound.playSuccess();
        modalManager.showAlert(`Đã cập nhật ảnh đại diện thẻ thành công cho kỳ thủ [${latestMember.name}]!`);
        if (typeof onComplete === 'function') {
          onComplete(updated || { ...latestMember, avatar: finalAvatarExport });
        }
      }
      return true;
    }, '💾 Lưu Ảnh Thẻ Mới');

    setTimeout(() => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;

      const canvas = modalEl.querySelector('#changeAvatarCropCanvas');
      const ctx = canvas ? canvas.getContext('2d') : null;
      const fileInput = modalEl.querySelector('#changeAvatarFileInput');
      const urlInput = modalEl.querySelector('#changeAvatarUrlInput');
      const zoomSlider = modalEl.querySelector('#changeAvatarZoomSlider');
      const posXSlider = modalEl.querySelector('#changeAvatarPosXSlider');
      const posYSlider = modalEl.querySelector('#changeAvatarPosYSlider');
      const zoomLabel = modalEl.querySelector('#changeAvatarZoomVal');
      const posXLabel = modalEl.querySelector('#changeAvatarPosXVal');
      const posYLabel = modalEl.querySelector('#changeAvatarPosYVal');
      const resetBtn = modalEl.querySelector('#btnResetChangeAvatar');
      const fitBtn = modalEl.querySelector('#btnFitChangeAvatar');
      const viewport = modalEl.querySelector('#changeAvatarViewportFrame');

      let img = new Image();
      img.crossOrigin = 'anonymous';
      let zoom = 1.0;
      let offsetX = 0;
      let offsetY = 0;
      let isDragging = false;
      let startDragX = 0;
      let startDragY = 0;

      const updateFinalExport = () => {
        try {
          if (canvas && img.complete && img.naturalWidth) {
            finalAvatarExport = canvas.toDataURL('image/jpeg', 0.92);
          }
        } catch (e) {
          finalAvatarExport = currentRawSrc;
        }
      };

      const draw = () => {
        if (!ctx || !img.complete || !img.naturalWidth) return;
        const cw = canvas.width; // 375
        const ch = canvas.height; // 456
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, cw, ch);

        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const aspect = nw / nh;
        const frameAspect = cw / ch;

        let baseW, baseH;
        if (aspect > frameAspect) {
          baseH = ch;
          baseW = ch * aspect;
        } else {
          baseW = cw;
          baseH = cw / aspect;
        }

        const scaleDpi = cw / 150; // 2.5
        const drawW = baseW * zoom;
        const drawH = baseH * zoom;
        const drawX = (cw - drawW) / 2 + (offsetX * scaleDpi);
        const drawY = (ch - drawH) / 2 + (offsetY * scaleDpi);

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        updateFinalExport();
      };

      const updateControls = () => {
        if (zoomSlider) zoomSlider.value = zoom;
        if (posXSlider) posXSlider.value = Math.round(offsetX);
        if (posYSlider) posYSlider.value = Math.round(offsetY);
        if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(2)}x`;
        if (posXLabel) posXLabel.textContent = `${Math.round(offsetX)}px`;
        if (posYLabel) posYLabel.textContent = `${Math.round(offsetY)}px`;
      };

      const loadSource = (src) => {
        currentRawSrc = src;
        finalAvatarExport = src;
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          zoom = 1.0;
          offsetX = 0;
          offsetY = 0;
          updateControls();
          draw();
        };
        img.onerror = () => {
          img = new Image();
          img.onload = () => {
            zoom = 1.0;
            offsetX = 0;
            offsetY = 0;
            updateControls();
            draw();
          };
          img.src = src;
        };
        img.src = src;
      };

      if (viewport) {
        const onStart = (cx, cy) => {
          isDragging = true;
          startDragX = cx - offsetX;
          startDragY = cy - offsetY;
          viewport.style.cursor = 'grabbing';
        };
        const onMove = (cx, cy) => {
          if (!isDragging) return;
          offsetX = Math.max(-180, Math.min(180, cx - startDragX));
          offsetY = Math.max(-180, Math.min(180, cy - startDragY));
          updateControls();
          draw();
        };
        const onEnd = () => {
          if (isDragging) {
            isDragging = false;
            viewport.style.cursor = 'grab';
          }
        };

        viewport.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', onEnd);

        viewport.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
          if (isDragging && e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchend', onEnd);

        viewport.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.06 : -0.06;
          zoom = Math.max(0.5, Math.min(3.0, zoom + delta));
          updateControls();
          draw();
        }, { passive: false });
      }

      zoomSlider?.addEventListener('input', (e) => {
        zoom = parseFloat(e.target.value);
        if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(2)}x`;
        draw();
      });

      posXSlider?.addEventListener('input', (e) => {
        offsetX = parseFloat(e.target.value);
        if (posXLabel) posXLabel.textContent = `${Math.round(offsetX)}px`;
        draw();
      });

      posYSlider?.addEventListener('input', (e) => {
        offsetY = parseFloat(e.target.value);
        if (posYLabel) posYLabel.textContent = `${Math.round(offsetY)}px`;
        draw();
      });

      resetBtn?.addEventListener('click', () => {
        sound.playClick();
        zoom = 1.0;
        offsetX = 0;
        offsetY = 0;
        updateControls();
        draw();
      });

      fitBtn?.addEventListener('click', () => {
        sound.playClick();
        zoom = 1.0;
        offsetX = 0;
        offsetY = 0;
        updateControls();
        draw();
      });

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            loadSource(evt.target.result);
          };
          reader.readAsDataURL(file);
        }
      });

      urlInput?.addEventListener('change', (e) => {
        const val = e.target.value.trim();
        if (val) {
          loadSource(val);
        }
      });

      // Initial load
      loadSource(currentRawSrc);
    }, 60);
  }
};

// Global replacement for native window.alert to eliminate "localhost:3000 cho biết"
if (typeof window !== 'undefined') {
  window.alert = (msg) => {
    modalManager.showAlert(msg);
  };
}
