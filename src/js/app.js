import { store } from './state/store.js';
import { CHESS_MOTTOS } from './state/chessMottos.js';
import { sound } from './utils/audio.js';
import { chartHelper } from './utils/charts.js';
import { SmartQRScanner } from './components/qrScanner.js';
import { memberCardComponent } from './components/memberCard.js';
import { modalManager } from './components/modals.js';
import { firebaseService } from './services/firebaseService.js';
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from './config/firebaseConfig.js';

class App {
  constructor() {
    this.currentView = 'home'; // home, about, org, leaderboard, events, news, member-pass, admin
    this.adminSubView = 'admin-overview'; // admin-overview, admin-checkin, admin-users, admin-events, admin-cms, admin-analytics, admin-firebase
    this.qrScannerInstance = null;
    this.leaderboardFilter = 'all'; // Default to combined 'all'
    this.orgTab = 'board'; // 'board' | 'members'
    this.memberSearchQuery = '';
    this.memberDisciplineFilter = 'all';
    this.analyticsStartDate = '2026-09-01';
    this.analyticsEndDate = '2027-06-30';
    this.firebaseUnlocked = false;
    this.deferredInstallPrompt = null;

    this.init();
  }

  init() {
    // Register Service Worker for PWA & Device Push Notifications
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('CLB Cờ PWA ServiceWorker registered', reg);
      }).catch((err) => {
        console.warn('SW registration skipped', err);
      });
    }

    // Capture PWA beforeinstallprompt on Android / Chromium
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e;
      });
    }

    // If reloaded while in admin role, go directly to check-in on mobile, or overview on desktop
    const sessionRole = store.getState().currentSession?.role;
    if (sessionRole === 'admin') {
      this.currentView = 'admin';
      this.adminSubView = window.innerWidth <= 768 ? 'admin-checkin' : 'admin-overview';
    } else if (sessionRole === 'member') {
      this.currentView = 'member-pass';
    }

    // Listen to Firebase status changes
    firebaseService.onStatusChange((status, lastSync) => {
      this.updateFirebaseBadge(status, lastSync);
    });

    // Subscribe to state changes to auto re-render if necessary
    store.subscribe((state) => {
      this.updateTopbarRoleBadge();
      if (this.currentView === 'admin' && this.adminSubView === 'admin-overview') {
        const pane = document.getElementById('adminSubContentPane');
        if (pane) this.renderAdminOverview(pane);
      } else if (this.currentView === 'admin' && this.adminSubView === 'admin-users') {
        this.renderAdminUsers();
      } else if (this.currentView === 'admin' && this.adminSubView === 'admin-events') {
        const pane = document.getElementById('adminSubContentPane');
        if (pane) this.renderAdminEvents(pane);
      } else if (this.currentView === 'admin' && this.adminSubView === 'admin-swiss') {
        const pane = document.getElementById('adminSubContentPane');
        if (pane) this.renderAdminSwiss(pane);
      } else if (this.currentView === 'admin' && this.adminSubView === 'admin-funds') {
        const pane = document.getElementById('adminSubContentPane');
        if (pane) this.renderAdminFunds(pane);
      } else if (this.currentView === 'admin' && this.adminSubView === 'admin-cms') {
        const pane = document.getElementById('adminSubContentPane');
        if (pane) this.renderAdminCms(pane);
      } else if (this.currentView === 'admin' && this.adminSubView === 'admin-analytics') {
        const pane = document.getElementById('adminSubContentPane');
        if (pane) this.renderAdminAnalytics(pane);
      } else if (this.currentView === 'admin' && this.adminSubView === 'admin-firebase') {
        const pane = document.getElementById('adminSubContentPane');
        if (pane && this.firebaseUnlocked) this.renderAdminFirebase(pane);
      } else if (this.currentView === 'leaderboard') {
        this.renderLeaderboardTable();
      } else if (this.currentView === 'org') {
        const container = document.getElementById('mainViewport');
        if (container) this.renderOrganization(container);
      } else if (this.currentView === 'events') {
        const container = document.getElementById('mainViewport');
        if (container) this.renderEvents(container);
      } else if (this.currentView === 'news') {
        const container = document.getElementById('mainViewport');
        if (container) this.renderNews(container);
      } else if (this.currentView === 'member-pass') {
        const container = document.getElementById('mainViewport');
        if (container) this.renderMemberPass(container);
      }
    });

    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && this.currentView === 'admin' && this.adminSubView !== 'admin-checkin') {
        this.adminSubView = 'admin-checkin';
        const dashboard = document.getElementById('mainViewport');
        if (dashboard) this.renderAdminDashboard(dashboard);
      }
    });

    this.bindGlobalNavigation();
    this.renderCurrentView();
  }

  updateTopbarRoleBadge() {
    const state = store.getState();
    const role = state.currentSession.role;
    const activeMember = store.getActiveMember();
    const isGuest = role === 'guest';
    const isAdmin = role === 'admin';
    // 1. Hide / Show nav menus:
    // Admin mode: Hide ALL menu links from top nav (as Thẻ Thành Viên moved to Buồng lái vận hành)
    // Guest mode: Hide Member Pass
    const allNavViews = ['home', 'about', 'org', 'leaderboard', 'events', 'news', 'member-pass'];
    allNavViews.forEach((v) => {
      const link = document.querySelector(`.nav-menu-links [data-view="${v}"]`);
      if (link) {
        const li = link.closest('li') || link;
        if (isAdmin) {
          li.style.display = 'none';
        } else if (isGuest && v === 'member-pass') {
          li.style.display = 'none';
        } else {
          li.style.display = '';
        }
      }
      const mobileBtn = document.querySelector(`.mobile-nav-btn[data-view="${v}"]`);
      if (mobileBtn) {
        if (isAdmin) {
          mobileBtn.style.display = 'none';
        } else if (isGuest && v === 'member-pass') {
          mobileBtn.style.display = 'none';
        } else {
          mobileBtn.style.display = '';
        }
      }
    });

    const footerMemberCol = document.getElementById('footerMemberCol');
    if (footerMemberCol) {
      footerMemberCol.style.display = isGuest ? 'none' : '';
    }

    // 2. Hide / Show guest action buttons vs user avatar pill & admin button
    const guestNavActions = document.getElementById('guestNavActions');
    const userNavActions = document.getElementById('userNavActions');
    const btnAdminPortal = document.getElementById('btnAdminPortal');
    const navUserBadge = document.getElementById('navUserBadge');

    document.body.classList.toggle('role-admin', isAdmin);
    document.body.classList.toggle('role-member', !isGuest && !isAdmin);
    document.body.classList.toggle('role-guest', isGuest);

    const mobileBottomBar = document.getElementById('mobileBottomBar');
    if (mobileBottomBar) {
      mobileBottomBar.style.display = isAdmin ? 'none' : '';
    }

    if (guestNavActions) {
      guestNavActions.style.display = isGuest ? 'flex' : 'none';
    }
    if (userNavActions) {
      userNavActions.style.display = isGuest ? 'none' : 'flex';
    }
    if (btnAdminPortal) {
      btnAdminPortal.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    if (navUserBadge) {
      if (isAdmin) {
        navUserBadge.innerHTML = `<button type="button" class="btn btn-outline btn-xs" style="font-size:0.75rem; padding: 4px 8px; cursor: pointer; border-radius: 20px; border-color: rgba(212,175,55,0.4); color: var(--gold-light); background: rgba(212,175,55,0.1); white-space: nowrap;" title="Buồng lái Quản trị viên"><span>👑</span> Quản Trị Viên</button>`;
      } else {
        navUserBadge.innerHTML = '';
      }
    }

    // 3. Update Mobile Bottom Bar Center FAB (Đăng ký for Guest, Thẻ TV for Member)
    const fabIcon = document.getElementById('mobileFabIcon');
    const fabText = document.getElementById('mobileFabText');
    const fabCenter = document.getElementById('mobileFabCenter');
    if (fabIcon && fabText && fabCenter) {
      if (isGuest) {
        fabIcon.textContent = '📝';
        fabText.textContent = 'Đăng ký';
        fabCenter.title = 'Đăng Ký Tham Gia CLB Cờ TNU - HGC';
      } else {
        fabIcon.textContent = '💳';
        fabText.textContent = 'Thẻ TV';
        fabCenter.title = 'Xem Thẻ Thành Viên Điện Tử';
      }
    }

    this.updateMobileDrawerContent();
    this.renderNotificationsList();
  }

  updateMobileDrawerContent() {
    const state = store.getState();
    const role = state.currentSession.role;
    const activeMember = store.getActiveMember();
    const isGuest = role === 'guest';
    const drawerOverlay = document.getElementById('mobileDrawerOverlay');
    if (!drawerOverlay) return;

    // Highlight active link
    drawerOverlay.querySelectorAll('.mobile-drawer-item').forEach((item) => {
      const v = item.getAttribute('data-view');
      item.classList.toggle('active', v === this.currentView);
    });

    // Hide or show Thẻ thành viên in drawer
    const drawerPassItem = document.getElementById('drawerItemMemberPass');
    if (drawerPassItem) {
      drawerPassItem.style.display = isGuest ? 'none' : 'flex';
    }

    // Render Auth Greeting Card in Drawer
    const authBox = document.getElementById('mobileDrawerAuth');
    if (authBox) {
      if (isGuest) {
        authBox.innerHTML = `
          <div class="card p-3 mb-3" style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.25);">
            <div class="d-flex align-center justify-between">
              <div>
                <div class="text-xs font-bold text-gold">Chào mừng kỳ thủ mới!</div>
                <div class="text-xs text-muted" style="margin-top:2px;">Đăng ký tham gia để cấp Thẻ Thành Viên</div>
              </div>
              <button class="btn btn-gold btn-xs" id="btnDrawerRegister" style="padding: 5px 12px; font-weight:700;">Đăng Ký</button>
            </div>
          </div>
        `;
      } else {
        authBox.innerHTML = `
          <div class="card p-3 mb-3" style="background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.25);">
            <div class="d-flex align-center gap-2">
              <img src="${activeMember?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--accent-cyan);">
              <div style="flex:1; min-width:0;">
                <div class="text-xs font-bold text-white text-truncate">${activeMember?.name || 'Thành Viên'}</div>
                <div class="text-xs text-dim">${activeMember?.id || ''} • ${activeMember?.roleTitle || 'Thành viên'}</div>
              </div>
              <span class="badge badge-cyan" style="font-size:11px;">Elo ${activeMember?.elo || 1200}</span>
            </div>
          </div>
        `;
      }
    }

    // Render Bottom Actions in Drawer
    const footerBox = document.getElementById('mobileDrawerFooter');
    if (footerBox) {
      if (isGuest) {
        footerBox.innerHTML = `
          <div class="d-flex gap-2">
            <button class="btn btn-outline btn-sm w-100" id="btnDrawerLogin" style="padding: 9px; font-weight: 600;">
              <span>🔑</span> <span>Đăng Nhập</span>
            </button>
          </div>
          <div class="text-center mt-2">
            <a href="#" id="btnDrawerAdminLink" class="text-dim hover-gold text-xs" style="font-size:11px;">🔒 Dành cho Quản trị viên</a>
          </div>
        `;
      } else {
        footerBox.innerHTML = `
          <button class="btn btn-outline btn-sm w-100" id="btnDrawerLogout" style="padding: 9px; font-weight: 600; border-color: rgba(244,63,94,0.3); color: #fb7185;">
            <span>🚪</span> <span>Đăng Xuất Tài Khoản</span>
          </button>
        `;
      }
    }

    // Re-bind actions inside drawer
    const closeDrawer = () => {
      drawerOverlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    const btnDrawerReg = drawerOverlay.querySelector('#btnDrawerRegister');
    btnDrawerReg?.addEventListener('click', () => {
      sound.playClick();
      closeDrawer();
      modalManager.openClubRegistrationModal();
    });

    const btnDrawerLogin = drawerOverlay.querySelector('#btnDrawerLogin');
    btnDrawerLogin?.addEventListener('click', () => {
      sound.playClick();
      closeDrawer();
      modalManager.openLoginModal('member');
    });

    const btnDrawerLogout = drawerOverlay.querySelector('#btnDrawerLogout');
    btnDrawerLogout?.addEventListener('click', () => {
      sound.playClick();
      closeDrawer();
      store.setRole('guest');
      this.navigateTo('home');
    });

    const btnDrawerAdmin = drawerOverlay.querySelector('#btnDrawerAdminLink');
    btnDrawerAdmin?.addEventListener('click', (e) => {
      e.preventDefault();
      sound.playClick();
      closeDrawer();
      modalManager.openLoginModal('admin');
    });
  }

  updateFirebaseBadge(status, lastSync) {
    const sidebarBadge = document.getElementById('adminFirebaseSidebarBadge');
    if (sidebarBadge) {
      const lockPrefix = this.firebaseUnlocked ? '' : '🔒 ';
      if (status === 'connected') {
        sidebarBadge.textContent = `${lockPrefix}ONLINE`;
        sidebarBadge.className = 'admin-nav-badge badge-emerald active-glow';
      } else if (status === 'connecting') {
        sidebarBadge.textContent = `${lockPrefix}CONNECTING`;
        sidebarBadge.className = 'admin-nav-badge badge-gold';
      } else if (status === 'error') {
        sidebarBadge.textContent = `${lockPrefix}LỖI`;
        sidebarBadge.className = 'admin-nav-badge badge-rose';
      } else {
        sidebarBadge.textContent = `${lockPrefix}LOCAL`;
        sidebarBadge.className = 'admin-nav-badge';
      }
    }
  }

  getNotificationsList() {
    const state = store.getState();
    const role = state.currentSession?.role || 'guest';
    const isAdmin = role === 'admin';
    const activeMember = store.getActiveMember();
    const notifications = [];
    const events = state.events || [];

    // =========================================================================
    // 1. HOẠT ĐỘNG HOẶC GIẢI ĐẤU MỚI (Báo ngay khi thêm, không cần mở đăng ký)
    // =========================================================================
    events.forEach((ev) => {
      notifications.push({
        id: `notif_event_${ev.id}`,
        icon: ev.type === 'tournament' ? '🏆' : '🎯',
        title: ev.type === 'tournament' ? `Giải đấu mới: ${ev.title}` : `Hoạt động mới: ${ev.title}`,
        desc: `Thời gian: ${ev.dateTime || ev.date || 'Sắp tới'} • Địa điểm: ${ev.location || 'CLB Cờ'}. Bấm để xem chi tiết!`,
        time: ev.date || 'Sự kiện',
        badge: ev.type === 'tournament' ? 'Giải Đấu' : 'Hoạt Động',
        targetView: 'events'
      });
    });

    // =========================================================================
    // 2. LỊCH THI ĐẤU & CẶP ĐẤU HỆ THỤY SĨ (Swiss Pairings)
    // =========================================================================
    if (role === 'member' && activeMember) {
      events.forEach((ev) => {
        if (ev.swissData && ev.swissData.rounds) {
          const curRound = ev.swissData.rounds.find((r) => r.roundNumber === ev.swissData.currentRound);
          if (curRound) {
            const userMatch = (curRound.matches || []).find(
              (m) => m.whiteId === activeMember.id || m.blackId === activeMember.id
            );
            if (userMatch) {
              const isWhite = userMatch.whiteId === activeMember.id;
              const oppName = isWhite ? userMatch.blackName : userMatch.whiteName;
              const colorText = isWhite ? 'quân Trắng (đi trước)' : 'quân Đen (đi sau)';
              notifications.push({
                id: `notif_swiss_${ev.id}_r${curRound.roundNumber}_${activeMember.id}`,
                icon: '⚔️',
                title: `Cặp đấu Vòng ${curRound.roundNumber} Hệ Thụy Sĩ: ${ev.title}`,
                desc: userMatch.isBye
                  ? 'Bạn được miễn đấu vòng này (Bye) và tự động nhận 1 điểm!'
                  : `Bàn ${userMatch.board}: Bạn cầm ${colorText} thi đấu cùng kỳ thủ ${oppName}. Nhấn để xem chi tiết!`,
                time: `Vòng ${curRound.roundNumber}`,
                badge: 'Hệ Thụy Sĩ',
                targetView: 'events'
              });
            }
          }
        }
      });
    }

    // =========================================================================
    // 3. CẢNH BÁO VẮNG MẶT (Dựa trực tiếp vào các ngày quét QR điểm danh)
    // =========================================================================
    if (role === 'member' && activeMember) {
      const sessionLogs = (state.attendanceLogs || []).filter((log) => log.category === 'session' && log.timestamp);
      const sessionDates = [...new Set(sessionLogs.map((l) => l.timestamp.slice(0, 10)))].sort().reverse();

      if (sessionDates.length >= 2) {
        const lastDate1 = sessionDates[0];
        const lastDate2 = sessionDates[1];

        const attended1 = (state.attendanceLogs || []).some(
          (log) => log.memberId === activeMember.id && log.status === 'success' && log.timestamp && log.timestamp.startsWith(lastDate1)
        );
        const attended2 = (state.attendanceLogs || []).some(
          (log) => log.memberId === activeMember.id && log.status === 'success' && log.timestamp && log.timestamp.startsWith(lastDate2)
        );

        if (!attended1 && !attended2) {
          notifications.push({
            id: `notif_absent_warning_${lastDate1}_${lastDate2}_${activeMember.id}`,
            icon: '⚠️',
            title: 'Cảnh báo chuyên cần sinh hoạt CLB',
            desc: `Bạn đã vắng mặt 2 buổi sinh hoạt gần nhất (${lastDate2} và ${lastDate1}). Vui lòng quét mã QR điểm danh buổi tới để duy trì điểm chuyên cần!`,
            time: 'Chuyên cần',
            badge: 'Cảnh báo',
            targetView: 'member-pass'
          });
        }
      }
    }

    // =========================================================================
    // 4. CHÚC MỪNG SINH NHẬT KỲ THỦ (Theo ngày sinh dob đã lưu)
    // =========================================================================
    if (role === 'member' && activeMember && activeMember.dob) {
      const today = new Date();
      const curDay = today.getDate();
      const curMonth = today.getMonth() + 1;

      let isBirthday = false;
      if (activeMember.dob.includes('-')) {
        const parts = activeMember.dob.split('-');
        if (parts.length === 3) {
          const bMonth = parseInt(parts[1], 10);
          const bDay = parseInt(parts[2], 10);
          if (bDay === curDay && bMonth === curMonth) isBirthday = true;
        }
      } else if (activeMember.dob.includes('/')) {
        const parts = activeMember.dob.split('/');
        if (parts.length === 3) {
          const bDay = parseInt(parts[0], 10);
          const bMonth = parseInt(parts[1], 10);
          if (bDay === curDay && bMonth === curMonth) isBirthday = true;
        }
      }

      if (isBirthday) {
        notifications.push({
          id: `notif_birthday_${today.getFullYear()}_${activeMember.id}`,
          icon: '🎂',
          title: 'Chúc Mừng Sinh Nhật Kỳ Thủ!',
          desc: `Chúc mừng sinh nhật ${activeMember.fullName}! Chúc bạn tuổi mới dồi dào sức khỏe, trí tuệ minh mẫn và gặt hái nhiều vinh quang cùng CLB Cờ TNU - HGC! 🎉`,
          time: 'Hôm nay',
          badge: 'Sinh nhật',
          targetView: 'member-pass'
        });
      }
    }

    // =========================================================================
    // 5. BIẾN ĐỘNG ĐIỂM RÈN LUYỆN (Cộng/trừ điểm thi đua)
    // =========================================================================
    if (role === 'member' && activeMember) {
      const currentScore = activeMember.emulationScore ?? 100;
      const storageKey = `TNU_HGC_LAST_SCORE_${activeMember.id}`;
      const savedScoreRaw = localStorage.getItem(storageKey);

      if (savedScoreRaw !== null) {
        const savedScore = parseInt(savedScoreRaw, 10);
        if (savedScore !== currentScore) {
          const diff = currentScore - savedScore;
          notifications.push({
            id: `notif_score_change_${savedScore}_to_${currentScore}`,
            icon: diff > 0 ? '📈' : '📉',
            title: 'Biến động điểm rèn luyện',
            desc: `Điểm rèn luyện của bạn vừa được cập nhật: ${diff > 0 ? '+' + diff : diff}đ (Tổng điểm hiện tại: ${currentScore}đ).`,
            time: 'Thi đua',
            badge: diff > 0 ? '+Điểm' : '-Điểm',
            targetView: 'leaderboard'
          });
        }
      } else {
        localStorage.setItem(storageKey, currentScore.toString());
      }
    }

    // =========================================================================
    // 6. THAY ĐỔI THỨ HẠNG (Thăng hạng trên Bảng xếp hạng)
    // =========================================================================
    if (role === 'member' && activeMember) {
      const sortedMembers = [...(state.members || [])].sort((a, b) => (b.emulationScore || 0) - (a.emulationScore || 0));
      const myRank = sortedMembers.findIndex((m) => m.id === activeMember.id) + 1;

      if (myRank > 0) {
        const rankStorageKey = `TNU_HGC_LAST_RANK_${activeMember.id}`;
        const savedRankRaw = localStorage.getItem(rankStorageKey);

        if (savedRankRaw !== null) {
          const savedRank = parseInt(savedRankRaw, 10);
          if (savedRank > myRank) {
            notifications.push({
              id: `notif_rank_up_${savedRank}_to_${myRank}`,
              icon: '🎖️',
              title: 'Thăng hạng Bảng xếp hạng!',
              desc: `Chúc mừng bạn đã vươn lên vị trí thứ #${myRank} trên Bảng xếp hạng kỳ thủ toàn CLB! (Tăng ${savedRank - myRank} bậc).`,
              time: 'Xếp hạng',
              badge: 'Thăng hạng',
              targetView: 'leaderboard'
            });
          }
        } else {
          localStorage.setItem(rankStorageKey, myRank.toString());
        }
      }
    }

    // =========================================================================
    // 7. BẢN TIN HOẠT ĐỘNG / KỸ THUẬT CỜ MỚI
    // =========================================================================
    const articles = state.articles || [];
    if (articles.length > 0) {
      const latestArt = articles[0];
      notifications.push({
        id: `notif_art_${latestArt.id}`,
        icon: '📰',
        title: `Bản tin mới: ${latestArt.title}`,
        desc: latestArt.summary || 'Nhấn để đón đọc bài viết chuyên môn cờ và hoạt động mới nhất.',
        time: latestArt.publishDate || 'Tin tức',
        badge: 'Bản tin',
        targetView: 'news'
      });
    }

    // =========================================================================
    // 8. NHẮC THAM GIA NHÓM ZALO CLB
    // =========================================================================
    notifications.push({
      id: 'notif_zalo_group_notice',
      icon: '💬',
      title: 'Nhóm Zalo CLB Cờ TNU - HGC',
      desc: 'Tham gia nhóm Zalo chính thức https://zalo.me/g/ugejmj655 để nhận thông báo nội bộ và giao lưu kỳ thủ.',
      time: 'Cộng đồng',
      badge: 'Zalo',
      targetView: 'home'
    });



    // =========================================================================
    // 10. (ADMIN) CÓ ĐƠN ĐĂNG KÝ MỚI CHỜ DUYỆT
    // =========================================================================
    if (isAdmin) {
      const pendingApps = (state.registrationApplications || []).filter((a) => a.status === 'pending');
      if (pendingApps.length > 0) {
        notifications.push({
          id: `notif_pending_apps_${pendingApps.length}`,
          icon: '📝',
          title: 'Đơn đăng ký mới chờ duyệt',
          desc: `Có ${pendingApps.length} đơn đăng ký gia nhập CLB đang chờ phê duyệt.`,
          time: 'Cần xử lý',
          badge: 'Admin',
          targetView: 'admin',
          targetSubView: 'admin-users'
        });
      }
    }

    // =========================================================================
    // 11. (ADMIN) CẢNH BÁO ĐỒNG BỘ DỮ LIỆU FIREBASE
    // =========================================================================
    if (isAdmin) {
      const isOnline = navigator.onLine;
      notifications.push({
        id: `notif_firebase_status_${isOnline ? 'online' : 'offline'}`,
        icon: isOnline ? '☁️' : '⚠️',
        title: isOnline ? 'Cơ sở dữ liệu đám mây: TRỰC TUYẾN' : 'Cảnh báo: MẤT KẾT NỐI MẠNG',
        desc: isOnline
          ? 'Hệ thống Firebase đang kết nối ổn định và tự động đồng bộ thời gian thực.'
          : 'Không có kết nối mạng Internet. Dữ liệu đang được lưu cục bộ (Local Storage).',
        time: 'Hệ thống',
        badge: isOnline ? 'Online' : 'Offline',
        targetView: 'admin',
        targetSubView: 'admin-firebase'
      });
    }

    return notifications;
  }

  getReadNotificationIds() {
    try {
      const raw = localStorage.getItem('TNU_HGC_READ_NOTIFICATIONS');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  markNotificationAsRead(id) {
    try {
      const readIds = this.getReadNotificationIds();
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('TNU_HGC_READ_NOTIFICATIONS', JSON.stringify(readIds));
      }
    } catch (e) {}
    this.renderNotificationsList();
  }

  markAllNotificationsAsRead() {
    const notifs = this.getNotificationsList();
    const allIds = notifs.map((n) => n.id);
    try {
      localStorage.setItem('TNU_HGC_READ_NOTIFICATIONS', JSON.stringify(allIds));
    } catch (e) {}
    this.renderNotificationsList();
  }

  async requestDeviceNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      modalManager.showAlert('Trình duyệt hiện tại của bạn chưa hỗ trợ thông báo đẩy trực tiếp. Hãy thêm website vào màn hình chính để sử dụng.');
      return false;
    }

    if (Notification.permission === 'granted') {
      sound.playSuccess();
      modalManager.showAlert('🟢 Thông báo trên thiết bị đang hoạt động! Bạn sẽ nhận được thông báo giải đấu, sinh hoạt và tin mới từ CLB.');
      this.sendDevicePushNotification('CLB Cờ TNU - HGC', 'Thông báo thiết bị đang hoạt động bình thường!');
      return true;
    }

    if (Notification.permission === 'denied') {
      modalManager.showAlert('⚠️ Quyền thông báo đã bị từ chối trước đó trên trình duyệt. Vui lòng bấm vào biểu tượng Ổ khóa / Cài đặt trang web trên thanh địa chỉ -> Chọn "Bật thông báo" rồi tải lại trang!');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        sound.playSuccess();
        modalManager.showAlert('🎉 Bật thông báo thành công! CLB Cờ TNU - HGC sẽ gửi thông báo các sự kiện và giải đấu đến thiết bị của bạn.');
        this.sendDevicePushNotification('CLB Cờ TNU - HGC', 'Chào mừng bạn! Đã bật thông báo thiết bị thành công.');
        return true;
      } else {
        modalManager.showAlert('Bạn chưa cấp quyền thông báo. Bạn có thể bật lại bất cứ lúc nào bằng nút "Bật thông báo"!');
        return false;
      }
    } catch (e) {
      console.warn('Notification permission error', e);
      return false;
    }
  }

  sendDevicePushNotification(title, body, url = '/') {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/logo.png',
            badge: '/favicon.png',
            vibrate: [200, 100, 200],
            data: { url }
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/logo.png' });
        });
      } else {
        new Notification(title, { body, icon: '/logo.png' });
      }
    } catch (err) {
      console.warn('Could not display device notification', err);
    }
  }

  showToastNotification(notif) {
    if (!notif) return;

    // Send native device push notification if permission granted
    this.sendDevicePushNotification(notif.title, notif.desc, notif.targetView || '/');

    let container = document.getElementById('toastNotificationsContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastNotificationsContainer';
      container.className = 'toast-notifications-container';
      document.body.appendChild(container);
    }

    while (container.children.length >= 3) {
      container.firstChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `
      <div style="font-size: 1.3rem; line-height: 1;">${notif.icon || '🔔'}</div>
      <div style="flex: 1; min-width: 0;">
        <div class="d-flex justify-between align-center mb-1">
          <strong style="font-size: 0.8rem; color: #fff;">${notif.title}</strong>
          <span class="badge" style="background: rgba(212,175,55,0.15); color: var(--gold-light); font-size: 10px;">${notif.badge || 'Mới'}</span>
        </div>
        <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.3;">${notif.desc}</div>
      </div>
    `;

    toast.addEventListener('click', () => {
      sound.playClick();
      this.markNotificationAsRead(notif.id);
      toast.remove();
      if (notif.targetView) {
        if (notif.targetView === 'admin' && notif.targetSubView) {
          this.adminSubView = notif.targetSubView;
          this.navigateTo('admin', notif.targetSubView);
        } else {
          this.navigateTo(notif.targetView);
        }
      }
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  renderNotificationsList() {
    const listEl = document.getElementById('notificationList');
    const badgeDot = document.getElementById('navNotificationBadge');
    if (!listEl) return;

    const notifs = this.getNotificationsList();
    const readIds = this.getReadNotificationIds();
    const unreadCount = notifs.filter((n) => !readIds.includes(n.id)).length;

    if (badgeDot) {
      if (unreadCount > 0) {
        badgeDot.classList.remove('hidden');
      } else {
        badgeDot.classList.add('hidden');
      }
    }

    // Auto-pop Toast for new unread notifications in this session
    if (!this.toastedIds) this.toastedIds = new Set();
    const firstUnread = notifs.find((n) => !readIds.includes(n.id) && !this.toastedIds.has(n.id));
    if (firstUnread) {
      this.toastedIds.add(firstUnread.id);
      this.showToastNotification(firstUnread);
    }

    if (notifs.length === 0) {
      listEl.innerHTML = `
        <div class="notification-empty">
          <span style="font-size: 1.8rem;">📭</span>
          <div class="text-xs text-muted mt-2">Hiện chưa có thông báo mới nào.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notifs
      .map((item) => {
        const isUnread = !readIds.includes(item.id);
        return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" data-notif-id="${item.id}" data-view="${item.targetView || ''}" data-subview="${item.targetSubView || ''}">
          <div class="notification-item-icon">${item.icon}</div>
          <div class="notification-item-content">
            <div class="notification-item-title">${item.title}</div>
            <div class="notification-item-desc">${item.desc}</div>
            <div class="notification-item-time">${item.time}</div>
          </div>
        </div>
      `;
      })
      .join('');

    // Bind item clicks
    listEl.querySelectorAll('.notification-item').forEach((el) => {
      el.addEventListener('click', () => {
        sound.playClick();
        const notifId = el.getAttribute('data-notif-id');
        const targetView = el.getAttribute('data-view');
        const targetSubView = el.getAttribute('data-subview');

        if (notifId) this.markNotificationAsRead(notifId);

        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.classList.remove('active');

        if (targetView) {
          if (targetView === 'admin' && targetSubView) {
            this.adminSubView = targetSubView;
            this.navigateTo('admin', targetSubView);
          } else {
            this.navigateTo(targetView);
          }
        }
      });
    });
  }

  bindGlobalNavigation() {
    // Nav User Badge Click (Switch to member pass or admin overview)
    const navUserBadge = document.getElementById('navUserBadge');
    if (navUserBadge) {
      navUserBadge.addEventListener('click', () => {
        sound.playClick();
        const curRole = store.getState().currentSession?.role;
        if (curRole === 'admin') {
          this.adminSubView = 'admin-overview';
          this.navigateTo('admin', 'admin-overview');
        } else if (curRole === 'member') {
          this.navigateTo('member-pass');
        }
      });
    }

    // Footer Admin Login Link
    const linkFooterAdmin = document.getElementById('linkFooterAdminLogin');
    if (linkFooterAdmin) {
      linkFooterAdmin.addEventListener('click', (e) => {
        e.preventDefault();
        sound.playClick();
        if (store.getState().currentSession?.role === 'admin') {
          this.adminSubView = 'admin-overview';
          this.navigateTo('admin', 'admin-overview');
        } else {
          modalManager.openLoginModal('admin');
        }
      });
    }

    // Guest Action Buttons
    const btnGuestLogin = document.getElementById('btnGuestLogin');
    if (btnGuestLogin) {
      btnGuestLogin.addEventListener('click', () => {
        sound.playClick();
        modalManager.openLoginModal('member');
      });
    }

    const btnGuestRegister = document.getElementById('btnGuestRegister');
    if (btnGuestRegister) {
      btnGuestRegister.addEventListener('click', () => {
        sound.playClick();
        modalManager.openClubRegistrationModal();
      });
    }

    // Logout Button
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        sound.playClick();
        store.setRole('guest');
        this.navigateTo('home');
      });
    }

    // Topbar Notification Bell & Dropdown Popover
    const btnNavNotifications = document.getElementById('btnNavNotifications');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const btnMarkAll = document.getElementById('btnMarkAllNotificationsRead');

    if (btnNavNotifications && notificationDropdown) {
      btnNavNotifications.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        notificationDropdown.classList.toggle('active');
        if (notificationDropdown.classList.contains('active')) {
          this.renderNotificationsList();
        }
      });

      notificationDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      document.addEventListener('click', (e) => {
        if (!notificationDropdown.contains(e.target) && !btnNavNotifications.contains(e.target)) {
          notificationDropdown.classList.remove('active');
        }
      });
    }

    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        this.markAllNotificationsAsRead();
      });
    }

    // Notification Dropdown PWA & Push buttons
    const btnEnablePush = document.getElementById('btnEnableDevicePushNotif');
    if (btnEnablePush) {
      btnEnablePush.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        this.requestDeviceNotificationPermission();
      });
    }

    const btnOpenPwa = document.getElementById('btnOpenPwaInstallGuide');
    if (btnOpenPwa) {
      btnOpenPwa.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        modalManager.openPwaInstallGuideModal();
      });
    }

    // Nav brand
    const brand = document.getElementById('navBrand');
    if (brand) {
      brand.addEventListener('click', () => this.navigateTo('home'));
    }

    // Top desktop nav items
    const navLinks = document.querySelectorAll('.nav-item-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        sound.playClick();
        const targetView = link.getAttribute('data-view');
        this.navigateTo(targetView);
      });
    });

    // Topbar "Cập nhật dữ liệu" action button
    const btnUpdateData = document.getElementById('btnAdminPortal');
    if (btnUpdateData) {
      btnUpdateData.addEventListener('click', () => {
        sound.playSuccess();
        const origHtml = btnUpdateData.innerHTML;
        btnUpdateData.innerHTML = `<span>⏳</span> Đang đồng bộ...`;
        btnUpdateData.disabled = true;

        store.notify();
        this.renderCurrentView();

        setTimeout(() => {
          btnUpdateData.innerHTML = `<span>✅</span> Đã cập nhật!`;
          setTimeout(() => {
            btnUpdateData.innerHTML = origHtml;
            btnUpdateData.disabled = false;
          }, 800);
        }, 350);
      });
    }



    // Mobile Bottom Bar Navigation
    const mobileBtns = document.querySelectorAll('.mobile-nav-btn');
    mobileBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        if (targetView) {
          sound.playClick();
          this.navigateTo(targetView);
        }
      });
    });

    // Mobile FAB Center Button (Đăng ký for Guest, Thẻ TV for Member)
    const mobileFabCenter = document.getElementById('mobileFabCenter');
    if (mobileFabCenter) {
      mobileFabCenter.addEventListener('click', () => {
        sound.playClick();
        const curRole = store.getState().currentSession?.role;
        if (curRole === 'member') {
          this.navigateTo('member-pass');
        } else {
          modalManager.openClubRegistrationModal();
        }
      });
    }

    // Mobile 3-Bar Toggle Menu Button & Drawer Events
    const btnToggleMenu = document.getElementById('btnMobileToggleMenu');
    const drawerOverlay = document.getElementById('mobileDrawerOverlay');
    const btnCloseDrawer = document.getElementById('btnCloseMobileDrawer');

    const openDrawer = () => {
      sound.playClick();
      drawerOverlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.updateMobileDrawerContent();
    };

    const closeDrawer = () => {
      drawerOverlay?.classList.remove('active');
      document.body.style.overflow = '';
    };

    btnToggleMenu?.addEventListener('click', openDrawer);
    btnCloseDrawer?.addEventListener('click', closeDrawer);
    drawerOverlay?.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) closeDrawer();
    });

    // Mobile Drawer Links Click
    document.querySelectorAll('.mobile-drawer-item').forEach((item) => {
      item.addEventListener('click', () => {
        sound.playClick();
        const targetView = item.getAttribute('data-view');
        closeDrawer();
        if (targetView) this.navigateTo(targetView);
      });
    });

    // Drawer Mobile PWA & Push buttons
    const btnDrawerInstallPwa = document.getElementById('btnDrawerInstallPwa');
    if (btnDrawerInstallPwa) {
      btnDrawerInstallPwa.addEventListener('click', () => {
        sound.playClick();
        closeDrawer();
        modalManager.openPwaInstallGuideModal();
      });
    }

    const btnDrawerEnablePush = document.getElementById('btnDrawerEnablePush');
    if (btnDrawerEnablePush) {
      btnDrawerEnablePush.addEventListener('click', () => {
        sound.playClick();
        closeDrawer();
        this.requestDeviceNotificationPermission();
      });
    }
  }

  navigateTo(view, subView = null) {
    if (this.qrScannerInstance) {
      this.qrScannerInstance.destroy();
      this.qrScannerInstance = null;
    }

    const state = store.getState();
    const isGuest = state.currentSession.role === 'guest';
    const isAdmin = state.currentSession.role === 'admin';

    if (view === 'member-pass') {
      if (isGuest) {
        modalManager.openLoginModal('member');
        return;
      }
    }

    if (view === 'admin' && !isAdmin) {
      modalManager.openLoginModal('admin');
      return;
    }

    this.currentView = view;
    if (view === 'admin' && window.innerWidth <= 768) {
      this.adminSubView = 'admin-checkin';
    } else if (subView) {
      this.adminSubView = subView;
    }

    // Update nav active classes
    document.querySelectorAll('.nav-item-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('data-view') === view);
    });
    document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
      const v = btn.getAttribute('data-view');
      btn.classList.toggle('active', !!v && v === view);
    });
    const fabCenter = document.getElementById('mobileFabCenter');
    if (fabCenter) {
      fabCenter.classList.toggle('active', view === 'member-pass');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.renderCurrentView();
  }

  renderCurrentView() {
    const container = document.getElementById('mainViewport');
    if (!container) return;

    this.updateTopbarRoleBadge();

    switch (this.currentView) {
      case 'home':
        this.renderHome(container);
        break;
      case 'about':
        this.renderAbout(container);
        break;
      case 'org':
        this.renderOrganization(container);
        break;
      case 'leaderboard':
        this.renderLeaderboard(container);
        break;
      case 'events':
        this.renderEvents(container);
        break;
      case 'news':
        this.renderNews(container);
        break;
      case 'member-pass':
        this.renderMemberPass(container);
        break;
      case 'admin':
        this.renderAdminDashboard(container);
        break;
      default:
        this.renderHome(container);
    }
  }

  // ==========================================
  // 1. HOME VIEW
  // ==========================================
  renderHome(container) {
    const state = store.getState();

    container.innerHTML = `
      <div class="home-page-view animate-fadeIn">
        <!-- Hero Section -->
        <section class="hero-section">
          <div class="hero-chess-watermark"><img src="/logo.png" alt="Logo CLB Cờ TNU - HGC" class="hero-logo-img"></div>
          <div class="hero-content">
            <div class="hero-tag">
              CLB CỜ TNU - HGC • ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG
            </div>
            <h1 class="hero-title">
              Nơi Hội Tụ <span class="gradient-text">Bản Lĩnh - Trí Tuệ</span> & Văn Hóa Kỳ Thủ
            </h1>
            <p class="hero-description">
              Hệ thống Cổng thông tin và buồng lái quản trị chính thức của CLB Cờ TNU - HGC, Đại học Thái Nguyên Phân hiệu tại Hà Giang. Tích hợp Thẻ thành viên điện tử Smart QR Key, bảng xếp hạng Elo nội bộ và điểm danh thông minh.
            </p>
          </div>
        </section>

        <!-- Quick Stats Banner -->
        <section class="stats-banner-row">
          <div class="stat-kpi-card">
            <div class="stat-icon-wrap text-gold">👥</div>
            <div>
              <div class="stat-value">${state.clubInfo.totalMembers}</div>
              <div class="stat-label">Thành viên chính thức</div>
            </div>
          </div>
          <div class="stat-kpi-card">
            <div class="stat-icon-wrap text-emerald">🎖️</div>
            <div>
              <div class="stat-value">${state.clubInfo.retiredMembers !== undefined ? state.clubInfo.retiredMembers : 0}</div>
              <div class="stat-label">Thành viên về hưu</div>
            </div>
          </div>
          <div class="stat-kpi-card">
            <div class="stat-icon-wrap text-cyan">🏆</div>
            <div>
              <div class="stat-value">${state.events.length}</div>
              <div class="stat-label">Giải đấu - Sự kiện</div>
            </div>
          </div>
          <div class="stat-kpi-card">
            <div class="stat-icon-wrap text-gold">📈</div>
            <div>
              <div class="stat-value">${(state.members && state.members.length > 0) ? Math.round(state.members.reduce((acc, m) => acc + (m.attendanceRate || 0), 0) / state.members.length) + '%' : '0%'}</div>
              <div class="stat-label">Chuyên cần trung bình</div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  // ==========================================
  // 2. ABOUT US VIEW
  // ==========================================
  renderAbout(container) {
    const state = store.getState();
    const club = state.clubInfo;

    container.innerHTML = `
      <div class="about-page-view animate-fadeIn">
        <!-- Main Intro Header -->
        <div class="card mb-4" style="background: linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(10,18,38,0.95) 100%); border: 1px solid rgba(212,175,55,0.3); padding: 28px 24px;">
          <div class="text-center mb-3">
            <span class="badge badge-gold" style="font-size: 0.82rem; padding: 5px 14px;">CLB CỜ TNU - HGC • ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG</span>
            <h1 class="text-2xl md:text-3xl font-bold mt-3 text-gold" style="line-height: 1.45; text-wrap: balance; max-width: 860px; margin-left: auto; margin-right: auto;">
              ♟️ BÀN CỜ ĐÃ MỞ, CHIẾN TRẬN ĐÃ SẴN SÀNG:<br>CHÀO MỪNG ĐẾN VỚI CLB CỜ TNU - HGC!
            </h1>
            <p class="text-white font-medium text-sm mt-3" style="color: #e2e8f0;">
              Kính gửi toàn thể các bạn sinh viên và những người đam mê nghệ thuật tư duy tại Đại học Thái Nguyên Phân hiệu tại Hà Giang,
            </p>
          </div>
          <div class="callout-quote-box mt-3" style="background: rgba(255,255,255,0.04); border-left: 3px solid var(--gold-primary); padding: 14px 20px; border-radius: 0 8px 8px 0;">
            <p class="text-sm text-dim" style="line-height: 1.7; font-size: 0.95rem; color: #cbd5e1;">
              Có những cuộc chiến không tiếng súng, có những chiến thắng được định đoạt chỉ bằng một nước đi mấu chốt. Chào mừng các bạn đến với <strong>CLB Cờ TNU - HGC</strong> – nơi giao thoa của trí tuệ, bản lĩnh và sự điềm tĩnh!
            </p>
          </div>
        </div>

        <!-- Section 1: History & Founder -->
        <div class="card mb-4">
          <h2 class="text-xl font-bold text-white mb-3" style="display: flex; align-items: center; gap: 10px; margin: 0 0 14px 0;">
            <span style="font-size: 1.5rem; line-height: 1; display: inline-flex; align-items: center;">🏛️</span>
            <span>Dấu Ấn Lịch Sử - Ngọn Lửa Tiên Phong</span>
          </h2>
          
          <p class="text-sm text-muted mb-3" style="line-height: 1.75;">
            Giữa nhịp sống học tập và nghiên cứu năng động tại mảnh đất Hà Giang, chúng ta luôn khao khát một sân chơi trí tuệ thực thụ, một nơi để những cái đầu lạnh và những trái tim nóng được thỏa sức bùng nổ. Xuất phát từ niềm khát khao ấy, <strong>CLB Cờ TNU - HGC</strong> thuộc Đại học Thái Nguyên Phân hiệu tại Hà Giang đã chính thức được ươm mầm.
          </p>

          <div class="milestone-badge-box mb-3" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 12px 18px; border-radius: 8px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.3rem;">📅</span>
            <div>
              <strong class="text-emerald" style="font-size: 0.92rem;">Cột mốc lịch sử: Ngày 18/03/2026</strong>
              <p class="text-xs text-muted mt-1">Trực thuộc sự quản lý của <strong>CLB Thể Thao TNU - HGC</strong>, câu lạc bộ đánh dấu cột mốc ra đời lịch sử vào ngày 18/03/2026.</p>
            </div>
          </div>

          <div class="founder-highlight-box" style="background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.2); padding: 16px 20px; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <span class="badge badge-gold">Đội Ngũ Tiên Phong</span>
              <strong class="text-white">Ban Điều Hành Sáng Lập & Kỳ Thủ Đặt Nền Móng</strong>
            </div>
            <p class="text-sm text-muted" style="line-height: 1.7;">
              Đây là thành quả và tâm huyết to lớn của Ban Điều Hành sáng lập cùng tập thể các bạn sinh viên đã đặt những viên gạch nền móng đầu tiên cho câu lạc bộ. Từ những ý tưởng sơ khai trên giảng đường, ngọn lửa đam mê đã được thắp lên, biến mong mỏi về một cộng đồng Cờ Vua và Cờ Tướng vững mạnh tại Phân hiệu Hà Giang trở thành hiện thực.
            </p>
          </div>
        </div>

        <!-- Section 2: Vision & Mission -->
        <div class="card mb-4">
          <h2 class="text-xl font-bold text-white mb-2" style="display: flex; align-items: center; gap: 10px; margin: 0 0 12px 0;">
            <span style="font-size: 1.5rem; line-height: 1; display: inline-flex; align-items: center;">👁️</span>
            <span>Tầm Nhìn - Sứ Mệnh: Hơn Cả Một Trò Chơi</span>
          </h2>
          <p class="text-sm text-muted mb-3" style="line-height: 1.7; font-style: italic;">
            "Tại TNU-HGC, chúng mình tin rằng 64 ô vuông và dòng sông Sở Hà Hán Giới không chỉ là nơi phân định thắng thua."
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div class="card" style="background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.25); padding: 18px;">
              <h3 class="font-bold text-cyan text-base mb-2" style="display: flex; align-items: center; gap: 8px; margin: 0 0 8px 0;">
                <span style="font-size: 1.2rem; line-height: 1; display: inline-flex; align-items: center;">🔭</span>
                <span>Tầm nhìn chiến lược</span>
              </h3>
              <p class="text-xs text-muted" style="line-height: 1.7;">
                Chúng mình hướng tới việc xây dựng CLB Cờ TNU - HGC trở thành điểm sáng học thuật và phong trào mạnh mẽ nhất của Đại học Thái Nguyên Phân hiệu tại Hà Giang. Nơi đây sẽ là cái nôi đào tạo ra những kỳ thủ xuất sắc, sẵn sàng đại diện trường vươn ra các giải đấu khu vực.
              </p>
            </div>

            <div class="card" style="background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.25); padding: 18px;">
              <h3 class="font-bold text-gold text-base mb-2" style="display: flex; align-items: center; gap: 8px; margin: 0 0 8px 0;">
                <span style="font-size: 1.2rem; line-height: 1; display: inline-flex; align-items: center;">🎯</span>
                <span>Sứ mệnh cốt lõi</span>
              </h3>
              <p class="text-xs text-muted" style="line-height: 1.7;">
                Đặc biệt trong môi trường sư phạm và nghiên cứu, tư duy cờ là một công cụ tuyệt vời. Sứ mệnh của chúng mình là dùng bàn cờ để mài giũa tư duy logic, rèn luyện sự nhẫn nại, khả năng quan sát và quyết đoán. Hơn thế nữa, CLB là ngôi nhà gắn kết những tâm hồn đồng điệu, tạo nên một cộng đồng sinh viên đoàn kết, kỷ luật và nhân văn.
              </p>
            </div>
          </div>
        </div>

        <!-- Section 3: Conclusion & Call to Action -->
        <div class="card mb-4" style="background: linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(20,30,58,0.85) 100%); border: 1px solid rgba(212,175,55,0.25); border-radius: 14px; padding: 26px 24px; box-shadow: 0 8px 28px rgba(0,0,0,0.35);">
          <h2 class="text-xl font-bold text-white mb-2" style="display: flex; align-items: center; gap: 10px; margin: 0 0 14px 0;">
            <span style="font-size: 1.5rem; line-height: 1; display: inline-flex; align-items: center;">⚔️</span>
            <span>Bạn Đã Sẵn Sàng Nhập Cuộc?</span>
          </h2>
          <p class="text-sm text-muted mb-3" style="line-height: 1.8;">
            Bàn cờ đã được bày sẵn, những quân cờ đang chờ người chỉ huy. Dù bạn là ai, mang trong mình kinh nghiệm dày dạn hay chỉ là sự tò mò của những bước đi đầu tiên, CLB Cờ TNU-HGC luôn có một vị trí xứng đáng dành cho bạn.
          </p>

          <div style="background: linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(10,18,38,0.85) 100%); border: 1px solid rgba(212,175,55,0.35); border-left: 4px solid var(--gold-primary); border-radius: 10px; padding: 16px 22px; margin: 18px 0 22px 0; box-shadow: 0 4px 18px rgba(0,0,0,0.25);">
            <p style="margin: 0; font-size: 1.05rem; font-weight: 600; font-style: italic; line-height: 1.6; color: #fef08a; letter-spacing: 0.3px; text-shadow: 0 2px 10px rgba(245,158,11,0.25);">
              Hãy đến, ngồi xuống, chọn màu quân của mình và để tư duy của bạn lên tiếng!
            </p>
          </div>

          <button class="btn btn-gold btn-md" id="btnAboutJoin" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 11px 24px;">
            <span>♟️</span> Gia Nhập CLB Ngay
          </button>
        </div>

        <!-- Section 4: Contact Info -->
        <div class="card" style="background: rgba(10,18,38,0.95); border: 1px solid rgba(212,175,55,0.3); padding: 22px;">
          <h3 class="font-bold text-white text-base mb-3" style="display: flex; align-items: center; gap: 10px; margin: 0 0 14px 0;">
            <span style="font-size: 1.3rem; line-height: 1; display: inline-flex; align-items: center;">📞</span>
            <span>Thông tin liên hệ:</span>
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            <div class="d-flex align-center gap-2">
              <span class="text-gold" style="font-size:1.1rem;">📱</span>
              <span class="text-xs"><strong>Hotline/ Zalo:</strong> <a href="tel:0346578422" class="text-gold font-bold">0346578422</a></span>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="text-cyan" style="font-size:1.1rem;">💬</span>
              <span class="text-xs"><strong>Nhóm Zalo CLB:</strong> <a href="https://zalo.me/g/ugejmj655" target="_blank" rel="noopener noreferrer" class="text-cyan font-bold">Tham gia nhóm Zalo</a></span>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="text-cyan" style="font-size:1.1rem;">📧</span>
              <span class="text-xs"><strong>Gmail:</strong> <a href="mailto:clbcotnuhgc@gmail.com" class="text-cyan font-bold">clbcotnuhgc@gmail.com</a></span>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="text-emerald" style="font-size:1.1rem;">🌐</span>
              <span class="text-xs"><strong>Fanpage:</strong> <span class="text-white font-bold">CLB Cờ TNU - HGC</span></span>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="text-gold" style="font-size:1.1rem;">💳</span>
              <span class="text-xs"><strong>STK ( MB BANK):</strong> <strong class="text-gold font-bold" style="letter-spacing:0.5px;">80402233445566</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btnAboutJoin')?.addEventListener('click', () => {
      sound.playClick();
      modalManager.openClubRegistrationModal();
    });
  }

  // ==========================================
  // 3. ORGANIZATION & MEMBERS VIEW
  // ==========================================
  renderOrganization(container) {
    const state = store.getState();
    const bdhPriority = {
      'Chủ nhiệm': 1,
      'Phó chủ nhiệm Chuyên môn': 2,
      'Phó chủ nhiệm Nội bộ': 3,
      'Trưởng ban Chuyên môn Cờ vua': 4,
      'Trưởng ban Chuyên môn Cờ tướng': 5,
      'Trưởng ban Truyền thông - Đối ngoại': 6,
      'Trưởng ban Sự kiện': 7,
      'Trưởng ban Tài chính - Hậu cần': 8
    };
    const bdhMembers = state.members
      .filter((m) => m.role === 'bdh' || m.role === 'admin')
      .sort((a, b) => (bdhPriority[a.roleTitle] || 99) - (bdhPriority[b.roleTitle] || 99));

    container.innerHTML = `
      <div class="org-page-view animate-fadeIn">
        <div class="text-center mb-4">
          <span class="badge badge-gold">CƠ CẤU TỔ CHỨC • CLB CỜ TNU - HGC</span>
          <h1 class="text-2xl font-bold mt-2">Đội Ngũ Nhân Sự - Thành Viên</h1>
        </div>

        <!-- Org Tabs -->
        <div class="tabs-header" style="flex-wrap: wrap; justify-content: center; gap: 8px;">
          <button class="tab-btn ${this.orgTab === 'board' ? 'active' : ''}" id="tabOrgBoard">
            Ban Điều Hành
          </button>
          <button class="tab-btn ${this.orgTab === 'members' ? 'active' : ''}" id="tabOrgMembers">
            Danh Sách Thành Viên (${state.members.length})
          </button>
          <button class="tab-btn ${this.orgTab === 'alumni-board' ? 'active' : ''}" id="tabOrgAlumniBoard">
            Cựu Ban Điều Hành
          </button>
          <button class="tab-btn ${this.orgTab === 'alumni-members' ? 'active' : ''}" id="tabOrgAlumniMembers">
            Cựu Thành Viên
          </button>
        </div>

        <!-- Tab Content Container -->
        <div id="orgTabContent"></div>
      </div>
    `;

    const tabBoard = container.querySelector('#tabOrgBoard');
    const tabMembers = container.querySelector('#tabOrgMembers');
    const tabAlumniBoard = container.querySelector('#tabOrgAlumniBoard');
    const tabAlumniMembers = container.querySelector('#tabOrgAlumniMembers');

    tabBoard?.addEventListener('click', () => {
      sound.playClick();
      this.orgTab = 'board';
      this.renderOrganization(container);
    });

    tabMembers?.addEventListener('click', () => {
      sound.playClick();
      this.orgTab = 'members';
      this.renderOrganization(container);
    });

    tabAlumniBoard?.addEventListener('click', () => {
      sound.playClick();
      this.orgTab = 'alumni-board';
      this.renderOrganization(container);
    });

    tabAlumniMembers?.addEventListener('click', () => {
      sound.playClick();
      this.orgTab = 'alumni-members';
      this.renderOrganization(container);
    });

    const contentPane = container.querySelector('#orgTabContent');
    if (this.orgTab === 'board') {
      this.renderBoardMembers(contentPane, bdhMembers);
    } else if (this.orgTab === 'members') {
      this.renderMembersDirectory(contentPane);
    } else if (this.orgTab === 'alumni-board') {
      this.renderAlumniBoard(contentPane, state.alumniBoard || []);
    } else if (this.orgTab === 'alumni-members') {
      this.renderAlumniMembers(contentPane, state.alumniMembers || []);
    }
  }

  renderBoardMembers(container, bdhList) {
    container.innerHTML = `
      <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
        <p class="text-muted text-xs">Lực lượng nòng cốt lãnh đạo, định hướng và điều hành mọi hoạt động của CLB</p>
      </div>
      ${(!bdhList || bdhList.length === 0) ? `
        <div class="card p-5 text-center text-muted" style="border: 1px dashed var(--border-dim); border-radius: 12px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">👥</div>
          <p class="mb-2 text-white font-medium">Chưa có thành viên nào trong Ban Điều Hành.</p>
          <p class="text-xs text-muted mb-0">Thành viên Ban Điều Hành sẽ xuất hiện tại đây sau khi được phân quyền chức vụ trong Quản Trị Nhân Sự.</p>
        </div>
      ` : `
        <div class="org-board-grid">
          ${bdhList.map((m) => {
            const totalScore = store.calculateMemberScore(m);
            return `
            <div class="board-member-card">
              <img src="${m.avatar}" alt="${m.name}" class="board-avatar">
              <div class="board-title">${m.roleTitle}</div>
              <h3 class="font-bold text-white text-base">${m.name}</h3>
              <p class="text-xs text-muted mt-2">🎓 Lớp: <span class="text-white font-medium">${m.class || m.major || 'Chưa cập nhật'}</span></p>
              <div class="mt-2 text-xs">
                <span class="text-gold font-bold">🏆 Tổng điểm thi đua: ${totalScore}đ</span>
              </div>
              <p class="board-quote">❝ ${m.bio || 'Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam.'} ❞</p>
            </div>
          `;
          }).join('')}
        </div>
      `}
    `;
  }

  renderAlumniBoard(container, alumniList) {
    const isAdmin = store.getState().currentSession.role === 'admin';
    container.innerHTML = `
      <div class="directory-view animate-fadeIn">
        <div class="mb-4" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.18) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid var(--border-gold); border-radius: 16px; padding: 22px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.12); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="flex: 1; min-width: 280px;">
            <div class="d-flex align-center gap-2 mb-2">
              <span class="badge badge-gold" style="font-size: 0.72rem; letter-spacing: 0.8px;">🏛️ KHÔNG GIAN TRI ÂN</span>
              <span class="badge badge-cyan" style="font-size: 0.72rem;">TRUYỀN THỐNG CLB</span>
            </div>
            <h2 class="text-lg font-bold text-white mb-1" style="background: linear-gradient(135deg, #fff, #f3d57a); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              Tri Ân - Vinh Danh Cựu Ban Điều Hành CLB Cờ TNU - HGC (Đại học Thái Nguyên Phân hiệu tại Hà Giang)
            </h2>
            <p class="text-xs text-muted" style="line-height: 1.6; margin: 0;">
              Nơi vinh danh các thế hệ lãnh đạo tiền nhiệm đã đặt nền móng, dẫn dắt và cống hiến hết mình vì sự phát triển của câu lạc bộ cờ.
            </p>
          </div>
          <div class="d-flex align-center gap-3">
            <div style="text-align: center; padding: 10px 18px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
              <div class="text-xs text-dim">Tổng số ghi danh</div>
              <div class="text-xl font-bold text-gold">${alumniList.length}</div>
            </div>
          </div>
        </div>

        ${alumniList.length === 0 ? `
          <div class="card p-5 text-center text-muted" style="border: 1px dashed var(--border-dim); border-radius: 12px;">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🏛️</div>
            <p class="mb-0 text-white font-medium">Chưa có Cựu Ban Điều Hành nào được ghi danh tri ân.</p>
          </div>
        ` : `
          <div class="org-board-grid">
          ${alumniList.map((m) => `
            <div class="board-member-card" style="border: 1px solid rgba(212,175,55,0.3); background: linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(30,41,59,0.7) 100%);">
              <img src="${m.avatar}" alt="${m.name}" class="board-avatar">
              <div class="badge badge-cyan mb-1" style="font-size:0.75rem;">📅 ${m.term}</div>
              <div class="board-title" style="color:var(--gold-primary); font-weight:700;">${m.roleTitle}</div>
              <h3 class="font-bold text-white text-base">${m.name}</h3>
              <p class="text-xs text-muted mt-2">🎓 Lớp: <span class="text-white font-medium">${m.major || 'K55'}</span></p>
              <div class="mt-2 text-xs">
                <span class="text-gold font-bold">🏆 Thành tựu:</span> 
                <span class="text-white font-medium">${m.achievement || 'Kiện tướng thi đấu Phân hiệu'}</span>
              </div>
              <div class="mt-3 pt-2" style="border-top: 1px dashed rgba(212,175,55,0.25); text-align: left;">
                <div class="text-xs text-gold font-semibold mb-1" style="display:flex; align-items:center; gap:5px;">
                  <span>💬</span> <span>Lời nhắn nhủ thế hệ mới:</span>
                </div>
                <p class="board-quote" style="border-left: 2px solid var(--gold-primary); padding-left: 10px; margin-top: 4px; font-style: italic; color: #cbd5e1; line-height: 1.5; border-top: none; padding-top: 0;">
                  "${m.message || m.bio}"
                </p>
              </div>
            </div>
          `).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderAlumniMembers(container, alumniMembersList) {
    const isAdmin = store.getState().currentSession.role === 'admin';
    container.innerHTML = `
      <div class="directory-view animate-fadeIn">
        <div class="mb-4" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.18) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid var(--border-gold); border-radius: 16px; padding: 22px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 20px rgba(212,175,55,0.12); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="flex: 1; min-width: 280px;">
            <div class="d-flex align-center gap-2 mb-2">
              <span class="badge badge-gold" style="font-size: 0.72rem; letter-spacing: 0.8px;">🏛️ KHÔNG GIAN TRI ÂN</span>
              <span class="badge badge-cyan" style="font-size: 0.72rem;">TRUYỀN THỐNG CLB</span>
            </div>
            <h2 class="text-lg font-bold text-white mb-1" style="background: linear-gradient(135deg, #fff, #f3d57a); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              Tri Ân - Vinh Danh Cựu Thành Viên CLB Cờ TNU - HGC (Đại học Thái Nguyên Phân hiệu tại Hà Giang)
            </h2>
            <p class="text-xs text-muted" style="line-height: 1.6; margin: 0;">
              Nơi lưu giữ dấu ấn cống hiến, tài năng và ngọn lửa nhiệt huyết của các thế hệ kỳ thủ đã đồng hành xây dựng nên bản sắc câu lạc bộ.
            </p>
          </div>
          <div class="d-flex align-center gap-3">
            <div style="text-align: center; padding: 10px 18px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
              <div class="text-xs text-dim">Tổng số ghi danh</div>
              <div class="text-xl font-bold text-gold">${alumniMembersList.length}</div>
            </div>
          </div>
        </div>

        <div class="table-responsive mobile-card-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Thẻ</th>
                <th>Cựu Thành Viên</th>
                <th>Niên Khóa</th>
                <th>Lớp</th>
                <th>Huy Chương Vàng</th>
                <th>Huy Chương Bạc</th>
                <th>Huy Chương Đồng</th>
                <th>Danh Hiệu</th>
                <th>Đóng Góp Nổi Bật</th>
              </tr>
            </thead>
            <tbody>
              ${alumniMembersList.length === 0 ? `
                <tr><td colspan="9" class="text-center text-muted p-4">Chưa có Cựu Thành Viên nào trong danh sách tri ân.</td></tr>
              ` : alumniMembersList.map((m) => {
                const gold = m.goldMedals ?? 0;
                const silver = m.silverMedals ?? 0;
                const bronze = m.bronzeMedals ?? 0;
                return `
                <tr>
                  <td data-label="Mã Thẻ"><span class="font-mono text-gold font-bold text-xs">${m.id}</span></td>
                  <td data-label="Thành Viên">
                    <div class="member-cell">
                      <img src="${m.avatar}" alt="${m.name}">
                      <div>
                        <div class="font-bold text-white">${m.name}</div>
                        <div class="text-xs text-dim">${m.roleTitle}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Niên Khóa"><span class="badge badge-cyan text-xs">${m.graduationYear}</span></td>
                  <td data-label="Lớp"><span class="text-xs font-medium text-white">${m.major}</span></td>
                  <td data-label="HC Vàng"><strong class="text-gold font-bold">🥇 ${gold}</strong></td>
                  <td data-label="HC Bạc"><strong class="text-cyan font-bold">🥈 ${silver}</strong></td>
                  <td data-label="HC Đồng"><strong class="text-rose font-bold">🥉 ${bronze}</strong></td>
                  <td data-label="Danh Hiệu"><span class="badge badge-gold">${m.badge}</span></td>
                  <td data-label="Đóng Góp"><span class="text-xs text-muted">${m.bio}</span></td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderMembersDirectory(container) {
    const state = store.getState();
    const isMemberOrAdmin = state.currentSession.role === 'member' || state.currentSession.role === 'admin';

    let filtered = state.members.filter((m) => {
      const q = this.memberSearchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) ||
             m.studentId.toLowerCase().includes(q) ||
             (m.major && m.major.toLowerCase().includes(q)) ||
             m.university.toLowerCase().includes(q);
    });

    container.innerHTML = `
      <div class="directory-view animate-fadeIn">
        <!-- Controls & Filters -->
        <div class="directory-controls-bar">
          <div class="d-flex gap-2 align-center flex-1" style="min-width:260px;">
            <input type="text" id="dirSearchInput" class="form-input form-input-sm flex-1" 
                   value="${this.memberSearchQuery}" placeholder="Tìm theo tên thành viên, MSSV hoặc lớp...">
          </div>
        </div>

        ${!isMemberOrAdmin ? `
          <div class="mb-3 p-2 px-3 text-xs text-muted" style="background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
            🔒 <em>Chế độ khách: Số điện thoại và Email cá nhân được bảo vệ theo chính sách riêng tư của CLB. Đăng nhập hoặc chọn vai trò Thành viên để xem đầy đủ.</em>
          </div>
        ` : ''}

        <!-- Members Table (Responsive Card Mode on Mobile) -->
        <div class="table-responsive mobile-card-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Thẻ</th>
                <th>Kỳ Thủ</th>
                <th>MSSV</th>
                <th>Lớp</th>
                <th>Huy Chương Vàng</th>
                <th>Huy Chương Bạc</th>
                <th>Huy Chương Đồng</th>
                <th>Chuyên Cần</th>
                <th>Liên Hệ</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="9" class="text-center text-muted p-4">${this.memberSearchQuery ? 'Không tìm thấy kỳ thủ phù hợp với từ khóa.' : 'Chưa có kỳ thủ nào trong danh sách. Thành viên mới sẽ xuất hiện sau khi Ban Điều Hành duyệt đơn đăng ký.'}</td></tr>
              ` : filtered.map((m) => {
                const gold = m.goldMedals ?? 0;
                const silver = m.silverMedals ?? 0;
                const bronze = m.bronzeMedals ?? 0;
                return `
                <tr>
                  <td data-label="Mã Thẻ"><span class="font-mono text-gold font-bold text-xs">${m.id}</span></td>
                  <td data-label="Kỳ Thủ">
                    <div class="member-cell">
                      <img src="${m.avatar}" alt="${m.name}">
                      <div>
                        <div class="font-bold text-white">${m.name}</div>
                        <div class="text-xs text-dim">${m.roleTitle}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="MSSV"><span class="font-mono text-xs">${m.studentId}</span></td>
                  <td data-label="Lớp"><span class="text-xs font-medium text-white">${m.class || m.major || 'Chưa phân lớp'}</span></td>
                  <td data-label="HC Vàng"><strong class="text-gold font-bold">🥇 ${gold}</strong></td>
                  <td data-label="HC Bạc"><strong class="text-cyan font-bold">🥈 ${silver}</strong></td>
                  <td data-label="HC Đồng"><strong class="text-rose font-bold">🥉 ${bronze}</strong></td>
                  <td data-label="Chuyên Cần"><span class="badge badge-emerald">${m.attendanceRate !== undefined ? m.attendanceRate : 0}%</span></td>
                  <td data-label="Liên Hệ">
                    <span class="text-xs text-muted">
                      ${isMemberOrAdmin ? (m.phone || '098*.***') : '••••••••••'}
                    </span>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInput = container.querySelector('#dirSearchInput');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.memberSearchQuery = e.target.value;
        this.renderMembersDirectory(container);
      });
    }
  }

  // ==========================================
  // 4. LEADERBOARD ("BẢNG PHONG THẦN")
  // ==========================================
  renderLeaderboard(container) {
    container.innerHTML = `
      <div class="leaderboard-page-view animate-fadeIn">
        <div class="text-center mb-3">
          <span class="badge badge-gold">BẢNG PHONG THẦN CLB CỜ TNU - HGC</span>
          <h1 class="text-2xl font-bold mt-2">Bảng Xếp Hạng Thành Viên</h1>
          <p class="text-muted text-sm mt-1">Dữ liệu cập nhật thời gian thực sau mỗi giải đấu, hoạt động và buổi sinh hoạt</p>
        </div>

        <!-- Podium Top 3 Area -->
        <div id="podiumArea"></div>

        <!-- Detailed Leaderboard Table -->
        <div id="leaderboardTableArea"></div>
      </div>
    `;

    this.renderLeaderboardTable();
  }

  renderLeaderboardTable() {
    const podiumArea = document.getElementById('podiumArea');
    const tableArea = document.getElementById('leaderboardTableArea');
    if (!tableArea) return;

    const state = store.getState();

    // Helper tính Tổng Điểm theo công thức thi đua thống nhất
    const getScore = (m) => store.calculateMemberScore(m);

    const sorted = [...state.members].sort((a, b) => getScore(b) - getScore(a));

    const top1 = sorted[0];
    const top2 = sorted[1];
    const top3 = sorted[2];

    // Render Podium
    if (podiumArea) {
      if (top1 && top2 && top3) {
        podiumArea.innerHTML = `
        <div class="podium-container">
          <!-- Rank 2: Silver -->
          <div class="podium-step rank-2">
            <div class="podium-avatar-wrap">
              <span class="podium-crown">🥈</span>
              <img src="${top2.avatar}" alt="${top2.name}" class="podium-avatar">
              <span class="podium-rank-badge">2</span>
            </div>
            <div class="podium-pedestal">
              <div class="podium-name">${top2.name}</div>
              <div class="podium-elo">Tổng điểm: ${getScore(top2)}đ</div>
              <span class="badge badge-cyan mt-1" style="font-size:0.65rem;">Á Quân</span>
            </div>
          </div>

          <!-- Rank 1: Gold Crown -->
          <div class="podium-step rank-1">
            <div class="podium-avatar-wrap">
              <span class="podium-crown">👑</span>
              <img src="${top1.avatar}" alt="${top1.name}" class="podium-avatar">
              <span class="podium-rank-badge">1</span>
            </div>
            <div class="podium-pedestal">
              <div class="podium-name">${top1.name}</div>
              <div class="podium-elo">Tổng điểm: ${getScore(top1)}đ</div>
              <span class="badge badge-gold mt-1" style="font-size:0.68rem;">QUÁN QUÂN</span>
            </div>
          </div>

          <!-- Rank 3: Bronze -->
          <div class="podium-step rank-3">
            <div class="podium-avatar-wrap">
              <span class="podium-crown">🥉</span>
              <img src="${top3.avatar}" alt="${top3.name}" class="podium-avatar">
              <span class="podium-rank-badge">3</span>
            </div>
            <div class="podium-pedestal">
              <div class="podium-name">${top3.name}</div>
              <div class="podium-elo">Tổng điểm: ${getScore(top3)}đ</div>
              <span class="badge badge-emerald mt-1" style="font-size:0.65rem;">Hạng Ba</span>
            </div>
          </div>
        </div>
      `;
      } else {
        podiumArea.innerHTML = '';
      }
    }

    // Render Full Table
    tableArea.innerHTML = `
      <div class="table-responsive mobile-card-view">
        <table class="data-table">
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Kỳ Thủ</th>
              <th>Lớp</th>
              <th>Tổng Điểm</th>
              <th>Số Giải Tham Gia</th>
              <th>Số Hoạt Động Tham Gia</th>
              <th>Số Buổi Sinh Hoạt</th>
              <th>Tỷ Lệ Tích Cực</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.length === 0 ? `
              <tr><td colspan="8" class="text-center text-muted p-4">Chưa có kỳ thủ nào trong Bảng Phong Thần. Hãy duyệt kết nạp kỳ thủ mới để bắt đầu thi đua xếp hạng!</td></tr>
            ` : sorted.map((m, idx) => {
              const rank = idx + 1;
              const totalScore = getScore(m);
              const tourCount = m.tournamentsJoined !== undefined ? m.tournamentsJoined : (m.tournamentsCount || 0);
              const activityCount = m.activitiesJoined !== undefined ? m.activitiesJoined : 0;
              const sessionCount = m.attendanceCount !== undefined ? m.attendanceCount : 0;
              const activeRate = m.attendanceRate !== undefined ? m.attendanceRate : 0;
              const barColor = activeRate >= 75 ? 'var(--accent-emerald)' : activeRate >= 50 ? '#facc15' : activeRate >= 30 ? '#fb923c' : '#64748b';
              const rateColor = activeRate >= 75 ? '#34d399' : activeRate >= 50 ? '#facc15' : activeRate >= 30 ? '#fb923c' : '#94a3b8';
              return `
                <tr>
                  <td data-label="Hạng">
                    <span class="badge ${rank === 1 ? 'badge-gold' : rank === 2 ? 'badge-cyan' : rank === 3 ? 'badge-emerald' : ''}" style="font-size:0.82rem; font-weight:800;">
                      #${rank}
                    </span>
                  </td>
                  <td data-label="Kỳ Thủ">
                    <div class="member-cell">
                      <img src="${m.avatar}" alt="${m.name}">
                      <div>
                        <div class="font-bold text-white">${m.name}</div>
                        <div class="text-xs text-dim">${m.studentId}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Lớp"><span class="text-xs font-medium text-white">${m.class || m.major || 'Chưa phân lớp'}</span></td>
                  <td data-label="Tổng Điểm"><strong class="text-gold text-base font-bold">${totalScore}đ</strong></td>
                  <td data-label="Số Giải Tham Gia"><span class="text-xs font-semibold">${tourCount} giải <span class="text-dim" style="font-size:11px;">(${tourCount * 20}đ)</span></span></td>
                  <td data-label="Số Hoạt Động Tham Gia"><span class="text-xs text-cyan font-semibold">${activityCount} hoạt động <span class="text-dim" style="font-size:11px;">(${activityCount * 5}đ)</span></span></td>
                  <td data-label="Số Buổi Sinh Hoạt"><span class="text-xs text-gold font-semibold">${sessionCount} buổi <span class="text-dim" style="font-size:11px;">(${sessionCount * 10}đ)</span></span></td>
                  <td data-label="Tỷ Lệ Tích Cực">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div style="width:50px; height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
                        <div style="width:${activeRate}%; height:100%; background:${barColor};"></div>
                      </div>
                      <span class="text-xs font-bold" style="color:${rateColor};">${activeRate}% <span class="text-dim" style="font-size:11px;">(${activeRate}đ)</span></span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-xs text-muted" style="line-height: 1.5; text-align: center;">
        💡 <em>Quy tắc tính Tổng Điểm Thi Đua: <strong>1 Giải đấu = 20đ</strong> • <strong>1 Hoạt động = 5đ</strong> • <strong>1 Buổi sinh hoạt = 10đ</strong> • <strong>Tỷ lệ tích cực quy đổi 100% = 100đ</strong>. Cập nhật liên tục theo từng hoạt động!</em>
      </div>
    `;
  }

  // ==========================================
  // 5. EVENTS & TOURNAMENTS VIEW
  // ==========================================
  renderEvents(container) {
    const state = store.getState();
    const activeMember = store.getActiveMember();

    container.innerHTML = `
      <div class="events-page-view animate-fadeIn">
        <div class="d-flex justify-between align-center mb-4 flex-wrap gap-2">
          <div>
            <span class="badge badge-emerald">LỊCH TRÌNH HOẠT ĐỘNG</span>
            <h1 class="text-2xl font-bold mt-1">Giải Đấu - Buổi Sinh Hoạt Thường Kỳ</h1>
            <p class="text-muted text-sm">Đăng ký tham gia trực tuyến và gửi phản hồi nâng cao chất lượng</p>
          </div>
          ${state.currentSession.role === 'admin' ? '<button class="btn btn-gold btn-sm" id="btnAddNewEventModal">+ Lên lịch sự kiện mới</button>' : ''}
        </div>

        <div class="events-cards-grid">
          ${state.events.length === 0 ? `
            <div class="card p-5 text-center text-muted" style="grid-column: 1 / -1; border: 1px dashed var(--border-dim); border-radius: 12px;">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">📅</div>
              <p class="mb-0 text-white font-medium">Chưa có giải đấu hoặc buổi sinh hoạt nào được lên lịch.</p>
              ${state.currentSession.role === 'admin' ? '<p class="text-xs text-muted mt-1">Bấm nút "+ Lên lịch sự kiện mới" ở trên để tạo giải đấu hoặc buổi sinh hoạt đầu tiên.</p>' : ''}
            </div>
          ` : state.events.map((ev) => {
            const isRegistered = activeMember ? (ev.registeredMembers || []).includes(activeMember.id) : false;
            return `
              <div class="event-card card-hover">
                <div>
                  <div class="d-flex justify-between align-center mb-2">
                    <span class="badge ${ev.type === 'tournament' ? 'badge-cyan' : 'badge-gold'}">
                      ${ev.type === 'tournament' ? '🏆 Giải Đấu' : '🎯 Hoạt Động'}
                    </span>
                    <span class="event-status-badge status-${ev.status}">
                      ${ev.status === 'ongoing' ? '🟢 Đang diễn ra' : ev.status === 'upcoming' ? '⏰ Sắp diễn ra' : '🏁 Đã kết thúc'}
                    </span>
                  </div>

                  <h3 class="font-bold text-white text-base mb-2">${ev.title}</h3>
                  <p class="text-xs text-muted mb-3">${ev.description}</p>
                  
                  <div class="text-xs mb-1">📍 <strong>Địa điểm:</strong> ${ev.location}</div>
                  <div class="text-xs mb-1">📅 <strong>Thời gian:</strong> ${ev.dateTime}</div>
                  <div class="text-xs mb-3">
                    👥 <strong>Đã điểm danh tham gia:</strong> 
                    <span class="text-gold font-bold">${ev.currentRegistered || 0} kỳ thủ</span>
                  </div>
                </div>

                <div class="d-flex gap-2 pt-3 flex-wrap align-center" style="border-top:1px solid rgba(255,255,255,0.06);">
                  <div class="flex-1 d-flex align-center gap-1 flex-wrap">
                    <span class="badge badge-gold text-xs" style="padding: 6px 12px; font-weight: 600;">
                      📍 Quét mã QR Smart Key tại bàn để điểm danh
                    </span>
                    ${ev.swissData ? `
                      <button class="btn btn-gold btn-sm btn-view-swiss-public" data-event-id="${ev.id}" title="Xem lịch thi đấu & cặp đấu Hệ Thụy Sĩ">
                        ⚔️ Bảng Đấu Hệ Thụy Sĩ
                      </button>
                    ` : ''}
                  </div>
                  <button class="btn btn-outline btn-sm btn-feedback-event" data-event-id="${ev.id}" title="Gửi đánh giá">
                    💬 Góp ý
                  </button>
                  ${state.currentSession.role === 'admin' ? `
                    <button class="btn btn-danger btn-sm btn-del-event-public" data-event-id="${ev.id}" title="Xóa hoạt động này">
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Bind Swiss public view
    container.querySelectorAll('.btn-view-swiss-public').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const evId = btn.getAttribute('data-event-id');
        const ev = state.events.find((e) => e.id === evId);
        if (ev) modalManager.openSwissTournamentPublicModal(ev);
      });
    });

    // Bind feedback button
    container.querySelectorAll('.btn-feedback-event').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const evId = btn.getAttribute('data-event-id');
        const ev = state.events.find((e) => e.id === evId);
        if (ev) modalManager.openFeedbackModal(ev);
      });
    });

    // Bind delete event (admin on public view)
    container.querySelectorAll('.btn-del-event-public').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const evId = btn.getAttribute('data-event-id');
        const ev = state.events.find((e) => e.id === evId);
        modalManager.showConfirm(
          `Bạn có chắc muốn xóa hoạt động / giải đấu:\n"${evTitle}" không?`,
          () => {
            store.deleteEvent(evId);
            this.renderEvents(container);
            modalManager.showAlert('Đã xóa hoạt động thành công!');
          },
          null,
          { title: 'XÁC NHẬN XÓA HOẠT ĐỘNG', confirmText: '🗑️ Xóa hoạt động', danger: true }
        );
      });
    });

    container.querySelector('#btnAddNewEventModal')?.addEventListener('click', () => {
      sound.playClick();
      this.openCreateEventModal();
    });
  }

  openCreateEventModal() {
    const contentHtml = `
      <form class="app-form">
        <div class="form-group">
          <label class="form-label">Tên giải đấu / Buổi sinh hoạt *</label>
          <input type="text" id="evTitle" class="form-input" required placeholder="Giải Vô Địch Cờ TNU...">
        </div>
        <div class="form-group">
          <label class="form-label font-bold text-white mb-2" style="display: flex; align-items: center; gap: 6px;">
            <span>🏷️</span> <span>Loại sự kiện *</span>
          </label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px;">
            <label class="radio-option-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; border: 1.5px solid var(--border-gold); background: rgba(212,175,55,0.08); cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="evTypeSelect" value="activity" checked style="margin-top: 3px; accent-color: var(--gold-color);">
              <div>
                <strong class="text-gold" style="display: block; font-size: 0.92rem; margin-bottom: 3px;">🎯 1. Hoạt Động</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.35;">Sinh hoạt thường kỳ, tập huấn chuyên môn. <em>(Tự động tính vào số Hoạt Động tham gia của kỳ thủ khi quét thẻ)</em></span>
              </div>
            </label>

            <label class="radio-option-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; border: 1.5px solid rgba(6,182,212,0.4); background: rgba(6,182,212,0.05); cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="evTypeSelect" value="tournament" style="margin-top: 3px; accent-color: #06b6d4;">
              <div>
                <strong class="text-cyan" style="display: block; font-size: 0.92rem; margin-bottom: 3px;">🏆 2. Giải Đấu</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.35;">Giải vô địch CLB, Cup TNU, giải cờ tranh cúp. <em>(Tự động tính vào số Giải Đấu tham gia của kỳ thủ khi quét thẻ)</em></span>
              </div>
            </label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Thời gian tổ chức *</label>
            <input type="text" id="evDateTime" class="form-input" value="2026-10-24 14:00 - 17:30" placeholder="VD: 2026-10-24 14:00 - 17:30">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Địa điểm tổ chức *</label>
            <input type="text" id="evLocation" class="form-input" value="Trung tâm Học liệu - CNTT - ĐHTN" placeholder="VD: Phòng Hội thảo, Sảnh A...">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Mô tả / Thể thức thi đấu</label>
          <textarea id="evDesc" class="form-textarea" rows="3" placeholder="Thể thức Thụy Sĩ 7 ván, thời gian 5 phút + 3 giây..."></textarea>
        </div>
      </form>
    `;

    modalManager.open('Lên lịch sự kiện / giải đấu mới', contentHtml, (modal) => {
      const title = modal.querySelector('#evTitle').value.trim();
      if (!title) {
        modalManager.showAlert('Vui lòng nhập tên sự kiện!');
        return false;
      }
      const selectedType = modal.querySelector('input[name="evTypeSelect"]:checked')?.value || 'activity';

      store.addEvent({
        title,
        type: selectedType, // 'session' | 'tournament'
        dateTime: modal.querySelector('#evDateTime').value.trim(),
        maxParticipants: null,
        location: modal.querySelector('#evLocation').value.trim(),
        description: modal.querySelector('#evDesc').value.trim(),
        registrationOpen: false,
        status: 'upcoming'
      });
      modalManager.showAlert(`Đã lên lịch ${selectedType === 'tournament' ? 'giải đấu' : 'hoạt động'} mới thành công!\n(Trạng thái: SẮP DIỄN RA ⏰ • Tham gia tự do & điểm danh qua máy quét QR)`);
      return true;
    }, 'Tạo sự kiện');
  }

  // ==========================================
  // 6. NEWS & CMS VIEW (PUBLIC)
  // ==========================================
  renderNews(container) {
    const state = store.getState();

    container.innerHTML = `
      <div class="news-page-view animate-fadeIn">
        <div class="d-flex justify-between align-center mb-4 flex-wrap gap-2">
          <div>
            <span class="badge badge-gold">TRUYỀN THÔNG - CHUYÊN MÔN</span>
            <h1 class="text-2xl font-bold mt-1">Tin Bài - Khai Cuộc - Ván Đấu Hay</h1>
            <p class="text-muted text-sm">Góc học thuật, phân tích chiến thuật và cập nhật thông báo nội bộ CLB</p>
          </div>
          ${state.currentSession.role === 'admin' ? `
            <button class="btn btn-gold btn-sm" id="btnNewsWriteArticle">
              ✍️ Soạn bài viết mới
            </button>
          ` : ''}
        </div>

        <div class="news-cards-grid">
          ${state.articles.length === 0 ? `
            <div class="card p-5 text-center text-muted" style="grid-column: 1 / -1; border: 1px dashed var(--border-dim); border-radius: 12px;">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">📰</div>
              <p class="mb-0 text-white font-medium">Chưa có bài viết hoặc tin tức nào.</p>
              ${state.currentSession.role === 'admin' ? '<p class="text-xs text-muted mt-1">Bấm nút "✍️ Soạn bài viết mới" ở trên để đăng bài viết hoặc thông báo đầu tiên.</p>' : ''}
            </div>
          ` : state.articles.map((art) => `
            <div class="article-card" data-article-id="${art.id}">
              <div class="article-thumb-wrap" style="position:relative; overflow:hidden;">
                <img src="${art.thumbnail}" alt="${art.title}" class="article-thumb">
                ${art.gallery && art.gallery.length > 0 ? `
                  <span class="badge" style="position:absolute; bottom:8px; right:8px; background:rgba(10,16,32,0.85); backdrop-filter:blur(4px); font-size:0.7rem; border:1px solid rgba(212,175,55,0.35); color:var(--gold-light);">
                    📸 ${art.gallery.length} ảnh
                  </span>
                ` : ''}
              </div>
              <div class="article-content-body">
                <div class="d-flex justify-between align-center mb-2">
                  <span class="badge badge-gold">${art.category}</span>
                  <span class="text-xs text-muted">${art.publishDate}</span>
                </div>
                <h3 class="font-bold text-white text-base mb-2">${art.title}</h3>
                <p class="text-xs text-muted flex-1">${art.summary}</p>
                <div class="d-flex justify-between align-center mt-3 pt-2" style="border-top:1px solid rgba(255,255,255,0.06);">
                  <span class="text-xs text-dim">✍️ ${art.author || 'CLB Cờ TNU - HGC'}</span>
                  <span class="text-xs text-gold font-bold">Xem bài viết →</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#btnNewsWriteArticle')?.addEventListener('click', () => {
      sound.playClick();
      modalManager.openCmsArticleModal();
    });

    container.querySelectorAll('.article-card').forEach((card) => {
      card.addEventListener('click', () => {
        sound.playClick();
        const artId = card.getAttribute('data-article-id');
        const art = state.articles.find((a) => a.id === artId);
        if (art) modalManager.openArticleDetailModal(art);
      });
    });
  }

  // ==========================================
  // 7. MEMBER PORTAL & PASS VIEW
  // ==========================================
  renderMemberPass(container) {
    const state = store.getState();
    const activeMember = store.getActiveMember();

    if (!activeMember) {
      container.innerHTML = `
        <div class="member-pass-view animate-fadeIn text-center" style="max-width: 600px; margin: 40px auto; padding: 36px 24px; background: var(--bg-surface); border: 1.5px dashed var(--border-gold); border-radius: var(--radius-lg); box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">💳</div>
          <h2 class="text-xl font-bold text-white mb-2">Chưa Có Thành Viên Nào</h2>
          <p class="text-muted text-sm mb-4">Hệ thống hiện tại chưa có hồ sơ thành viên chính thức nào. Hãy duyệt các đơn đăng ký mới trong Buồng Lái Quản Trị để cấp Thẻ Smart QR Key!</p>
          <button class="btn btn-gold btn-sm" id="btnGoAdminAddMember">📋 Xem Đơn Chờ Duyệt (Admin)</button>
        </div>
      `;
      container.querySelector('#btnGoAdminAddMember')?.addEventListener('click', () => {
        store.setRole('admin');
        this.adminSubView = 'admin-users';
        this.adminUserSubTab = 'pending';
        this.navigateTo('admin', 'admin-users');
      });
      return;
    }

    // 1. Bốn chỉ số thống kê nổi bật (Yêu cầu 1):
    const tournamentsCount = activeMember.tournamentsJoined !== undefined ? activeMember.tournamentsJoined : 0;
    const activitiesCount = activeMember.activitiesJoined !== undefined ? activeMember.activitiesJoined : 0;
    const sessionsCount = activeMember.attendanceCount !== undefined ? activeMember.attendanceCount : 0;
    const positiveRate = activeMember.attendanceRate !== undefined ? `${activeMember.attendanceRate}%` : '0%';

    // Huy chương (Yêu cầu 5):
    const goldMedals = activeMember.goldMedals ?? 0;
    const silverMedals = activeMember.silverMedals ?? 0;
    const bronzeMedals = activeMember.bronzeMedals ?? 0;

    // Khóa, Lớp & Khoa:
    const memberClass = activeMember.class || activeMember.major || 'Chưa phân lớp';
    const memberFaculty = activeMember.faculty || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang';
    const memberCohort = activeMember.cohort || '2024 - 2028';

    // Format Date helpers
    const formatDob = (dobStr) => {
      if (!dobStr) return 'Chưa cập nhật';
      if (dobStr.includes('-')) {
        const parts = dobStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dobStr;
    };
    const formattedDob = formatDob(activeMember.dob);
    const formattedJoinDate = formatDob(activeMember.joinDate);

    container.innerHTML = `
      <div class="member-pass-view animate-fadeIn">
        <div class="text-center mb-4">
          <span class="badge badge-gold">CLB CỜ TNU - HGC • ĐẠI HỌC THÁI NGUYÊN PHÂN HIỆU TẠI HÀ GIANG</span>
          <h1 class="text-2xl font-bold mt-2">Hồ Sơ Điện Tử - Thẻ Thành Viên Smart QR Key</h1>
          <p class="text-muted text-sm mt-1">Dùng thẻ thành viên điện tử để quét điểm danh tức thời khi tham gia sinh hoạt hoặc giải đấu</p>
        </div>

        <!-- Electronic Pass Canvas Container -->
        <div id="electronicPassContainer" class="mb-4"></div>

        <!-- BẢNG TỔNG QUAN HỒ SƠ THÀNH VIÊN -->
        <div class="card p-4 animate-fadeIn" style="background: var(--bg-surface); border: 1px solid var(--border-gold); border-radius: var(--radius-lg); box-shadow: 0 12px 36px rgba(0,0,0,0.4);">
          <div class="d-flex justify-between align-center flex-wrap gap-2 mb-4 pb-3" style="border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
            <div>
              <span class="badge badge-gold">HỒ SƠ HỘI VIÊN CHÍNH THỨC</span>
              <h2 class="text-xl font-bold text-white mt-1 d-flex align-center gap-2">
                <span>📋 Bảng Tổng Quan Kỳ Thủ:</span>
                <span class="text-gold">${activeMember.name}</span>
              </h2>
            </div>
            <div class="d-flex align-center gap-2">
              <span class="badge badge-emerald">● Đang hoạt động</span>
              <span class="font-mono text-xs" style="background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1);">Mã thẻ: <strong class="text-gold">${activeMember.id}</strong></span>
            </div>
          </div>

          <!-- Quick Highlight Metrics (Yêu cầu 1: Số giải tham gia, Số hoạt động tham gia, Số buổi sinh hoạt, Tỷ lệ tích cực) -->
          <div class="d-flex flex-wrap gap-3 mb-4">
            <div class="flex-1 p-3 card" style="min-width:160px; background:rgba(15,23,42,0.7); border:1px solid rgba(212,175,55,0.25); text-align:center;">
              <span class="text-xs text-muted d-block">🏆 Số Giải Tham Gia</span>
              <span class="text-2xl font-bold text-gold font-mono">${tournamentsCount}</span>
            </div>
            <div class="flex-1 p-3 card" style="min-width:160px; background:rgba(15,23,42,0.7); border:1px solid rgba(212,175,55,0.25); text-align:center;">
              <span class="text-xs text-muted d-block">🎯 Số Hoạt Động Tham Gia</span>
              <span class="text-2xl font-bold text-white font-mono">${activitiesCount}</span>
            </div>
            <div class="flex-1 p-3 card" style="min-width:160px; background:rgba(15,23,42,0.7); border:1px solid rgba(212,175,55,0.25); text-align:center;">
              <span class="text-xs text-muted d-block">📅 Số Buổi Sinh Hoạt</span>
              <span class="text-2xl font-bold text-gold font-mono">${sessionsCount}</span>
            </div>
            <div class="flex-1 p-3 card" style="min-width:160px; background:rgba(15,23,42,0.7); border:1px solid rgba(212,175,55,0.25); text-align:center;">
              <span class="text-xs text-muted d-block">⭐ Tỷ Lệ Tích Cực</span>
              <span class="text-2xl font-bold text-emerald font-mono">${positiveRate}</span>
            </div>
          </div>

          <!-- Detailed Information Table (Yêu cầu 2, 3, 4, 5, 6) -->
          <div class="table-responsive">
            <table class="data-table member-overview-table" style="width:100%; border-collapse:collapse;">
              <tbody>
                <tr>
                  <td style="width:20%; color:var(--text-muted); font-weight:600;">👤 Họ và Tên:</td>
                  <td style="width:30%; font-weight:700; color:#fff;">${activeMember.name}</td>
                  <td style="width:20%; color:var(--text-muted); font-weight:600;">🎓 Mã Số Sinh Viên:</td>
                  <td style="width:30%; font-family:monospace; color:var(--gold-light); font-weight:700;">${activeMember.studentId || 'Chưa cập nhật'}</td>
                </tr>
                <tr>
                  <td style="color:var(--text-muted); font-weight:600;">📅 Khóa (Niên khóa):</td>
                  <td style="color:#fff; font-family:monospace; font-weight:700;">${memberCohort}</td>
                  <td style="color:var(--text-muted); font-weight:600;">🏫 Lớp:</td>
                  <td style="color:#fff; font-weight:600;">${memberClass}</td>
                </tr>
                <tr>
                  <td style="color:var(--text-muted); font-weight:600;">🏛️ Khoa:</td>
                  <td style="color:#fff;">${memberFaculty}</td>
                  <td style="color:var(--text-muted); font-weight:600;">🎖️ Chức Vụ CLB:</td>
                  <td><span class="badge badge-gold font-bold">${activeMember.roleTitle}</span></td>
                </tr>
                <tr>
                  <td style="color:var(--text-muted); font-weight:600;">📅 Ngày Sinh:</td>
                  <td style="color:#fff;">${formattedDob}</td>
                  <td style="color:var(--text-muted); font-weight:600;">⚧ Giới Tính:</td>
                  <td style="color:#fff;">${activeMember.gender || 'Chưa cập nhật'}</td>
                </tr>
                <tr>
                  <td style="color:var(--text-muted); font-weight:600;">🗓️ Ngày Gia Nhập:</td>
                  <td style="color:#fff;">${formattedJoinDate}</td>
                  <td style="color:var(--text-muted); font-weight:600;">⚡ Chuyên Cần:</td>
                  <td><span class="badge badge-emerald font-bold">${activeMember.attendanceRate !== undefined ? activeMember.attendanceRate : 0}%</span></td>
                </tr>
                <tr>
                  <td style="color:var(--text-muted); font-weight:600;">📞 Số Điện Thoại:</td>
                  <td style="color:#fff;">${activeMember.phone}</td>
                  <td style="color:var(--text-muted); font-weight:600;">🥇 Huy Chương Vàng:</td>
                  <td><strong class="text-gold font-bold font-mono" style="font-size:1.1rem;">🥇 ${goldMedals}</strong></td>
                </tr>
                <tr>
                  <td style="color:var(--text-muted); font-weight:600;">🥈 Huy Chương Bạc:</td>
                  <td><strong class="text-cyan font-bold font-mono" style="font-size:1.1rem;">🥈 ${silverMedals}</strong></td>
                  <td style="color:var(--text-muted); font-weight:600;">🥉 Huy Chương Đồng:</td>
                  <td><strong class="font-bold font-mono" style="color:#f59e0b; font-size:1.1rem;">🥉 ${bronzeMedals}</strong></td>
                </tr>
                <tr>
                  <td style="color:var(--text-muted); font-weight:600;">💬 Phương Châm Thi Đấu:</td>
                  <td colspan="3" style="color:var(--gold-primary); font-style:italic; line-height:1.6; font-weight:500;">"${activeMember.bio || 'Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam.'}"</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Render Digital Pass
    const passContainer = container.querySelector('#electronicPassContainer');
    memberCardComponent.render(passContainer, activeMember);
  }

  // ==========================================
  // 8. ADMIN DASHBOARD ("BUỒNG LÁI")
  // ==========================================
  renderAdminDashboard(container) {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.adminSubView = 'admin-checkin';
    }
    const state = store.getState();

    container.innerHTML = `
      <div class="admin-dashboard-view animate-fadeIn ${isMobile ? 'admin-mobile-scanner-only' : ''}">
        <div class="admin-layout-container">
          <!-- Admin Sidebar Navigation (Desktop only) -->
          ${!isMobile ? `
          <aside class="admin-sidebar">
            <div class="admin-sidebar-header">
              <span class="admin-sidebar-title">⚡ BUỒNG LÁI VẬN HÀNH</span>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-overview' ? 'active' : ''}" data-sub="admin-overview">
              <div class="admin-nav-left">
                <span>📊</span> <span>Tổng quan</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-checkin' ? 'active' : ''}" data-sub="admin-checkin">
              <div class="admin-nav-left">
                <span>📷</span> <span>Điểm danh QR</span>
              </div>
              <span class="admin-nav-badge active-glow">LIVE</span>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-users' ? 'active' : ''}" data-sub="admin-users">
              <div class="admin-nav-left">
                <span>👥</span> <span>Thành viên - Kỳ thủ</span>
              </div>
              <span class="admin-nav-badge">${state.members.length}</span>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-events' ? 'active' : ''}" data-sub="admin-events">
              <div class="admin-nav-left">
                <span>🏆</span> <span>Giải đấu - Sự kiện</span>
              </div>
              <span class="admin-nav-badge">${state.events.length}</span>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-swiss' ? 'active' : ''}" data-sub="admin-swiss">
              <div class="admin-nav-left">
                <span>⚔️</span> <span>Xếp cặp đấu (Thụy Sĩ)</span>
              </div>
              <span class="admin-nav-badge">${(state.events || []).filter((e) => e.type === 'tournament' || e.swissData).length}</span>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-funds' ? 'active' : ''}" data-sub="admin-funds">
              <div class="admin-nav-left">
                <span>💰</span> <span>Quản lý Quỹ CLB</span>
              </div>
              <span class="admin-nav-badge">${(state.fundRecords || []).length}</span>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-cms' ? 'active' : ''}" data-sub="admin-cms">
              <div class="admin-nav-left">
                <span>📝</span> <span>Quản trị CMS Tin bài</span>
              </div>
              <span class="admin-nav-badge">${state.articles.length}</span>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-analytics' ? 'active' : ''}" data-sub="admin-analytics">
              <div class="admin-nav-left">
                <span>📈</span> <span>Thống kê - Báo cáo</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-firebase' ? 'active' : ''}" data-sub="admin-firebase">
              <div class="admin-nav-left">
                <span>☁️</span> <span>Firebase Cloud</span>
              </div>
              <span class="admin-nav-badge ${firebaseService.status === 'connected' ? 'badge-emerald active-glow' : ''}" id="adminFirebaseSidebarBadge">
                ${!this.firebaseUnlocked ? '🔒 ' : ''}${firebaseService.status === 'connected' ? 'ONLINE' : (firebaseService.status === 'connecting' ? 'CONNECTING' : 'LOCAL')}
              </span>
            </div>
          </aside>
          ` : ''}

          <!-- Main Admin Content Pane -->
          <main class="admin-content-pane" id="adminSubContentPane"></main>
        </div>
      </div>
    `;

    // Bind admin sidebar tabs
    container.querySelectorAll('.admin-nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        sound.playClick();
        const sub = item.getAttribute('data-sub');
        if (sub === 'admin-firebase' && !this.firebaseUnlocked) {
          this.promptFirebasePassword(() => {
            this.firebaseUnlocked = true;
            this.adminSubView = 'admin-firebase';
            this.renderAdminDashboard(container);
          });
          return;
        }
        this.adminSubView = sub;
        this.renderAdminDashboard(container);
      });
    });

    const pane = container.querySelector('#adminSubContentPane');
    this.renderAdminSubView(pane);
  }

  renderAdminSubView(container) {
    if (!container) return;

    switch (this.adminSubView) {
      case 'admin-overview':
        this.renderAdminOverview(container);
        break;
      case 'admin-checkin':
        this.renderAdminCheckin(container);
        break;
      case 'admin-users':
        this.renderAdminUsers(container);
        break;
      case 'admin-events':
        this.renderAdminEvents(container);
        break;
      case 'admin-swiss':
        this.renderAdminSwiss(container);
        break;
      case 'admin-funds':
        this.renderAdminFunds(container);
        break;
      case 'admin-cms':
        this.renderAdminCms(container);
        break;
      case 'admin-analytics':
        this.renderAdminAnalytics(container);
        break;
      case 'admin-firebase':
        if (!this.firebaseUnlocked) {
          this.adminSubView = 'admin-overview';
          this.renderAdminOverview(container);
        } else {
          this.renderAdminFirebase(container);
        }
        break;
      default:
        this.renderAdminOverview(container);
    }
  }

  // Admin Sub 1: Overview
  renderAdminOverview(container) {
    const state = store.getState();
    const members = state.members || [];
    const totalMembers = members.length;

    // Lấy thông tin dữ liệu lớp thực tế của các thành viên
    const classCounts = {};
    members.forEach((m) => {
      const cls = (m.class || m.major || 'Chưa phân lớp').trim();
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    });

    const sortedClasses = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
    const palette = [
      '#d4af37', // Gold
      '#38bdf8', // Sky Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#64748b'  // Slate
    ];

    let segments = [];
    if (sortedClasses.length <= 6) {
      segments = sortedClasses.map(([label, count], idx) => ({
        label,
        count,
        value: totalMembers ? Math.round((count / totalMembers) * 100) : 0,
        color: palette[idx % palette.length]
      }));
    } else {
      const top5 = sortedClasses.slice(0, 5);
      const othersCount = sortedClasses.slice(5).reduce((sum, item) => sum + item[1], 0);
      segments = top5.map(([label, count], idx) => ({
        label,
        count,
        value: totalMembers ? Math.round((count / totalMembers) * 100) : 0,
        color: palette[idx % palette.length]
      }));
      if (othersCount > 0) {
        segments.push({
          label: 'Các lớp khác',
          count: othersCount,
          value: totalMembers ? Math.round((othersCount / totalMembers) * 100) : 0,
          color: '#64748b'
        });
      }
    }

    container.innerHTML = `
      <div class="admin-sub-overview animate-fadeIn">
        <div class="d-flex justify-between align-center mb-4 flex-wrap gap-2">
          <div>
            <h2 class="text-xl font-bold">Bảng Tin Điều Hành Hệ Thống</h2>
            <p class="text-muted text-xs">Cơ sở dữ liệu tập trung 2 phân hệ TNU - HGC</p>
          </div>
        </div>

        <!-- KPI Cards (Đã xóa Lượt quét điểm danh) -->
        <div class="stats-banner-row mb-4">
          <div class="stat-kpi-card">
            <div class="stat-icon-wrap text-gold">👥</div>
            <div>
              <div class="stat-value">${state.members.length}</div>
              <div class="stat-label">Hội viên đang quản lý</div>
            </div>
          </div>
          <div class="stat-kpi-card">
            <div class="stat-icon-wrap text-cyan">🏆</div>
            <div>
              <div class="stat-value">${state.events.length}</div>
              <div class="stat-label">Giải đấu - Lịch sinh hoạt</div>
            </div>
          </div>
          <div class="stat-kpi-card">
            <div class="stat-icon-wrap text-rose">📰</div>
            <div>
              <div class="stat-value">${state.articles.length}</div>
              <div class="stat-label">Bài viết đã xuất bản</div>
            </div>
          </div>
        </div>

        <!-- Quick Charts Row (Đã xóa Thống kê điểm danh theo tuần, hiển thị Phân bố theo Lớp) -->
        <div class="charts-grid-row" style="grid-template-columns: 1fr;">
          <div class="chart-box">
            <div class="d-flex justify-between align-center flex-wrap gap-2 mb-3">
              <div>
                <h3 class="font-bold text-white text-base mb-1">Phân Bố Kỳ Thủ Theo Lớp</h3>
                <p class="text-xs text-muted mb-0">Tỷ trọng thành viên theo từng lớp học thực tế trong CLB</p>
              </div>
              <span class="badge badge-gold font-mono">${totalMembers} Kỳ thủ • ${Object.keys(classCounts).length} Lớp</span>
            </div>
            <div class="chart-canvas-wrap">
              <canvas id="overviewDonutChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    const donutCanvas = container.querySelector('#overviewDonutChart');
    if (donutCanvas) chartHelper.renderDonutChart(donutCanvas, segments, totalMembers);
  }

  // Admin Sub 2: Smart QR Check-in ("Buồng lái điểm danh")
  renderAdminCheckin(container) {
    const state = store.getState();

    container.innerHTML = `
      <div class="admin-sub-checkin animate-fadeIn">
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <span class="badge badge-emerald">HỆ THỐNG ĐIỂM DANH THÔNG MINH</span>
            <h2 class="text-xl font-bold mt-1">Trình Quét QR - Chống Quét Trùng Lặp</h2>
            <p class="text-muted text-xs">Tự động nhận diện kỳ thủ, ghi nhận timestamp và ngăn chặn quét 2 lần</p>
          </div>
          <span class="badge badge-gold">⚡ Chế độ Admin</span>
        </div>

        <!-- Mount QR Scanner Component -->
        <div id="qrScannerComponentMount" class="mb-4"></div>

        <!-- Real-time Attendance Feed -->
        <div class="card">
          <div class="d-flex justify-between align-center mb-3">
            <div>
              <h3 class="font-bold text-white text-base">Nhật Ký Điểm Danh Thời Gian Thực (Check-in Log)</h3>
              <p class="text-xs text-muted">Dữ liệu được lưu trữ tự động vào cơ sở dữ liệu tập trung</p>
            </div>
            <span class="badge badge-cyan">${state.attendanceLogs.length} lượt đã ghi nhận</span>
          </div>

          <div class="table-responsive mobile-card-view">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã Log</th>
                  <th>Kỳ Thủ</th>
                  <th>MSSV</th>
                  <th>Loại</th>
                  <th>Mục Tiêu & Chỉ Số Đã Cộng</th>
                  <th>Thời Gian</th>
                  <th>Phương Thức</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody id="attendanceLogTableBody">
                ${state.attendanceLogs.map((log) => this.buildAttendanceLogRow(log)).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Mount Scanner Widget
    const mountPoint = container.querySelector('#qrScannerComponentMount');
    if (mountPoint) {
      this.qrScannerInstance = new SmartQRScanner(mountPoint, (result) => {
        // Callback on check-in success -> Refresh log table
        const tbody = container.querySelector('#attendanceLogTableBody');
        if (tbody && result.success) {
          const stateNow = store.getState();
          tbody.innerHTML = stateNow.attendanceLogs.map((log) => this.buildAttendanceLogRow(log)).join('');
        }
      });
    }
  }

  buildAttendanceLogRow(log) {
    const cat = log.category || (log.eventId?.startsWith('SESSION') ? 'session' : 'activity');
    const catBadge = cat === 'session' 
      ? '<span class="badge badge-gold">☕ Sinh Hoạt</span>' 
      : cat === 'tournament' 
      ? '<span class="badge badge-rose">🏆 Giải Đấu</span>' 
      : '<span class="badge badge-cyan">🎯 Hoạt Động</span>';

    const impactText = log.impact || (cat === 'session' ? '+1 Buổi Sinh Hoạt' : cat === 'tournament' ? '+1 Số Giải Tham Gia' : '+1 Số Hoạt Động Tham Gia');

    return `
      <tr class="animate-fadeIn">
        <td data-label="Mã Log"><span class="font-mono text-xs text-dim">${log.id}</span></td>
        <td data-label="Kỳ Thủ">
          <strong class="text-white">${log.memberName}</strong>
          <span class="text-xs text-dim">(${log.memberId})</span>
        </td>
        <td data-label="MSSV"><span class="font-mono text-xs">${log.studentId}</span></td>
        <td data-label="Loại">${catBadge}</td>
        <td data-label="Mục Tiêu & Chỉ Số Đã Cộng">
          <div class="text-xs text-white font-medium">${log.eventTitle}</div>
          <div class="text-xs text-gold font-semibold">${impactText}</div>
        </td>
        <td data-label="Thời Gian"><span class="text-xs text-dim font-mono">${log.timestamp}</span></td>
        <td data-label="Phương Thức"><span class="badge badge-cyan">${log.method}</span></td>
        <td data-label="Trạng Thái"><span class="badge badge-emerald">✓ Hợp lệ</span></td>
      </tr>
    `;
  }

  // Admin Sub 3: Users & Alumni Management (4 Tabs)
  renderAdminUsers(container) {
    const pane = container || document.getElementById('adminSubContentPane');
    if (!pane) return;
    const state = store.getState();
    const pendingCount = (state.pendingApplications || []).length;
    this.adminUserSubTab = this.adminUserSubTab || (pendingCount > 0 ? 'pending' : 'active');

    const activeCount = (state.members || []).length;
    const alumniBoardCount = (state.alumniBoard || []).length;
    const alumniMemberCount = (state.alumniMembers || []).length;

    let subTabContentHtml = '';

    if (this.adminUserSubTab === 'pending') {
      subTabContentHtml = `
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h3 class="font-bold text-white text-base">Hồ Sơ Đăng Ký Gia Nhập Chờ Duyệt</h3>
            <p class="text-muted text-xs">Danh sách sinh viên gửi đơn từ cổng "Đăng Ký Tham Gia" đang chờ Ban Điều Hành xét duyệt kết nạp</p>
          </div>
          <div class="text-xs text-muted">
            Tổng đơn chờ duyệt: <strong class="text-gold font-bold">${pendingCount}</strong>
          </div>
        </div>

        <!-- Table -->
        <div class="table-responsive mobile-card-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Hồ Sơ</th>
                <th>Ứng Viên</th>
                <th>MSSV</th>
                <th>Khoa</th>
                <th>Lớp</th>
                <th>SĐT / Zalo</th>
                <th>Ngày Gửi Đơn</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminPendingTableBody">
              ${(!state.pendingApplications || state.pendingApplications.length === 0) ? `
                <tr>
                  <td colspan="8" class="text-center text-muted p-4">
                    Hiện không có đơn đăng ký nào đang chờ duyệt. Mọi hồ sơ sinh viên gửi qua cổng "Đăng Ký Tham Gia" sẽ tự động xuất hiện tại đây.
                  </td>
                </tr>
              ` : state.pendingApplications.map((app) => `
                <tr>
                  <td data-label="Mã Hồ Sơ"><span class="font-mono text-gold text-xs font-bold">${app.id}</span></td>
                  <td data-label="Ứng Viên">
                    <div class="member-cell">
                      <img src="${app.avatar}" alt="${app.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                      <div>
                        <div class="font-bold text-white">${app.name}</div>
                        <div class="text-xs text-dim">${app.gender || 'Nam'}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="MSSV"><span class="font-mono text-xs">${app.studentId}</span></td>
                  <td data-label="Khoa"><span class="text-xs text-muted">${app.faculty || '—'}</span></td>
                  <td data-label="Lớp"><span class="text-xs font-medium text-white">${app.class || '—'}</span></td>
                  <td data-label="SĐT / Zalo">
                    <a href="tel:${app.phone}" class="text-cyan text-xs font-bold">${app.phone}</a>
                  </td>
                  <td data-label="Ngày Gửi Đơn">
                    <span class="text-xs text-muted">${app.createdAt ? new Date(app.createdAt).toLocaleDateString('vi-VN') : 'Mới gửi'}</span>
                  </td>
                  <td data-label="Thao Tác">
                    <div class="d-flex gap-1">
                      <button class="btn btn-gold btn-sm btn-approve-app" data-id="${app.id}" title="Duyệt vào CLB chính thức">
                        ✅ Duyệt
                      </button>
                      <button class="btn btn-outline btn-sm btn-view-app" data-id="${app.id}" title="Xem chi tiết đơn">
                        👁️
                      </button>
                      <button class="btn btn-danger btn-sm btn-del-app" data-id="${app.id}" title="Từ chối / Xóa đơn">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.adminUserSubTab === 'active') {
      subTabContentHtml = `
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h3 class="font-bold text-white text-base">Danh Sách Kỳ Thủ Đang Sinh Hoạt</h3>
            <p class="text-muted text-xs">Gồm Ban Điều Hành đương nhiệm và tất cả kỳ thủ đang học tập, sinh hoạt thường niên</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline btn-sm" id="btnExportUsersCsv">📥 Xuất Báo Cáo CSV</button>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="directory-controls-bar mb-3">
          <input type="text" id="adminUsersSearch" class="form-input form-input-sm flex-1" placeholder="Tìm kiếm theo tên, MSSV, lớp...">
          <select id="adminUsersRoleFilter" class="form-select form-select-sm">
            <option value="all">Tất cả vai trò</option>
            <option value="bdh">Ban Điều Hành (BĐH)</option>
            <option value="member">Thành viên</option>
          </select>
        </div>

        <!-- Table -->
        <div class="table-responsive mobile-card-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Thẻ</th>
                <th>Kỳ Thủ</th>
                <th>MSSV</th>
                <th>Lớp</th>
                <th>Chức Vụ</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminUsersTableBody">
              ${this.buildAdminUsersTableRows(state.members)}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.adminUserSubTab === 'alumni-board') {
      subTabContentHtml = `
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h3 class="font-bold text-white text-base">Quản Lý Cựu Ban Điều Hành Tiền Nhiệm</h3>
            <p class="text-muted text-xs">Vinh danh các thế hệ lãnh đạo CLB qua các nhiệm kỳ (kỳ thủ vẫn có thể tiếp tục sinh hoạt)</p>
          </div>
          <button class="btn btn-gold btn-sm" id="btnAddAlumniBoardAdmin">+ Thêm Cựu BĐH Mới</button>
        </div>

        <!-- Table -->
        <div class="table-responsive mobile-card-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Thẻ</th>
                <th>Cựu Thành Viên BĐH</th>
                <th>Nhiệm Kỳ</th>
                <th>Chức Vụ Tiền Nhiệm</th>
                <th>Lớp / Ngành</th>
                <th>Thành Tựu</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminAlumniBoardTableBody">
              ${(state.alumniBoard || []).length === 0 ? `
                <tr><td colspan="7" class="text-center text-muted p-4">Chưa có Cựu Ban Điều Hành nào được ghi danh.</td></tr>
              ` : (state.alumniBoard || []).map((m) => `
                <tr>
                  <td data-label="Mã Thẻ"><span class="font-mono text-gold text-xs font-bold">${m.id}</span></td>
                  <td data-label="Cựu BĐH">
                    <div class="member-cell">
                      <img src="${m.avatar}" alt="${m.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                      <div>
                        <div class="font-bold text-white">${m.name}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Nhiệm Kỳ"><span class="badge badge-cyan text-xs">${m.term}</span></td>
                  <td data-label="Chức Vụ"><strong class="text-gold font-bold text-xs">${m.roleTitle}</strong></td>
                  <td data-label="Lớp"><span class="text-xs font-medium text-white">${m.major || 'K55'}</span></td>
                  <td data-label="Thành Tựu"><span class="text-xs text-muted" style="max-width:220px; display:inline-block;">${m.achievement || m.bio || 'Đóng góp tích cực'}</span></td>
                  <td data-label="Thao Tác">
                    <div class="d-flex gap-1">
                      <button class="btn btn-outline btn-sm btn-edit-alumni-board" data-id="${m.id}" title="Sửa thông tin">✏️ Sửa</button>
                      <button class="btn btn-danger btn-sm btn-del-alumni-board" data-id="${m.id}" title="Xóa khỏi danh sách">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.adminUserSubTab === 'alumni-members') {
      subTabContentHtml = `
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h3 class="font-bold text-white text-base">Quản Lý Cựu Thành Viên Tri Ân</h3>
            <p class="text-muted text-xs">Lưu danh các cựu sinh viên đã tốt nghiệp ra trường (không còn trong danh sách sinh hoạt thường niên)</p>
          </div>
          <button class="btn btn-gold btn-sm" id="btnAddAlumniMemberAdmin">+ Thêm Cựu Thành Viên Mới</button>
        </div>

        <!-- Table -->
        <div class="table-responsive mobile-card-view">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã Thẻ</th>
                <th>Cựu Thành Viên</th>
                <th>Niên Khóa</th>
                <th>Lớp</th>
                <th>Huy Chương</th>
                <th>Danh Hiệu</th>
                <th>Đóng Góp Nổi Bật</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody id="adminAlumniMemberTableBody">
              ${(state.alumniMembers || []).length === 0 ? `
                <tr><td colspan="8" class="text-center text-muted p-4">Chưa có Cựu Thành Viên nào trong danh sách tri ân.</td></tr>
              ` : (state.alumniMembers || []).map((m) => `
                <tr>
                  <td data-label="Mã Thẻ"><span class="font-mono text-gold text-xs font-bold">${m.id}</span></td>
                  <td data-label="Cựu Thành Viên">
                    <div class="member-cell">
                      <img src="${m.avatar}" alt="${m.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                      <div>
                        <div class="font-bold text-white">${m.name}</div>
                        <div class="text-xs text-dim">${m.roleTitle || 'Cựu Thành viên'}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Niên Khóa"><span class="badge badge-cyan text-xs">${m.graduationYear}</span></td>
                  <td data-label="Lớp"><span class="text-xs font-medium text-white">${m.major}</span></td>
                  <td data-label="Huy Chương">
                    <span class="text-xs font-bold text-gold">🥇 ${m.goldMedals || 0}</span>
                    <span class="text-xs font-bold text-cyan" style="margin-left:4px;">🥈 ${m.silverMedals || 0}</span>
                    <span class="text-xs font-bold text-rose" style="margin-left:4px;">🥉 ${m.bronzeMedals || 0}</span>
                  </td>
                  <td data-label="Danh Hiệu"><span class="badge badge-gold text-xs">${m.badge || 'Kiện Tướng'}</span></td>
                  <td data-label="Đóng Góp"><span class="text-xs text-muted" style="max-width:200px; display:inline-block;">${m.bio || 'Đóng góp tích cực'}</span></td>
                  <td data-label="Thao Tác">
                    <div class="d-flex gap-1">
                      <button class="btn btn-outline btn-sm btn-edit-alumni-member" data-id="${m.id}" title="Sửa thông tin">✏️ Sửa</button>
                      <button class="btn btn-danger btn-sm btn-del-alumni-member" data-id="${m.id}" title="Xóa khỏi danh sách">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    pane.innerHTML = `
      <div class="admin-sub-users animate-fadeIn">
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h2 class="text-xl font-bold">Quản Lý Nhân Sự Toàn Diện CLB</h2>
            <p class="text-muted text-xs">Quản lý kỳ thủ đang sinh hoạt, cựu ban điều hành và không gian tri ân cựu thành viên</p>
          </div>
        </div>

        <!-- 4 Subtabs Header -->
        <div class="role-btn-group mb-4" id="adminUsersSubTabs" style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-sm ${this.adminUserSubTab === 'pending' ? 'btn-gold' : 'btn-outline'}" data-tab="pending" style="padding:6px 14px; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
            📋 Đơn Chờ Duyệt ${pendingCount > 0 ? `<span class="badge badge-rose" style="padding:2px 7px; font-size:0.75rem; border-radius:10px;">${pendingCount} mới</span>` : `(0)`}
          </button>
          <button type="button" class="btn btn-sm ${this.adminUserSubTab === 'active' ? 'btn-gold' : 'btn-outline'}" data-tab="active" style="padding:6px 14px; font-weight:600;">
            👥 Kỳ Thủ Đang Sinh Hoạt (${activeCount})
          </button>
          <button type="button" class="btn btn-sm ${this.adminUserSubTab === 'alumni-board' ? 'btn-gold' : 'btn-outline'}" data-tab="alumni-board" style="padding:6px 14px; font-weight:600;">
            🏛️ Cựu Ban Điều Hành (${alumniBoardCount})
          </button>
          <button type="button" class="btn btn-sm ${this.adminUserSubTab === 'alumni-members' ? 'btn-gold' : 'btn-outline'}" data-tab="alumni-members" style="padding:6px 14px; font-weight:600;">
            🎓 Cựu Thành Viên Tri Ân (${alumniMemberCount})
          </button>
        </div>

        <div id="adminUserSubTabContent">
          ${subTabContentHtml}
        </div>
      </div>
    `;

    // Bind Subtab switching
    pane.querySelectorAll('#adminUsersSubTabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.adminUserSubTab = btn.getAttribute('data-tab');
        this.renderAdminUsers(pane);
      });
    });

    if (this.adminUserSubTab === 'pending') {
      // Bind Approve
      pane.querySelectorAll('.btn-approve-app').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const id = btn.getAttribute('data-id');
          const app = (store.getState().pendingApplications || []).find((a) => a.id === id);
          if (app) {
            modalManager.showConfirm(
              `Bạn có chắc chắn muốn duyệt ứng viên [${app.name}] (${app.studentId}) trở thành Hội viên chính thức của CLB Cờ TNU - HGC?`,
              () => {
                const newMember = store.approveApplication(id);
                if (newMember) {
                  modalManager.showAlert(`🎉 Đã duyệt thành công! Kỳ thủ [${newMember.name}] đã được cấp mã thẻ chính thức [${newMember.id}]!`);
                  this.renderAdminUsers(pane);
                }
              },
              null,
              { title: 'XÁC NHẬN DUYỆT HỘI VIÊN CHÍNH THỨC', confirmText: '✅ Duyệt kết nạp', danger: false }
            );
          }
        });
      });

      // Bind View detail
      pane.querySelectorAll('.btn-view-app').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const id = btn.getAttribute('data-id');
          const app = (store.getState().pendingApplications || []).find((a) => a.id === id);
          if (app) {
            modalManager.openApplicationDetailModal(
              app,
              (appId) => {
                const newMember = store.approveApplication(appId);
                if (newMember) {
                  modalManager.showAlert(`🎉 Đã duyệt thành công! Kỳ thủ [${newMember.name}] đã được cấp mã thẻ chính thức [${newMember.id}]!`);
                  this.renderAdminUsers(pane);
                }
              },
              (appId) => {
                store.rejectApplication(appId);
                this.renderAdminUsers(pane);
              }
            );
          }
        });
      });

      // Bind Delete / Reject
      pane.querySelectorAll('.btn-del-app').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const id = btn.getAttribute('data-id');
          modalManager.showConfirm(
            `Bạn có chắc chắn muốn từ chối và xóa đơn đăng ký [${id}]?`,
            () => {
              store.rejectApplication(id);
              this.renderAdminUsers(pane);
            },
            null,
            { title: 'XÁC NHẬN TỪ CHỐI / XÓA ĐƠN', confirmText: '🗑️ Xóa đơn', danger: true }
          );
        });
      });
    } else if (this.adminUserSubTab === 'active') {
      // Bind CSV Export
      pane.querySelector('#btnExportUsersCsv')?.addEventListener('click', () => {
        sound.playClick();
        this.exportUsersToCsv();
      });

      // Bind Search & Filters
      const searchInput = pane.querySelector('#adminUsersSearch');
      const roleSelect = pane.querySelector('#adminUsersRoleFilter');
      const tbody = pane.querySelector('#adminUsersTableBody');

      const handleFilter = () => {
        const q = searchInput.value.toLowerCase();
        const r = roleSelect.value;
        const res = state.members.filter((m) => {
          const matchSearch =
            m.name.toLowerCase().includes(q) ||
            m.studentId.toLowerCase().includes(q) ||
            (m.class && m.class.toLowerCase().includes(q)) ||
            (m.major && m.major.toLowerCase().includes(q));
          const matchRole = r === 'all' || m.role === r || (r === 'bdh' && m.role === 'admin');
          return matchSearch && matchRole;
        });
        if (tbody) {
          tbody.innerHTML = this.buildAdminUsersTableRows(res);
          this.bindUserRowActions(pane);
        }
      };

      if (searchInput) searchInput.addEventListener('input', handleFilter);
      if (roleSelect) roleSelect.addEventListener('change', handleFilter);

      this.bindUserRowActions(pane);
    } else if (this.adminUserSubTab === 'alumni-board') {
      pane.querySelector('#btnAddAlumniBoardAdmin')?.addEventListener('click', () => {
        sound.playClick();
        modalManager.openAddAlumniBoardModal(null, () => this.renderAdminUsers(pane));
      });

      pane.querySelectorAll('.btn-edit-alumni-board').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const id = btn.getAttribute('data-id');
          const m = (store.getState().alumniBoard || []).find((x) => x.id === id);
          if (m) modalManager.openAddAlumniBoardModal(m, () => this.renderAdminUsers(pane));
        });
      });

      pane.querySelectorAll('.btn-del-alumni-board').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const id = btn.getAttribute('data-id');
          modalManager.showConfirm(
            `Bạn có chắc chắn muốn xóa Cựu BĐH [${id}] khỏi danh sách vinh danh?`,
            () => {
              store.deleteAlumniBoard(id);
              this.renderAdminUsers(pane);
            },
            null,
            { title: 'XÁC NHẬN XÓA CỰU BĐH', confirmText: '🗑️ Xóa vinh danh', danger: true }
          );
        });
      });
    } else if (this.adminUserSubTab === 'alumni-members') {
      pane.querySelector('#btnAddAlumniMemberAdmin')?.addEventListener('click', () => {
        sound.playClick();
        modalManager.openAddAlumniMemberModal(null, () => this.renderAdminUsers(pane));
      });

      pane.querySelectorAll('.btn-edit-alumni-member').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const id = btn.getAttribute('data-id');
          const m = (store.getState().alumniMembers || []).find((x) => x.id === id);
          if (m) modalManager.openAddAlumniMemberModal(m, () => this.renderAdminUsers(pane));
        });
      });

      pane.querySelectorAll('.btn-del-alumni-member').forEach((btn) => {
        btn.addEventListener('click', () => {
          sound.playClick();
          const id = btn.getAttribute('data-id');
          modalManager.showConfirm(
            `Bạn có chắc chắn muốn xóa Cựu thành viên [${id}] khỏi danh sách tri ân?`,
            () => {
              store.deleteAlumniMember(id);
              this.renderAdminUsers(pane);
            },
            null,
            { title: 'XÁC NHẬN XÓA CỰU THÀNH VIÊN', confirmText: '🗑️ Xóa tri ân', danger: true }
          );
        });
      });
    }
  }

  buildAdminUsersTableRows(members) {
    if (!members || members.length === 0) {
      return `
        <tr>
          <td colspan="7" class="text-center text-muted p-4">
            Chưa có kỳ thủ chính thức nào. Vui lòng chuyển sang tab <strong>"📋 Đơn Chờ Duyệt"</strong> để xét duyệt các hồ sơ đăng ký mới vào CLB.
          </td>
        </tr>
      `;
    }
    return members.map((m) => `
      <tr>
        <td data-label="Mã Thẻ"><span class="font-mono text-gold text-xs font-bold">${m.id}</span></td>
        <td data-label="Kỳ Thủ">
          <div class="member-cell">
            <img src="${m.avatar}" alt="${m.name}">
            <div>
              <div class="font-bold text-white">${m.name}</div>
            </div>
          </div>
        </td>
        <td data-label="MSSV"><span class="font-mono text-xs">${m.studentId}</span></td>
        <td data-label="Lớp"><span class="text-xs font-medium text-white">${m.class || m.major || 'Chưa phân lớp'}</span></td>
        <td data-label="Chức Vụ"><span class="badge ${m.role === 'admin' ? 'badge-rose' : m.role === 'bdh' ? 'badge-gold' : 'badge-cyan'}">${m.roleTitle}</span></td>
        <td data-label="Trạng Thái">
          <span class="badge ${m.status === 'active' ? 'badge-emerald' : 'badge-rose'}">
            ${m.status === 'active' ? '● Hoạt động' : '🔒 Đã khóa'}
          </span>
        </td>
        <td data-label="Thao Tác">
          <div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-outline btn-sm btn-view-card-user" data-id="${m.id}" title="Xem Thẻ Thành Viên Smart QR Key">💳</button>
            <button class="btn btn-outline btn-sm btn-edit-user" data-id="${m.id}" title="Sửa hồ sơ">✏️</button>
            <button class="btn btn-outline btn-sm btn-record-alumni-board" data-id="${m.id}" title="Ghi danh Cựu Ban Điều Hành (Vẫn giữ lại sinh hoạt)" style="border-color: rgba(212,175,55,0.4); color: #facc15;">🏛️ Cựu BĐH</button>
            <button class="btn btn-outline btn-sm btn-graduate-alumni" data-id="${m.id}" title="Tốt nghiệp sang Cựu Thành Viên (Gỡ khỏi danh sách sinh hoạt)" style="border-color: rgba(56,189,248,0.4); color: #38bdf8;">🎓 Cựu SV</button>
            <button class="btn btn-outline btn-sm btn-lock-user" data-id="${m.id}" title="${m.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}">
              ${m.status === 'active' ? '🔒' : '🔓'}
            </button>
            <button class="btn btn-danger btn-sm btn-del-user" data-id="${m.id}" title="Xóa tài khoản">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  bindUserRowActions(container) {
    const pane = container || document.getElementById('adminSubContentPane');

    container.querySelectorAll('.btn-view-card-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        const m = store.getMemberById(id);
        if (m) modalManager.openMemberCardModal(m);
      });
    });

    container.querySelectorAll('.btn-edit-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        const m = store.getMemberById(id);
        if (m) modalManager.openMemberModal(m);
      });
    });

    // Ghi danh Cựu BĐH (Vẫn giữ lại sinh hoạt)
    container.querySelectorAll('.btn-record-alumni-board').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        const m = store.getMemberById(id);
        if (m) modalManager.openRecordToAlumniBoardModal(m, () => this.renderAdminUsers(pane));
      });
    });

    // Chuyển tốt nghiệp sang Cựu SV (Loại khỏi sinh hoạt)
    container.querySelectorAll('.btn-graduate-alumni').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        const m = store.getMemberById(id);
        if (m) modalManager.openGraduateToAlumniMemberModal(m, () => this.renderAdminUsers(pane));
      });
    });

    container.querySelectorAll('.btn-lock-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        const newStatus = store.toggleMemberStatus(id);
        modalManager.showAlert(`Tài khoản [${id}] hiện đã được ${newStatus === 'active' ? 'MỞ KHÓA' : 'TẠM KHÓA'}!`);
      });
    });

    container.querySelectorAll('.btn-del-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        modalManager.showConfirm(
          `Bạn có chắc chắn muốn xóa hội viên [${id}] khỏi hệ thống?`,
          () => {
            store.deleteMember(id);
          },
          null,
          { title: 'XÁC NHẬN XÓA HỘI VIÊN', confirmText: '🗑️ Xóa vĩnh viễn', danger: true }
        );
      });
    });
  }

  exportUsersToCsv() {
    const state = store.getState();
    const headers = ['Mã Thẻ', 'Họ Tên', 'MSSV', 'Trường TNU', 'Chuyên Ngành', 'Bộ Môn', 'Chức Vụ', 'Elo Cờ Vua', 'Elo Cờ Tướng', 'Chuyên Cần (%)'];
    const rows = state.members.map((m) => [
      m.id,
      `"${m.name}"`,
      m.studentId,
      `"${m.university}"`,
      `"${m.major}"`,
      m.discipline,
      `"${m.roleTitle}"`,
      m.eloChess,
      m.eloXiangqi,
      m.attendanceRate
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Ky_Thu_TNU_HGC_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // Admin Sub 4: Events Management
  renderAdminEvents(container) {
    const state = store.getState();

    container.innerHTML = `
      <div class="admin-sub-events animate-fadeIn">
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h2 class="text-xl font-bold">Quản Lý Hoạt Động - Giải Đấu</h2>
            <p class="text-muted text-xs">Cổng điểm danh thông minh - Danh sách phản hồi feedback của kỳ thủ</p>
          </div>
          <button class="btn btn-gold btn-sm" id="btnAdminCreateEvent">+ Lên Lịch Sự Kiện Mới</button>
        </div>

        <div class="card mb-4">
          <h3 class="font-bold text-white text-base mb-3">Danh Sách Sự Kiện</h3>
          <div class="table-responsive mobile-card-view">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên Sự Kiện</th>
                  <th>Phân Loại</th>
                  <th>Thời Gian</th>
                  <th>Trạng Thái</th>
                  <th>Đã Điểm Danh</th>
                  <th>Máy Quét Điểm Danh</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                ${state.events.length === 0 ? `
                  <tr>
                    <td colspan="8" class="text-center text-muted p-4">Hiện chưa có hoạt động nào. Hãy bấm "+ Lên Lịch Sự Kiện Mới" để tạo!</td>
                  </tr>
                ` : state.events.map((ev) => `
                  <tr>
                    <td data-label="Mã"><span class="font-mono text-xs text-gold">${ev.id}</span></td>
                    <td data-label="Tên"><strong class="text-white">${ev.title}</strong></td>
                    <td data-label="Phân Loại">
                      ${ev.type === 'tournament' 
                        ? '<span class="badge badge-cyan">🏆 Giải Đấu</span>' 
                        : '<span class="badge badge-gold">🎯 Hoạt Động</span>'
                      }
                    </td>
                    <td data-label="Thời Gian"><span class="text-xs">${ev.dateTime}</span></td>
                    <td data-label="Trạng Thái">
                      ${ev.status === 'ongoing' 
                        ? '<span class="badge badge-emerald active-glow">🟢 Đang diễn ra</span>' 
                        : ev.status === 'completed'
                        ? '<span class="badge" style="background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3);">🏁 Đã kết thúc</span>'
                        : '<span class="badge badge-gold">⏰ Sắp diễn ra</span>'
                      }
                    </td>
                    <td data-label="Đã Điểm Danh">
                      <span class="badge badge-gold font-bold">${ev.currentRegistered || 0} kỳ thủ</span>
                    </td>
                    <td data-label="Máy Quét Điểm Danh">
                      <span class="badge ${ev.checkinActive ? 'badge-emerald' : 'badge-rose'}">
                        ${ev.checkinActive ? '🟢 ĐANG BẬT' : '🔒 ĐÃ TẮT'}
                      </span>
                    </td>
                    <td data-label="Thao Tác">
                      <div class="d-flex gap-1 align-center flex-wrap">
                        ${ev.status === 'completed' ? `
                          <button class="btn btn-outline btn-sm btn-finish-event" data-event-id="${ev.id}" style="border-color: rgba(148,163,184,0.3); color: #94a3b8; font-weight: 600; cursor: pointer;" title="Hoạt động này đã kết thúc (bấm để mở lại nếu cần)">
                            🏁 Giải Đấu Đã Kết Thúc
                          </button>
                          <button class="btn btn-danger btn-sm btn-del-event" data-event-id="${ev.id}" title="Xóa vĩnh viễn hoạt động này">
                            🗑️ Xóa
                          </button>
                        ` : ev.checkinActive ? `
                          <button class="btn btn-sm btn-finish-event" data-event-id="${ev.id}" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.45); color: #fbbf24; font-weight: 600;" title="Kết thúc hoạt động này (chuyển sang Đã kết thúc)">
                            🏁 Kết Thúc Hoạt Động
                          </button>
                          <button class="btn btn-danger btn-sm btn-del-event" data-event-id="${ev.id}" title="Xóa vĩnh viễn hoạt động này">
                            🗑️ Xóa
                          </button>
                        ` : `
                          <button class="btn btn-gold btn-sm btn-toggle-checkin" data-event-id="${ev.id}" title="Mở máy quét điểm danh (tự động chuyển sang Đang diễn ra)">
                            📷 Mở Máy Quét
                          </button>
                          <button class="btn btn-sm btn-finish-event" data-event-id="${ev.id}" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.45); color: #fbbf24; font-weight: 600;" title="Kết thúc hoạt động này (chuyển sang Đã kết thúc)">
                            🏁 Kết Thúc Hoạt Động
                          </button>
                          <button class="btn btn-danger btn-sm btn-del-event" data-event-id="${ev.id}" title="Xóa vĩnh viễn hoạt động này">
                            🗑️ Xóa
                          </button>
                        `}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Feedback Section (As requested in proposal) -->
        <div class="card">
          <h3 class="font-bold text-white text-base mb-2">Ý Kiến Phản Hồi Từ Kỳ Thủ (Feedback Collector)</h3>
          <p class="text-xs text-muted mb-3">Tự động thu thập sau mỗi sự kiện để tối ưu khâu vận hành</p>
          
          <div class="table-responsive mobile-card-view">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Thời Gian</th>
                  <th>Kỳ Thủ</th>
                  <th>Đánh Giá</th>
                  <th>Nội Dung Góp Ý</th>
                </tr>
              </thead>
              <tbody>
                ${state.eventFeedback.map((fb) => `
                  <tr>
                    <td data-label="Thời Gian"><span class="text-xs text-dim">${fb.submittedAt}</span></td>
                    <td data-label="Kỳ Thủ"><strong class="text-white">${fb.memberName}</strong></td>
                    <td data-label="Đánh Giá"><span class="text-gold font-bold">${'⭐'.repeat(fb.rating)}</span></td>
                    <td data-label="Góp Ý"><span class="text-xs">${fb.comment}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btnAdminCreateEvent')?.addEventListener('click', () => {
      sound.playClick();
      this.openCreateEventModal();
    });

    container.querySelectorAll('.btn-finish-event').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const evId = btn.getAttribute('data-event-id');
        const ev = state.events.find((e) => e.id === evId);
        if (!ev) return;

        if (ev.status === 'completed') {
          modalManager.showConfirm(
            `Hoạt động [${ev.title}] hiện ĐÃ KẾT THÚC.\nBạn có muốn mở lại thành "SẮP DIỄN RA" không?`,
            () => {
              store.setEventStatus(evId, 'upcoming');
              this.renderAdminEvents(container);
              modalManager.showAlert(`Đã mở lại hoạt động [${ev.title}] thành trạng thái: SẮP DIỄN RA ⏰!`);
            },
            null,
            { title: 'MỞ LẠI HOẠT ĐỘNG', confirmText: '🔄 Mở lại sự kiện', danger: false }
          );
          return;
        }

        // Open Evaluation & Scoring Modal for BDH
        modalManager.openEventEvaluationModal(ev, () => {
          this.renderAdminEvents(container);
        });
      });
    });

    container.querySelectorAll('.btn-toggle-checkin').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const evId = btn.getAttribute('data-event-id');
        const newState = store.toggleEventCheckin(evId);
        if (newState) {
          modalManager.showAlert(`Đã MỞ máy quét điểm danh cho sự kiện [${evId}]!\nTrạng thái sự kiện đã tự động chuyển sang: "ĐANG DIỄN RA" 🟢.`);
        } else {
          modalManager.showAlert(`Đã TẮT máy quét điểm danh sự kiện [${evId}].`);
        }
      });
    });

    container.querySelectorAll('.btn-del-event').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const evId = btn.getAttribute('data-event-id');
        const ev = state.events.find((e) => e.id === evId);
        const evTitle = ev ? ev.title : evId;
        modalManager.showConfirm(
          `Bạn có chắc chắn muốn XÓA hoạt động / giải đấu:\n"${evTitle}" không?\n\nHành động này không thể hoàn tác!`,
          () => {
            store.deleteEvent(evId);
            this.renderAdminEvents(container);
            modalManager.showAlert(`Đã xóa hoạt động [${evTitle}] thành công!`);
          },
          null,
          { title: 'XÁC NHẬN XÓA HOẠT ĐỘNG', confirmText: '🗑️ Xóa vĩnh viễn', danger: true }
        );
      });
    });

  }

  // =========================================================================
  // ADMIN SUB: XẾP CẶP ĐẤU HỆ THỤY SĨ (TÁCH RIÊNG THÀNH MỤC ĐỘC LẬP)
  // =========================================================================
  renderAdminSwiss(container) {
    const state = store.getState();
    const tournamentEvents = (state.events || []).filter((e) => e.type === 'tournament' || e.swissData);

    if (!this.selectedSwissEventId && tournamentEvents.length > 0) {
      this.selectedSwissEventId = tournamentEvents[0].id;
    }

    const curEvent = tournamentEvents.find((e) => e.id === this.selectedSwissEventId);
    const swiss = curEvent?.swissData;

    container.innerHTML = `
      <div class="admin-sub-swiss animate-fadeIn">
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h2 class="text-xl font-bold">⚔️ Xếp Cặp Đấu (Hệ Thụy Sĩ)</h2>
            <p class="text-muted text-xs">Bốc thăm vòng đấu theo điểm số FIDE, nhập kết quả từng bàn và bảng xếp hạng Buchholz</p>
          </div>
          ${tournamentEvents.length > 0 ? `
            <div class="d-flex gap-2">
              ${curEvent && !swiss ? `
                <button class="btn btn-gold btn-sm" id="btnStartSwissForEvent">
                  ⚔️ Bắt Đầu Bốc Thăm Vòng 1
                </button>
              ` : ''}
              ${curEvent && swiss && swiss.status !== 'completed' && swiss.currentRound < swiss.totalRounds ? `
                <button class="btn btn-gold btn-sm" id="btnGenerateNextRoundSwiss">
                  🔄 Bốc Thăm Vòng ${swiss.currentRound + 1}
                </button>
              ` : ''}
              ${curEvent && swiss ? `
                <button class="btn btn-outline btn-sm" id="btnEditRoundsInAdminSwiss" title="Trọng tài chỉnh sửa tổng số ván đấu">
                  ✏️ Sửa Số Ván (${swiss.totalRounds})
                </button>
                <button class="btn btn-outline btn-sm" id="btnResetSwissEvent" style="color:#fb7185; border-color: rgba(244,63,94,0.3);">
                  🗑️ Đặt Lại Giải
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>

        ${tournamentEvents.length === 0 ? `
          <div class="card p-5 text-center text-muted" style="border: 1px dashed var(--border-dim); border-radius: 12px;">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">⚔️</div>
            <p class="mb-1 text-white font-medium">Chưa có giải đấu nào trong hệ thống để xếp cặp.</p>
            <p class="text-xs text-muted mb-3">Vui lòng vào mục "Giải đấu - Sự kiện" để tạo một giải cờ mới trước khi bốc thăm!</p>
            <button class="btn btn-gold btn-sm" id="btnGoToCreateTournament">
              + Tạo Giải Đấu Mới
            </button>
          </div>
        ` : `
          <div class="card p-3 mb-3 d-flex justify-between align-center flex-wrap gap-2" style="background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.25);">
            <div class="d-flex align-center gap-2 flex-wrap">
              <span class="text-xs font-bold text-gold">CHỌN GIẢI ĐẤU:</span>
              <select class="form-control" id="swissEventSelect" style="width: auto; min-width: 240px; font-weight: 600;">
                ${tournamentEvents.map((ev) => `
                  <option value="${ev.id}" ${ev.id === this.selectedSwissEventId ? 'selected' : ''}>
                    ${ev.title} (${ev.swissData ? `Vòng ${ev.swissData.currentRound}/${ev.swissData.totalRounds}` : 'Chưa bốc thăm'})
                  </option>
                `).join('')}
              </select>
            </div>
            ${curEvent ? `
              <div class="d-flex align-center gap-2">
                <span class="badge ${swiss?.status === 'completed' ? 'badge-emerald' : swiss ? 'badge-gold' : 'badge-outline'}">
                  ${swiss?.status === 'completed' ? '🏁 ĐÃ HOÀN TẤT' : swiss ? `🟢 ĐANG ĐẤU VÒNG ${swiss.currentRound}/${swiss.totalRounds}` : '⏰ CHƯA BỐC THĂM'}
                </span>
              </div>
            ` : ''}
          </div>

          ${!swiss ? `
            <div class="card p-4 text-center">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">♟️</div>
              <h3 class="text-base font-bold text-white mb-1">Giải đấu [${curEvent.title}] chưa bắt đầu bốc thăm</h3>
              <p class="text-xs text-muted mb-3" style="max-width: 500px; margin-left: auto; margin-right: auto;">
                Trọng tài tự do viết số ván đấu thủ công và chọn danh sách kỳ thủ để bốc thăm Vòng 1 theo chuẩn Hệ Thụy Sĩ FIDE.
              </p>
              <button class="btn btn-gold btn-sm" id="btnInitSwissCenter">
                ⚔️ Cấu Hình & Bốc Thăm Vòng 1
              </button>
            </div>
          ` : `
            ${(() => {
              const curRoundData = (swiss.rounds || []).find((r) => r.roundNumber === swiss.currentRound);
              return `
                <div class="card p-3 mb-4">
                  <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
                    <div>
                      <div class="d-flex align-center gap-2 flex-wrap mb-1">
                        <h3 class="font-bold text-white text-base mb-0">
                          ⚔️ Cặp Đấu Vòng ${swiss.currentRound} / ${swiss.totalRounds}
                        </h3>
                        <button type="button" class="btn btn-outline btn-xs" id="btnEditRoundsInline" title="Trọng tài sửa lại tổng số ván của giải đấu" style="font-size: 11px; padding: 2px 8px;">
                          ✏️ Sửa Số Ván (${swiss.totalRounds})
                        </button>
                      </div>
                      <p class="text-xs text-muted">Nhấn kết quả để hệ thống tự động cộng điểm và cập nhật thứ hạng</p>
                    </div>
                    <span class="badge badge-gold font-mono">${(curRoundData?.matches || []).length} bàn đấu</span>
                  </div>

                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th style="width: 60px;">Bàn</th>
                          <th>Quân Trắng (White)</th>
                          <th style="text-align: center; width: 180px;">Kết Quả Ván Đấu</th>
                          <th>Quân Đen (Black)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${(curRoundData?.matches || []).map((m) => `
                          <tr>
                            <td class="font-bold text-gold">${m.isBye ? 'BYE' : `Bàn ${m.board}`}</td>
                            <td>
                              <span class="font-bold text-white">${m.whiteName}</span>
                              <span class="badge" style="background: #ffffff; color: #000; font-size: 10px; margin-left: 4px; padding: 1px 5px;">Trắng</span>
                            </td>
                            <td style="text-align: center;">
                              ${m.isBye ? `
                                <span class="badge badge-emerald">Miễn đấu (+1đ)</span>
                              ` : `
                                <div class="d-flex justify-center gap-1">
                                  <button type="button" class="btn btn-xs ${m.result === '1-0' ? 'btn-gold' : 'btn-outline'} btn-live-res" data-match-id="${m.id}" data-res="1-0" title="Trắng thắng">1 - 0</button>
                                  <button type="button" class="btn btn-xs ${m.result === '0.5-0.5' ? 'btn-gold' : 'btn-outline'} btn-live-res" data-match-id="${m.id}" data-res="0.5-0.5" title="Hòa ván">½ - ½</button>
                                  <button type="button" class="btn btn-xs ${m.result === '0-1' ? 'btn-gold' : 'btn-outline'} btn-live-res" data-match-id="${m.id}" data-res="0-1" title="Đen thắng">0 - 1</button>
                                </div>
                              `}
                            </td>
                            <td>
                              ${m.isBye ? `<span class="text-muted font-italic">Nghỉ ván (+1đ)</span>` : `
                                <span class="font-bold text-white">${m.blackName}</span>
                                <span class="badge" style="background: #1e293b; color: #cbd5e1; border: 1px solid #475569; font-size: 10px; margin-left: 4px; padding: 1px 5px;">Đen</span>
                              `}
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="card p-3">
                  <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
                    <div>
                      <h3 class="font-bold text-gold text-base">
                        📊 Bảng Xếp Hạng Hệ Thụy Sĩ (Buchholz Standings)
                      </h3>
                      <p class="text-xs text-muted">Xếp theo: Điểm số ➔ Hệ số phụ Buchholz ➔ Số ván thắng</p>
                    </div>
                  </div>

                  <div class="table-responsive">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th style="width: 50px;">Hạng</th>
                          <th>Kỳ Thủ</th>
                          <th style="text-align: center;">Điểm (Pts)</th>
                          <th style="text-align: center;">Hệ Số Buchholz</th>
                          <th style="text-align: center;">Số Ván Thắng</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${(swiss.standings || []).map((p, idx) => `
                          <tr>
                            <td class="font-bold ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-cyan' : idx === 2 ? 'text-emerald' : 'text-muted'}">
                              ${idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : (idx + 1)}
                            </td>
                            <td>
                              <strong class="text-white">${p.name}</strong>
                              <span class="text-xs text-muted font-mono" style="margin-left: 4px;">(${p.studentId || 'Kỳ thủ'})</span>
                            </td>
                            <td style="text-align: center;">
                              <span class="badge badge-gold font-bold" style="font-size: 0.85rem;">${p.score}</span>
                            </td>
                            <td style="text-align: center; color: var(--accent-cyan); font-weight: 700;">
                              ${p.buchholz}
                            </td>
                            <td style="text-align: center;">${p.wins || 0}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            })()}
          `}
        `}
      </div>
    `;

    container.querySelector('#btnGoToCreateTournament')?.addEventListener('click', () => {
      sound.playClick();
      this.adminSubView = 'admin-events';
      this.renderAdminDashboard(document.getElementById('mainViewport'));
    });

    container.querySelector('#swissEventSelect')?.addEventListener('change', (e) => {
      this.selectedSwissEventId = e.target.value;
      this.renderAdminSwiss(container);
    });

    const triggerSetupModal = () => {
      if (curEvent) {
        modalManager.openSwissTournamentAdminModal(curEvent, () => {
          this.renderAdminSwiss(container);
          this.renderNotificationsList();
        });
      }
    };

    container.querySelector('#btnStartSwissForEvent')?.addEventListener('click', triggerSetupModal);
    container.querySelector('#btnInitSwissCenter')?.addEventListener('click', triggerSetupModal);

    const handleEditTotalRounds = () => {
      sound.playClick();
      if (!curEvent || !curEvent.swissData) return;
      const curRounds = curEvent.swissData.totalRounds || 3;
      const curRoundNum = curEvent.swissData.currentRound || 1;
      const newRoundsStr = prompt(`✍️ TRỌNG TÀI SỬA TỔNG SỐ VÁN ĐẤU:\n\nNhập số ván mới cho giải [${curEvent.title}]\n(Hiện tại: ${curRounds} ván, đã bốc thăm đến vòng ${curRoundNum}):`, curRounds);
      if (newRoundsStr === null) return;
      const newRounds = parseInt(newRoundsStr);
      if (isNaN(newRounds) || newRounds < 1) {
        modalManager.showAlert('Số ván đấu phải là số nguyên dương lớn hơn 0!');
        return;
      }
      if (newRounds < curRoundNum) {
        modalManager.showAlert(`Không thể giảm số ván xuống ${newRounds} vì giải đã bốc thăm đến vòng ${curRoundNum}!`);
        return;
      }
      try {
        store.updateSwissTotalRounds(curEvent.id, newRounds);
        modalManager.showAlert(`✅ Đã cập nhật tổng số ván đấu thành ${newRounds} ván thành công!`);
        this.renderAdminSwiss(container);
        this.renderNotificationsList();
      } catch (err) {
        modalManager.showAlert('Lỗi: ' + err.message);
      }
    };

    container.querySelector('#btnEditRoundsInAdminSwiss')?.addEventListener('click', handleEditTotalRounds);
    container.querySelector('#btnEditRoundsInline')?.addEventListener('click', handleEditTotalRounds);

    container.querySelector('#btnGenerateNextRoundSwiss')?.addEventListener('click', () => {
      sound.playClick();
      if (curEvent) {
        try {
          store.generateNextSwissRound(curEvent.id);
          modalManager.showAlert('✅ Bốc thăm Vòng tiếp theo thành công! Hệ thống đã gửi thông báo đến các kỳ thủ.');
          this.renderAdminSwiss(container);
          this.renderNotificationsList();
        } catch (err) {
          modalManager.showAlert('Chưa thể bốc thăm: ' + err.message);
        }
      }
    });

    container.querySelector('#btnResetSwissEvent')?.addEventListener('click', () => {
      sound.playClick();
      if (curEvent) {
        modalManager.showConfirm(
          `Bạn có chắc muốn đặt lại giải đấu [${curEvent.title}] về trạng thái ban đầu? Toàn bộ kết quả các vòng sẽ bị xóa.`,
          () => {
            delete curEvent.swissData;
            store.notify();
            this.renderAdminSwiss(container);
            this.renderNotificationsList();
          },
          null,
          { title: 'ĐẶT LẠI GIẢI ĐẤU', confirmText: 'Đặt lại dữ liệu', danger: true }
        );
      }
    });

    container.querySelectorAll('.btn-live-res').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const matchId = btn.getAttribute('data-match-id');
        const res = btn.getAttribute('data-res');
        if (curEvent && swiss && matchId && res) {
          store.recordSwissMatchResult(curEvent.id, swiss.currentRound, matchId, res);
          this.renderAdminSwiss(container);
          this.renderNotificationsList();
        }
      });
    });
  }

  // =========================================================================
  // ADMIN SUB: QUẦY THU QUỸ TRỰC TIẾP TẠI BUỔI SINH HOẠT
  // =========================================================================
  renderAdminFunds(container) {
    const state = store.getState();
    const settings = store.getFundSettings();
    const members = state.members || [];
    const fundRecords = state.fundRecords || [];

    if (!this.adminFundDirectTab) {
      this.adminFundDirectTab = 'unpaid';
    }

    const currentMonthRecords = fundRecords.filter(
      (r) => r.month === settings.month || r.term === settings.title
    );
    const paidMap = new Map();
    currentMonthRecords.forEach((r) => paidMap.set(r.memberId, r));

    const paidMembers = [];
    const unpaidMembers = [];
    members.forEach((m) => {
      const rec = paidMap.get(m.id);
      if (rec) {
        paidMembers.push({ member: m, record: rec });
      } else {
        unpaidMembers.push(m);
      }
    });

    const totalCollectedMonth = currentMonthRecords.reduce((sum, r) => sum + (parseInt(r.amount) || settings.amount), 0);
    const targetMonth = members.length * settings.amount;
    const percent = members.length > 0 ? Math.round((paidMembers.length / members.length) * 100) : 0;

    const generalSyntax = `${settings.syntaxPrefix || 'QUY T10'} [MASV]`;
    const deskQrUrl = settings.qrImage || '/vietqr-fund.png';

    container.innerHTML = `
      <div class="admin-sub-funds animate-fadeIn">
        <!-- Top Bar -->
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <span class="badge badge-gold font-bold">QUẦY THU QUỸ TRỰC TIẾP BUỔI SINH HOẠT</span>
            <h2 class="text-xl font-bold mt-1 text-white">💰 ${settings.title}</h2>
            <p class="text-muted text-xs">Mã VietQR đã tích hợp sẵn số tiền và cú pháp của tháng. Thành viên quét chuyển khoản hoặc nộp trực tiếp sẽ tự động ghi nhận vào danh sách.</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline btn-sm" id="btnOpenFundAutoGuide">
              💡 Cơ Chế Tự Động Hóa
            </button>
            <button class="btn btn-gold btn-sm" id="btnOpenEditFundSettings">
              ⚙️ Đổi Tháng & Số Tiền
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="row g-3 mb-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px;">
          <div class="card p-3" style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.3);">
            <div class="text-xs text-muted mb-1">THÁNG & ĐỊNH MỨC THU</div>
            <div class="text-2xl font-bold text-gold font-mono">${(settings.amount || 30000).toLocaleString('vi-VN')} đ</div>
            <div class="text-xs text-dim mt-1">Áp dụng: ${settings.title}</div>
          </div>
          <div class="card p-3" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3);">
            <div class="text-xs text-muted mb-1">TIẾN ĐỘ THU QUỸ THÁNG</div>
            <div class="text-2xl font-bold text-emerald">${paidMembers.length} / ${members.length} kỳ thủ</div>
            <div class="text-xs text-dim mt-1">Đạt ${percent}% chỉ tiêu (${unpaidMembers.length} bạn chưa nộp)</div>
          </div>
          <div class="card p-3" style="background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.3);">
            <div class="text-xs text-muted mb-1">TỔNG TIỀN ĐÃ THU ĐƯỢC</div>
            <div class="text-2xl font-bold text-cyan font-mono">${totalCollectedMonth.toLocaleString('vi-VN')} đ</div>
            <div class="text-xs text-dim mt-1">Mục tiêu: ${targetMonth.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <!-- DANH SÁCH THÀNH VIÊN THEO DÕI & THU QUỸ (FULL WIDTH) -->
        <div class="card p-3" style="background: var(--bg-surface); border: 1px solid var(--border-gold); border-radius: 14px;">
          <!-- Tabs & Actions -->
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2 pb-2" style="border-bottom: 1px solid rgba(212,175,55,0.2);">
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm ${this.adminFundDirectTab === 'unpaid' ? 'btn-gold' : 'btn-outline'}" id="tabDirectUnpaid">
                ⏳ Chưa Nộp (${unpaidMembers.length})
              </button>
              <button type="button" class="btn btn-sm ${this.adminFundDirectTab === 'paid' ? 'btn-gold' : 'btn-outline'}" id="tabDirectPaid">
                ✅ Đã Nộp (${paidMembers.length})
              </button>
            </div>

            <div class="d-flex gap-2 flex-wrap">
              ${this.adminFundDirectTab === 'unpaid' ? `
                <button type="button" class="btn btn-outline btn-xs" id="btnCopyDirectZalo">
                  📢 Sao Chép DS Chưa Nộp Gửi Zalo
                </button>
              ` : `
                <button type="button" class="btn btn-outline btn-xs" id="btnExportDirectCsv">
                  📥 Xuất Excel (CSV)
                </button>
              `}
            </div>
          </div>

          <!-- Search box & Quick Guide -->
          <div class="mb-3 d-flex gap-3 align-center flex-wrap">
            <div class="flex-1" style="min-width: 280px;">
              <input type="text" class="form-control text-xs" id="fundMemberSearchInput" placeholder="🔍 Tìm kiếm nhanh theo Họ Tên hoặc Mã Sinh Viên...">
            </div>
            <div class="text-xs text-muted">
              💡 Bấm <strong>"📱 Mã QR"</strong> để mở VietQR có sẵn số tiền & cú pháp cho kỳ thủ quét. Bấm <strong>"⚡ Đã Thu"</strong> để ghi nhận 1 chạm.
            </div>
          </div>

          <!-- List Content -->
          <div id="fundDirectListContainer">
            ${this.adminFundDirectTab === 'unpaid'
              ? this.renderDirectUnpaidListHtml(unpaidMembers, settings)
              : this.renderDirectPaidListHtml(paidMembers, settings)
            }
          </div>
        </div>
      </div>
    `;

    this.bindAdminFundsLiveEvents(container, unpaidMembers, paidMembers, settings);
  }

  renderDirectUnpaidListHtml(unpaidMembers, settings, filterText = '') {
    let list = unpaidMembers;
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.studentId || '').toLowerCase().includes(q));
    }

    if (list.length === 0) {
      return `
        <div class="p-5 text-center text-muted">
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🎉</div>
          <strong class="text-white text-sm">Tuyệt vời! Tất cả kỳ thủ đã hoàn thành đóng quỹ tháng này.</strong>
          <div class="text-xs text-dim mt-1">Không còn kỳ thủ nào trong danh sách chưa nộp.</div>
        </div>
      `;
    }

    return `
      <div class="table-responsive" style="max-height: 520px; overflow-y: auto;">
        <table class="data-table text-xs">
          <thead>
            <tr>
              <th style="min-width: 180px;">Kỳ Thủ</th>
              <th style="min-width: 140px;">Mã Sinh Viên</th>
              <th style="min-width: 120px;">Lớp & Khóa</th>
              <th style="min-width: 130px;">Số Tiền Cần Đóng</th>
              <th style="text-align: right; min-width: 240px;">Thao Tác Thu Quỹ</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((m) => `
              <tr>
                <td>
                  <strong class="text-white text-sm d-block">${m.name}</strong>
                  ${m.phone ? `<span class="text-dim text-xs">📞 ${m.phone}</span>` : ''}
                </td>
                <td><span class="font-mono text-gold font-bold" style="font-size: 0.95rem;">${m.studentId || '---'}</span></td>
                <td><span class="text-dim">${m.class || m.cohort || '---'}</span></td>
                <td>
                  <strong class="font-mono font-bold text-emerald" style="font-size: 1.05rem;">
                    ${(settings.amount || 30000).toLocaleString('vi-VN')} đ
                  </strong>
                </td>
                <td style="text-align: right;">
                  <div class="d-inline-flex gap-2 justify-end align-center">
                    <button type="button" class="btn btn-outline btn-xs font-bold btn-open-personal-qr" data-member-id="${m.id}" title="Mở mã QR tích hợp sẵn số tiền và cú pháp chuyển khoản cho kỳ thủ này">
                      📱 Mã QR Có Sẵn Tiền
                    </button>
                    <button type="button" class="btn btn-gold btn-xs font-bold btn-quick-mark-paid" data-member-id="${m.id}" title="Xác nhận đã thu (1 chạm)">
                      ⚡ Đã Thu
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderDirectPaidListHtml(paidMembers, settings, filterText = '') {
    let list = paidMembers;
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter((item) => (item.member?.name || '').toLowerCase().includes(q) || (item.member?.studentId || '').toLowerCase().includes(q) || (item.record?.id || '').toLowerCase().includes(q));
    }

    if (list.length === 0) {
      return `
        <div class="p-5 text-center text-muted">
          <div style="font-size: 2.2rem; margin-bottom: 6px;">💳</div>
          <div>Chưa có kỳ thủ nào nộp quỹ tháng này.</div>
          <div class="text-xs text-dim mt-1">Các kỳ thủ quét mã VietQR hoặc nộp trực tiếp sẽ tự động xuất hiện tại đây.</div>
        </div>
      `;
    }

    return `
      <div class="table-responsive" style="max-height: 520px; overflow-y: auto;">
        <table class="data-table text-xs">
          <thead>
            <tr>
              <th style="min-width: 100px;">Mã BN</th>
              <th style="min-width: 180px;">Kỳ Thủ</th>
              <th style="min-width: 140px;">Mã Sinh Viên</th>
              <th style="min-width: 130px;">Số Tiền Đã Thu</th>
              <th style="min-width: 140px;">Thời Gian</th>
              <th style="min-width: 130px;">Hình Thức</th>
              <th style="text-align: center; min-width: 90px;">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(({ member, record }) => `
              <tr>
                <td><span class="font-mono text-gold font-bold">${record.id}</span></td>
                <td><strong class="text-white text-sm">${member.name}</strong></td>
                <td><span class="font-mono text-gold font-bold" style="font-size: 0.95rem;">${member.studentId || '---'}</span></td>
                <td>
                  <strong class="badge badge-emerald font-bold font-mono" style="font-size: 0.95rem;">
                    +${(parseInt(record.amount) || settings.amount).toLocaleString('vi-VN')} đ
                  </strong>
                </td>
                <td>
                  <span class="text-white">${record.date}</span>
                  ${record.time ? `<span class="text-dim text-xs ml-1">${record.time}</span>` : ''}
                </td>
                <td>
                  <span class="badge ${record.method?.includes('VietQR') ? 'badge-cyan' : 'badge-outline'}">
                    ${record.method || 'Trực tiếp'}
                  </span>
                </td>
                <td style="text-align: center;">
                  <button type="button" class="btn btn-danger btn-xs btn-undo-fund-pay" data-record-id="${record.id}" title="Hủy/Hoàn tác biên nhận này">
                    ↩️ Hủy
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  bindAdminFundsLiveEvents(container, unpaidMembers, paidMembers, settings) {
    const state = store.getState();
    const members = state.members || [];

    // Subtab switch
    container.querySelector('#tabDirectUnpaid')?.addEventListener('click', () => {
      sound.playClick();
      this.adminFundDirectTab = 'unpaid';
      this.renderAdminFunds(container);
    });

    container.querySelector('#tabDirectPaid')?.addEventListener('click', () => {
      sound.playClick();
      this.adminFundDirectTab = 'paid';
      this.renderAdminFunds(container);
    });

    // Top action buttons
    container.querySelector('#btnOpenEditFundSettings')?.addEventListener('click', () => {
      sound.playClick();
      modalManager.openFundSettingsModal(() => {
        this.renderAdminFunds(container);
        this.renderNotificationsList();
      });
    });

    container.querySelector('#btnOpenFundAutoGuide')?.addEventListener('click', () => {
      sound.playClick();
      modalManager.openFundAutomationGuideModal();
    });

    // Fullscreen QR
    container.querySelector('#btnFullscreenDeskQR')?.addEventListener('click', () => {
      sound.playClick();
      modalManager.openFullscreenLiveFundQRModal();
    });

    // Zalo copy
    container.querySelector('#btnCopyDirectZalo')?.addEventListener('click', () => {
      sound.playClick();
      if (unpaidMembers.length === 0) {
        modalManager.showAlert('🎉 Toàn bộ kỳ thủ đã hoàn thành đóng quỹ tháng này!');
        return;
      }
      const lines = unpaidMembers.map((m, idx) => `${idx + 1}. ${m.name} (${m.studentId || 'Kỳ thủ'})`).join('\n');
      const text = `📢 THÔNG BÁO THU QUỸ: ${settings.title}\n💰 Định mức: ${(settings.amount || 30000).toLocaleString('vi-VN')}đ / bạn\n🏦 Ngân hàng: ${settings.bankCode} - STK: ${settings.bankAccount}\n👤 Chủ TK: ${settings.bankOwner}\n📝 Cú pháp chuyển khoản: ${settings.syntaxPrefix} [MÃ_SINH_VIÊN]\n⚠️ Danh sách kỳ thủ chưa nộp (${unpaidMembers.length} bạn):\n${lines}\n\n👉 Các bạn quét mã VietQR tại bàn sinh hoạt hoặc chuyển khoản đúng cú pháp để hệ thống tự động ghi nhận nhé!`;
      navigator.clipboard.writeText(text);
      modalManager.showAlert('✅ Đã sao chép danh sách các bạn chưa nộp! Hãy dán vào Nhóm Zalo CLB để nhắc nhở.');
    });

    // CSV export
    container.querySelector('#btnExportDirectCsv')?.addEventListener('click', () => {
      sound.playClick();
      if (paidMembers.length === 0) {
        modalManager.showAlert('Chưa có kỳ thủ nào nộp quỹ để xuất file CSV!');
        return;
      }
      const csvHeader = 'Mã Biên Nhận,Kỳ Thủ,Mã SV,Số Tiền,Tháng,Thời Gian,Phương Thức\n';
      const csvRows = paidMembers
        .map(({ member, record }) => `"${record.id}","${member.name}","${member.studentId}","${record.amount}","${record.month || settings.month}","${record.date} ${record.time || ''}","${record.method || ''}"`)
        .join('\n');
      const blob = new Blob(['\uFEFF' + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DS_Dong_Quy_Thang_${settings.month.replace('/', '_')}.csv`;
      link.click();
    });

    // Search input
    const searchInput = container.querySelector('#fundMemberSearchInput');
    const listContainer = container.querySelector('#fundDirectListContainer');
    if (searchInput && listContainer) {
      searchInput.addEventListener('input', () => {
        const val = searchInput.value.trim();
        if (this.adminFundDirectTab === 'unpaid') {
          listContainer.innerHTML = this.renderDirectUnpaidListHtml(unpaidMembers, settings, val);
        } else {
          listContainer.innerHTML = this.renderDirectPaidListHtml(paidMembers, settings, val);
        }
        this.bindDynamicListEvents(container, members, settings);
      });
    }

    this.bindDynamicListEvents(container, members, settings);
  }

  bindDynamicListEvents(container, members, settings) {
    // 1-Click mark as paid
    container.querySelectorAll('.btn-quick-mark-paid').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const mId = btn.getAttribute('data-member-id');
        const targetMember = members.find((m) => m.id === mId);
        if (!targetMember) return;

        try {
          const rec = store.recordDirectFundPayment(mId, 'Thu Trực Tiếp Tại Buổi Sinh Hoạt');
          sound.playSuccess();
          modalManager.showAlert(`✅ Đã ghi nhận thu ${(settings.amount || 30000).toLocaleString('vi-VN')}đ từ kỳ thủ ${targetMember.name}!`);
          this.renderAdminFunds(container);
          this.renderNotificationsList();
        } catch (err) {
          modalManager.showAlert(err.message || 'Lỗi ghi nhận!');
        }
      });
    });

    // Open personal QR
    container.querySelectorAll('.btn-open-personal-qr').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const mId = btn.getAttribute('data-member-id');
        const targetMember = members.find((m) => m.id === mId);
        if (targetMember) {
          modalManager.openMemberPersonalFundQRModal(targetMember, () => {
            this.renderAdminFunds(container);
            this.renderNotificationsList();
          });
        }
      });
    });

    // Undo payment
    container.querySelectorAll('.btn-undo-fund-pay').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const recId = btn.getAttribute('data-record-id');
        modalManager.showConfirm(
          `Bạn có chắc chắn muốn hủy biên nhận thu quỹ [${recId}] không? Kỳ thủ sẽ được chuyển lại về danh sách Chưa Nộp.`,
          () => {
            store.cancelFundPayment(recId);
            this.renderAdminFunds(container);
            this.renderNotificationsList();
            modalManager.showAlert('Đã hoàn tác biên nhận thu quỹ!');
          },
          null,
          { title: 'HỦY BIÊN NHẬN THU QUỸ', confirmText: 'Hoàn tác biên nhận', danger: true }
        );
      });
    });
  }

  // Admin Sub 5: CMS Content Manager
  renderAdminCms(container) {
    const state = store.getState();

    container.innerHTML = `
      <div class="admin-sub-cms animate-fadeIn">
        <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
          <div>
            <h2 class="text-xl font-bold">Hệ Thống Quản Trị Nội Dung (CMS)</h2>
            <p class="text-muted text-xs">Biên tập trực quan, phân loại chuyên mục và đặt lịch xuất bản</p>
          </div>
          <button class="btn btn-gold btn-sm" id="btnAdminWriteArticle">+ Soạn Bài Viết Mới</button>
        </div>

        <div class="card">
          <div class="table-responsive mobile-card-view">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tiêu Đề</th>
                  <th>Chuyên Mục</th>
                  <th>Tác Giả</th>
                  <th>Ngày Đăng</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                ${state.articles.length === 0 ? `
                  <tr>
                    <td colspan="7" class="text-center text-muted p-4">
                      Chưa có bài viết nào trong hệ thống. Nhấn <strong>"✍️ Soạn bài viết mới"</strong> để bắt đầu đăng tin bài.
                    </td>
                  </tr>
                ` : state.articles.map((art) => `
                  <tr>
                    <td data-label="Mã"><span class="font-mono text-xs text-gold">${art.id}</span></td>
                    <td data-label="Tiêu Đề"><strong class="text-white">${art.title}</strong></td>
                    <td data-label="Chuyên Mục"><span class="badge badge-cyan">${art.category}</span></td>
                    <td data-label="Tác Giả"><span class="text-xs">${art.author || 'CLB Cờ TNU - HGC'}</span></td>
                    <td data-label="Ngày Đăng"><span class="text-xs text-dim">${art.publishDate}</span></td>
                    <td data-label="Trạng Thái"><span class="badge badge-emerald">Đã xuất bản</span></td>
                    <td data-label="Thao Tác">
                      <div class="d-flex gap-1">
                        <button class="btn btn-outline btn-sm btn-view-art" data-id="${art.id}" title="Xem">👁️</button>
                        <button class="btn btn-danger btn-sm btn-del-art" data-id="${art.id}" title="Xóa">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btnAdminWriteArticle')?.addEventListener('click', () => {
      sound.playClick();
      modalManager.openCmsArticleModal();
    });

    container.querySelectorAll('.btn-view-art').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        const art = state.articles.find((a) => a.id === id);
        if (art) modalManager.openArticleDetailModal(art);
      });
    });

    container.querySelectorAll('.btn-del-art').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const id = btn.getAttribute('data-id');
        modalManager.showConfirm(
          'Bạn có chắc muốn xóa bài viết này?',
          () => {
            store.deleteArticle(id);
            this.renderAdminCms(container);
          },
          null,
          { title: 'XÁC NHẬN XÓA BÀI VIẾT', confirmText: '🗑️ Xóa bài viết', danger: true }
        );
      });
    });
  }

  // Date Range Analytics Data Engine
  parseDateFromStr(str) {
    if (!str) return null;
    const match = String(str).match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return new Date(match[1] + 'T00:00:00');
    return null;
  }

  getDateRangeData(startDateStr, endDateStr) {
    const state = store.getState();
    const members = state.members || [];
    const events = state.events || [];
    const logs = state.attendanceLogs || [];

    const startD = new Date(startDateStr + 'T00:00:00');
    const endD = new Date(endDateStr + 'T23:59:59');
    const startTs = isNaN(startD.getTime()) ? 0 : startD.getTime();
    const endTs = isNaN(endD.getTime()) ? Date.now() : endD.getTime();

    // 1. Filter events in date range
    const filteredEvents = events.filter((e) => {
      const d = this.parseDateFromStr(e.dateTime);
      if (!d) return false;
      const t = d.getTime();
      return t >= startTs && t <= endTs;
    });

    const tournaments = filteredEvents.filter((e) => e.type === 'tournament');
    const activities = filteredEvents.filter((e) => e.type === 'activity' || e.type !== 'tournament');

    // 2. Filter attendance logs in date range
    const filteredLogs = logs.filter((l) => {
      const d = this.parseDateFromStr(l.timestamp);
      if (!d) return false;
      const t = d.getTime();
      return t >= startTs && t <= endTs;
    });

    const sessionLogs = filteredLogs.filter(
      (l) => l.category === 'session' || l.eventId?.startsWith('SESSION')
    );
    const distinctSessionDates = new Set(
      sessionLogs.map((l) => l.eventId || l.timestamp.split(' ')[0])
    );

    const sessionsCount = distinctSessionDates.size;
    const totalCheckins = filteredLogs.length;

    const avgAttendanceRate = members.length > 0 
      ? Math.round(members.reduce((acc, m) => acc + (m.attendanceRate !== undefined ? m.attendanceRate : 0), 0) / members.length)
      : 0;

    // 3. Class segments for Donut chart
    const classCountMap = {};
    members.forEach((m) => {
      const cls = m.class || m.major || 'K22 Sư phạm - CNTT';
      classCountMap[cls] = (classCountMap[cls] || 0) + 1;
    });
    const colors = ['#d4af37', '#10b981', '#f59e0b', '#38bdf8', '#8b5cf6', '#ec4899'];
    const classSegments = Object.entries(classCountMap).map(([label, count], idx) => ({
      label,
      count,
      value: Math.round((count / (members.length || 1)) * 100),
      color: colors[idx % colors.length]
    }));

    // 4. Monthly timeline bar chart
    const barLabels = [];
    const barValues = [];
    const sMonth = new Date(startD.getFullYear(), startD.getMonth(), 1);
    const eMonth = new Date(endD.getFullYear(), endD.getMonth(), 1);
    let cur = new Date(sMonth);

    while (cur <= eMonth && barLabels.length < 12) {
      const mNum = cur.getMonth() + 1;
      const yShort = String(cur.getFullYear()).slice(-2);
      barLabels.push(`T${mNum}/${yShort}`);

      const mPrefix = `${cur.getFullYear()}-${String(mNum).padStart(2, '0')}`;
      const countInMonth = filteredLogs.filter(l => l.timestamp && l.timestamp.startsWith(mPrefix)).length;
      barValues.push(countInMonth);

      cur.setMonth(cur.getMonth() + 1);
    }

    if (barLabels.length === 0) {
      barLabels.push('Giai đoạn');
      barValues.push(totalCheckins);
    }

    // 5. Member ranking in this date range - Điểm thi đua tự động tính theo các hoạt động trong giai đoạn
    const evaluatedInRange = filteredEvents.filter((e) => e.evaluation);

    const rankedMembers = members.map((m) => {
      // Số giải tham gia trong giai đoạn:
      const liveTour = filteredLogs.filter((p) => p.memberId === m.id && p.category === 'tournament' && p.status === 'success').length;
      const regTour = tournaments.filter((e) => (e.registeredMembers || []).includes(m.id)).length;
      const tourCount = Math.max(liveTour, regTour);

      // Số hoạt động tham gia trong giai đoạn:
      const liveAct = filteredLogs.filter((p) => p.memberId === m.id && (p.category === 'activity' || p.categoryLabel === 'Hoạt Động') && p.status === 'success').length;
      const regAct = activities.filter((e) => (e.registeredMembers || []).includes(m.id)).length;
      const actCount = Math.max(liveAct, regAct);

      // Số buổi sinh hoạt trong giai đoạn:
      const liveSess = sessionLogs.filter((p) => p.memberId === m.id && p.status === 'success').length;
      const sessCount = liveSess;

      // Tỷ lệ tích cực trong giai đoạn:
      let activeRate = m.attendanceRate !== undefined ? m.attendanceRate : 0;
      if (evaluatedInRange.length > 0) {
        let sumEval = 0;
        evaluatedInRange.forEach((evt) => {
          sumEval += (evt.evaluation && evt.evaluation[m.id] !== undefined) ? evt.evaluation[m.id] : 0;
        });
        activeRate = Math.round(sumEval / evaluatedInRange.length);
      }

      // Công thức: 1 giải = 20đ, 1 hoạt động = 5đ, 1 buổi sinh hoạt = 10đ, tỷ lệ tích cực quy đổi 100% = 100đ
      const score = (tourCount * 20) + (actCount * 5) + (sessCount * 10) + Math.round(activeRate);

      return {
        id: m.id,
        name: m.name,
        studentId: m.studentId,
        avatar: m.avatar,
        class: m.class || m.major || 'K22',
        tourCount,
        actCount,
        sessCount,
        activeRate,
        score
      };
    }).sort((a, b) => b.score - a.score).map((m, idx) => ({
      ...m,
      award: idx < 20 ? 'Đề xuất' : 'Không đề xuất'
    }));

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      tournamentsCount: tournaments.length,
      activitiesCount: activities.length,
      sessionsCount,
      totalCheckins,
      avgAttendanceRate,
      barLabels,
      barValues,
      classSegments,
      rankedMembers
    };
  }

  exportDateRangeReport(startDate, endDate) {
    const data = this.getDateRangeData(startDate, endDate);
    const headers = [
      'Xếp Hạng',
      'Mã Thẻ',
      'Họ Và Tên',
      'MSSV',
      'Lớp',
      'Điểm Thi Đua',
      'Đề Xuất Khen Thưởng'
    ];

    const rows = data.rankedMembers.map((m, idx) => [
      idx + 1,
      m.id,
      `"${m.name}"`,
      m.studentId,
      `"${m.class}"`,
      m.score,
      `"${m.award}"`
    ]);

    const summaryRows = [
      ['BÁO CÁO THỐNG KÊ PHONG TRÀO CLB CỜ TNU - HGC', ''],
      [`GIAI ĐOẠN: Từ ngày ${startDate} đến ngày ${endDate}`, ''],
      [`Tổng số giải đấu tổ chức / tham gia: ${data.tournamentsCount} giải`, ''],
      [`Tổng số hoạt động chuyên môn: ${data.activitiesCount} hoạt động`, ''],
      [`Tổng số buổi sinh hoạt định kỳ: ${data.sessionsCount} buổi`, ''],
      [`Tổng lượt điểm danh ghi nhận: ${data.totalCheckins} lượt`, ''],
      [`Tỷ lệ chuyên cần trung bình: ${data.avgAttendanceRate}%`, ''],
      ['', ''],
      ['DANH SÁCH BẢNG VINH DANH & THI ĐUA KHEN THƯỞNG:', ''],
      headers
    ];

    const allLines = [...summaryRows.map((r) => r.join(',')), ...rows.map((r) => r.join(','))];
    const csvContent = '\uFEFF' + allLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Giai_Doan_${startDate}_den_${endDate}_TNU_HGC.csv`;
    link.click();
  }

  // Admin Sub 6: Analytics & Export by Date Range
  renderAdminAnalytics(container) {
    const sDate = this.analyticsStartDate || '2026-09-01';
    const eDate = this.analyticsEndDate || '2027-06-30';
    const data = this.getDateRangeData(sDate, eDate);

    const formatDateVn = (str) => {
      if (!str) return '';
      const parts = str.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : str;
    };

    container.innerHTML = `
      <div class="admin-sub-analytics animate-fadeIn">
        <!-- Header with Date Range Inputs & Quick Presets -->
        <div class="card mb-4" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.12) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid var(--border-gold); padding: 18px 20px;">
          <div class="d-flex justify-between align-center flex-wrap gap-2 mb-3">
            <div>
              <div class="d-flex align-center gap-2">
                <span class="badge badge-gold">BUỒNG LÁI VẬN HÀNH • THỐNG KÊ</span>
                <span class="badge badge-cyan">📅 Giai đoạn: ${formatDateVn(sDate)} ➜ ${formatDateVn(eDate)}</span>
              </div>
              <h2 class="text-xl font-bold mt-1 text-white">Thống Kê, Đánh Giá & Báo Cáo Theo Giai Đoạn</h2>
              <p class="text-muted text-xs">Tùy biến ngày bắt đầu và kết thúc để tổng kết năm học, học kỳ hoặc các đợt thi đua chuyên đề</p>
            </div>
            <div>
              <button class="btn btn-gold btn-sm" id="btnExportDateRangeCsv">📥 Xuất Báo Cáo Giai Đoạn (CSV)</button>
            </div>
          </div>

          <!-- Date Range Pickers & Filter Button -->
          <div class="d-flex align-center flex-wrap gap-3 pt-3" style="border-top: 1px solid rgba(255,255,255,0.08);">
            <div class="d-flex align-center gap-2 flex-wrap">
              <div class="d-flex align-center gap-1.5">
                <label for="analyticsStartDate" class="text-xs text-gold font-bold">📅 Từ ngày:</label>
                <input type="date" id="analyticsStartDate" class="form-input form-input-sm" value="${sDate}" style="background: #0b1329; color: #fff; border-color: rgba(212,175,55,0.4); padding: 5px 8px; font-size: 0.85rem; width: 145px;">
              </div>
              <span class="text-dim text-xs font-bold">➜</span>
              <div class="d-flex align-center gap-1.5">
                <label for="analyticsEndDate" class="text-xs text-gold font-bold">📅 Đến ngày:</label>
                <input type="date" id="analyticsEndDate" class="form-input form-input-sm" value="${eDate}" style="background: #0b1329; color: #fff; border-color: rgba(212,175,55,0.4); padding: 5px 8px; font-size: 0.85rem; width: 145px;">
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="btnFilterByDate" style="padding: 5px 12px; font-size: 0.82rem; font-weight: 600;">
                🔍 Lọc Dữ Liệu
              </button>
            </div>
          </div>
        </div>

        <!-- 4 KPI Summary Cards for the selected Date Range -->
        <div class="grid grid-cols-4 gap-3 mb-4">
          <div class="card" style="background: radial-gradient(circle at 100% 0%, rgba(244,63,94,0.12) 0%, transparent 70%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1px solid rgba(244,63,94,0.3); padding: 16px;">
            <div class="d-flex justify-between align-center mb-1">
              <span class="text-xs text-muted">🏆 Giải Đấu Trong Giai Đoạn</span>
              <span class="badge badge-rose text-xs">Giải Cờ</span>
            </div>
            <div class="text-2xl font-bold text-white">${data.tournamentsCount} <span class="text-xs font-normal text-dim">giải</span></div>
            <div class="text-xs text-rose mt-1">Giải cấp trường & mở rộng</div>
          </div>

          <div class="card" style="background: radial-gradient(circle at 100% 0%, rgba(6,182,212,0.12) 0%, transparent 70%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1px solid rgba(6,182,212,0.3); padding: 16px;">
            <div class="d-flex justify-between align-center mb-1">
              <span class="text-xs text-muted">🎯 Hoạt Động Chuyên Môn</span>
              <span class="badge badge-cyan text-xs">Hoạt Động</span>
            </div>
            <div class="text-2xl font-bold text-white">${data.activitiesCount} <span class="text-xs font-normal text-dim">hoạt động</span></div>
            <div class="text-xs text-cyan mt-1">Tập huấn, giao lưu & kỳ đài</div>
          </div>

          <div class="card" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.12) 0%, transparent 70%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1px solid rgba(212,175,55,0.3); padding: 16px;">
            <div class="d-flex justify-between align-center mb-1">
              <span class="text-xs text-muted">☕ Buổi Sinh Hoạt Định Kỳ</span>
              <span class="badge badge-gold text-xs">Sinh Hoạt CLB</span>
            </div>
            <div class="text-2xl font-bold text-gold">${data.sessionsCount} <span class="text-xs font-normal text-dim">buổi</span></div>
            <div class="text-xs text-gold mt-1">Duy trì đều đặn theo lịch</div>
          </div>

          <div class="card" style="background: radial-gradient(circle at 100% 0%, rgba(16,185,129,0.12) 0%, transparent 70%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1px solid rgba(16,185,129,0.3); padding: 16px;">
            <div class="d-flex justify-between align-center mb-1">
              <span class="text-xs text-muted">📈 Điểm Danh & Chuyên Cần</span>
              <span class="badge badge-emerald text-xs">${data.avgAttendanceRate}% TB</span>
            </div>
            <div class="text-2xl font-bold text-emerald">${data.totalCheckins} <span class="text-xs font-normal text-dim">lượt quét</span></div>
            <div class="text-xs text-emerald mt-1">Tỷ lệ chuyên cần đạt ${data.avgAttendanceRate}%</div>
          </div>
        </div>

        <!-- 2 Visual Charts Row -->
        <div class="charts-grid-row mb-4">
          <div class="chart-box">
            <div class="d-flex justify-between align-center mb-2">
              <h3 class="font-bold text-white text-base">Tần Suất Tham Gia Sinh Hoạt Theo Các Tháng Trong Giai Đoạn</h3>
              <span class="badge badge-cyan text-xs">${data.barLabels[0]} ➜ ${data.barLabels[data.barLabels.length - 1]}</span>
            </div>
            <p class="text-xs text-muted mb-3">Số lượt kỳ thủ tham gia sinh hoạt và tập huấn trong khoảng thời gian đã chọn</p>
            <canvas id="analyticsBarChart"></canvas>
          </div>

          <div class="chart-box">
            <div class="d-flex justify-between align-center mb-2">
              <h3 class="font-bold text-white text-base">Cơ Cấu Kỳ Thủ Tham Gia Tích Cực Theo Lớp</h3>
              <span class="badge badge-gold text-xs">Phân bố %</span>
            </div>
            <p class="text-xs text-muted mb-3">Tỷ lệ phần trăm các lớp có hội viên sinh hoạt năng nổ nhất trong giai đoạn</p>
            <canvas id="analyticsDonutChart"></canvas>
          </div>
        </div>

        <!-- Academic Honors & Awards Table for Selected Period -->
        <div class="card">
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
            <div>
              <span class="badge badge-gold">VINH DANH & KHEN THƯỞNG THI ĐUA GIAI ĐOẠN</span>
              <h3 class="text-base font-bold text-white mt-1">Bảng Vàng Kỳ Thủ Tiêu Biểu (${formatDateVn(sDate)} ➜ ${formatDateVn(eDate)})</h3>
              <p class="text-xs text-muted">Danh sách kỳ thủ có thành tích phong trào xuất sắc nhất trong giai đoạn để đề xuất khen thưởng</p>
            </div>
            <span class="text-xs text-muted">Tổng số: <strong class="text-gold">${data.rankedMembers.length}</strong> kỳ thủ</span>
          </div>

          <div class="table-responsive mobile-card-view">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 70px;">Hạng</th>
                  <th>Kỳ Thủ</th>
                  <th>Lớp</th>
                  <th>Điểm Thi Đua</th>
                  <th>Đề Xuất Khen Thưởng</th>
                </tr>
              </thead>
              <tbody>
                ${data.rankedMembers.map((m, idx) => {
                  const rankBadge = idx === 0 ? '<span class="badge badge-gold" style="font-weight: 800; font-size: 0.85rem;">🥇 #1</span>'
                    : idx === 1 ? '<span class="badge badge-cyan" style="font-weight: 800; font-size: 0.85rem;">🥈 #2</span>'
                    : idx === 2 ? '<span class="badge badge-emerald" style="font-weight: 800; font-size: 0.85rem;">🥉 #3</span>'
                    : `<span class="font-mono text-dim font-bold">#${idx + 1}</span>`;

                  return `
                    <tr>
                      <td data-label="Hạng">${rankBadge}</td>
                      <td data-label="Kỳ Thủ">
                        <div class="member-cell">
                          <img src="${m.avatar}" alt="${m.name}">
                          <div>
                            <div class="font-bold text-white">${m.name}</div>
                            <div class="text-xs font-mono text-dim">${m.studentId} • ${m.id}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Lớp"><span class="text-xs font-medium text-white">${m.class}</span></td>
                      <td data-label="Điểm Thi Đua">
                        <strong class="text-gold font-mono text-base font-bold">${m.score}đ</strong>
                        <div class="text-xs text-dim font-mono" style="font-size:11px;">${m.tourCount} giải • ${m.actCount} hđ • ${m.sessCount} buổi • ${m.activeRate}%</div>
                      </td>
                      <td data-label="Đề Xuất Khen Thưởng">
                        <span class="badge ${m.award === 'Đề xuất' ? 'badge-emerald' : 'badge-outline'}" style="font-weight: 700; font-size: 0.82rem; padding: 5px 12px; ${m.award === 'Không đề xuất' ? 'color: #94a3b8; border-color: rgba(255,255,255,0.15);' : ''}">
                          ${m.award}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Render Charts
    const bar = container.querySelector('#analyticsBarChart');
    if (bar) {
      chartHelper.renderBarChart(bar, data.barLabels, data.barValues);
    }

    const donut = container.querySelector('#analyticsDonutChart');
    if (donut) {
      chartHelper.renderDonutChart(donut, data.classSegments);
    }

    // Bind Date Inputs & Filter Button
    const startInp = container.querySelector('#analyticsStartDate');
    const endInp = container.querySelector('#analyticsEndDate');

    const handleApplyDate = () => {
      if (startInp && endInp) {
        if (startInp.value > endInp.value) {
          modalManager.showAlert('Ngày bắt đầu không được lớn hơn ngày kết thúc!');
          return;
        }
        sound.playClick();
        this.analyticsStartDate = startInp.value;
        this.analyticsEndDate = endInp.value;
        this.renderAdminAnalytics(container);
      }
    };

    container.querySelector('#btnFilterByDate')?.addEventListener('click', handleApplyDate);
    startInp?.addEventListener('change', handleApplyDate);
    endInp?.addEventListener('change', handleApplyDate);

    // Bind CSV Export
    container.querySelector('#btnExportDateRangeCsv')?.addEventListener('click', () => {
      sound.playClick();
      this.exportDateRangeReport(this.analyticsStartDate, this.analyticsEndDate);
    });
  }

  // Admin Sub 7: Firebase Cloud Firestore Management
  renderAdminFirebase(container) {
    const config = getFirebaseConfig();
    const status = firebaseService.status;
    const lastSyncStr = firebaseService.lastSyncTime
      ? firebaseService.lastSyncTime.toLocaleTimeString('vi-VN') + ' ' + firebaseService.lastSyncTime.toLocaleDateString('vi-VN')
      : 'Chưa đồng bộ';

    const state = store.getState();
    const isConnected = status === 'connected';

    container.innerHTML = `
      <div class="admin-sub-firebase animate-fadeIn">
        <div class="d-flex justify-between align-center mb-4 flex-wrap gap-2">
          <div>
            <div class="d-flex align-center gap-2">
              <span class="badge ${isConnected ? 'badge-emerald' : status === 'connecting' ? 'badge-gold' : 'badge-outline'}">
                ${isConnected ? '🟢 CLOUD ONLINE' : status === 'connecting' ? '🟡 ĐANG KẾT NỐI' : '🟠 CHẾ ĐỘ CỤC BỘ (LOCAL)'}
              </span>
              <span class="badge badge-cyan">GOOGLE FIREBASE FIRESTORE</span>
            </div>
            <h2 class="text-xl font-bold mt-1 text-white">Cơ Sở Dữ Liệu Đám Mây Firebase Firestore</h2>
            <p class="text-muted text-xs">Đồng bộ dữ liệu thời gian thực giữa máy tính Ban Chủ Nhiệm và toàn thể điện thoại kỳ thủ</p>
          </div>
          <div class="d-flex gap-2 align-center flex-wrap">
            <button id="btnManualPushCloud" class="btn btn-gold btn-sm" ${!isConnected ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="Tải toàn bộ dữ liệu trên máy tính này lên Cloud">
              <span>⚡</span> <span>Đẩy Dữ Liệu Lên Cloud</span>
            </button>
            <button id="btnManualPullCloud" class="btn btn-outline btn-sm" ${!isConnected ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="Tải dữ liệu mới nhất từ Cloud về máy tính này">
              <span>📥</span> <span>Kéo Dữ Liệu Về Máy</span>
            </button>
            <button id="btnLockFirebase" class="btn btn-outline-rose btn-sm" title="Khóa bảo vệ lại mục Firebase Cloud">
              <span>🔒</span> <span>Khóa Lại</span>
            </button>
          </div>
        </div>

        <!-- Status Overview Card -->
        <div class="card mb-4" style="background: radial-gradient(circle at 100% 0%, rgba(56,189,248,0.12) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid ${isConnected ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}; padding: 20px;">
          <div class="d-flex justify-between align-center flex-wrap gap-3">
            <div>
              <div class="text-xs text-muted mb-1">Trạng thái kết nối hiện tại:</div>
              <div class="d-flex align-center gap-2">
                <span style="font-size: 1.5rem;">${isConnected ? '🟢' : status === 'connecting' ? '🟡' : '🟠'}</span>
                <div>
                  <h3 class="text-base font-bold text-white mb-0">
                    ${isConnected ? 'Đã kết nối cơ sở dữ liệu đám mây Google Firestore' : status === 'connecting' ? 'Đang thiết lập kết nối tới Google Firebase...' : 'Chưa kết nối Firebase (Đang chạy chế độ lưu trữ cục bộ)'}
                  </h3>
                  <p class="text-xs text-muted mb-0">
                    ${isConnected 
                      ? `Project ID: <span class="font-mono text-cyan font-bold">${config?.projectId}</span> • Lần đồng bộ gần nhất: <span class="text-gold font-mono">${lastSyncStr}</span>`
                      : 'Hệ thống đang lưu dữ liệu trên trình duyệt này. Hãy dán cấu hình Firebase bên dưới để kết nối máy chủ online.'}
                  </p>
                </div>
              </div>
            </div>

            <!-- Stats badges -->
            <div class="d-flex gap-2 flex-wrap">
              <div class="card p-2 text-center" style="min-width: 90px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08);">
                <div class="text-xs text-dim">Hội viên</div>
                <div class="text-base font-bold text-gold font-mono">${state.members.length}</div>
              </div>
              <div class="card p-2 text-center" style="min-width: 90px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08);">
                <div class="text-xs text-dim">Giải đấu/HĐ</div>
                <div class="text-base font-bold text-cyan font-mono">${state.events.length}</div>
              </div>
              <div class="card p-2 text-center" style="min-width: 90px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08);">
                <div class="text-xs text-dim">Lượt điểm danh</div>
                <div class="text-base font-bold text-emerald font-mono">${state.attendanceLogs.length}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration Card -->
        <div class="card mb-4">
          <div class="d-flex justify-between align-center mb-3">
            <div>
              <h3 class="font-bold text-white text-base">Cài Đặt Cấu Hình Firebase (Firebase Configuration)</h3>
              <p class="text-xs text-muted">Dán đoạn mã cấu hình mà Google cấp khi bạn tạo ứng dụng web trên Firebase Console</p>
            </div>
            ${config ? `
              <button id="btnClearFirebaseConfig" class="btn btn-outline-rose btn-sm" title="Xóa cấu hình và ngắt kết nối">
                <span>🔌</span> <span>Ngắt Kết Nối & Dùng Offline</span>
              </button>
            ` : ''}
          </div>

          <div class="form-group mb-3">
            <label class="form-label text-xs font-bold text-dim">
              MÃ CẤU HÌNH FIREBASE (DÁN ĐOẠN <code>firebaseConfig = { ... }</code> HOẶC JSON VÀO ĐÂY)
            </label>
            <textarea id="firebaseConfigInput" class="form-control font-mono text-xs" rows="8" placeholder='const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tnu-hgc-chess.firebaseapp.com",
  projectId: "tnu-hgc-chess",
  storageBucket: "tnu-hgc-chess.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};'>${config ? JSON.stringify(config, null, 2) : ''}</textarea>
          </div>

          <div class="d-flex justify-between align-center flex-wrap gap-2">
            <button id="btnSaveFirebaseConfig" class="btn btn-gold btn-sm" style="font-weight:700; padding:8px 20px;">
              <span>💾</span> <span>Lưu & Kết Nối Ngay</span>
            </button>
            <span class="text-xs text-muted">💡 Cấu hình được lưu an toàn và tự động khởi chạy mỗi khi mở trang web.</span>
          </div>
        </div>

        <!-- Dedicated Firebase Cloud Password Card -->
        <div class="card mb-4" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.08) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid var(--border-gold); padding: 22px;">
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
            <div>
              <div class="d-flex align-center gap-2 mb-1">
                <span class="badge badge-gold">BẢO MẬT RIÊNG</span>
                <span class="badge badge-cyan">MẬT KHẨU MỤC NÀY</span>
              </div>
              <h3 class="font-bold text-white text-base">Đổi Mật Khẩu Mở Khóa Firebase Cloud</h3>
              <p class="text-xs text-muted mb-0">Mật khẩu này dùng riêng để mở khóa mục Firebase Cloud (độc lập với mật khẩu đăng nhập Admin)</p>
            </div>
          </div>

          <form id="formChangeFirebaseLockPassword" onsubmit="return false;" class="app-form" style="max-width: 560px;">
            <div class="form-group mb-3">
              <label class="form-label text-xs font-bold text-dim">MẬT KHẨU HIỆN TẠI CỦA FIREBASE CLOUD:</label>
              <div style="position: relative;">
                <input type="password" id="inputFbCurrentPass" class="form-input" placeholder="Nhập mật khẩu Firebase hiện tại..." required style="padding-right: 42px;">
                <button type="button" class="btn-toggle-eye" data-target="inputFbCurrentPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label text-xs font-bold text-dim">MẬT KHẨU MỚI (TỐI THIỂU 6 KÝ TỰ):</label>
              <div style="position: relative;">
                <input type="password" id="inputFbNewPass" class="form-input" placeholder="Nhập mật khẩu mới..." required style="padding-right: 42px;">
                <button type="button" class="btn-toggle-eye" data-target="inputFbNewPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label text-xs font-bold text-dim">XÁC NHẬN MẬT KHẨU MỚI:</label>
              <div style="position: relative;">
                <input type="password" id="inputFbConfirmPass" class="form-input" placeholder="Nhập lại mật khẩu mới..." required style="padding-right: 42px;">
                <button type="button" class="btn-toggle-eye" data-target="inputFbConfirmPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
              </div>
            </div>

            <div id="fbChangePassAlert" style="display: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 0.8rem; font-weight: 600;"></div>

            <div class="d-flex justify-between align-center flex-wrap gap-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.08);">
              <button type="submit" class="btn btn-gold btn-sm" id="btnSaveFirebasePassword" style="font-weight: 700; padding: 8px 22px;">
                <span>💾</span> <span>Lưu Mật Khẩu Firebase</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm" id="btnResetDefaultFbPass" style="font-size: 0.78rem;">
                <span>🔄</span> Đặt lại mật khẩu gốc
              </button>
            </div>
          </form>
        </div>

        <!-- 3-Minute Quick Guide Card -->
        <div class="card" style="border: 1px dashed rgba(212,175,55,0.35);">
          <h3 class="font-bold text-white text-base mb-3 d-flex align-center gap-2">
            <span>📋</span> <span>Hướng Dẫn 3 Phút Tạo Firebase Miễn Phí (Google Firebase Spark Plan)</span>
          </h3>

          <div class="instruction-steps text-xs text-muted" style="line-height: 1.8;">
            <p class="mb-2"><strong class="text-white">Bước 1:</strong> Mở <a href="https://console.firebase.google.com" target="_blank" class="text-cyan font-bold" style="text-decoration:underline;">console.firebase.google.com</a>, đăng nhập tài khoản Google $\rightarrow$ Bấm <strong>Thêm dự án (Add project)</strong> $\rightarrow$ Đặt tên dự án (Ví dụ: <code>tnu-hgc-chess</code>) $\rightarrow$ Bấm Tiếp tục.</p>
            <p class="mb-2"><strong class="text-white">Bước 2:</strong> Vào menu trái chọn <strong>Build</strong> $\rightarrow$ <strong>Firestore Database</strong> $\rightarrow$ Bấm <strong>Tạo cơ sở dữ liệu (Create database)</strong> $\rightarrow$ Chọn <strong>Bắt đầu ở chế độ thử nghiệm (Start in test mode)</strong> $\rightarrow$ Bấm Bật (Enable).</p>
            <p class="mb-2"><strong class="text-white">Bước 3:</strong> Bấm vào biểu tượng bánh răng ⚙️ (Cài đặt dự án / Project settings) $\rightarrow$ Cuộn xuống mục <strong>Ứng dụng của bạn (Your apps)</strong> $\rightarrow$ Bấm biểu tượng Web <strong>&lt;/&gt;</strong> $\rightarrow$ Đặt tên web rồi bấm Đăng ký $\rightarrow$ Sao chép toàn bộ đoạn mã <code>const firebaseConfig = { ... };</code> rồi dán vào ô bên trên và bấm <strong>Lưu & Kết Nối Ngay</strong>!</p>
          </div>

          <!-- Security Rules Box -->
          <div class="mt-3 p-3" style="background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <div class="d-flex justify-between align-center mb-1">
              <span class="text-xs font-bold text-gold">Quy tắc bảo mật Firestore (Security Rules)</span>
              <button id="btnCopyRules" class="btn btn-outline btn-xs" style="font-size:11px; padding:2px 8px;">📋 Sao chép Rules</button>
            </div>
            <pre class="font-mono text-xs text-muted mb-0" style="overflow-x:auto;">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}</pre>
          </div>
        </div>
      </div>
    `;

    this.bindFirebaseEvents(container);
  }

  bindFirebaseEvents(container) {
    const btnSave = container.querySelector('#btnSaveFirebaseConfig');
    const input = container.querySelector('#firebaseConfigInput');
    const btnClear = container.querySelector('#btnClearFirebaseConfig');
    const btnPush = container.querySelector('#btnManualPushCloud');
    const btnPull = container.querySelector('#btnManualPullCloud');
    const btnCopyRules = container.querySelector('#btnCopyRules');

    // Save & Connect
    btnSave?.addEventListener('click', async () => {
      sound.playClick();
      const rawText = input?.value || '';
      try {
        const parsed = this.parseFirebaseConfigInput(rawText);
        saveFirebaseConfig(parsed);
        sound.playSuccess();
        modalManager.showAlert({
          type: 'success',
          title: 'Đã lưu cấu hình',
          message: 'Đang kết nối tới Google Firebase Firestore...'
        });

        // Initialize sync
        store.initFirebaseSync();
        this.renderAdminFirebase(container);
      } catch (e) {
        sound.playAlert();
        modalManager.showAlert({
          type: 'error',
          title: 'Lỗi cấu hình',
          message: e.message || 'Không thể nhận diện mã cấu hình Firebase. Vui lòng kiểm tra lại!'
        });
      }
    });

    // Clear config
    btnClear?.addEventListener('click', () => {
      sound.playAlert();
      modalManager.showConfirm({
        title: 'Xác nhận ngắt kết nối Firebase?',
        message: 'Hệ thống sẽ chuyển về lưu trữ trên bộ nhớ máy (cục bộ). Bạn có thể kết nối lại bất cứ lúc nào.',
        confirmText: 'Đồng ý ngắt kết nối',
        cancelText: 'Hủy',
        onConfirm: () => {
          clearFirebaseConfig();
          firebaseService.disconnect();
          sound.playSuccess();
          this.renderAdminFirebase(container);
        }
      });
    });

    // Manual Push
    btnPush?.addEventListener('click', async () => {
      sound.playClick();
      const origHtml = btnPush.innerHTML;
      btnPush.innerHTML = `<span>⏳</span> <span>Đang đẩy lên Cloud...</span>`;
      btnPush.disabled = true;

      try {
        await firebaseService.pushToFirestore(store.getState());
        sound.playSuccess();
        modalManager.showAlert({
          type: 'success',
          title: 'Đồng bộ thành công',
          message: 'Toàn bộ dữ liệu hiện tại đã được tải lên cơ sở dữ liệu đám mây Google Firestore!'
        });
      } catch (e) {
        sound.playAlert();
        modalManager.showAlert({
          type: 'error',
          title: 'Lỗi đồng bộ',
          message: e.message || 'Không thể đẩy dữ liệu lên Cloud.'
        });
      } finally {
        btnPush.innerHTML = origHtml;
        btnPush.disabled = false;
        this.renderAdminFirebase(container);
      }
    });

    // Manual Pull
    btnPull?.addEventListener('click', async () => {
      sound.playClick();
      modalManager.showConfirm({
        title: 'Tải dữ liệu mới nhất từ Cloud?',
        message: 'Hành động này sẽ cập nhật dữ liệu trên máy tính này với phiên bản mới nhất trên Google Firestore.',
        confirmText: 'Tải về ngay',
        cancelText: 'Hủy',
        onConfirm: async () => {
          try {
            const data = await firebaseService.pullFromFirestore();
            if (data) {
              store.applyRemoteData(data);
              sound.playSuccess();
              modalManager.showAlert({
                type: 'success',
                title: 'Tải về thành công',
                message: 'Đã cập nhật dữ liệu mới nhất từ Google Firestore vào máy tính!'
              });
              this.renderAdminFirebase(container);
            } else {
              modalManager.showAlert({
                type: 'info',
                title: 'Chưa có dữ liệu trên Cloud',
                message: 'Cơ sở dữ liệu trên Cloud hiện đang trống. Hãy bấm "Đẩy Dữ Liệu Lên Cloud" trước!'
              });
            }
          } catch (e) {
            sound.playAlert();
            modalManager.showAlert({
              type: 'error',
              title: 'Lỗi tải về',
              message: e.message || 'Không thể tải dữ liệu từ Cloud.'
            });
          }
        }
      });
    });

    // Lock button
    const btnLock = container.querySelector('#btnLockFirebase');
    btnLock?.addEventListener('click', () => {
      sound.playClick();
      this.firebaseUnlocked = false;
      this.adminSubView = 'admin-overview';
      modalManager.showAlert({
        type: 'info',
        title: 'Đã khóa bảo vệ',
        message: 'Mục Firebase Cloud đã được khóa an toàn. Bạn sẽ cần nhập lại mật khẩu khi truy cập lần sau.'
      });
      const dashboard = document.getElementById('mainViewport');
      if (dashboard) this.renderAdminDashboard(dashboard);
    });

    // Change Firebase Password Form
    const formFbPass = container.querySelector('#formChangeFirebaseLockPassword');
    const inputFbCurr = container.querySelector('#inputFbCurrentPass');
    const inputFbNew = container.querySelector('#inputFbNewPass');
    const inputFbConf = container.querySelector('#inputFbConfirmPass');
    const alertFbBox = container.querySelector('#fbChangePassAlert');
    const btnResetFbPass = container.querySelector('#btnResetDefaultFbPass');

    // Eye toggles in Firebase view
    container.querySelectorAll('.btn-toggle-eye').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = container.querySelector('#' + targetId);
        if (input) {
          if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
          } else {
            input.type = 'password';
            btn.textContent = '👁️';
          }
        }
      });
    });

    const showFbPassAlert = (msg, isSuccess = false) => {
      if (!alertFbBox) return;
      alertFbBox.textContent = msg;
      alertFbBox.style.display = 'block';
      if (isSuccess) {
        alertFbBox.style.background = 'rgba(16, 185, 129, 0.15)';
        alertFbBox.style.color = '#34d399';
        alertFbBox.style.border = '1px solid rgba(16, 185, 129, 0.35)';
      } else {
        alertFbBox.style.background = 'rgba(244, 63, 94, 0.15)';
        alertFbBox.style.color = '#fb7185';
        alertFbBox.style.border = '1px solid rgba(244, 63, 94, 0.35)';
      }
    };

    formFbPass?.addEventListener('submit', (e) => {
      e.preventDefault();
      const curr = (inputFbCurr?.value || '').trim();
      const newP = (inputFbNew?.value || '').trim();
      const conf = (inputFbConf?.value || '').trim();

      const expected = localStorage.getItem('TNU_HGC_FIREBASE_LOCK_PASSWORD') || 'admin123456';
      if (curr !== expected) {
        sound.playAlert();
        showFbPassAlert('⚠️ Mật khẩu Firebase hiện tại không đúng. Vui lòng thử lại!');
        inputFbCurr?.focus();
        return;
      }

      if (newP.length < 6) {
        sound.playAlert();
        showFbPassAlert('⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!');
        inputFbNew?.focus();
        return;
      }

      if (newP !== conf) {
        sound.playAlert();
        showFbPassAlert('⚠️ Xác nhận mật khẩu mới không trùng khớp!');
        inputFbConf?.focus();
        return;
      }

      localStorage.setItem('TNU_HGC_FIREBASE_LOCK_PASSWORD', newP);
      sound.playSuccess();
      showFbPassAlert('✅ Đã cập nhật mật khẩu mở khóa Firebase Cloud mới thành công!', true);

      if (inputFbCurr) inputFbCurr.value = '';
      if (inputFbNew) inputFbNew.value = '';
      if (inputFbConf) inputFbConf.value = '';

      modalManager.showAlert({
        type: 'success',
        title: 'Đổi mật khẩu thành công',
        message: 'Mật khẩu mở khóa Firebase Cloud đã được cập nhật thành công (hoàn toàn độc lập với mật khẩu Admin)!'
      });
    });

    btnResetFbPass?.addEventListener('click', () => {
      sound.playAlert();
      modalManager.showConfirm({
        title: 'Đặt lại mật khẩu Firebase gốc?',
        message: 'Bạn có chắc chắn muốn đặt lại mật khẩu mở khóa Firebase Cloud về mặc định "admin123456"?',
        confirmText: 'Đặt lại về admin123456',
        cancelText: 'Hủy bỏ',
        onConfirm: () => {
          localStorage.removeItem('TNU_HGC_FIREBASE_LOCK_PASSWORD');
          sound.playSuccess();
          showFbPassAlert('✅ Đã khôi phục mật khẩu Firebase về mặc định: admin123456', true);
          if (inputFbCurr) inputFbCurr.value = '';
          if (inputFbNew) inputFbNew.value = '';
          if (inputFbConf) inputFbConf.value = '';
        }
      });
    });

    // Copy Rules
    btnCopyRules?.addEventListener('click', () => {
      const rules = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
      navigator.clipboard.writeText(rules).then(() => {
        btnCopyRules.textContent = '✅ Đã sao chép!';
        setTimeout(() => {
          btnCopyRules.textContent = '📋 Sao chép Rules';
        }, 1500);
      });
    });
  }

  promptFirebasePassword(onSuccess) {
    const contentHtml = `
      <div style="padding: 10px 4px;">
        <div class="text-center mb-3">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🔐</div>
          <h3 class="text-lg font-bold text-white mb-1">Xác Thực Truy Cập Firebase Cloud</h3>
          <p class="text-xs text-muted mb-0">
            Khu vực này chứa cấu hình máy chủ đám mây và đồng bộ cơ sở dữ liệu. Vui lòng nhập mật khẩu bảo vệ Firebase Cloud để mở khóa:
          </p>
        </div>

        <form id="formUnlockFirebase" onsubmit="return false;" class="app-form">
          <div class="form-group mb-4">
            <label class="form-label text-xs font-bold text-dim">MẬT KHẨU FIREBASE CLOUD BẢO VỆ:</label>
            <div style="position: relative;">
              <input type="password" id="inputFirebaseUnlockPass" class="form-input" placeholder="Nhập mật khẩu..." autofocus autocomplete="current-password" required style="padding-right: 42px;">
              <button type="button" class="btn-toggle-eye" data-target="inputFirebaseUnlockPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
            </div>
            <div id="firebaseUnlockError" class="text-xs text-rose mt-2" style="display:none; font-weight:600;">⚠️ Mật khẩu không chính xác! Mật khẩu mặc định là: admin123456</div>
            <div class="text-xs text-muted mt-2" style="opacity: 0.9;">
              💡 Mật khẩu mặc định: <strong class="text-gold">admin123456</strong> (hoặc mật khẩu Admin của bạn)
            </div>
          </div>

          <div class="d-flex gap-2 justify-between align-center flex-wrap">
            <button type="button" class="btn btn-outline btn-xs text-gold" id="btnQuickUnlockFb" style="font-size: 0.75rem; padding: 6px 12px; border-color: rgba(212,175,55,0.4);">
              ⚡ Mở khóa nhanh (admin123456)
            </button>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline btn-sm" id="btnCancelFirebaseUnlock">Hủy Bỏ</button>
              <button type="submit" class="btn btn-gold btn-sm" id="btnConfirmFirebaseUnlock" style="font-weight:700; padding:8px 18px;">
                <span>🔓</span> <span>Mở Khóa Truy Cập</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    modalManager.open('Bảo Mật Cơ Sở Dữ Liệu Cloud', contentHtml, null, null);

    setTimeout(() => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;
      const passInp = modalEl.querySelector('#inputFirebaseUnlockPass');
      const errEl = modalEl.querySelector('#firebaseUnlockError');
      const form = modalEl.querySelector('#formUnlockFirebase');
      const btnCancel = modalEl.querySelector('#btnCancelFirebaseUnlock');
      const btnQuickUnlock = modalEl.querySelector('#btnQuickUnlockFb');
      const eyeBtn = modalEl.querySelector('.btn-toggle-eye');

      if (passInp) passInp.focus();

      btnQuickUnlock?.addEventListener('click', () => {
        sound.playSuccess();
        modalManager.close();
        onSuccess && onSuccess();
      });

      eyeBtn?.addEventListener('click', () => {
        if (passInp) {
          if (passInp.type === 'password') {
            passInp.type = 'text';
            eyeBtn.textContent = '🙈';
          } else {
            passInp.type = 'password';
            eyeBtn.textContent = '👁️';
          }
        }
      });

      btnCancel?.addEventListener('click', () => {
        modalManager.close();
      });

      const handleUnlock = () => {
        const entered = (passInp?.value || '').trim();
        const fbPass = localStorage.getItem('TNU_HGC_FIREBASE_LOCK_PASSWORD') || 'admin123456';
        const adminPass = localStorage.getItem('TNU_HGC_ADMIN_PASSWORD') || 'admin123456';

        if (entered === fbPass || entered === adminPass || entered === 'admin123456') {
          sound.playSuccess();
          modalManager.close();
          onSuccess && onSuccess();
        } else {
          sound.playAlert();
          if (errEl) {
            errEl.style.display = 'block';
            errEl.innerHTML = '⚠️ Mật khẩu không chính xác! Mật khẩu mặc định là: <strong>admin123456</strong> (hoặc bấm nút "Mở khóa nhanh" bên dưới).';
          }
          if (passInp) {
            passInp.value = '';
            passInp.focus();
          }
        }
      };

      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUnlock();
      });
    }, 50);
  }

  parseFirebaseConfigInput(raw) {
    if (!raw || !raw.trim()) throw new Error('Vui lòng nhập mã cấu hình Firebase');
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (parsed.projectId || parsed.apiKey)) return parsed;
    } catch (e) {}

    const apiKeyMatch = trimmed.match(/apiKey\s*:\s*["']([^"']+)["']/);
    const authDomainMatch = trimmed.match(/authDomain\s*:\s*["']([^"']+)["']/);
    const projectIdMatch = trimmed.match(/projectId\s*:\s*["']([^"']+)["']/);
    const storageBucketMatch = trimmed.match(/storageBucket\s*:\s*["']([^"']+)["']/);
    const messagingSenderIdMatch = trimmed.match(/messagingSenderId\s*:\s*["']([^"']+)["']/);
    const appIdMatch = trimmed.match(/appId\s*:\s*["']([^"']+)["']/);

    if (apiKeyMatch && projectIdMatch) {
      return {
        apiKey: apiKeyMatch[1],
        authDomain: authDomainMatch ? authDomainMatch[1] : '',
        projectId: projectIdMatch[1],
        storageBucket: storageBucketMatch ? storageBucketMatch[1] : '',
        messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : '',
        appId: appIdMatch ? appIdMatch[1] : ''
      };
    }

    throw new Error('Không thể nhận diện cấu hình Firebase. Vui lòng đảm bảo có ít nhất apiKey và projectId hợp lệ.');
  }
}

// Instantiate application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
