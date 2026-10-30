import { modalManager } from "./modals.js";
import { qrHelper } from '../utils/qrHelper.js';
import { sound } from '../utils/audio.js';
import { store } from '../state/store.js';

export const memberCardComponent = {
  async render(containerEl, member) {
    if (!containerEl || !member) return;

    const payload = qrHelper.generatePayload(member);

    // Derived fields for clean front & back view
    const memberClass = (member.class || member.major || (member.studentId ? 'Lớp ' + member.studentId : 'Chưa phân lớp')).trim();
    const rawFaculty = (member.faculty || '').trim();
    const memberFaculty = (rawFaculty && !rawFaculty.toLowerCase().includes('đại học thái nguyên'))
      ? rawFaculty
      : 'Sư phạm';

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

    // Format cohort / Khóa (ví dụ 2025 - 2029)
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
      return '2025 - 2029';
    };
    const memberCohort = formatCohort(member);
    const memberJoinDate = formatDob(member.joinDate) || '29/10/2026';
    const memberRoleTitle = (member.roleTitle || 'Thành viên').trim();
    const memberName = (member.name || 'Hội Viên CLB').trim();
    const memberMssv = (member.studentId || 'Chưa cập nhật').trim();

    containerEl.innerHTML = `
      <div class="member-card-wrapper animate-fadeIn">
        <!-- Dòng ghi chú lật thẻ đặt lên trên thẻ thành viên -->
        <div class="flip-guide-hint top-hint">
          <span>👆 Nhấn trực tiếp vào thẻ hoặc nút bên dưới để lật giữa <strong>Mặt Trước</strong> và <strong>Mặt Sau</strong></span>
        </div>

        <!-- 3D Flip Card Container (Chuẩn dọc Portrait VIP 452x606 / 904x1212) -->
        <div class="id-card-flip-container" id="idCardFlipper" title="Bấm vào thẻ để lật mặt trước / mặt sau">
          <div class="id-card-flip-inner" id="idCardFlipInner">
            
            <!-- ================= MẶT TRƯỚC (FRONT SIDE) ================= -->
            <div class="electronic-id-card id-card-front" id="digitalMemberPassFront">
              <canvas id="frontCardMasterCanvas" width="904" height="1212" class="vcard-master-canvas"></canvas>
            </div>

            <!-- ================= MẶT SAU (BACK SIDE) ================= -->
            <div class="electronic-id-card id-card-back" id="digitalMemberPassBack">
              <canvas id="backCardMasterCanvas" width="904" height="1212" class="vcard-master-canvas"></canvas>
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

    // Helper: load image safely with CORS fallback
    const loadImage = (src) => new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      if (!src.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (img.crossOrigin) {
          const retryImg = new Image();
          retryImg.onload = () => resolve(retryImg);
          retryImg.onerror = () => resolve(null);
          retryImg.src = src;
        } else {
          resolve(null);
        }
      };
      img.src = src;
    });

    // Helper: rounded rectangle path
    const drawRoundedRectPath = (ctx, x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Prepare Enlarged QR Code (280x280) on offscreen canvas for effortless scanning
    const qrCanvas = document.createElement('canvas');
    await qrHelper.renderToCanvas(qrCanvas, payload, {
      width: 280,
      margin: 0,
      dark: '#071536',
      light: '#ffffff'
    });

    // Load template backgrounds & member avatar in parallel
    const [frontBgImg, backBgImg, avatarImg, fallbackLogoImg] = await Promise.all([
      loadImage('/card-front-bg.png?v=14'),
      loadImage('/card-back-bg.png?v=14'),
      loadImage(member.avatar),
      loadImage('/logo-circle.png?v=14')
    ]);

    const frontCanvas = containerEl.querySelector('#frontCardMasterCanvas');
    const backCanvas = containerEl.querySelector('#backCardMasterCanvas');

    // ================= DRAW FRONT MASTER CANVAS (904 x 1212) =================
    if (frontCanvas) {
      const ctxF = frontCanvas.getContext('2d');
      ctxF.clearRect(0, 0, 904, 1212);

      if (frontBgImg) {
        ctxF.drawImage(frontBgImg, 0, 0, 904, 1212);
      }

      // 1. Draw Member Portrait strictly INSIDE the 3D Gold Frame (47, 427, 324, 359, r=34)
      const photoToDraw = avatarImg || fallbackLogoImg;
      ctxF.save();
      drawRoundedRectPath(ctxF, 47, 427, 324, 359, 34);
      ctxF.clip();
      ctxF.fillStyle = '#08183a';
      ctxF.fillRect(47, 427, 324, 359);
      if (photoToDraw) {
        const boxX = 47, boxY = 427, boxW = 324, boxH = 359;
        const imgW = photoToDraw.naturalWidth || photoToDraw.width || boxW;
        const imgH = photoToDraw.naturalHeight || photoToDraw.height || boxH;
        const scale = Math.max(boxW / imgW, boxH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const drawX = boxX + (boxW - drawW) / 2;
        const drawY = boxY + (boxH - drawH) / 2;
        ctxF.drawImage(photoToDraw, drawX, drawY, drawW, drawH);
      }
      ctxF.restore();

      // Draw crisp inner gold bezel rim over the portrait edge so the photo sits 100% inside the 3D gold frame
      ctxF.save();
      drawRoundedRectPath(ctxF, 45.5, 425.5, 327, 362, 35.5);
      ctxF.strokeStyle = '#dcb258';
      ctxF.lineWidth = 2.8;
      ctxF.stroke();
      ctxF.restore();

      // 2. Draw Member Name centered above the Gold Star Divider (x=646, y=490, maxWidth=445)
      ctxF.save();
      let nameFontSize = 48;
      ctxF.font = `700 ${nameFontSize}px "Segoe UI", "Roboto", "Be Vietnam Pro", Arial, sans-serif`;
      while (ctxF.measureText(memberName).width > 445 && nameFontSize > 28) {
        nameFontSize -= 2;
        ctxF.font = `700 ${nameFontSize}px "Segoe UI", "Roboto", "Be Vietnam Pro", Arial, sans-serif`;
      }
      ctxF.fillStyle = '#ffffff';
      ctxF.textAlign = 'center';
      ctxF.textBaseline = 'middle';
      ctxF.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctxF.shadowBlur = 10;
      ctxF.shadowOffsetX = 0;
      ctxF.shadowOffsetY = 3;
      ctxF.fillText(memberName, 646, 490, 445);
      ctxF.restore();

      // 3. Draw Ngày sinh & Lớp values aligned with unified 33px Bold labels (y=611, y=689)
      ctxF.save();
      ctxF.font = '700 34px "Segoe UI", "Roboto", "Be Vietnam Pro", Arial, sans-serif';
      ctxF.fillStyle = '#f8fafc';
      ctxF.textAlign = 'left';
      ctxF.textBaseline = 'middle';
      ctxF.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctxF.shadowBlur = 6;
      ctxF.shadowOffsetX = 0;
      ctxF.shadowOffsetY = 2;
      ctxF.fillText(memberDob, 670, 611, 196);
      ctxF.fillText(memberClass, 670, 689, 196);
      ctxF.restore();

      // 4. Draw Chức vụ value centered inside the 3D Gold Pill (x=766, y=770, maxWidth=176)
      ctxF.save();
      let roleFontSize = 29;
      ctxF.font = `700 ${roleFontSize}px "Segoe UI", "Roboto", "Be Vietnam Pro", Arial, sans-serif`;
      while (ctxF.measureText(memberRoleTitle).width > 174 && roleFontSize > 20) {
        roleFontSize -= 1;
        ctxF.font = `700 ${roleFontSize}px "Segoe UI", "Roboto", "Be Vietnam Pro", Arial, sans-serif`;
      }
      ctxF.fillStyle = '#081636';
      ctxF.textAlign = 'center';
      ctxF.textBaseline = 'middle';
      ctxF.shadowColor = 'rgba(255, 248, 220, 0.45)';
      ctxF.shadowBlur = 1;
      ctxF.shadowOffsetY = 1;
      ctxF.fillText(memberRoleTitle, 766, 770, 176);
      ctxF.restore();

      // 5. Draw Enlarged Smart QR Key inside the Expanded Gold QR Frame (527, 828, 280, 280)
      ctxF.save();
      drawRoundedRectPath(ctxF, 527, 828, 280, 280, 10);
      ctxF.clip();
      ctxF.drawImage(qrCanvas, 527, 828, 280, 280);
      ctxF.restore();
    }

    // ================= DRAW BACK MASTER CANVAS (904 x 1212) =================
    if (backCanvas) {
      const ctxB = backCanvas.getContext('2d');
      ctxB.clearRect(0, 0, 904, 1212);

      if (backBgImg) {
        ctxB.drawImage(backBgImg, 0, 0, 904, 1212);
      }

      ctxB.save();
      ctxB.textAlign = 'left';
      ctxB.textBaseline = 'middle';
      ctxB.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctxB.shadowBlur = 6;
      ctxB.shadowOffsetX = 0;
      ctxB.shadowOffsetY = 2;

      // 1. Mã thẻ (highlighted sky-blue bold at x=212, y=313)
      ctxB.font = '700 33px "Segoe UI", "Roboto", "Be Vietnam Pro", Arial, sans-serif';
      ctxB.fillStyle = '#56ccf2';
      ctxB.fillText(String(member.id || ''), 212, 313, 245);

      // 2. MSSV, Khoa, Khóa, Ngày gia nhập (unified 31px bold white aligned with labels)
      ctxB.font = '700 31px "Segoe UI", "Roboto", "Be Vietnam Pro", Arial, sans-serif';
      ctxB.fillStyle = '#f8fafc';
      ctxB.fillText(memberMssv, 578, 313, 290);
      ctxB.fillText(memberFaculty, 256, 398, 205);
      ctxB.fillText(memberCohort, 578, 398, 290);
      ctxB.fillText(memberJoinDate, 396, 482, 290);
      ctxB.restore();
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

    // Chức năng tải ảnh thẻ thành viên 2 mặt (Ghép trực tiếp từ 2 Master Canvas 904x1212 sắc nét 100%)
    const btnDownload = containerEl.querySelector('#btnDownloadCard');

    if (btnDownload) {
      btnDownload.addEventListener('click', async (e) => {
        e.stopPropagation();
        sound.playClick();

        const origHtml = btnDownload.innerHTML;
        btnDownload.disabled = true;
        btnDownload.innerHTML = '<span class="btn-icon">⏳</span> Đang tạo ảnh thẻ 2 mặt...';

        try {
          if (!frontCanvas || !backCanvas) {
            throw new Error('Không tìm thấy thẻ mặt trước hoặc mặt sau');
          }

          // Create composite 2-sided master canvas: 2048 x 1274
          const compCanvas = document.createElement('canvas');
          compCanvas.width = 2048;
          compCanvas.height = 1274;
          const ctxComp = compCanvas.getContext('2d');

          // Dark luxury textured background
          ctxComp.fillStyle = '#070e20';
          ctxComp.fillRect(0, 0, compCanvas.width, compCanvas.height);

          const radGrad = ctxComp.createRadialGradient(
            compCanvas.width / 2,
            compCanvas.height / 2,
            120,
            compCanvas.width / 2,
            compCanvas.height / 2,
            compCanvas.width * 0.7
          );
          radGrad.addColorStop(0, 'rgba(20, 38, 76, 0.72)');
          radGrad.addColorStop(1, 'rgba(6, 12, 28, 0.98)');
          ctxComp.fillStyle = radGrad;
          ctxComp.fillRect(0, 0, compCanvas.width, compCanvas.height);

          // Helper to draw each card with drop shadow and rounded corners
          const drawCardOnComposite = (cardCanvas, x, y, w, h, r) => {
            ctxComp.save();
            ctxComp.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctxComp.shadowBlur = 40;
            ctxComp.shadowOffsetX = 0;
            ctxComp.shadowOffsetY = 20;
            drawRoundedRectPath(ctxComp, x, y, w, h, r);
            ctxComp.fillStyle = '#081838';
            ctxComp.fill();
            ctxComp.restore();

            ctxComp.save();
            drawRoundedRectPath(ctxComp, x, y, w, h, r);
            ctxComp.clip();
            ctxComp.drawImage(cardCanvas, x, y, w, h);
            ctxComp.restore();
          };

          // Draw Front Card on left (70, 31, 904, 1212) & Back Card on right (1074, 31, 904, 1212)
          drawCardOnComposite(frontCanvas, 70, 31, 904, 1212, 44);
          drawCardOnComposite(backCanvas, 1074, 31, 904, 1212, 44);

          // Convert compCanvas to Blob
          const blob = await new Promise((resolve) => {
            compCanvas.toBlob(resolve, 'image/png', 0.98);
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
