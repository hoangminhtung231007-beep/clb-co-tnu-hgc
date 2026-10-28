import { modalManager } from "./modals.js";
import { qrHelper } from '../utils/qrHelper.js';
import { sound } from '../utils/audio.js';
import html2canvas from 'html2canvas';

export const memberCardComponent = {
  async render(containerEl, member) {
    if (!containerEl || !member) return;

    const payload = qrHelper.generatePayload(member);

    // Derived fields for clean front view
    const memberClass = member.class || member.major || (member.studentId ? 'Lớp ' + member.studentId : 'Chưa phân lớp');
    const memberFaculty = member.faculty || member.university || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang';
    
    // Format date of birth (DD/MM/YYYY)
    const formatDob = (dobStr) => {
      if (!dobStr) return 'Chưa cập nhật';
      if (dobStr.includes('-')) {
        const parts = dobStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return dobStr;
    };
    const memberDob = formatDob(member.dob);

    // Format cohort / Khóa (ví dụ 2024 - 2028)
    const formatCohort = (m) => {
      if (m.cohort) {
        const raw = m.cohort.trim();
        if (raw.includes('-')) {
          return raw.split('-').map((s) => s.trim()).join(' - ');
        }
        const matches = raw.match(/(\d{4})\D+(\d{4})/);
        if (matches) {
          return `${matches[1]} - ${matches[2]}`;
        }
        return raw;
      }
      if (m.academicYear) return m.academicYear;
      if (m.studentId) {
        const digits = m.studentId.replace(/\D/g, '');
        if (digits.length >= 2) {
          const yr = parseInt(digits.slice(0, 2), 10);
          if (yr >= 15 && yr <= 35) {
            return `20${yr} - 20${yr + 4}`;
          }
        }
      }
      return '2024 - 2028';
    };
    const memberCohort = formatCohort(member);
    const memberJoinDate = formatDob(member.joinDate) || '18/03/2026';

    containerEl.innerHTML = `
      <div class="member-card-wrapper animate-fadeIn">
        <!-- Dòng ghi chú lật thẻ đặt lên trên thẻ thành viên -->
        <div class="flip-guide-hint top-hint">
          <span>👆 Nhấn trực tiếp vào thẻ để lật xem giữa <strong>Mặt Trước</strong> và <strong>Mặt Sau</strong></span>
        </div>

        <!-- 3D Flip Card Container -->
        <div class="id-card-flip-container" id="idCardFlipper" title="Bấm vào thẻ để lật mặt trước / mặt sau">
          <div class="id-card-flip-inner" id="idCardFlipInner">
            
            <!-- ================= MẶT TRƯỚC (FRONT SIDE) ================= -->
            <div class="electronic-id-card id-card-front" id="digitalMemberPassFront">
              <div class="card-glass-sheen"></div>
              
              <!-- Card Header -->
              <div class="id-card-header">
                <div class="id-brand">
                  <img src="/logo.png" alt="Logo CLB Cờ TNU - HGC" class="id-logo-img">
                  <div>
                    <div class="id-club-title">CLB CỜ TNU - HGC</div>
                    <div class="id-club-sub">ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG</div>
                  </div>
                </div>
                <div class="id-chip-gold" title="Thẻ từ thông minh EMV">
                  <div class="chip-line"></div>
                  <div class="chip-line"></div>
                </div>
              </div>

              <!-- Tiêu đề đơn giản: THẺ THÀNH VIÊN -->
              <div class="id-card-title-simple">THẺ THÀNH VIÊN</div>

              <!-- Card Body (Ảnh đại diện 125px + 8 trường thông tin + Khối Smart QR Key lấp đầy khoảng trống) -->
              <div class="id-card-body id-front-body">
                <!-- Cột 1: Ảnh đại diện (Hỗ trợ bấm để đổi avatar) -->
                <div class="id-avatar-wrap" id="cardAvatarWrap" title="Bấm vào đây để đổi avatar ảnh thẻ" style="cursor: pointer; position: relative;">
                  <img src="${member.avatar}" alt="${member.name}" class="id-avatar">
                  <div class="id-avatar-change-hint" style="position: absolute; bottom: 6px; right: 6px; background: rgba(15,23,42,0.85); border: 1.5px solid var(--border-gold); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--gold-color); pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,0.6);" title="Đổi Avatar">📸</div>
                </div>

                <!-- Cột 2: Thông tin chi tiết -->
                <div class="id-info-col">
                  <div class="id-member-name">${member.name}</div>
                  
                  <div class="id-details-grid">
                    <div class="id-field">
                      <span class="id-label">MÃ THẺ:</span>
                      <span class="id-val font-mono val-id">${member.id}</span>
                    </div>
                    <div class="id-field">
                      <span class="id-label">MSSV:</span>
                      <span class="id-val font-mono val-mssv">${member.studentId || 'Chưa cập nhật'}</span>
                    </div>
                    <div class="id-field">
                      <span class="id-label">NGÀY SINH:</span>
                      <span class="id-val font-mono val-dob">${memberDob}</span>
                    </div>
                    <div class="id-field">
                      <span class="id-label">KHÓA:</span>
                      <span class="id-val font-mono val-cohort">${memberCohort}</span>
                    </div>
                    <div class="id-field">
                      <span class="id-label">LỚP:</span>
                      <span class="id-val val-class" title="${memberClass}">${memberClass}</span>
                    </div>
                    <div class="id-field">
                      <span class="id-label">KHOA:</span>
                      <span class="id-val val-faculty" title="${memberFaculty}">${memberFaculty}</span>
                    </div>
                    <div class="id-field">
                      <span class="id-label">CHỨC VỤ:</span>
                      <span class="id-val val-role">${member.roleTitle}</span>
                    </div>
                    <div class="id-field">
                      <span class="id-label">GIA NHẬP:</span>
                      <span class="id-val font-mono val-join">${memberJoinDate}</span>
                    </div>
                  </div>
                </div>

                <!-- Cột 3: Khối Smart QR Key lấp đầy hoàn hảo khoảng trống bên phải -->
                <div class="id-front-qr-box">
                  <div class="id-front-qr-card">
                    <canvas id="memberFrontQrCanvas" class="qr-canvas"></canvas>
                    <div class="front-qr-label">SMART QR KEY</div>
                  </div>
                </div>
              </div>

              <!-- Card Footer -->
              <div class="id-card-footer">
                <div class="id-watermark">CLB CỜ TNU - HGC • TRÍ TUỆ & VĂN HÓA</div>
              </div>
            </div>

            <!-- ================= MẶT SAU (BACK SIDE - BỐ CỤC 2 PHẦN ĐỒNG BỘ DARK VIP THEME) ================= -->
            <div class="electronic-id-card id-card-back" id="digitalMemberPassBack">
              <div class="card-glass-sheen"></div>
              
              <!-- Card Header Mặt Sau -->
              <div class="id-card-header id-back-header">
                <div class="id-brand">
                  <img src="/logo.png" alt="Logo CLB Cờ TNU - HGC" class="id-logo-img sm">
                  <div>
                    <div class="id-club-title text-sm">CLB CỜ TNU - HGC</div>
                    <div class="id-club-sub">ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG</div>
                  </div>
                </div>
                <div class="id-serial-badge">
                  <span class="serial-label">MÃ ĐỊNH DANH:</span>
                  <span class="serial-code font-mono text-gold font-bold">${member.id}</span>
                </div>
              </div>

              <!-- Card Body: 2 Phần (Phần 1: Quy định bên trái, Phần 2: Liên hệ & Slogan bên phải) -->
              <div class="id-card-body id-back-body-2col">
                <!-- Phần 1: Bên trái - QUY ĐỊNH SỬ DỤNG THẺ -->
                <div class="back-rules-card-dark">
                  <div class="badge-rules-title">QUY ĐỊNH SỬ DỤNG THẺ</div>
                  <div class="rules-list">
                    <div class="rule-item">
                      <div class="rule-icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="2" y="5" width="20" height="14" rx="2"/>
                          <line x1="2" y1="10" x2="22" y2="10"/>
                          <circle cx="16" cy="15" r="1" fill="currentColor"/>
                        </svg>
                      </div>
                      <div class="rule-text">1. Thẻ chỉ có giá trị sử dụng trong CLB Cờ TNU - HGC.</div>
                    </div>

                    <div class="rule-item">
                      <div class="rule-icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <div class="rule-text">2. Giữ gìn thẻ cẩn thận, không làm mất hoặc hư hỏng.</div>
                    </div>

                    <div class="rule-item">
                      <div class="rule-icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                      </div>
                      <div class="rule-text">3. Không cho người khác mượn, sử dụng thẻ của mình.</div>
                    </div>

                    <div class="rule-item">
                      <div class="rule-icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="23 4 23 10 17 10"/>
                          <polyline points="1 20 1 14 7 14"/>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                      </div>
                      <div class="rule-text">4. Khi có thay đổi thông tin, vui lòng liên hệ Ban Điều hành CLB.</div>
                    </div>
                  </div>
                </div>

                <!-- Đường phân cách dọc chính giữa -->
                <div class="back-divider-dark"></div>

                <!-- Phần 2: Bên phải - ĐỊA CHỈ & LIÊN HỆ & SLOGAN -->
                <div class="back-contact-card-dark">
                  <div class="contact-list-dark">
                    <div class="contact-item">
                      <div class="contact-icon-circle">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                        </svg>
                      </div>
                      <div class="contact-body">
                        <div class="contact-name">CLB Cờ TNU - HGC</div>
                        <div class="contact-sub">Đại học Thái Nguyên Phân hiệu tại Hà Giang</div>
                      </div>
                    </div>

                    <div class="contact-item">
                      <div class="contact-icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                      <div class="contact-body">
                        <div class="contact-link font-mono">cotu.tnu.hgc@gmail.com</div>
                      </div>
                    </div>

                    <div class="contact-item">
                      <div class="contact-icon-circle">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <div class="contact-body">
                        <div class="contact-link font-mono">fb.com/CLBCoTNUHGC</div>
                      </div>
                    </div>
                  </div>

                  <!-- Slogan & Dot line đồng bộ phong cách CLB -->
                  <div class="slogan-section-dark">
                    <div class="slogan-text-dark">Cờ là cầu nối những tâm hồn đồng điệu!</div>
                    <div class="slogan-line-wrap-dark">
                      <span class="slogan-line-bar-dark"></span>
                      <span class="slogan-line-dot-dark"></span>
                      <span class="slogan-line-bar-dark"></span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Back Footer Mặt Sau -->
              <div class="id-card-footer id-back-footer">
                <div class="id-watermark">CLB CỜ TNU - HGC • TRÍ TUỆ & VĂN HÓA</div>
              </div>
            </div>

          </div>
        </div>

        <!-- Card Actions: Tải Thẻ Thành Viên, Nộp Quỹ & Đổi Avatar -->
        <div class="card-action-bar" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
          <button id="btnDownloadCard" class="btn btn-gold btn-sm">
            <span class="btn-icon">⬇</span> Tải Thẻ Thành Viên
          </button>
          <button id="btnMemberPayFund" class="btn btn-sm" style="font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); border: none; color: #ffffff; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); padding: 8px 16px;">
            <span class="btn-icon">💳</span> Nộp Quỹ CLB
          </button>
          <button id="btnChangeAvatarCard" class="btn btn-outline btn-sm" style="border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; font-weight: 600;">
            <span class="btn-icon">📸</span> Đổi Avatar
          </button>
        </div>
      </div>
    `;

    // Render QR Code onto canvas (placed on the front side)
    const canvas = containerEl.querySelector('#memberFrontQrCanvas');
    if (canvas) {
      await qrHelper.renderToCanvas(canvas, payload, {
        width: 104,
        margin: 1,
        dark: '#070d1e',
        light: '#ffffff'
      });
    }

    // Bind 3D Flip interactions on clicking directly on the card
    const flipInner = containerEl.querySelector('#idCardFlipInner');
    const cardFlipper = containerEl.querySelector('#idCardFlipper');

    cardFlipper?.addEventListener('click', () => {
      if (!flipInner) return;
      sound.playClick();
      flipInner.classList.toggle('is-flipped');
    });

    // Chức năng Đổi Avatar Thẻ Thành Viên
    const triggerChangeAvatar = (e) => {
      if (e) e.stopPropagation();
      sound.playClick();
      modalManager.openChangeAvatarModal(member, (updatedMember) => {
        memberCardComponent.render(containerEl, updatedMember);
      });
    };

    const btnChangeAvatar = containerEl.querySelector('#btnChangeAvatarCard');
    btnChangeAvatar?.addEventListener('click', triggerChangeAvatar);

    // Chức năng Nộp Quỹ CLB cá nhân hóa
    const btnPayFund = containerEl.querySelector('#btnMemberPayFund');
    btnPayFund?.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      sound.playClick();
      modalManager.openMemberFundPaymentModal(member, () => {
        memberCardComponent.render(containerEl, member);
      });
    });

    const avatarWrap = containerEl.querySelector('#cardAvatarWrap');
    avatarWrap?.addEventListener('click', triggerChangeAvatar);

    // Chức năng tải ảnh thẻ thành viên 2 mặt (Mặt trước & Mặt sau)
    const btnDownload = containerEl.querySelector('#btnDownloadCard');

    if (btnDownload) {
      btnDownload.addEventListener('click', async (e) => {
        e.stopPropagation();
        sound.playClick();

        const origHtml = btnDownload.innerHTML;
        btnDownload.disabled = true;
        btnDownload.innerHTML = '<span class="btn-icon">⏳</span> Đang tạo ảnh thẻ...';

        try {
          const frontEl = containerEl.querySelector('#digitalMemberPassFront');

          if (!frontEl) {
            throw new Error('Không tìm thấy thẻ mặt trước');
          }

          // Off-screen clone container to remove 3D transform during render
          const cloneWrap = document.createElement('div');
          cloneWrap.style.cssText = 'position: absolute; top: 0; left: 0; width: 700px; opacity: 0; pointer-events: none; z-index: -9999;';
          document.body.appendChild(cloneWrap);

          // Clone Mặt Trước (Mặt thông tin & Smart QR Key)
          const cloneFront = frontEl.cloneNode(true);
          cloneFront.style.setProperty('transform', 'none', 'important');
          cloneFront.style.setProperty('position', 'relative', 'important');
          cloneFront.style.setProperty('width', '700px', 'important');
          cloneFront.style.setProperty('min-height', '360px', 'important');
          cloneFront.style.margin = '0';

          // Xóa icon camera đổi avatar để ảnh thẻ xuất ra chuẩn đẹp
          cloneFront.querySelector('.id-avatar-change-hint')?.remove();

          cloneWrap.appendChild(cloneFront);

          // Copy canvas pixel buffer from original QR
          const origCanvas = frontEl.querySelector('canvas');
          const cloneCanvas = cloneFront.querySelector('canvas');
          if (origCanvas && cloneCanvas) {
            cloneCanvas.width = origCanvas.width;
            cloneCanvas.height = origCanvas.height;
            const ctxC = cloneCanvas.getContext('2d');
            ctxC.drawImage(origCanvas, 0, 0);
          }

          // Pre-convert img tags to data URLs if possible for clean cross-origin capture
          const imgs = cloneFront.querySelectorAll('img');
          for (const img of imgs) {
            if (img.src && !img.src.startsWith('data:')) {
              try {
                const res = await fetch(img.src, { mode: 'cors' });
                if (res.ok) {
                  const b = await res.blob();
                  const dUrl = await new Promise((resolve) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve(r.result);
                    r.readAsDataURL(b);
                  });
                  img.src = dUrl;
                }
              } catch (_) {}
            }
          }

          // Capture Front Card via html2canvas (2x Retina scale)
          const canvasFront = await html2canvas(cloneFront, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false
          });

          cloneWrap.remove();

          // Convert canvasFront to Blob
          const blob = await new Promise((resolve) => {
            canvasFront.toBlob(resolve, 'image/png', 0.95);
          });

          const cleanName = (member.name || 'Member').replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
          const fileName = `The_Thanh_Vien_${member.id}_${cleanName}.png`;
          const blobUrl = blob ? URL.createObjectURL(blob) : canvasFront.toDataURL('image/png');
          const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;

          // Attempt direct download for desktop
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
          if (!isMobile) {
            try {
              const dlLink = document.createElement('a');
              dlLink.download = fileName;
              dlLink.href = blobUrl;
              document.body.appendChild(dlLink);
              dlLink.click();
              setTimeout(() => {
                if (document.body.contains(dlLink)) document.body.removeChild(dlLink);
              }, 1000);
            } catch (_) {}
          }

          // Open Mobile-Friendly Card Preview & Direct Save Modal
          modalManager.openCardSaveModal({
            blobUrl,
            file,
            fileName,
            memberName: member.name,
            memberId: member.id
          });

          sound.playSuccess?.() || sound.playClick();
        } catch (err) {
          console.error('Lỗi xuất ảnh thẻ mặt trước:', err);
          modalManager.showAlert('Có lỗi khi tạo ảnh thẻ thành viên. Vui lòng thử lại!');
        } finally {
          btnDownload.disabled = false;
          btnDownload.innerHTML = origHtml;
        }
      });
    }
  }
};
