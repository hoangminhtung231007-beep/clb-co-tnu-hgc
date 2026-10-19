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
            ⚡ Quản Trị Viên (Admin)
          </button>
        </div>

        <!-- Tab 1: Member Login -->
        <div id="loginMemberSection" style="display: ${defaultTab === 'member' ? 'block' : 'none'};">
          ${members.length > 0 ? `
            <div class="form-group mb-3">
              <label class="form-label">Chọn kỳ thủ đăng nhập:</label>
              <select id="loginMemberSelect" class="form-select">
                ${members.slice(0, 10).map((m) => `
                  <option value="${m.id}">${m.name} (${m.id}) - ${m.roleTitle || 'Thành viên'}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          <div class="form-group mb-3">
            <label class="form-label">${members.length > 0 ? 'Hoặc nhập Mã Thẻ / MSSV:' : 'Nhập Mã Thẻ hoặc MSSV:'}</label>
            <input type="text" id="loginMemberInput" class="form-input" placeholder="VD: Mã thẻ thành viên hoặc MSSV..." value="${members[0]?.id || ''}">
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Mật khẩu thẻ:</label>
            <input type="password" id="loginMemberPass" class="form-input" placeholder="Nhập mật khẩu thẻ..." value="">
          </div>
          <button type="button" class="btn btn-gold btn-md" id="btnSubmitMemberLogin" style="width: 100%; font-weight: 700; padding: 10px;">
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

      if (memberSelect && memberInput) {
        memberSelect.onchange = () => {
          memberInput.value = memberSelect.value;
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
          const targetId = (memberInput ? memberInput.value : '').trim().toLowerCase();
          const found = members.find((m) => m.id.toLowerCase() === targetId || m.studentId.toLowerCase() === targetId);
          const active = found || members[0];
          if (active) {
            store.setActiveMember(active.id);
            store.setRole('member');
            this.close();
            modalManager.showAlert(`Đăng nhập thành công! Chào mừng ${active.name} (${active.roleTitle || 'Thành viên'}).`);
            if (window.app) window.app.navigateTo('member-pass');
          }
        };
      }

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
    const zaloLink = store.getState().clubInfo?.zaloGroupLink || 'https://zalo.me/g/clbcotnuhgc';

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

          <!-- QR Canvas -->
          <div style="background: #ffffff; padding: 10px; border-radius: 12px; display: inline-block; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
            <canvas id="regSuccessZaloQrCanvas" width="170" height="170" style="width: 170px; height: 170px; display: block;"></canvas>
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

    // Render Zalo QR code to canvas
    setTimeout(() => {
      const canvas = document.getElementById('regSuccessZaloQrCanvas');
      if (canvas && qrHelper) {
        qrHelper.renderToCanvas(canvas, zaloLink, { width: 170, margin: 1 });
      }
    }, 100);
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
  }
};

// Global replacement for native window.alert to eliminate "localhost:3000 cho biết"
if (typeof window !== 'undefined') {
  window.alert = (msg) => {
    modalManager.showAlert(msg);
  };
}
