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
        btnDownload.innerHTML = '<span class="btn-icon">⏳</span> Đang tạo ảnh 2 mặt...';

        try {
          const frontEl = containerEl.querySelector('#digitalMemberPassFront');
          const backEl = containerEl.querySelector('#digitalMemberPassBack');

          if (!frontEl || !backEl) {
            throw new Error('Không tìm thấy thẻ');
          }

          // Off-screen clone container to remove 3D transform during render
          const cloneWrap = document.createElement('div');
          cloneWrap.style.cssText = 'position:fixed; left:-9999px; top:0; width:700px; z-index:-9999; pointer-events:none;';
          document.body.appendChild(cloneWrap);

          // Clone Mặt Trước
          const cloneFront = frontEl.cloneNode(true);
          cloneFront.style.setProperty('transform', 'none', 'important');
          cloneFront.style.setProperty('position', 'relative', 'important');
          cloneFront.style.setProperty('width', '700px', 'important');
          cloneFront.style.setProperty('min-height', '360px', 'important');
          cloneFront.style.margin = '0 0 20px 0';
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

          // Clone Mặt Sau
          const cloneBack = backEl.cloneNode(true);
          cloneBack.style.setProperty('transform', 'none', 'important');
          cloneBack.style.setProperty('position', 'relative', 'important');
          cloneBack.style.setProperty('width', '700px', 'important');
          cloneBack.style.setProperty('min-height', '360px', 'important');
          cloneBack.style.margin = '0';
          cloneWrap.appendChild(cloneBack);

          // Pre-convert img tags to data URLs if possible for clean cross-origin capture
          const convertImgToDataUrl = async (el) => {
            const imgs = el.querySelectorAll('img');
            for (const img of imgs) {
              if (img.src && !img.src.startsWith('data:')) {
                try {
                  const res = await fetch(img.src, { mode: 'cors' });
                  if (res.ok) {
                    const blob = await res.blob();
                    const dUrl = await new Promise((resolve) => {
                      const r = new FileReader();
                      r.onloadend = () => resolve(r.result);
                      r.readAsDataURL(blob);
                    });
                    img.src = dUrl;
                  }
                } catch (_) {}
              }
            }
          };

          await Promise.all([convertImgToDataUrl(cloneFront), convertImgToDataUrl(cloneBack)]);

          // Capture both sides via html2canvas (2x Retina scale)
          const [canvasFront, canvasBack] = await Promise.all([
            html2canvas(cloneFront, {
              scale: 2,
              useCORS: true,
              backgroundColor: null,
              logging: false
            }),
            html2canvas(cloneBack, {
              scale: 2,
              useCORS: true,
              backgroundColor: null,
              logging: false
            })
          ]);

          cloneWrap.remove();

          // Create Composite Canvas containing both sides
          const pad = 48;
          const cardGap = 36;
          const headerH = 100;
          const labelH = 40;
          const footerH = 50;

          const totalW = Math.max(canvasFront.width, canvasBack.width) + pad * 2;
          const totalH = pad * 2 + headerH + (labelH + canvasFront.height) + cardGap + (labelH + canvasBack.height) + footerH;

          const compositeCanvas = document.createElement('canvas');
          compositeCanvas.width = totalW;
          compositeCanvas.height = totalH;
          const ctx = compositeCanvas.getContext('2d');

          // Gradient Luxury Background
          const grad = ctx.createLinearGradient(0, 0, totalW, totalH);
          grad.addColorStop(0, '#060d1e');
          grad.addColorStop(0.5, '#0d1d40');
          grad.addColorStop(1, '#050a16');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);

          // Golden Outer Frame
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
          ctx.lineWidth = 3;
          ctx.strokeRect(18, 18, totalW - 36, totalH - 36);

          // Header Text
          ctx.textAlign = 'center';
          ctx.fillStyle = '#d4af37';
          ctx.font = 'bold 36px sans-serif';
          ctx.fillText('CLB CỜ TNU - HGC • THẺ THÀNH VIÊN ĐIỆN TỬ', totalW / 2, pad + 38);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '600 20px sans-serif';
          ctx.fillText('ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG', totalW / 2, pad + 74);

          // Label 1: Mặt Trước
          let curY = pad + headerH;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('❖ MẶT TRƯỚC (THÔNG TIN & SMART QR KEY)', pad, curY + 24);

          curY += labelH;
          const frontX = (totalW - canvasFront.width) / 2;
          ctx.drawImage(canvasFront, frontX, curY);

          // Label 2: Mặt Sau
          curY += canvasFront.height + cardGap;
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('❖ MẶT SAU (QUY ĐỊNH SỬ DỤNG & LIÊN HỆ)', pad, curY + 24);

          curY += labelH;
          const backX = (totalW - canvasBack.width) / 2;
          ctx.drawImage(canvasBack, backX, curY);

          // Footer Watermark
          curY += canvasBack.height + 36;
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(212, 175, 55, 0.75)';
          ctx.font = '600 18px monospace';
          ctx.fillText(`HỘI VIÊN: ${member.name.toUpperCase()} • MÃ ĐỊNH DANH: ${member.id} • HỆ THỐNG XÁC THỰC THẺ CLB CỜ TNU - HGC`, totalW / 2, curY);

          // Trigger Download
          const finalUrl = compositeCanvas.toDataURL('image/png');
          const dlLink = document.createElement('a');
          dlLink.download = `The_Thanh_Vien_2_Mat_TNU_HGC_${member.id}.png`;
          dlLink.href = finalUrl;
          dlLink.click();

          sound.playSuccess?.() || sound.playClick();
        } catch (err) {
          console.error('Lỗi xuất ảnh thẻ 2 mặt:', err);
          modalManager.showAlert('Có lỗi khi tạo ảnh thẻ thành viên. Vui lòng thử lại!');
        } finally {
          btnDownload.disabled = false;
          btnDownload.innerHTML = origHtml;
        }
      });
    }
  }
};
