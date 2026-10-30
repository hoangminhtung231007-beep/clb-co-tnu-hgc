import { modalManager } from "./modals.js";
import { qrHelper } from '../utils/qrHelper.js';
import { sound } from '../utils/audio.js';
import { store } from '../state/store.js';
import html2canvas from 'html2canvas';

export const memberCardComponent = {
  async render(containerEl, member) {
    if (!containerEl || !member) return;

    const payload = qrHelper.generatePayload(member);

    // Derived fields for clean front & back view
    const memberClass = member.class || member.major || (member.studentId ? 'Lớp ' + member.studentId : 'Chưa phân lớp');
    const memberFaculty = member.faculty || member.university || 'Sư phạm';

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
    const memberRoleTitle = member.roleTitle || 'Thành viên';

    // Monochrome 3D Metallic Gold SVG Icons
    const svgCalendar = `
      <svg class="vcard-gold-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gCal" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF3B0"/>
            <stop offset="45%" stop-color="#EAB308"/>
            <stop offset="100%" stop-color="#A16207"/>
          </linearGradient>
        </defs>
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" stroke="url(#gCal)" stroke-width="2" fill="rgba(234,179,8,0.12)"/>
        <path d="M3 9.5H21" stroke="url(#gCal)" stroke-width="2"/>
        <path d="M8 2.5V6M16 2.5V6" stroke="url(#gCal)" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="6.5" y="12" width="2.2" height="2.2" rx="0.5" fill="url(#gCal)"/>
        <rect x="10.9" y="12" width="2.2" height="2.2" rx="0.5" fill="url(#gCal)"/>
        <rect x="15.3" y="12" width="2.2" height="2.2" rx="0.5" fill="url(#gCal)"/>
        <rect x="6.5" y="16" width="2.2" height="2.2" rx="0.5" fill="url(#gCal)"/>
        <rect x="10.9" y="16" width="2.2" height="2.2" rx="0.5" fill="url(#gCal)"/>
        <rect x="15.3" y="16" width="2.2" height="2.2" rx="0.5" fill="url(#gCal)"/>
      </svg>`;

    const svgGradCap = `
      <svg class="vcard-gold-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gCap" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF3B0"/>
            <stop offset="50%" stop-color="#EAB308"/>
            <stop offset="100%" stop-color="#A16207"/>
          </linearGradient>
        </defs>
        <path d="M12 4L2 9L12 14L22 9L12 4Z" fill="url(#gCap)" stroke="#FEF08A" stroke-width="0.8" stroke-linejoin="round"/>
        <path d="M6 11.5V16.5C6 18.2 8.7 19.8 12 19.8C15.3 19.8 18 18.2 18 16.5V11.5" stroke="url(#gCap)" stroke-width="2" stroke-linecap="round"/>
        <path d="M21 9.5V16.5" stroke="url(#gCap)" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="21" cy="17" r="1.3" fill="url(#gCap)"/>
      </svg>`;

    const svgUser = `
      <svg class="vcard-gold-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gUsr" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF3B0"/>
            <stop offset="50%" stop-color="#EAB308"/>
            <stop offset="100%" stop-color="#A16207"/>
          </linearGradient>
        </defs>
        <circle cx="12" cy="8" r="4.2" fill="url(#gUsr)"/>
        <path d="M4.5 19.5C4.5 15.9 7.8 13.5 12 13.5C16.2 13.5 19.5 15.9 19.5 19.5C19.5 20.3 18.8 20.8 18 20.8H6C5.2 20.8 4.5 20.3 4.5 19.5Z" fill="url(#gUsr)"/>
      </svg>`;

    const svgHandshake = `
      <svg class="vcard-gold-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gHand" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF3B0"/>
            <stop offset="50%" stop-color="#EAB308"/>
            <stop offset="100%" stop-color="#A16207"/>
          </linearGradient>
        </defs>
        <path d="M2 11L6.5 6.5L11 9L15 6L22 11L18.5 15.5L14 12.5L10.5 16L6.5 13.5L2 11Z" stroke="url(#gHand)" stroke-width="2" stroke-linejoin="round" fill="rgba(234,179,8,0.18)"/>
        <path d="M8.5 15L11.5 18C12.3 18.8 13.6 18.8 14.4 18L18 14.5" stroke="url(#gHand)" stroke-width="2" stroke-linecap="round"/>
      </svg>`;

    // Ornate 3D Gold Banner SVG ("THẺ THÀNH VIÊN" + 3D Crown + Left/Right Laurel Wreaths + 3 Stars)
    const svgFrontBanner = `
      <svg class="vcard-banner-svg" viewBox="0 0 840 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldPlaque" x1="0" y1="36" x2="0" y2="122" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF6B7"/>
            <stop offset="22%" stop-color="#F6C851"/>
            <stop offset="52%" stop-color="#D49B27"/>
            <stop offset="80%" stop-color="#F8D568"/>
            <stop offset="100%" stop-color="#9A6912"/>
          </linearGradient>
          <linearGradient id="goldRim" x1="90" y1="36" x2="750" y2="122" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FEF08A"/>
            <stop offset="50%" stop-color="#B47B15"/>
            <stop offset="100%" stop-color="#FEF08A"/>
          </linearGradient>
          <linearGradient id="goldLeaf" x1="0" y1="20" x2="0" y2="125" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF5B2"/>
            <stop offset="50%" stop-color="#E5AF36"/>
            <stop offset="100%" stop-color="#9E6C14"/>
          </linearGradient>
          <linearGradient id="goldLineFade" x1="80" y1="0" x2="760" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#EAB308" stop-opacity="0"/>
            <stop offset="20%" stop-color="#FDE047" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#FFF9C4" stop-opacity="1"/>
            <stop offset="80%" stop-color="#FDE047" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#EAB308" stop-opacity="0"/>
          </linearGradient>
          <filter id="plaqueShadow" x="-5%" y="-5%" width="110%" height="120%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000000" flood-opacity="0.65"/>
          </filter>
        </defs>

        <!-- Top & Bottom Accent Gold Hairlines -->
        <line x1="95" y1="33" x2="745" y2="33" stroke="url(#goldLineFade)" stroke-width="1.6"/>
        <line x1="95" y1="136" x2="745" y2="136" stroke="url(#goldLineFade)" stroke-width="1.6"/>

        <!-- LEFT GOLDEN LAUREL WREATH (Cành nguyệt quế trái) -->
        <g filter="url(#plaqueShadow)" fill="url(#goldLeaf)">
          <path d="M98 110 C65 104, 42 82, 34 38 C38 66, 58 92, 96 104 Z"/>
          <!-- Outer Leaves Left -->
          <path d="M74 102 C50 105, 30 96, 18 82 C36 82, 56 88, 74 102 Z"/>
          <path d="M60 88 C38 86, 22 72, 16 54 C32 58, 48 70, 60 88 Z"/>
          <path d="M50 70 C32 62, 22 46, 22 26 C35 35, 45 50, 50 70 Z"/>
          <path d="M44 50 C34 36, 32 20, 38 6 C45 20, 48 35, 44 50 Z"/>
          <!-- Inner Leaves Left -->
          <path d="M84 96 C72 80, 68 65, 75 50 C82 64, 86 80, 84 96 Z"/>
          <path d="M68 80 C60 64, 60 48, 68 34 C73 48, 74 64, 68 80 Z"/>
          <path d="M56 60 C52 44, 54 30, 64 18 C66 32, 63 46, 56 60 Z"/>
        </g>

        <!-- RIGHT GOLDEN LAUREL WREATH (Cành nguyệt quế phải - đối xứng) -->
        <g transform="translate(840, 0) scale(-1, 1)" filter="url(#plaqueShadow)" fill="url(#goldLeaf)">
          <path d="M98 110 C65 104, 42 82, 34 38 C38 66, 58 92, 96 104 Z"/>
          <path d="M74 102 C50 105, 30 96, 18 82 C36 82, 56 88, 74 102 Z"/>
          <path d="M60 88 C38 86, 22 72, 16 54 C32 58, 48 70, 60 88 Z"/>
          <path d="M50 70 C32 62, 22 46, 22 26 C35 35, 45 50, 50 70 Z"/>
          <path d="M44 50 C34 36, 32 20, 38 6 C45 20, 48 35, 44 50 Z"/>
          <path d="M84 96 C72 80, 68 65, 75 50 C82 64, 86 80, 84 96 Z"/>
          <path d="M68 80 C60 64, 60 48, 68 34 C73 48, 74 64, 68 80 Z"/>
          <path d="M56 60 C52 44, 54 30, 64 18 C66 32, 63 46, 56 60 Z"/>
        </g>

        <!-- MAIN 3D BEVELED GOLD PLAQUE + BOTTOM STAR PEDESTAL -->
        <g filter="url(#plaqueShadow)">
          <!-- Outer Gold Plaque Body -->
          <path d="M118 42 H722 C738 42, 750 54, 750 70 V88 C750 104, 738 116, 722 116 H510 L488 134 H352 L330 116 H118 C102 116, 90 104, 90 88 V70 C90 54, 102 42, 118 42 Z"
                fill="url(#goldPlaque)" stroke="url(#goldRim)" stroke-width="3"/>
          <!-- Inner Recessed Gold Bevel Line -->
          <path d="M122 48 H718 C730 48, 742 58, 742 70 V88 C742 100, 730 110, 718 110 H504 L483 128 H357 L336 110 H122 C110 110, 98 100, 98 88 V70 C98 58, 110 48, 122 48 Z"
                fill="none" stroke="#784F08" stroke-width="1.3" stroke-opacity="0.75"/>
        </g>

        <!-- TOP CENTER 3D ROYAL GOLD CROWN -->
        <g filter="url(#plaqueShadow)">
          <path d="M382 36 L372 15 L397 25 L420 6 L443 25 L468 15 L458 36 Z" fill="url(#goldPlaque)" stroke="#FEF08A" stroke-width="1.2" stroke-linejoin="round"/>
          <rect x="380" y="35" width="80" height="6" rx="2.5" fill="url(#goldPlaque)" stroke="#9A6912" stroke-width="1"/>
          <circle cx="371" cy="12" r="2.6" fill="#FFF9C4"/>
          <circle cx="397" cy="21" r="2.2" fill="#FFF9C4"/>
          <circle cx="420" cy="4" r="3.2" fill="#FFF9C4"/>
          <circle cx="443" cy="21" r="2.2" fill="#FFF9C4"/>
          <circle cx="469" cy="12" r="2.6" fill="#FFF9C4"/>
        </g>

        <!-- ENGRAVED TITLE: THẺ THÀNH VIÊN -->
        <text x="420" y="92" text-anchor="middle" fill="#07193E"
              font-family="'Times New Roman', 'Playfair Display', Georgia, serif"
              font-weight="900" font-size="42" letter-spacing="2.5"
              style="filter: drop-shadow(0px 1px 0px rgba(255,250,210,0.75));">THẺ THÀNH VIÊN</text>

        <!-- 3 STARS ON BOTTOM PEDESTAL (★ ★ ★) -->
        <g fill="#07193E">
          <polygon transform="translate(390, 118) scale(0.75)" points="0,-8 2.4,-2.5 8.4,-2.5 3.6,1.2 5.4,7 0,3.5 -5.4,7 -3.6,1.2 -8.4,-2.5 -2.4,-2.5"/>
          <polygon transform="translate(420, 117) scale(0.95)" points="0,-8 2.4,-2.5 8.4,-2.5 3.6,1.2 5.4,7 0,3.5 -5.4,7 -3.6,1.2 -8.4,-2.5 -2.4,-2.5"/>
          <polygon transform="translate(450, 118) scale(0.75)" points="0,-8 2.4,-2.5 8.4,-2.5 3.6,1.2 5.4,7 0,3.5 -5.4,7 -3.6,1.2 -8.4,-2.5 -2.4,-2.5"/>
        </g>
      </svg>`;

    // Centered Gold Star Divider under Member Name (─── ✦ ───)
    const svgNameDivider = `
      <svg class="vcard-name-divider-svg" viewBox="0 0 420 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="divLineL" x1="10" y1="11" x2="195" y2="11" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#EAB308" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#FDE047" stop-opacity="0.95"/>
          </linearGradient>
          <linearGradient id="divLineR" x1="225" y1="11" x2="410" y2="11" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FDE047" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#EAB308" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
        <line x1="10" y1="11" x2="194" y2="11" stroke="url(#divLineL)" stroke-width="1.8"/>
        <line x1="226" y1="11" x2="410" y2="11" stroke="url(#divLineR)" stroke-width="1.8"/>
        <circle cx="195" cy="11" r="2" fill="#FDE047"/>
        <path d="M210 1 L213.2 7.8 L220 11 L213.2 14.2 L210 21 L206.8 14.2 L200 11 L206.8 7.8 Z" fill="#FEF08A"/>
        <circle cx="225" cy="11" r="2" fill="#FDE047"/>
      </svg>`;

    // Back Rules Crown + 3D Gold Header Plaque SVG ("QUY ĐỊNH SỬ DỤNG THẺ")
    const svgBackRulesHeader = `
      <svg class="vcard-rules-header-svg" viewBox="0 0 620 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldRulePlaque" x1="0" y1="32" x2="0" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF6B7"/>
            <stop offset="28%" stop-color="#F5C445"/>
            <stop offset="65%" stop-color="#CA8E1E"/>
            <stop offset="100%" stop-color="#FDE68A"/>
          </linearGradient>
          <filter id="ruleHeadShadow" x="-5%" y="-5%" width="110%" height="125%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
          </filter>
        </defs>
        <!-- Top Center 3D Crown -->
        <g filter="url(#ruleHeadShadow)">
          <path d="M276 32 L267 11 L290 21 L310 3 L330 21 L353 11 L344 32 Z" fill="url(#goldRulePlaque)" stroke="#FEF08A" stroke-width="1.2" stroke-linejoin="round"/>
          <rect x="274" y="31" width="72" height="5.5" rx="2" fill="url(#goldRulePlaque)" stroke="#9A6912" stroke-width="1"/>
          <circle cx="266" cy="9" r="2.3" fill="#FFF9C4"/>
          <circle cx="310" cy="2.5" r="2.8" fill="#FFF9C4"/>
          <circle cx="354" cy="9" r="2.3" fill="#FFF9C4"/>
        </g>
        <!-- Side Wing Tips -->
        <path d="M52 62 L76 48 V76 Z" fill="url(#goldRulePlaque)"/>
        <path d="M568 62 L544 48 V76 Z" fill="url(#goldRulePlaque)"/>
        <!-- Main Plaque -->
        <rect x="70" y="36" width="480" height="50" rx="18" fill="url(#goldRulePlaque)" stroke="#FEF08A" stroke-width="2.2" filter="url(#ruleHeadShadow)"/>
        <rect x="76" y="41" width="468" height="40" rx="14" fill="none" stroke="#784F08" stroke-width="1.1" stroke-opacity="0.65"/>
        <text x="310" y="69" text-anchor="middle" fill="#07193E"
              font-family="'Montserrat', 'Be Vietnam Pro', 'Segoe UI', sans-serif"
              font-weight="900" font-size="25" letter-spacing="1.2"
              style="filter: drop-shadow(0px 1px 0px rgba(255,250,210,0.75));">QUY ĐỊNH SỬ DỤNG THẺ</text>
      </svg>`;

    containerEl.innerHTML = `
      <div class="member-card-wrapper animate-fadeIn">
        <!-- Dòng ghi chú lật thẻ đặt lên trên thẻ thành viên -->
        <div class="flip-guide-hint top-hint">
          <span>👆 Nhấn trực tiếp vào thẻ hoặc nút bên dưới để lật giữa <strong>Mặt Trước</strong> và <strong>Mặt Sau</strong></span>
        </div>

        <!-- 3D Flip Card Container (Chuẩn dọc Portrait VIP 452x606) -->
        <div class="id-card-flip-container" id="idCardFlipper" title="Bấm vào thẻ để lật mặt trước / mặt sau">
          <div class="id-card-flip-inner" id="idCardFlipInner">
            
            <!-- ================= MẶT TRƯỚC (FRONT SIDE) ================= -->
            <div class="electronic-id-card id-card-front" id="digitalMemberPassFront">
              
              <!-- Header CLB: Logo Tròn + Vạch Vàng + Tên CLB & Phân hiệu -->
              <div class="vcard-header">
                <div class="vcard-logo-ring">
                  <img src="/logo-circle.png?v=11" alt="Logo CLB Cờ TNU - HGC" class="vcard-logo-img">
                </div>
                <div class="vcard-header-divider"></div>
                <div class="vcard-header-titles">
                  <div class="vcard-club-title">CLB CỜ TNU - HGC</div>
                  <div class="vcard-club-sub">ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU<br>TẠI HÀ GIANG</div>
                </div>
              </div>

              <!-- Quốc Huy / Biểu Tượng Vàng 3D: Vương Miện + Cành Nguyệt Quế + THẺ THÀNH VIÊN + 3 Sao -->
              <div class="vcard-banner-wrap">
                ${svgFrontBanner}
              </div>

              <!-- Khung Vàng 3D Ảnh Chân Dung Hội Viên -->
              <div class="vcard-avatar-box">
                <div class="vcard-avatar-inner">
                  <img src="${member.avatar}" alt="${member.name}" class="vcard-avatar-img">
                </div>
              </div>

              <!-- Cột Thông Tin Kỳ Thủ Bên Phải Ảnh Chân Dung -->
              <div class="vcard-front-info">
                <div class="vcard-member-name" title="${member.name}">${member.name}</div>
                <div class="vcard-name-divider">${svgNameDivider}</div>
                
                <div class="vcard-info-rows">
                  <div class="vcard-info-row">
                    <span class="vcard-icon">${svgCalendar}</span>
                    <span class="vcard-label">Ngày sinh:</span>
                    <span class="vcard-val">${memberDob}</span>
                  </div>
                  <div class="vcard-info-row">
                    <span class="vcard-icon">${svgGradCap}</span>
                    <span class="vcard-label">Lớp:</span>
                    <span class="vcard-val" title="${memberClass}">${memberClass}</span>
                  </div>
                  <div class="vcard-info-row">
                    <span class="vcard-icon">${svgUser}</span>
                    <span class="vcard-label">Chức vụ:</span>
                    <span class="vcard-role-pill">${memberRoleTitle}</span>
                  </div>
                </div>
              </div>

              <!-- Ô Mã QR Động Smart QR Key Ở Góc Dưới Bên Phải -->
              <div class="vcard-qr-box">
                <canvas id="memberFrontQrCanvas" class="vcard-qr-canvas"></canvas>
              </div>
            </div>

            <!-- ================= MẶT SAU (BACK SIDE) ================= -->
            <div class="electronic-id-card id-card-back" id="digitalMemberPassBack">
              
              <!-- Header CLB Đồng Bộ Mặt Trước -->
              <div class="vcard-header">
                <div class="vcard-logo-ring">
                  <img src="/logo-circle.png?v=11" alt="Logo CLB Cờ TNU - HGC" class="vcard-logo-img">
                </div>
                <div class="vcard-header-divider"></div>
                <div class="vcard-header-titles">
                  <div class="vcard-club-title">CLB CỜ TNU - HGC</div>
                  <div class="vcard-club-sub">ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU<br>TẠI HÀ GIANG</div>
                </div>
              </div>

              <!-- Khu Vực Thông Tin Chi Tiết Kỳ Thủ Trên Mặt Sau -->
              <div class="vcard-back-info-box">
                <div class="vcard-back-row">
                  <div class="vcard-back-col">
                    <span class="vback-label">Mã thẻ:</span>
                    <span class="vback-val vback-id">${member.id}</span>
                  </div>
                  <div class="vcard-back-col">
                    <span class="vback-label">MSSV:</span>
                    <span class="vback-val">${member.studentId || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                <div class="vcard-back-row">
                  <div class="vcard-back-col">
                    <span class="vback-icon">${svgGradCap}</span>
                    <span class="vback-label">Khoa:</span>
                    <span class="vback-val" title="${memberFaculty}">${memberFaculty}</span>
                  </div>
                  <div class="vcard-back-col">
                    <span class="vback-label">Khóa:</span>
                    <span class="vback-val">${memberCohort}</span>
                  </div>
                </div>

                <div class="vcard-back-row">
                  <div class="vcard-back-col full-w">
                    <span class="vback-icon">${svgHandshake}</span>
                    <span class="vback-label">Ngày gia nhập:</span>
                    <span class="vback-val">${memberJoinDate}</span>
                  </div>
                </div>
              </div>

              <!-- Khung Vàng 3D Quy Định Sử Dụng Thẻ Có Vương Miện -->
              <div class="vcard-back-rules-wrap">
                <div class="vcard-rules-header-box">
                  ${svgBackRulesHeader}
                </div>
                <div class="vcard-rules-frame">
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">1</span>
                    <span class="vcard-rule-text">Thẻ chỉ có giá trị sử dụng trong CLB Cờ TNU - HGC.</span>
                  </div>
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">2</span>
                    <span class="vcard-rule-text">Giữ gìn thẻ cẩn thận, không làm mất hoặc hư hỏng.</span>
                  </div>
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">3</span>
                    <span class="vcard-rule-text">Không cho người khác mượn, sử dụng thẻ của mình.</span>
                  </div>
                  <div class="vcard-rule-item">
                    <span class="vcard-rule-num">4</span>
                    <span class="vcard-rule-text">Khi có thay đổi thông tin, vui lòng liên hệ Ban Điều hành CLB.</span>
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
        width: 140,
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
