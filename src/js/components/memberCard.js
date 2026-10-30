import { modalManager } from "./modals.js";
import { qrHelper } from '../utils/qrHelper.js';
import { sound } from '../utils/audio.js';
import { store } from '../state/store.js';
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

    const memberRoleTitle = member.roleTitle || 'Thành viên';

    containerEl.innerHTML = `
      <div class="member-card-wrapper animate-fadeIn">
        <!-- Dòng ghi chú lật thẻ đặt lên trên thẻ thành viên -->
        <div class="flip-guide-hint top-hint">
          <span>👆 Nhấn trực tiếp vào thẻ hoặc nút bên dưới để lật giữa <strong>Mặt Trước</strong> và <strong>Mặt Sau</strong></span>
        </div>

        <!-- 3D Flip Card Container (Chuẩn dọc Portrait VIP) -->
        <div class="id-card-flip-container" id="idCardFlipper" title="Bấm vào thẻ để lật mặt trước / mặt sau">
          <div class="id-card-flip-inner" id="idCardFlipInner">
            
            <!-- ================= MẶT TRƯỚC (FRONT SIDE) ================= -->
            <div class="electronic-id-card id-card-front" id="digitalMemberPassFront">
              <div class="vcard-inner-frame"></div>
              <div class="vcard-checkered-watermark"></div>
              <img src="/vcard-front-art.png" alt="" class="vcard-bottom-art">

              <!-- Header: Logo + Divider + Club Info -->
              <div class="vcard-header">
                <div class="vcard-logo-wrap">
                  <img src="/logo-circle.png" alt="Logo CLB Cờ TNU - HGC" class="vcard-header-logo">
                </div>
                <div class="vcard-divider-v"></div>
                <div class="vcard-header-text">
                  <div class="vcard-club-name">CLB CỜ TNU - HGC</div>
                  <div class="vcard-university-name">ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG</div>
                </div>
              </div>

              <!-- Gold Ribbon Banner: THẺ THÀNH VIÊN -->
              <div class="vcard-ribbon-wrap">
                <div class="vcard-crown">👑</div>
                <div class="vcard-ribbon">
                  <span class="vcard-ribbon-text">THẺ THÀNH VIÊN</span>
                </div>
                <div class="vcard-stars">★★★</div>
              </div>

              <!-- Middle: Avatar + Member Details -->
              <div class="vcard-middle">
                <!-- Avatar Frame with double gold border -->
                <div class="vcard-avatar-frame">
                  <img src="${member.avatar}" alt="${member.name}" class="vcard-avatar-img">
                </div>

                <!-- Member Details Column -->
                <div class="vcard-details-col">
                  <div class="vcard-member-name-row">
                    <span class="vcard-member-name" title="${member.name}">${member.name}</span>
                    <span class="vcard-sparkle">✦</span>
                  </div>
                  <div class="vcard-gold-line"></div>

                  <div class="vcard-field-row">
                    <span class="vcard-lbl">NGÀY SINH:</span>
                    <span class="vcard-val font-mono">${memberDob}</span>
                  </div>
                  <div class="vcard-field-row">
                    <span class="vcard-lbl">LỚP:</span>
                    <span class="vcard-val" title="${memberClass}">${memberClass}</span>
                  </div>
                  <div class="vcard-field-row">
                    <span class="vcard-lbl">CHỨC VỤ:</span>
                    <span class="vcard-role-pill">${memberRoleTitle}</span>
                  </div>
                </div>
              </div>

              <!-- Bottom Right: SMART QR KEY -->
              <div class="vcard-smart-qr-card">
                <div class="vcard-qr-inner">
                  <canvas id="memberFrontQrCanvas" class="vcard-qr-canvas"></canvas>
                </div>
                <div class="vcard-qr-label">SMART QR KEY</div>
              </div>
            </div>

            <!-- ================= MẶT SAU (BACK SIDE) ================= -->
            <div class="electronic-id-card id-card-back" id="digitalMemberPassBack">
              <div class="vcard-inner-frame"></div>
              <div class="vcard-checkered-watermark"></div>
              <img src="/vcard-back-art.png" alt="" class="vcard-bottom-art">

              <!-- Header: Logo + Divider + Club Info -->
              <div class="vcard-header">
                <div class="vcard-logo-wrap">
                  <img src="/logo-circle.png" alt="Logo CLB Cờ TNU - HGC" class="vcard-header-logo">
                </div>
                <div class="vcard-divider-v"></div>
                <div class="vcard-header-text">
                  <div class="vcard-club-name">CLB CỜ TNU - HGC</div>
                  <div class="vcard-university-name">ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG</div>
                </div>
              </div>

              <!-- Member Data Table in Frosted Glass -->
              <div class="vcard-back-data-card">
                <div class="vback-grid-row">
                  <div class="vback-item">
                    <span class="vback-lbl">MÃ THẺ:</span>
                    <span class="vback-val-id font-mono">${member.id}</span>
                  </div>
                  <div class="vback-item">
                    <span class="vback-lbl">MSSV:</span>
                    <span class="vback-val-mono font-mono">${member.studentId || 'Chưa cập nhật'}</span>
                  </div>
                </div>
                <div class="vback-grid-row">
                  <div class="vback-item">
                    <span class="vback-lbl">KHOA:</span>
                    <span class="vback-val" title="${memberFaculty}">${memberFaculty}</span>
                  </div>
                  <div class="vback-item">
                    <span class="vback-lbl">KHÓA:</span>
                    <span class="vback-val-mono font-mono">${memberCohort}</span>
                  </div>
                </div>
                <div class="vback-grid-row">
                  <div class="vback-item full">
                    <span class="vback-lbl">NGÀY GIA NHẬP:</span>
                    <span class="vback-val-mono font-mono">${memberJoinDate}</span>
                  </div>
                </div>
              </div>

              <!-- Official Rules Box with Gold Border -->
              <div class="vcard-rules-box">
                <div class="vcard-rules-ribbon">
                  <span class="vcard-crown-mini">👑</span>
                  <span class="vcard-rules-title-pill">QUY ĐỊNH SỬ DỤNG THẺ</span>
                </div>
                <div class="vcard-rules-list">
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">①</span>
                    <span class="vcard-rule-txt">Thẻ chỉ có giá trị sử dụng trong CLB Cờ TNU - HGC.</span>
                  </div>
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">②</span>
                    <span class="vcard-rule-txt">Giữ gìn thẻ cẩn thận, không làm mất hoặc hư hỏng.</span>
                  </div>
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">③</span>
                    <span class="vcard-rule-txt">Không cho người khác mượn, sử dụng thẻ của mình.</span>
                  </div>
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">④</span>
                    <span class="vcard-rule-txt">Khi có thay đổi thông tin, vui lòng liên hệ Ban Điều hành CLB.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Card Actions: Tải Thẻ Thành Viên, Lật Thẻ, Nộp Quỹ & Sửa Thông Tin Cá Nhân -->
        <div class="card-action-bar" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 18px;">
          <button id="btnDownloadCard" class="btn btn-gold btn-sm" style="font-weight: 700; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);">
            <span class="btn-icon">⬇</span> Tải Thẻ Thành Viên (2 Mặt)
          </button>
          <button id="btnFlipCardToggle" class="btn btn-outline btn-sm" style="border-color: rgba(212,175,55,0.4); color: #f5d061; font-weight: 600;">
            <span class="btn-icon">🔄</span> Lật Xem Mặt Sau
          </button>
          <button id="btnMemberPayFund" class="btn btn-sm" style="font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); border: none; color: #ffffff; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); padding: 8px 16px;">
            <span class="btn-icon">💳</span> Nộp Quỹ CLB
          </button>
          <button id="btnEditMemberProfileCard" class="btn btn-outline btn-sm" style="border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; font-weight: 600;">
            <span class="btn-icon">✏️</span> Sửa thông tin cá nhân
          </button>
        </div>
      </div>
    `;

    // Render QR Code onto canvas (placed on the front side)
    const canvas = containerEl.querySelector('#memberFrontQrCanvas');
    if (canvas) {
      await qrHelper.renderToCanvas(canvas, payload, {
        width: 120,
        margin: 0,
        dark: '#071536',
        light: '#ffffff'
      });
    }

    // Bind 3D Flip interactions on clicking directly on the card or the toggle button
    const flipInner = containerEl.querySelector('#idCardFlipInner');
    const cardFlipper = containerEl.querySelector('#idCardFlipper');
    const btnFlipToggle = containerEl.querySelector('#btnFlipCardToggle');

    const toggleFlip = () => {
      if (!flipInner) return;
      sound.playClick();
      const isFlipped = flipInner.classList.toggle('is-flipped');
      if (btnFlipToggle) {
        btnFlipToggle.innerHTML = isFlipped 
          ? '<span class="btn-icon">🔄</span> Lật Xem Mặt Trước' 
          : '<span class="btn-icon">🔄</span> Lật Xem Mặt Sau';
      }
    };

    cardFlipper?.addEventListener('click', toggleFlip);
    btnFlipToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFlip();
    });

    // Chức năng Sửa Thông Tin Cá Nhân (Bao gồm ảnh thẻ & thông tin, ẩn phân quyền vai trò)
    const triggerEditProfile = (e) => {
      if (e) e.stopPropagation();
      sound.playClick();
      const latestMember = store.getMemberById(member.id) || member;
      modalManager.openMemberModal(latestMember, (updatedMember) => {
        memberCardComponent.render(containerEl, updatedMember);
      }, { hideRole: true });
    };

    const btnEditProfile = containerEl.querySelector('#btnEditMemberProfileCard');
    btnEditProfile?.addEventListener('click', triggerEditProfile);

    // Chức năng Nộp Quỹ CLB cá nhân hóa
    const btnPayFund = containerEl.querySelector('#btnMemberPayFund');
    btnPayFund?.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      sound.playClick();
      modalManager.openMemberFundPaymentModal(member, () => {
        memberCardComponent.render(containerEl, member);
      });
    });

    // Chức năng tải ảnh thẻ thành viên 2 mặt (Mặt trước & Mặt sau ghép đôi cao cấp)
    const btnDownload = containerEl.querySelector('#btnDownloadCard');

    if (btnDownload) {
      btnDownload.addEventListener('click', async (e) => {
        e.stopPropagation();
        sound.playClick();

        const origHtml = btnDownload.innerHTML;
        btnDownload.disabled = true;
        btnDownload.innerHTML = '<span class="btn-icon">⏳</span> Đang tạo ảnh thẻ 2 mặt...';

        try {
          const frontEl = containerEl.querySelector('#digitalMemberPassFront');
          const backEl = containerEl.querySelector('#digitalMemberPassBack');

          if (!frontEl || !backEl) {
            throw new Error('Không tìm thấy thẻ mặt trước hoặc mặt sau');
          }

          // Off-screen clone container to remove 3D transform during render
          const cloneWrap = document.createElement('div');
          cloneWrap.style.cssText = 'position: absolute; top: 0; left: 0; width: 1000px; opacity: 0; pointer-events: none; z-index: -9999;';
          document.body.appendChild(cloneWrap);

          // Clone Mặt Trước (452 x 606)
          const cloneFront = frontEl.cloneNode(true);
          cloneFront.style.setProperty('transform', 'none', 'important');
          cloneFront.style.setProperty('position', 'relative', 'important');
          cloneFront.style.setProperty('width', '452px', 'important');
          cloneFront.style.setProperty('height', '606px', 'important');
          cloneFront.style.setProperty('aspect-ratio', '452 / 606', 'important');
          cloneFront.style.margin = '0';
          cloneWrap.appendChild(cloneFront);

          // Clone Mặt Sau (452 x 606)
          const cloneBack = backEl.cloneNode(true);
          cloneBack.style.setProperty('transform', 'none', 'important');
          cloneBack.style.setProperty('position', 'relative', 'important');
          cloneBack.style.setProperty('width', '452px', 'important');
          cloneBack.style.setProperty('height', '606px', 'important');
          cloneBack.style.setProperty('aspect-ratio', '452 / 606', 'important');
          cloneBack.style.margin = '0';
          cloneWrap.appendChild(cloneBack);

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
          const imgs = cloneWrap.querySelectorAll('img');
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

          // Capture Front Card via html2canvas (2x scale = 904 x 1212)
          const canvasFront = await html2canvas(cloneFront, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false
          });

          // Capture Back Card via html2canvas (2x scale = 904 x 1212)
          const canvasBack = await html2canvas(cloneBack, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false
          });

          cloneWrap.remove();

          // Create composite 2-sided master canvas matching official proof design: 1024 x 637 at 2x = 2048 x 1274
          const compCanvas = document.createElement('canvas');
          compCanvas.width = 1024 * 2;
          compCanvas.height = 637 * 2;
          const ctxComp = compCanvas.getContext('2d');

          // Dark luxury textured background
          ctxComp.fillStyle = '#1e2129';
          ctxComp.fillRect(0, 0, compCanvas.width, compCanvas.height);

          const radGrad = ctxComp.createRadialGradient(compCanvas.width / 2, compCanvas.height / 2, 120, compCanvas.width / 2, compCanvas.height / 2, compCanvas.width * 0.7);
          radGrad.addColorStop(0, 'rgba(30, 41, 59, 0.6)');
          radGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
          ctxComp.fillStyle = radGrad;
          ctxComp.fillRect(0, 0, compCanvas.width, compCanvas.height);

          // Draw Front Card on left: x = 35 * 2, y = 18 * 2, w = 452 * 2, h = 606 * 2 with soft shadow
          ctxComp.save();
          ctxComp.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctxComp.shadowBlur = 40;
          ctxComp.shadowOffsetX = 0;
          ctxComp.shadowOffsetY = 20;
          ctxComp.drawImage(canvasFront, 35 * 2, 18 * 2, 452 * 2, 606 * 2);
          ctxComp.restore();

          // Draw Back Card on right: x = 536 * 2, y = 18 * 2, w = 453 * 2, h = 606 * 2 with soft shadow
          ctxComp.save();
          ctxComp.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctxComp.shadowBlur = 40;
          ctxComp.shadowOffsetX = 0;
          ctxComp.shadowOffsetY = 20;
          ctxComp.drawImage(canvasBack, 536 * 2, 18 * 2, 453 * 2, 606 * 2);
          ctxComp.restore();

          // Convert compCanvas to Blob
          const blob = await new Promise((resolve) => {
            compCanvas.toBlob(resolve, 'image/png', 0.95);
          });

          const cleanName = (member.name || 'Member').replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
          const fileName = `The_Thanh_Vien_${member.id}_${cleanName}_2Mat.png`;
          const blobUrl = blob ? URL.createObjectURL(blob) : compCanvas.toDataURL('image/png');
          const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;

          // Direct download for desktop
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
