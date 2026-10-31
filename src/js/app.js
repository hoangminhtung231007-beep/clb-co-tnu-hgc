import { store, isProofEvent } from './state/store.js';
import { CHESS_MOTTOS } from './state/chessMottos.js';
import { sound } from './utils/audio.js';
import { chartHelper } from './utils/charts.js';
import { SmartQRScanner } from './components/qrScanner.js';
import { memberCardComponent } from './components/memberCard.js';
import { modalManager } from './components/modals.js';
import { firebaseService } from './services/firebaseService.js';
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from './config/firebaseConfig.js';
import { exportSwissStandingsCsv } from './utils/swissSystem.js';
import { copyToClipboard } from './utils/qrHelper.js';
import { pushNotificationService, FCM_VAPID_KEY } from './services/pushNotificationService.js';

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
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New update available, auto reloading...');
              window.location.reload();
            }
          });
        });
      }).catch((err) => {
        console.warn('SW registration skipped', err);
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          navigator.serviceWorker.ready.then((reg) => reg.update()).catch(() => {});
        }
      });
    }

    // Initialize Web Push FCM Service
    if (typeof window !== 'undefined') {
      pushNotificationService.init().catch((err) => console.warn('Push init error:', err));
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
      this.adminSubView = window.innerWidth <= 768 ? 'admin-checkin' : (this.adminSubView || 'admin-overview');
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
          li.style.display = (this.currentView === 'admin') ? 'none' : '';
        } else if (isGuest && v === 'member-pass') {
          li.style.display = 'none';
        } else {
          li.style.display = '';
        }
      }
      const mobileBtn = document.querySelector(`.mobile-nav-btn[data-view="${v}"]`);
      if (mobileBtn) {
        if (isAdmin) {
          mobileBtn.style.display = (this.currentView === 'admin') ? 'none' : '';
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
      mobileBottomBar.style.display = (isAdmin && this.currentView === 'admin') ? 'none' : '';
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
        navUserBadge.innerHTML = `
          <button type="button" class="btn btn-gold btn-sm btn-nav-admin-return" id="btnNavAdminReturn" style="font-weight: 700; padding: 6px 14px; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 10px rgba(212,175,55,0.35); border-radius: 8px;">
            <span>👑</span> <span>${this.currentView === 'admin' ? 'Buồng Lái Admin' : 'Về Trang Admin'}</span>
          </button>
        `;
        const btnReturn = navUserBadge.querySelector('#btnNavAdminReturn');
        if (btnReturn) {
          btnReturn.onclick = (e) => {
            e.stopPropagation();
            sound.playClick();
            const isMobile = window.innerWidth <= 768;
            this.adminSubView = isMobile ? 'admin-checkin' : (this.adminSubView || 'admin-overview');
            this.navigateTo('admin', this.adminSubView);
          };
        }
      } else if (!isGuest && activeMember) {
        navUserBadge.innerHTML = `
          <div class="user-avatar-pill" id="btnNavUserPill" title="Xem thẻ thành viên cá nhân" style="cursor: pointer;">
            <img src="${activeMember.avatar}" alt="${activeMember.name}" style="object-fit:cover; border-radius:50%; width: 28px; height: 28px;">
            <span class="user-avatar-name" style="font-weight: 600; font-size: 0.82rem; color: #fff;">${activeMember.name}</span>
          </div>
        `;
        const pill = navUserBadge.querySelector('#btnNavUserPill');
        if (pill) {
          pill.onclick = (e) => {
            e.stopPropagation();
            sound.playClick();
            this.navigateTo('member-pass');
          };
        }
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
    const isAdmin = role === 'admin';
    const drawerOverlay = document.getElementById('mobileDrawerOverlay');
    if (!drawerOverlay) return;

    // Highlight active link & control link visibility by role
    drawerOverlay.querySelectorAll('.mobile-drawer-item').forEach((item) => {
      const v = item.getAttribute('data-view');
      item.classList.toggle('active', v === this.currentView);
      if (isAdmin) {
        // Chế độ Admin: Luôn ưu tiên hiển thị Buồng Lái Quản Trị và các trang công khai để kiểm tra
        if (v === 'admin') {
          item.style.display = 'flex';
        } else if (v === 'member-pass') {
          item.style.display = 'none';
        } else {
          item.style.display = 'flex';
        }
      } else {
        if (v === 'admin') {
          item.style.display = 'none';
        } else if (v === 'member-pass') {
          item.style.display = isGuest ? 'none' : 'flex';
        } else {
          item.style.display = 'flex';
        }
      }
    });

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
      } else if (isAdmin) {
        authBox.innerHTML = `
          <div class="card p-3 mb-3" style="background: rgba(212,175,55,0.12); border: 1.5px solid var(--gold-primary);">
            <div class="d-flex align-center gap-2">
              <span style="font-size: 1.8rem;">👑</span>
              <div style="flex:1; min-width:0;">
                <div class="text-xs font-bold text-gold">Quản Trị Viên (Admin)</div>
                <div class="text-xs text-dim">Chế độ Quét QR Điểm Danh Di Động</div>
              </div>
              <span class="badge badge-gold" style="font-size:10px;">SCANNER</span>
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
      } else if (isAdmin) {
        footerBox.innerHTML = `
          <button class="btn btn-outline btn-sm w-100" id="btnDrawerLogout" style="padding: 9px; font-weight: 600; border-color: rgba(244,63,94,0.3); color: #fb7185;">
            <span>🚪</span> <span>Đăng Xuất Quản Trị</span>
          </button>
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
    // 👑 CHẾ ĐỘ QUẢN TRỊ VIÊN (ADMIN ONLY): THÔNG BÁO DÀNH RIÊNG CHO ADMIN
    // Chỉ hiển thị các thông báo nghiệp vụ Quản trị, bấm vào chuyển ngay đến
    // tab tương ứng trong Buồng Lái Admin, không nhảy sang giao diện thành viên.
    // =========================================================================
    if (isAdmin) {
      // 1. ĐƠN ĐĂNG KÝ GIA NHẬP MỚI CHỜ DUYỆT
      const pendingApps = (state.pendingApplications || []).filter((a) => !a.status || a.status === 'pending');
      if (pendingApps.length > 0) {
        notifications.push({
          id: `notif_admin_pending_apps_${pendingApps.length}`,
          icon: '📝',
          title: `Đơn gia nhập mới chờ duyệt (${pendingApps.length})`,
          desc: `Có ${pendingApps.length} tân kỳ thủ vừa gửi đơn gia nhập CLB đang chờ duyệt hồ sơ. Bấm để mở tab Duyệt đơn!`,
          time: 'Cần duyệt',
          badge: 'Duyệt Đơn',
          targetView: 'admin',
          targetSubView: 'admin-users'
        });
      }

      // 2. QUẢN LÝ HOẠT ĐỘNG & GIẢI ĐẤU
      const realEvents = events.filter((ev) => !isProofEvent(ev));
      if (realEvents.length > 0) {
        const latestEvent = realEvents[0];
        notifications.push({
          id: `notif_admin_events_${latestEvent.id || 'overview'}`,
          icon: '🏆',
          title: `Quản lý giải đấu: ${latestEvent.title || 'Sự kiện CLB'}`,
          desc: `Thời gian: ${latestEvent.dateTime || latestEvent.date || 'Sắp tới'} • Bấm để quản lý danh sách đăng ký, mở điểm danh hoặc cập nhật kết quả.`,
          time: latestEvent.date || 'Sự kiện',
          badge: 'Sự Kiện',
          targetView: 'admin',
          targetSubView: 'admin-events'
        });
      } else {
        notifications.push({
          id: 'notif_admin_events_empty',
          icon: '🎯',
          title: 'Tổ chức sự kiện & giải đấu mới',
          desc: 'Hiện chưa có giải đấu nào được lên lịch. Bấm để tạo sự kiện giao lưu hoặc giải cờ mới cho CLB.',
          time: 'Kế hoạch',
          badge: 'Tạo Mới',
          targetView: 'admin',
          targetSubView: 'admin-events'
        });
      }

      // 3. VẬN HÀNH BỐC THĂM HỆ THỤY SĨ (Swiss Tournament)
      const swissEvent = events.find((ev) => ev.swissData && ev.swissData.rounds && ev.swissData.rounds.length > 0);
      if (swissEvent) {
        const curR = swissEvent.swissData.currentRound || 1;
        notifications.push({
          id: `notif_admin_swiss_${swissEvent.id}_r${curR}`,
          icon: '⚔️',
          title: `Vận hành Hệ Thụy Sĩ: ${swissEvent.title}`,
          desc: `Đang ở Vòng ${curR}. Bấm để xem kết quả các bàn đấu, nhập tỷ số hoặc bốc thăm vòng tiếp theo.`,
          time: `Vòng ${curR}`,
          badge: 'Hệ Thụy Sĩ',
          targetView: 'admin',
          targetSubView: 'admin-swiss'
        });
      }

      // 4. QUÉT MÃ QR ĐIỂM DANH BUỔI SINH HOẠT
      notifications.push({
        id: 'notif_admin_checkin_fast',
        icon: '📷',
        title: 'Quét mã QR Thẻ Điểm danh',
        desc: 'Mở nhanh camera quét thẻ PVC hoặc mã QR điện tử của kỳ thủ khi đến sinh hoạt CLB.',
        time: 'Sinh hoạt',
        badge: 'Điểm Danh',
        targetView: 'admin',
        targetSubView: 'admin-checkin'
      });

      // 5. CẢNH BÁO KỲ THỦ VẮNG SINH HOẠT
      const sessionLogs = (state.attendanceLogs || []).filter((log) => log.category === 'session' && log.timestamp);
      const sessionDates = [...new Set(sessionLogs.map((l) => l.timestamp.slice(0, 10)))].sort().reverse();
      if (sessionDates.length >= 2) {
        const lastDate1 = sessionDates[0];
        const lastDate2 = sessionDates[1];
        const absentMembers = (state.members || []).filter((m) => {
          const attended1 = sessionLogs.some((l) => l.memberId === m.id && l.status === 'success' && l.timestamp.startsWith(lastDate1));
          const attended2 = sessionLogs.some((l) => l.memberId === m.id && l.status === 'success' && l.timestamp.startsWith(lastDate2));
          return !attended1 && !attended2;
        });
        if (absentMembers.length > 0) {
          notifications.push({
            id: `notif_admin_absent_members_${lastDate1}`,
            icon: '⚠️',
            title: `Cảnh báo chuyên cần: Có ${absentMembers.length} kỳ thủ vắng 2 buổi`,
            desc: `Có ${absentMembers.length} thành viên vắng 2 buổi sinh hoạt gần nhất. Bấm để xem và quản lý danh sách chuyên cần!`,
            time: 'Chuyên cần',
            badge: 'Cảnh Báo',
            targetView: 'admin',
            targetSubView: 'admin-overview'
          });
        }
      }

      // 6. QUẢN LÝ QUỸ & TÀI CHÍNH CLB
      const fundCampaigns = state.fundCampaigns || [];
      const activeCampaign = fundCampaigns.find((c) => c.status === 'active') || fundCampaigns[0];
      notifications.push({
        id: 'notif_admin_funds_monitor',
        icon: '💰',
        title: 'Quản lý Quỹ & Thu chi CLB',
        desc: activeCampaign
          ? `Chiến dịch "${activeCampaign.title}" đang hoạt động. Bấm để kiểm tra số dư và duyệt đóng quỹ.`
          : 'Bấm để quản lý quỹ sinh hoạt, xem lịch sử đóng quỹ và thiết lập số tài khoản CLB.',
        time: 'Tài chính',
        badge: 'Quỹ CLB',
        targetView: 'admin',
        targetSubView: 'admin-funds'
      });

      // 7. CẢNH BÁO / TRẠNG THÁI FIREBASE CLOUD
      const isOnline = navigator.onLine;
      notifications.push({
        id: `notif_admin_firebase_${isOnline ? 'online' : 'offline'}`,
        icon: isOnline ? '☁️' : '⚠️',
        title: isOnline ? 'Đồng bộ Đám mây: TRỰC TUYẾN' : 'Cảnh báo: MẤT KẾT NỐI MẠNG',
        desc: isOnline
          ? 'Hệ thống Firebase đang kết nối ổn định và tự động đồng bộ 2 chiều thời gian thực.'
          : 'Không có kết nối Internet. Dữ liệu đang lưu cục bộ trên máy và sẽ tự động đồng bộ khi có mạng.',
        time: 'Hệ thống',
        badge: isOnline ? 'Online' : 'Offline',
        targetView: 'admin',
        targetSubView: 'admin-firebase'
      });

      return notifications;
    }

    // =========================================================================
    // 👥 THÔNG BÁO CHO THÀNH VIÊN VÀ KHÁCH (MEMBER & GUEST ONLY)
    // =========================================================================
    // 1. HOẠT ĐỘNG HOẶC GIẢI ĐẤU MỚI (Báo ngay khi thêm, không cần mở đăng ký)
    // =========================================================================
    events.filter((ev) => !isProofEvent(ev)).forEach((ev) => {
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
      modalManager.showAlert('Trình duyệt hiện tại của bạn chưa hỗ trợ thông báo đẩy trực tiếp. Hãy cài đặt website vào màn hình chính (PWA) để nhận thông báo.');
      return false;
    }

    try {
      const state = store.getState();
      const currentMember = state.currentSession?.memberId ? store.getMemberById(state.currentSession.memberId) : null;

      const token = await pushNotificationService.requestPermissionAndGetToken(currentMember);
      if (token) {
        sound.playSuccess();
        modalManager.showAlert({
          type: 'success',
          title: '🎉 Kích Hoạt Thông Báo Đẩy Thành Công!',
          message: 'Từ nay, bạn sẽ nhận được thông báo giải đấu, sự kiện và tin tức quan trọng từ CLB Cờ TNU - HGC ngay cả khi không mở website hoặc khi tắt/khóa màn hình!'
        });
        return true;
      } else {
        if (Notification.permission === 'denied') {
          modalManager.showAlert({
            type: 'warning',
            title: 'Quyền thông báo bị chặn',
            message: 'Quyền thông báo đã bị từ chối trên trình duyệt. Vui lòng bấm vào biểu tượng Ổ khóa / Cài đặt trang web trên thanh địa chỉ -> Chọn "Cho phép thông báo" rồi tải lại trang!'
          });
        }
        return false;
      }
    } catch (err) {
      sound.playAlert();
      modalManager.showAlert({
        type: 'warning',
        title: 'Chưa thể bật thông báo',
        message: err.message || 'Vui lòng kiểm tra quyền thông báo trên trình duyệt của bạn.'
      });
      return false;
    }
  }

  sendDevicePushNotification(title, body, url = '/') {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    pushNotificationService.showNativeNotification(title, body, url);
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
          if (notif.targetSubView === 'admin-users') {
            this.adminUserSubTab = 'pending';
          }
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

    const notifHeaderTitle = document.querySelector('#notificationDropdown .notification-header .font-bold');
    const isAdminRole = store.getState().currentSession?.role === 'admin';
    if (notifHeaderTitle) {
      notifHeaderTitle.textContent = isAdminRole ? 'THÔNG BÁO QUẢN TRỊ (ADMIN)' : 'THÔNG BÁO CLB';
    }

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
            if (targetSubView === 'admin-users') {
              this.adminUserSubTab = 'pending';
            }
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
          const isMobile = window.innerWidth <= 768;
          this.adminSubView = isMobile ? 'admin-checkin' : (this.adminSubView || 'admin-overview');
          this.navigateTo('admin', this.adminSubView);
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
          const isMobile = window.innerWidth <= 768;
          this.adminSubView = isMobile ? 'admin-checkin' : (this.adminSubView || 'admin-overview');
          this.navigateTo('admin', this.adminSubView);
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
        btnUpdateData.innerHTML = `<span>⏳</span> Đang tải lại hệ thống...`;
        btnUpdateData.disabled = true;
        window.location.reload();
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

    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
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

    // Khi Admin xem các trang khác, hiển thị thanh banner thông báo kèm nút quay lại Buồng Lái Admin
    const curRole = store.getState().currentSession?.role;
    if (curRole === 'admin' && this.currentView !== 'admin') {
      const banner = document.createElement('div');
      banner.id = 'adminViewingClientBanner';
      banner.className = 'admin-viewing-client-banner animate-fadeIn';
      banner.style.cssText = 'background: linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%); border: 1.5px solid var(--border-gold); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 auto 16px; max-width: 1200px; border-radius: 10px; box-shadow: 0 4px 18px rgba(0,0,0,0.6);';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; font-size: 0.88rem; color: #fde68a;">
          <span style="font-size: 1.25rem;">👑</span>
          <div>
            <strong>Chế độ Quản trị viên:</strong> Bạn đang xem giao diện công khai / thành viên.
          </div>
        </div>
        <button type="button" class="btn btn-gold btn-sm" id="btnBannerReturnAdmin" style="font-weight: 700; padding: 6px 16px; font-size: 0.82rem; white-space: nowrap; box-shadow: 0 2px 8px rgba(245,158,11,0.4); border-radius: 6px;">
          <span>👑</span> Quay lại Buồng Lái Admin
        </button>
      `;
      container.insertBefore(banner, container.firstChild);
      banner.querySelector('#btnBannerReturnAdmin')?.addEventListener('click', () => {
        sound.playClick();
        const isMobile = window.innerWidth <= 768;
        this.adminSubView = isMobile ? 'admin-checkin' : (this.adminSubView || 'admin-overview');
        this.navigateTo('admin', this.adminSubView);
      });
    }
  }

  // ==========================================
  // 1. HOME VIEW
  // ==========================================
  renderHome(container) {
    if (this._homeCdInterval) {
      clearInterval(this._homeCdInterval);
      this._homeCdInterval = null;
    }

    const state = store.getState();
    const featuredEvent = (state.events || []).find((e) => e.type === 'tournament' || e.status === 'upcoming') || (state.events || [])[0] || {
      id: 'EVT-FEATURED',
      title: 'Giải Cờ vua mở rộng gây quỹ "Áo ấm cho em"',
      description: 'Giải đấu thiện nguyện quy mô toàn trường nhằm quyên góp gây quỹ mua áo ấm cho trẻ em khó khăn vùng cao Hà Giang. Kết nối ngọn lửa nhiệt huyết và tinh thần tương thân tương ái của các kỳ thủ sinh viên.',
      dateTime: '2026-11-21',
      location: 'Hội trường ĐH Thái Nguyên Phân hiệu Hà Giang',
      currentRegistered: 0
    };

    const dateMatch = (featuredEvent.dateTime || '').match(/\d{4}-\d{2}-\d{2}/);
    const targetDateStr = dateMatch ? `${dateMatch[0]}T08:00:00` : '2026-11-21T08:00:00';
    const targetTs = new Date(targetDateStr).getTime();
    const articles = state.articles || [];

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
              Hệ thống Cổng thông tin và buồng lái quản trị chính thức của CLB Cờ TNU - HGC, Đại học Thái Nguyên Phân hiệu tại Hà Giang.
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

        <!-- Featured Spotlight & News Bulletin Grid -->
        <section class="home-split-grid mb-4">
          <!-- Left: Featured Event & Live Countdown -->
          <div class="home-event-spotlight-card">
            <div>
              <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
                <span class="badge badge-gold" style="font-weight: 800; font-size: 0.78rem; padding: 4px 10px;">
                  🏆 GIẢI ĐẤU TIÊU ĐIỂM
                </span>
                <span class="badge badge-emerald" style="font-weight: 700; font-size: 0.75rem; padding: 4px 10px;">
                  🟢 Sắp Khởi Tranh
                </span>
              </div>

              <h2 class="text-xl font-bold text-white mb-2" style="line-height: 1.35;">
                ${featuredEvent.title}
              </h2>

              <p class="text-xs text-muted mb-3" style="line-height: 1.6;">
                ${featuredEvent.description || 'Giải đấu quy mô cấp câu lạc bộ và mở rộng, nơi các kỳ thủ cọ xát bản lĩnh và lan tỏa phong trào cờ tại Hà Giang.'}
              </p>

              <!-- Live Countdown Widget -->
              <div class="countdown-wrap mb-3">
                <div class="text-xs font-bold text-dim mb-1.5" style="letter-spacing: 0.5px; text-transform: uppercase;">
                  ⏳ Thời gian đếm ngược đến giờ khai mạc:
                </div>
                <div class="countdown-box" id="homeEventCountdown">
                  <div class="countdown-item">
                    <div class="countdown-num" id="cdDays">00</div>
                    <div class="countdown-lbl">Ngày</div>
                  </div>
                  <div class="countdown-item">
                    <div class="countdown-num" id="cdHours">00</div>
                    <div class="countdown-lbl">Giờ</div>
                  </div>
                  <div class="countdown-item">
                    <div class="countdown-num" id="cdMinutes">00</div>
                    <div class="countdown-lbl">Phút</div>
                  </div>
                  <div class="countdown-item">
                    <div class="countdown-num" id="cdSeconds">00</div>
                    <div class="countdown-lbl">Giây</div>
                  </div>
                </div>
              </div>

              <!-- Event Key Details -->
              <div class="event-mini-info-grid mb-3" style="display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 0.82rem;">
                <div class="d-flex align-center gap-2">
                  <span class="text-gold font-bold">📅 Thời gian:</span>
                  <span class="text-white font-mono">${featuredEvent.dateTime || '21/11/2026'}</span>
                </div>
                <div class="d-flex align-center gap-2">
                  <span class="text-cyan font-bold">📍 Địa điểm:</span>
                  <span class="text-white">${featuredEvent.location || 'CLB Cờ TNU - HGC'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: News & Internal Announcements Bulletin -->
          <div class="home-news-bulletin-card">
            <div>
              <div class="d-flex justify-between align-center mb-3">
                <div class="d-flex align-center gap-2">
                  <span style="font-size: 1.3rem;">📰</span>
                  <h2 class="text-base font-bold text-white mb-0">Bảng Tin & Thông Báo CLB</h2>
                </div>
                <a href="#news" class="text-xs text-gold font-bold hover-underline" style="text-decoration: none;">Xem tất cả →</a>
              </div>

              <div class="home-news-list">
                ${articles.length > 0 ? articles.slice(0, 3).map((art) => `
                  <div class="home-news-item" data-art-id="${art.id}">
                    <span class="home-news-icon">♟️</span>
                    <div class="flex-1 min-w-0">
                      <div class="home-news-title text-truncate">${art.title}</div>
                      <div class="home-news-meta">
                        <span class="badge badge-gold" style="font-size:0.65rem; padding:1px 6px;">${art.category || 'Tin tức'}</span>
                        <span>📅 ${art.publishDate || 'Gần đây'}</span>
                        <span>•</span>
                        <span class="text-gold font-bold">Đọc bài →</span>
                      </div>
                    </div>
                  </div>
                `).join('') : `
                  <div class="home-news-item" data-action="zalo">
                    <span class="home-news-icon">📢</span>
                    <div class="flex-1">
                      <div class="home-news-title">Lịch Sinh Hoạt & Tập Huấn Kỳ Thủ Định Kỳ</div>
                      <div class="home-news-meta">
                        <span class="badge badge-gold" style="font-size:0.65rem; padding:1px 6px;">Thông báo</span>
                        <span>📅 Chiều Thứ Bảy & Chủ Nhật hàng tuần</span>
                      </div>
                    </div>
                  </div>

                  <div class="home-news-item" data-action="register">
                    <span class="home-news-icon">💳</span>
                    <div class="flex-1">
                      <div class="home-news-title">Quy Chế Cấp Thẻ Hội Viên PVC 2 Mặt Chuẩn TNU</div>
                      <div class="home-news-meta">
                        <span class="badge badge-cyan" style="font-size:0.65rem; padding:1px 6px;">Hội viên</span>
                        <span>Định danh mã QR Smart Key trọn đời</span>
                      </div>
                    </div>
                  </div>

                  <div class="home-news-item" data-action="zalo">
                    <span class="home-news-icon">💬</span>
                    <div class="flex-1">
                      <div class="home-news-title">Kênh Kết Nối Zalo Chính Thức CLB Cờ TNU - HGC</div>
                      <div class="home-news-meta">
                        <span class="badge badge-emerald" style="font-size:0.65rem; padding:1px 6px;">Cộng đồng</span>
                        <span>Giao lưu, ghép cặp đấu và cập nhật hoạt động</span>
                      </div>
                    </div>
                  </div>
                `}
              </div>
            </div>

            <div class="pt-3" style="border-top: 1px solid rgba(255,255,255,0.06);">
              <a href="#news" class="btn btn-outline btn-sm w-100 text-center" style="display:flex; align-items:center; justify-content:center; gap:6px; text-decoration: none;">
                📖 Xem Toàn Bộ Bản Tin & Chuyên Đề →
              </a>
            </div>
          </div>
        </section>
      </div>
    `;

    // Live countdown interval
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTs - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const dEl = container.querySelector('#cdDays');
      const hEl = container.querySelector('#cdHours');
      const mEl = container.querySelector('#cdMinutes');
      const sEl = container.querySelector('#cdSeconds');
      if (dEl) dEl.textContent = String(days).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
      if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
      if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
    };
    updateCountdown();
    this._homeCdInterval = setInterval(updateCountdown, 1000);

    // News item clicks
    container.querySelectorAll('.home-news-item').forEach((item) => {
      item.addEventListener('click', () => {
        sound.playClick();
        const artId = item.getAttribute('data-art-id');
        if (artId) {
          const art = (state.articles || []).find((a) => a.id === artId);
          if (art) modalManager.openArticleDetailModal(art);
          return;
        }
        const action = item.getAttribute('data-action');
        if (action === 'register') {
          modalManager.openRegisterModal();
        } else if (action === 'zalo') {
          window.open(state.clubInfo.zaloGroupLink || 'https://zalo.me/g/ugejmj655', '_blank');
        } else {
          window.location.hash = '#news';
        }
      });
    });
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
    const contentPane = container.querySelector('#orgTabContent');

    const switchOrgSubTab = (tabName) => {
      this.orgTab = tabName;
      tabBoard?.classList.toggle('active', tabName === 'board');
      tabMembers?.classList.toggle('active', tabName === 'members');
      tabAlumniBoard?.classList.toggle('active', tabName === 'alumni-board');
      tabAlumniMembers?.classList.toggle('active', tabName === 'alumni-members');

      if (!contentPane) return;
      if (tabName === 'board') {
        this.renderBoardMembers(contentPane, bdhMembers);
      } else if (tabName === 'members') {
        this.renderMembersDirectory(contentPane);
      } else if (tabName === 'alumni-board') {
        this.renderAlumniBoard(contentPane, state.alumniBoard || []);
      } else if (tabName === 'alumni-members') {
        this.renderAlumniMembers(contentPane, state.alumniMembers || []);
      }
    };

    tabBoard?.addEventListener('click', () => {
      sound.playClick();
      switchOrgSubTab('board');
    });

    tabMembers?.addEventListener('click', () => {
      sound.playClick();
      switchOrgSubTab('members');
    });

    tabAlumniBoard?.addEventListener('click', () => {
      sound.playClick();
      switchOrgSubTab('alumni-board');
    });

    tabAlumniMembers?.addEventListener('click', () => {
      sound.playClick();
      switchOrgSubTab('alumni-members');
    });

    switchOrgSubTab(this.orgTab);
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

  renderMembersDirectoryRows(filtered, isMemberOrAdmin) {
    if (!filtered || filtered.length === 0) {
      return `
        <tr><td colspan="9" class="text-center text-muted p-4">${this.memberSearchQuery ? 'Không tìm thấy kỳ thủ phù hợp với từ khóa.' : 'Chưa có kỳ thủ nào trong danh sách. Thành viên mới sẽ xuất hiện sau khi Ban Điều Hành duyệt đơn đăng ký.'}</td></tr>
      `;
    }
    return filtered.map((m) => {
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
    }).join('');
  }

  filterMembersDirectory(members, query) {
    const rawQ = (query || '').trim().toLowerCase();
    if (!rawQ) return members;

    // Normalizer for accent-insensitive search (e.g. 'tien dat' matches 'Tiến Đạt')
    const stripAccents = (str) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .trim();
    };

    const normQ = stripAccents(rawQ);

    return members.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const studentId = (m.studentId || '').toLowerCase();
      const mClass = (m.class || '').toLowerCase();
      const major = (m.major || '').toLowerCase();
      const faculty = (m.faculty || '').toLowerCase();
      const university = (m.university || '').toLowerCase();

      // Check direct contains
      if (name.includes(rawQ) || studentId.includes(rawQ) || mClass.includes(rawQ) || major.includes(rawQ) || faculty.includes(rawQ) || university.includes(rawQ)) {
        return true;
      }

      // Check accent-stripped contains
      if (normQ) {
        const normName = stripAccents(m.name);
        const normClass = stripAccents(m.class);
        const normMajor = stripAccents(m.major);
        const normFaculty = stripAccents(m.faculty);
        if (normName.includes(normQ) || normClass.includes(normQ) || normMajor.includes(normQ) || normFaculty.includes(normQ)) {
          return true;
        }
      }

      return false;
    });
  }

  renderMembersDirectory(container) {
    const state = store.getState();
    const isMemberOrAdmin = state.currentSession.role === 'member' || state.currentSession.role === 'admin';

    // If search bar & table already exist in container, update table body in place (avoids losing focus on mobile)
    const existingSearchInput = container.querySelector('#dirSearchInput');
    const existingTbody = container.querySelector('#membersDirectoryTbody');
    const existingClearBtn = container.querySelector('#btnClearDirSearch');

    if (existingSearchInput && existingTbody) {
      const filtered = this.filterMembersDirectory(state.members, this.memberSearchQuery);
      existingTbody.innerHTML = this.renderMembersDirectoryRows(filtered, isMemberOrAdmin);
      if (existingClearBtn) {
        existingClearBtn.style.display = this.memberSearchQuery ? 'inline-flex' : 'none';
      }
      return;
    }

    const filtered = this.filterMembersDirectory(state.members, this.memberSearchQuery);

    container.innerHTML = `
      <div class="directory-view animate-fadeIn">
        <!-- Controls & Filters -->
        <div class="directory-controls-bar">
          <div class="d-flex gap-2 align-center flex-1" style="min-width:260px; position:relative;">
            <input type="text" id="dirSearchInput" class="form-input form-input-sm flex-1" 
                   value="${this.memberSearchQuery}" placeholder="Tìm theo tên thành viên, MSSV hoặc lớp..."
                   autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
                   inputmode="search"
                   style="padding-right: 32px;">
            <button type="button" id="btnClearDirSearch" class="btn btn-outline btn-sm" 
                    style="display: ${this.memberSearchQuery ? 'inline-flex' : 'none'}; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); padding: 0; width: 22px; height: 22px; font-size: 12px; align-items: center; justify-content: center; border-radius: 50%; z-index: 2; border-color: rgba(255,255,255,0.2); color: #cbd5e1;" 
                    title="Xóa tìm kiếm">✕</button>
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
            <tbody id="membersDirectoryTbody">
              ${this.renderMembersDirectoryRows(filtered, isMemberOrAdmin)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInput = container.querySelector('#dirSearchInput');
    const clearBtn = container.querySelector('#btnClearDirSearch');
    const tbody = container.querySelector('#membersDirectoryTbody');

    if (searchInput && tbody) {
      searchInput.addEventListener('input', (e) => {
        this.memberSearchQuery = e.target.value;
        const res = this.filterMembersDirectory(state.members, this.memberSearchQuery);
        tbody.innerHTML = this.renderMembersDirectoryRows(res, isMemberOrAdmin);
        if (clearBtn) {
          clearBtn.style.display = this.memberSearchQuery ? 'inline-flex' : 'none';
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchInput.blur();
        }
      });
    }

    if (clearBtn && searchInput && tbody) {
      clearBtn.addEventListener('click', () => {
        sound.playClick();
        this.memberSearchQuery = '';
        searchInput.value = '';
        clearBtn.style.display = 'none';
        const res = this.filterMembersDirectory(state.members, '');
        tbody.innerHTML = this.renderMembersDirectoryRows(res, isMemberOrAdmin);
        searchInput.focus();
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
    const publicEvents = (state.events || []).filter((ev) => !isProofEvent(ev));

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
          ${publicEvents.length === 0 ? `
            <div class="card p-5 text-center text-muted" style="grid-column: 1 / -1; border: 1px dashed var(--border-dim); border-radius: 12px;">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">📅</div>
              <p class="mb-0 text-white font-medium">Chưa có giải đấu hoặc buổi sinh hoạt nào được lên lịch.</p>
              ${state.currentSession.role === 'admin' ? '<p class="text-xs text-muted mt-1">Bấm nút "+ Lên lịch sự kiện mới" ở trên để tạo giải đấu hoặc buổi sinh hoạt đầu tiên.</p>' : ''}
            </div>
          ` : publicEvents.map((ev) => {
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
                  <p class="text-xs text-muted mb-3" style="line-height: 1.55;">${ev.description || 'Chưa có mô tả chi tiết.'}</p>
                  
                  <div class="d-flex align-center gap-2 text-xs mb-1.5 flex-wrap">
                    <span class="text-gold font-bold">📅 Thời gian:</span> 
                    <span class="badge badge-outline font-mono text-xs" style="padding: 3px 9px; border-color: rgba(212,175,55,0.35); color: var(--gold-light); font-weight: 600;">${ev.dateTime}</span>
                  </div>
                  <div class="d-flex align-center gap-2 text-xs mb-3 flex-wrap">
                    <span class="text-cyan font-bold">📍 Địa điểm:</span> 
                    <span class="text-white">${ev.location || 'CLB Cờ TNU - HGC'}</span>
                  </div>
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
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const defaultStart = '14:00';
    const defaultEnd = '17:30';

    const formatVnDateTime = (dateStr, startStr, endStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const d = parseInt(parts[2]);
      const dObj = new Date(y, m - 1, d);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = isNaN(dObj.getTime()) ? '' : days[dObj.getDay()];
      const timePart = startStr && endStr ? `${startStr} - ${endStr}` : startStr || endStr || '';
      return `${timePart ? timePart + ' • ' : ''}${dayName ? dayName + ', ' : ''}${pad(d)}/${pad(m)}/${y}`;
    };

    const initialFormatted = formatVnDateTime(defaultDate, defaultStart, defaultEnd);

    const contentHtml = `
      <form class="app-form" id="formCreateEventModal">
        <!-- Tên sự kiện -->
        <div class="form-group mb-3">
          <label class="form-label font-bold text-white mb-1">Tên giải đấu / Buổi sinh hoạt *</label>
          <input type="text" id="evTitle" class="form-input" required placeholder="Ví dụ: Giải Vô Địch Cờ Vua Mùa Đông 2026...">
        </div>

        <!-- Phân loại sự kiện -->
        <div class="form-group mb-3">
          <label class="form-label font-bold text-white mb-2" style="display: flex; align-items: center; gap: 6px;">
            <span>🏷️</span> <span>Loại sự kiện *</span>
          </label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px;">
            <label class="radio-option-card" id="cardEvTypeActivity" style="display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 12px; border: 1.5px solid var(--border-gold); background: rgba(212,175,55,0.12); cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="evTypeSelect" value="activity" checked style="margin-top: 3px; accent-color: var(--gold-color);">
              <div>
                <strong class="text-gold" style="display: block; font-size: 0.94rem; margin-bottom: 3px;">🎯 1. Hoạt Động Thường Kỳ</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.45;">Sinh hoạt thường kỳ, tập huấn chuyên môn. <em>(Tự động tính vào số Hoạt Động tham gia của kỳ thủ khi quét thẻ)</em></span>
              </div>
            </label>

            <label class="radio-option-card" id="cardEvTypeTournament" style="display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="evTypeSelect" value="tournament" style="margin-top: 3px; accent-color: #38bdf8;">
              <div>
                <strong class="text-cyan" style="display: block; font-size: 0.94rem; margin-bottom: 3px;">🏆 2. Giải Đấu Tranh Cúp</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.45;">Giải vô địch CLB, Cup TNU, giải cờ tranh cúp. <em>(Tự động tính vào số Giải Đấu tham gia của kỳ thủ khi quét thẻ)</em></span>
              </div>
            </label>
          </div>
        </div>

        <!-- Khung Thời gian tổ chức tách riêng Ngày & Giờ chuẩn đẹp -->
        <div class="card p-3 mb-3" style="background: rgba(15,23,42,0.65); border: 1px solid rgba(212,175,55,0.25); border-radius: 12px;">
          <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
            <span class="text-xs font-bold text-gold d-flex align-center gap-1">
              <span>🗓️</span> <span>THỜI GIAN TỔ CHỨC (CHUẨN NGÀY & KHUNG GIỜ)</span>
            </span>
            <span class="text-xs text-dim">Chọn từ lịch & đồng hồ</span>
          </div>

          <div class="form-row flex-wrap gap-3">
            <!-- Chọn ngày -->
            <div class="form-group flex-1" style="min-width: 170px; margin-bottom: 0;">
              <label class="form-label text-xs font-bold text-white mb-1">📅 Ngày tổ chức *</label>
              <input type="date" id="evDate" class="form-input" value="${defaultDate}" required style="font-family: var(--font-system); font-weight: 600;">
            </div>

            <!-- Giờ bắt đầu -->
            <div class="form-group" style="width: 130px; margin-bottom: 0;">
              <label class="form-label text-xs font-bold text-white mb-1">⏰ Giờ bắt đầu *</label>
              <input type="time" id="evTimeStart" class="form-input text-center" value="${defaultStart}" required style="font-family: var(--font-mono); font-weight: 700; color: var(--gold-light);">
            </div>

            <!-- Giờ kết thúc -->
            <div class="form-group" style="width: 130px; margin-bottom: 0;">
              <label class="form-label text-xs font-bold text-white mb-1">🏁 Giờ kết thúc *</label>
              <input type="time" id="evTimeEnd" class="form-input text-center" value="${defaultEnd}" required style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">
            </div>
          </div>

          <!-- Dòng xem trước thời gian thực chuẩn tiếng Việt -->
          <div class="mt-2 pt-2 d-flex align-center justify-between flex-wrap gap-2" style="border-top: 1px dashed rgba(255,255,255,0.08);">
            <span class="text-xs text-muted">Hiển thị chuẩn:</span>
            <span id="evDateTimePreview" class="badge badge-gold font-bold font-mono" style="font-size: 0.82rem; padding: 5px 12px; letter-spacing: 0.02em;">
              ${initialFormatted}
            </span>
          </div>
        </div>

        <!-- Địa điểm tổ chức -->
        <div class="form-group mb-3">
          <label class="form-label font-bold text-white mb-1">📍 Địa điểm tổ chức *</label>
          <input type="text" id="evLocation" class="form-input" value="Trung tâm Học liệu - CNTT - ĐHTN" placeholder="VD: Phòng Hội thảo tầng 2, Sảnh A...">
        </div>

        <!-- Mô tả -->
        <div class="form-group mb-2">
          <label class="form-label font-bold text-white mb-1">📝 Mô tả / Thể thức thi đấu</label>
          <textarea id="evDesc" class="form-textarea" rows="3" placeholder="Ví dụ: Thi đấu Thụy Sĩ 7 ván, thời gian 5 phút + 3 giây..."></textarea>
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

      const dateVal = modal.querySelector('#evDate')?.value || defaultDate;
      const startVal = modal.querySelector('#evTimeStart')?.value || defaultStart;
      const endVal = modal.querySelector('#evTimeEnd')?.value || defaultEnd;
      const finalDateTime = formatVnDateTime(dateVal, startVal, endVal);

      const newEv = store.addEvent({
        title,
        type: selectedType, // 'activity' | 'tournament'
        dateTime: finalDateTime,
        eventDate: dateVal,
        startTime: startVal,
        endTime: endVal,
        maxParticipants: null,
        location: modal.querySelector('#evLocation').value.trim() || 'CLB Cờ TNU - HGC',
        description: modal.querySelector('#evDesc').value.trim(),
        registrationOpen: false,
        status: 'upcoming'
      });

      // Kích hoạt ngay thông báo thiết bị cục bộ (Đổ chuông & Banner màn hình)
      const evLabel = selectedType === 'tournament' ? '🏆 GIẢI ĐẤU MỚI' : '🎯 HOẠT ĐỘNG MỚI';
      const evLoc = modal.querySelector('#evLocation').value.trim() || 'CLB Cờ TNU';
      const notifBody = `Thời gian: ${finalDateTime} • Địa điểm: ${evLoc}. Bấm để xem chi tiết!`;

      this.sendDevicePushNotification(
        `${evLabel}: ${title}`,
        notifBody,
        '/#events'
      );

      // Tự động phát sóng Web Push qua máy chủ Google FCM tới toàn thể điện thoại thành viên (Kể cả khi tắt web)
      pushNotificationService.broadcastPushNotification(
        `${evLabel}: ${title}`,
        notifBody,
        '/#events'
      ).then((res) => {
        if (res && res.sentCount > 0) {
          console.log(`Đã phát sóng thông báo tới ${res.sentCount} thiết bị thành viên.`);
        }
      }).catch((e) => console.warn('Broadcast push error:', e));

      modalManager.showAlert(`Đã lên lịch ${selectedType === 'tournament' ? 'giải đấu' : 'hoạt động'} mới thành công!\n(Thời gian: ${finalDateTime} • Đã kích hoạt thông báo tới các thiết bị!)`);
      return true;
    }, 'Tạo sự kiện');

    // Kích hoạt tương tác cập nhật ngày giờ & Radio card sau khi modal mở
    setTimeout(() => {
      const modalEl = document.getElementById('globalAppModal');
      if (!modalEl) return;

      const dateInp = modalEl.querySelector('#evDate');
      const startInp = modalEl.querySelector('#evTimeStart');
      const endInp = modalEl.querySelector('#evTimeEnd');
      const preview = modalEl.querySelector('#evDateTimePreview');

      const refreshPreview = () => {
        if (preview && dateInp && startInp && endInp) {
          preview.textContent = formatVnDateTime(dateInp.value, startInp.value, endInp.value);
        }
      };

      dateInp?.addEventListener('input', refreshPreview);
      dateInp?.addEventListener('change', refreshPreview);
      startInp?.addEventListener('input', refreshPreview);
      startInp?.addEventListener('change', refreshPreview);
      endInp?.addEventListener('input', refreshPreview);
      endInp?.addEventListener('change', refreshPreview);

      // Radio Selection highlight
      const cardActivity = modalEl.querySelector('#cardEvTypeActivity');
      const cardTournament = modalEl.querySelector('#cardEvTypeTournament');
      modalEl.querySelectorAll('input[name="evTypeSelect"]').forEach((r) => {
        r.addEventListener('change', (e) => {
          if (e.target.value === 'tournament') {
            if (cardTournament) {
              cardTournament.style.borderColor = '#38bdf8';
              cardTournament.style.background = 'rgba(56,189,248,0.12)';
            }
            if (cardActivity) {
              cardActivity.style.borderColor = 'rgba(255,255,255,0.1)';
              cardActivity.style.background = 'rgba(255,255,255,0.02)';
            }
          } else {
            if (cardActivity) {
              cardActivity.style.borderColor = 'var(--border-gold)';
              cardActivity.style.background = 'rgba(212,175,55,0.12)';
            }
            if (cardTournament) {
              cardTournament.style.borderColor = 'rgba(255,255,255,0.1)';
              cardTournament.style.background = 'rgba(255,255,255,0.02)';
            }
          }
        });
      });
    }, 50);
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
    this.adminSubView = isMobile ? 'admin-checkin' : (this.adminSubView || 'admin-overview');

    // NẾU Ở GIAO DIỆN ĐIỆN THOẠI (MOBILE): CHỈ HIỂN THỊ DUY NHẤT PHẦN QUÉT QR ĐIỂM DANH
    if (isMobile) {
      container.innerHTML = `
        <div class="admin-dashboard-view admin-mobile-scanner-only animate-fadeIn" style="max-width: 600px; margin: 0 auto; padding: 4px;">
          <!-- Chứa duy nhất phần quét QR và nhật ký điểm danh -->
          <div id="adminActualSubContent"></div>
        </div>
      `;

      const targetPane = container.querySelector('#adminActualSubContent');
      this.renderAdminCheckin(targetPane);
      return;
    }

    // GIAO DIỆN DESKTOP: ĐẦY ĐỦ SIDEBAR VÀ CÁC SUBVIEWS QUẢN TRỊ
    const state = store.getState();

    container.innerHTML = `
      <div class="admin-dashboard-view animate-fadeIn">
        <div class="admin-layout-container">
          <!-- Admin Sidebar Navigation (Desktop only) -->
          <aside class="admin-sidebar">
            <div class="admin-sidebar-header" style="display: flex; align-items: center; justify-content: center; padding: 10px 14px 14px;">
              <div class="admin-role-badge" style="font-size: 0.8rem; padding: 5px 14px; border-radius: 20px; border: 1px solid rgba(212,175,55,0.45); color: var(--gold-light); background: rgba(212,175,55,0.12); white-space: nowrap; font-weight: 700; width: 100%; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>👑</span> Quản Trị Viên
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-overview' ? 'active' : ''}" data-sub="admin-overview">
              <div class="admin-nav-left">
                <span>📊</span> <span>Tổng quan</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-checkin' ? 'active' : ''}" data-sub="admin-checkin">
              <div class="admin-nav-left">
                <span>📷</span> <span>Điểm danh</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-proofs' ? 'active' : ''}" data-sub="admin-proofs">
              <div class="admin-nav-left">
                <span>📱</span> <span>Xác nhận minh chứng</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-users' ? 'active' : ''}" data-sub="admin-users">
              <div class="admin-nav-left">
                <span>👥</span> <span>Thành viên</span>
              </div>
              ${(state.pendingApplications || []).length > 0 
                ? `<span class="badge badge-rose" style="padding: 1px 7px; font-size: 0.72rem; border-radius: 10px;">${state.pendingApplications.length} đơn</span>` 
                : `<span class="admin-nav-badge">${state.members.length}</span>`}
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-events' ? 'active' : ''}" data-sub="admin-events">
              <div class="admin-nav-left">
                <span>🏆</span> <span>Giải đấu - Sự kiện</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-swiss' ? 'active' : ''}" data-sub="admin-swiss">
              <div class="admin-nav-left">
                <span>⚔️</span> <span>Xếp bảng</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-funds' ? 'active' : ''}" data-sub="admin-funds">
              <div class="admin-nav-left">
                <span>💰</span> <span>Quản lý Quỹ CLB</span>
              </div>
            </div>

            <div class="admin-nav-item ${this.adminSubView === 'admin-cms' ? 'active' : ''}" data-sub="admin-cms">
              <div class="admin-nav-left">
                <span>📝</span> <span>Quản trị CMS Tin bài</span>
              </div>
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
            </div>
          </aside>

          <!-- Main Admin Content Pane -->
          <main class="admin-content-pane" id="adminSubContentPane">
            <div id="adminActualSubContent"></div>
          </main>
        </div>
      </div>
    `;

    // Bind admin sidebar tabs with in-place static transition
    container.querySelectorAll('.admin-nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const sub = item.getAttribute('data-sub');
        if (!sub || this.adminSubView === sub) return;

        sound.playClick();
        if (sub === 'admin-firebase' && !this.firebaseUnlocked) {
          this.promptFirebasePassword(() => {
            this.firebaseUnlocked = true;
            this.switchAdminSubView(container, 'admin-firebase');
          });
          return;
        }
        this.switchAdminSubView(container, sub);
      });
    });

    const pane = container.querySelector('#adminSubContentPane');
    this.renderAdminSubView(pane);
  }

  switchAdminSubView(container, sub) {
    this.adminSubView = sub;
    container.querySelectorAll('.admin-nav-item').forEach((it) => {
      it.classList.toggle('active', it.getAttribute('data-sub') === sub);
    });
    const pane = container.querySelector('#adminSubContentPane');
    if (pane) {
      this.renderAdminSubView(pane);
    } else {
      this.renderAdminDashboard(container);
    }
  }

  renderAdminSubView(container) {
    if (!container) return;
    const targetPane = container.querySelector('#adminActualSubContent') || container;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.adminSubView = 'admin-checkin';
      this.renderAdminCheckin(targetPane);
      return;
    }

    switch (this.adminSubView) {
      case 'admin-overview':
        this.renderAdminOverview(targetPane);
        break;
      case 'admin-checkin':
        this.renderAdminCheckin(targetPane);
        break;
      case 'admin-proofs':
        this.renderAdminProofs(targetPane);
        break;
      case 'admin-users':
        this.renderAdminUsers(targetPane);
        break;
      case 'admin-events':
        this.renderAdminEvents(targetPane);
        break;
      case 'admin-swiss':
        this.renderAdminSwiss(targetPane);
        break;
      case 'admin-funds':
        this.renderAdminFunds(targetPane);
        break;
      case 'admin-cms':
        this.renderAdminCms(targetPane);
        break;
      case 'admin-analytics':
        this.renderAdminAnalytics(targetPane);
        break;
      case 'admin-firebase':
        if (!this.firebaseUnlocked) {
          this.adminSubView = 'admin-overview';
          this.renderAdminOverview(targetPane);
        } else {
          this.renderAdminFirebase(targetPane);
        }
        break;
      default:
        this.renderAdminOverview(targetPane);
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

    const sortedClasses = Object.entries(classCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const palette = [
      '#d4af37', // Gold
      '#38bdf8', // Sky Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#f43f5e', // Rose
      '#14b8a6', // Teal
      '#a855f7', // Violet
      '#eab308', // Yellow
      '#6366f1', // Indigo
      '#84cc16', // Lime
      '#fb923c', // Orange
      '#22d3ee', // Light Cyan
      '#94a3b8'  // Slate
    ];

    // Hiển thị toàn bộ tất cả các lớp của hội viên trong CLB
    const segments = sortedClasses.map(([label, count], idx) => ({
      label,
      count,
      value: totalMembers ? Math.round((count / totalMembers) * 100) : 0,
      color: palette[idx % palette.length]
    }));

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

        <!-- Quick Charts Row (Hiển thị đầy đủ tất cả các lớp) -->
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
    if (donutCanvas) {
      chartHelper.renderDonutChart(donutCanvas, segments, totalMembers);

      if (window.ResizeObserver && donutCanvas.parentElement) {
        const ro = new ResizeObserver(() => {
          chartHelper.renderDonutChart(donutCanvas, segments, totalMembers);
        });
        ro.observe(donutCanvas.parentElement);
      }
    }
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

  // ==========================================
  // Admin Sub: Xác Nhận Minh Chứng (Fanpage)
  // ==========================================
  renderAdminProofs(container) {
    const state = store.getState();
    const members = state.members || [];
    const proofEvents = (state.events || []).filter((ev) => isProofEvent(ev));

    if (!this.simpleProofState) {
      this.simpleProofState = {
        title: '',
        selectedIds: new Set(),
        searchQuery: ''
      };
    }

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const query = (this.simpleProofState.searchQuery || '').trim().toLowerCase();
    const filteredMembers = members.filter((m) => {
      if (!query) return true;
      const name = (m.name || m.fullName || '').toLowerCase();
      const studentId = (m.studentId || '').toLowerCase();
      const unit = (m.university || m.faculty || m.class || '').toLowerCase();
      return name.includes(query) || studentId.includes(query) || unit.includes(query);
    });

    const selectedCount = this.simpleProofState.selectedIds.size;

    container.innerHTML = `
      <div class="admin-sub-proofs animate-fadeIn p-1">
        <div class="mb-3">
          <span class="badge badge-gold font-bold">⚡ XÁC NHẬN MINH CHỨNG</span>
          <h2 class="text-xl font-bold text-white mt-1">Xác Nhận Minh Chứng Hoạt Động (Fanpage)</h2>
          <p class="text-muted text-xs mb-0">BĐH theo dõi minh chứng thành viên gửi trên Zalo ➔ Nhập tên bài ➔ Tích chọn người nộp ➔ Xác nhận cộng điểm hoạt động.</p>
        </div>

        <div class="card p-3 mb-4">
          <!-- 1. Tên bài viết -->
          <div class="form-group mb-3">
            <label class="form-label text-gold font-bold text-xs mb-1">
              1. Thêm Tên Bài Viết / Hoạt Động:
            </label>
            <input type="text" class="form-control text-white" id="simpleProofTitleInput" value="${escapeHtml(this.simpleProofState.title)}" placeholder="Ví dụ: Chia sẻ bài tuyển thành viên, bài khai mạc giải cờ..." style="font-size: 0.88rem;">
          </div>

          <!-- 2. Tích chọn người đã gửi minh chứng -->
          <div class="form-group mb-3">
            <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
              <label class="form-label text-gold font-bold text-xs mb-0">
                2. Tích Chọn Thành Viên Đã Gửi Minh Chứng:
              </label>
              <div class="d-flex gap-1.5 align-center flex-wrap">
                <input type="text" class="form-control form-control-sm" id="simpleProofSearchInput" value="${escapeHtml(this.simpleProofState.searchQuery)}" placeholder="🔍 Tìm nhanh tên hoặc MSSV..." style="width: 220px; font-size: 0.8rem;">
                <button type="button" class="btn btn-xs btn-outline" id="btnSimpleSelectAll">Chọn tất cả</button>
                <button type="button" class="btn btn-xs btn-outline" id="btnSimpleUnselectAll">Bỏ chọn</button>
              </div>
            </div>

            <div class="table-responsive" style="max-height: 380px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;">
              <table class="data-table" style="font-size: 0.82rem; margin-bottom: 0;">
                <thead style="position: sticky; top: 0; background: #161a23; z-index: 2;">
                  <tr>
                    <th style="width: 50px; text-align: center;">Tích</th>
                    <th style="width: 45px; text-align: center;">STT</th>
                    <th>Họ và Tên</th>
                    <th style="width: 120px;">MSSV / Mã Thẻ</th>
                    <th>Khoa / Lớp</th>
                    <th style="text-align: center; width: 110px;">Hoạt Động Hiện Tại</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredMembers.length === 0 ? `
                    <tr>
                      <td colspan="6" class="text-center text-muted p-4">Không tìm thấy thành viên phù hợp.</td>
                    </tr>
                  ` : filteredMembers.map((m, idx) => {
                    const isChecked = this.simpleProofState.selectedIds.has(m.id);
                    return `
                      <tr style="${isChecked ? 'background: rgba(212,175,55,0.08);' : ''}">
                        <td style="text-align: center; vertical-align: middle;">
                          <input type="checkbox" class="simple-chk-member" data-id="${m.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 17px; height: 17px; accent-color: var(--gold-primary);">
                        </td>
                        <td style="text-align: center; vertical-align: middle;" class="text-dim">${idx + 1}</td>
                        <td style="vertical-align: middle;">
                          <strong class="text-white">${escapeHtml(m.name || m.fullName)}</strong>
                        </td>
                        <td style="vertical-align: middle;" class="font-mono text-xs text-gold">${escapeHtml(m.studentId || m.id || '-')}</td>
                        <td style="vertical-align: middle;" class="text-xs text-muted">${escapeHtml(m.university || m.faculty || m.class || 'CLB Cờ')}</td>
                        <td style="text-align: center; vertical-align: middle;">
                          <span class="badge badge-gold font-bold">${m.activitiesJoined || 0}</span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. Xác nhận và cộng điểm -->
          <div class="d-flex justify-between align-center flex-wrap gap-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.08);">
            <span class="text-xs text-muted">
              Đang chọn: <strong class="text-gold" id="simpleCountLabel">${selectedCount}</strong> thành viên
            </span>
            <button type="button" class="btn btn-gold btn-sm font-bold" id="btnSimpleSubmitProofs" style="padding: 7px 18px;" ${selectedCount === 0 ? 'disabled' : ''}>
              ⚡ Xác Nhận & Cộng +1 Hoạt Động
            </button>
          </div>
        </div>

        <!-- 4. Danh sách các đợt minh chứng đã xác nhận (Hiện tại trang minh chứng) -->
        <div class="proof-history-section card p-3" style="background: rgba(11, 17, 32, 0.85); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px;">
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <div>
              <span class="badge badge-gold font-bold">📜 LỊCH SỬ MINH CHỨNG ĐÃ GHI NHẬN</span>
              <h3 class="text-base font-bold text-white mt-1 mb-0">Danh Sách Hoạt Động Minh Chứng</h3>
              <p class="text-muted text-xs mb-0">Lưu trữ các đợt duyệt Fanpage/Zalo. Dữ liệu hiển thị trực tiếp tại đây thay vì trang Lịch trình hoạt động.</p>
            </div>
            <span class="badge badge-cyan font-bold">${proofEvents.length} đợt minh chứng</span>
          </div>

          ${proofEvents.length === 0 ? `
            <div class="p-4 text-center text-muted" style="border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px;">
              <div style="font-size: 2.2rem; margin-bottom: 6px;">📱</div>
              <p class="text-white font-medium mb-1">Chưa có đợt minh chứng nào được xác nhận.</p>
              <p class="text-xs text-muted mb-0">Khi bạn xác nhận minh chứng ở trên, đợt duyệt sẽ hiển thị ngay tại bảng này.</p>
            </div>
          ` : `
            <div class="d-flex flex-column gap-3">
              ${proofEvents.map((pev, pIdx) => {
                const approvedList = (pev.registeredMembers || []).map((mId) => members.find((m) => m.id === mId)).filter(Boolean);
                return `
                  <div class="card p-3" style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(212,175,55,0.22); border-radius: 10px;">
                    <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                      <div class="d-flex align-center gap-2 flex-wrap">
                        <span class="badge badge-gold font-bold text-xs">#${pIdx + 1}</span>
                        <h4 class="text-white font-bold text-sm mb-0">${escapeHtml(pev.title)}</h4>
                        <span class="badge badge-cyan text-xs">👥 ${approvedList.length} thành viên</span>
                      </div>
                      <div class="d-flex align-center gap-2">
                        <span class="text-xs text-dim font-mono">🗓️ ${pev.date || pev.dateTime || 'Hôm nay'} ${pev.time ? `• ${pev.time}` : ''}</span>
                        <button type="button" class="btn btn-danger btn-xs btn-del-proof-campaign" data-campaign-id="${pev.id}" title="Xóa đợt minh chứng này và trừ lại 1 điểm hoạt động">
                          🗑️ Xóa đợt
                        </button>
                      </div>
                    </div>

                    <!-- Bảng danh sách thành viên trong đợt minh chứng này -->
                    <div class="table-responsive" style="max-height: 240px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;">
                      <table class="data-table" style="font-size: 0.78rem; margin-bottom: 0;">
                        <thead style="position: sticky; top: 0; background: #111827; z-index: 1;">
                          <tr>
                            <th style="width: 40px; text-align: center;">STT</th>
                            <th>Họ và Tên</th>
                            <th style="width: 120px;">MSSV / Mã</th>
                            <th>Khoa / Lớp</th>
                            <th style="width: 90px; text-align: center;">Tổng Hoạt Động</th>
                            <th style="width: 75px; text-align: center;">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${approvedList.length === 0 ? `
                            <tr>
                              <td colspan="6" class="text-center text-muted p-2">Không còn thành viên nào trong đợt này.</td>
                            </tr>
                          ` : approvedList.map((m, mIdx) => `
                            <tr>
                              <td style="text-align: center;" class="text-dim">${mIdx + 1}</td>
                              <td><strong class="text-white">${escapeHtml(m.name || m.fullName)}</strong></td>
                              <td class="font-mono text-gold text-xs">${escapeHtml(m.studentId || m.id || '-')}</td>
                              <td class="text-muted text-xs">${escapeHtml(m.university || m.faculty || m.class || 'CLB Cờ')}</td>
                              <td style="text-align: center;">
                                <span class="badge badge-gold font-bold">${m.activitiesJoined || 0}</span>
                              </td>
                              <td style="text-align: center;">
                                <button type="button" class="btn btn-outline btn-xs btn-revert-member-proof" data-campaign-id="${pev.id}" data-member-id="${m.id}" title="Hủy xác nhận cho thành viên này" style="color: #f87171; border-color: rgba(248,113,113,0.3); padding: 2px 7px;">
                                  ❌ Hủy
                                </button>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.bindAdminProofsEvents(container);
  }

  bindAdminProofsEvents(container) {
    const titleInput = container.querySelector('#simpleProofTitleInput');
    titleInput?.addEventListener('input', (e) => {
      this.simpleProofState.title = e.target.value;
    });

    const searchInput = container.querySelector('#simpleProofSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.simpleProofState.searchQuery = e.target.value;
      this.renderAdminProofs(container);
      const newInp = container.querySelector('#simpleProofSearchInput');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
      }
    });

    container.querySelectorAll('.simple-chk-member').forEach((chk) => {
      chk.addEventListener('change', () => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) {
          this.simpleProofState.selectedIds.add(id);
        } else {
          this.simpleProofState.selectedIds.delete(id);
        }
        const count = this.simpleProofState.selectedIds.size;
        const countLabel = container.querySelector('#simpleCountLabel');
        const submitBtn = container.querySelector('#btnSimpleSubmitProofs');
        if (countLabel) countLabel.textContent = count;
        if (submitBtn) submitBtn.disabled = count === 0;
      });
    });

    container.querySelector('#btnSimpleSelectAll')?.addEventListener('click', () => {
      sound.playClick();
      container.querySelectorAll('.simple-chk-member').forEach((chk) => {
        chk.checked = true;
        const id = chk.getAttribute('data-id');
        this.simpleProofState.selectedIds.add(id);
      });
      const count = this.simpleProofState.selectedIds.size;
      const countLabel = container.querySelector('#simpleCountLabel');
      const submitBtn = container.querySelector('#btnSimpleSubmitProofs');
      if (countLabel) countLabel.textContent = count;
      if (submitBtn) submitBtn.disabled = count === 0;
    });

    container.querySelector('#btnSimpleUnselectAll')?.addEventListener('click', () => {
      sound.playClick();
      this.simpleProofState.selectedIds.clear();
      container.querySelectorAll('.simple-chk-member').forEach((chk) => {
        chk.checked = false;
      });
      const countLabel = container.querySelector('#simpleCountLabel');
      const submitBtn = container.querySelector('#btnSimpleSubmitProofs');
      if (countLabel) countLabel.textContent = '0';
      if (submitBtn) submitBtn.disabled = true;
    });

    container.querySelector('#btnSimpleSubmitProofs')?.addEventListener('click', () => {
      sound.playClick();
      const ids = Array.from(this.simpleProofState.selectedIds);
      if (ids.length === 0) {
        modalManager.showAlert('Vui lòng tích chọn ít nhất 1 thành viên!');
        return;
      }
      const title = (this.simpleProofState.title || '').trim() || 'Hoạt động chia sẻ Fanpage';

      try {
        const res = store.approveFanpageProofs({
          campaignTitle: title,
          memberIds: ids,
          note: 'Xác nhận minh chứng Zalo'
        });
        sound.playSuccess();
        modalManager.showAlert(`✅ Đã cộng +1 hoạt động cho ${res.approvedCount} thành viên thành công! Minh chứng đã được lưu vào danh sách bên dưới.`);
        this.simpleProofState.title = '';
        this.simpleProofState.selectedIds.clear();
        this.renderAdminProofs(container);
        this.renderNotificationsList();
      } catch (err) {
        modalManager.showAlert('Lỗi: ' + err.message);
      }
    });

    // Xóa toàn bộ đợt minh chứng
    container.querySelectorAll('.btn-del-proof-campaign').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const campaignId = btn.getAttribute('data-campaign-id');
        const stateNow = store.getState();
        const ev = stateNow.events.find((e) => e.id === campaignId);
        if (!ev) return;

        modalManager.showConfirm(
          `Bạn có chắc chắn muốn xóa đợt minh chứng [${ev.title}]?\nHệ thống sẽ tự động trừ lại 1 lượt tham gia hoạt động của tất cả thành viên trong đợt này.`,
          () => {
            store.deleteFanpageProofCampaign(campaignId);
            sound.playSuccess();
            modalManager.showAlert(`Đã xóa đợt minh chứng [${ev.title}] thành công!`);
            this.renderAdminProofs(container);
            this.renderNotificationsList();
          },
          null,
          { title: 'XÁC NHẬN XÓA ĐỢT MINH CHỨNG', confirmText: '🗑️ Xóa đợt minh chứng', danger: true }
        );
      });
    });

    // Hủy minh chứng cho 1 thành viên cụ thể
    container.querySelectorAll('.btn-revert-member-proof').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const campaignId = btn.getAttribute('data-campaign-id');
        const memberId = btn.getAttribute('data-member-id');
        const stateNow = store.getState();
        const member = (stateNow.members || []).find((m) => m.id === memberId);
        const mName = member?.name || member?.fullName || 'thành viên';

        modalManager.showConfirm(
          `Hủy xác nhận minh chứng và trừ lại 1 điểm hoạt động cho kỳ thủ [${mName}]?`,
          () => {
            store.revertFanpageProof(campaignId, memberId);
            sound.playSuccess();
            modalManager.showAlert(`Đã hủy minh chứng cho kỳ thủ [${mName}]!`);
            this.renderAdminProofs(container);
            this.renderNotificationsList();
          },
          null,
          { title: 'HỦY MINH CHỨNG THÀNH VIÊN', confirmText: '❌ Xác nhận hủy', danger: true }
        );
      });
    });
  }

  // Admin Sub 3: Users & Alumni Management (4 Tabs)
  renderAdminUsers(container) {
    const pane = container || document.getElementById('adminSubContentPane');
    if (!pane) return;
    const state = store.getState();
    const pendingCount = (state.pendingApplications || []).length;
    if (!this._userSelectedUserSubTab && pendingCount > 0) {
      this.adminUserSubTab = 'pending';
    } else {
      this.adminUserSubTab = this.adminUserSubTab || (pendingCount > 0 ? 'pending' : 'active');
    }

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
        this._userSelectedUserSubTab = true;
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
    const events = (state.events || []).filter((ev) => !isProofEvent(ev));

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
                ${events.length === 0 ? `
                  <tr>
                    <td colspan="8" class="text-center text-muted p-4">Hiện chưa có hoạt động nào. Hãy bấm "+ Lên Lịch Sự Kiện Mới" để tạo!</td>
                  </tr>
                ` : events.map((ev) => `
                  <tr>
                    <td data-label="Mã"><span class="font-mono text-xs text-gold">${ev.id}</span></td>
                    <td data-label="Tên"><strong class="text-white">${ev.title}</strong></td>
                    <td data-label="Phân Loại">
                      ${ev.type === 'tournament' 
                        ? '<span class="badge badge-cyan">🏆 Giải Đấu</span>' 
                        : '<span class="badge badge-gold">🎯 Hoạt Động</span>'
                      }
                    </td>
                    <td data-label="Thời Gian">
                      <span class="badge badge-outline text-xs font-mono font-semibold" style="letter-spacing: 0.01em; padding: 4px 8px; border-color: rgba(255,255,255,0.15); color: #e2e8f0; white-space: normal; line-height: 1.4;">
                        🗓️ ${ev.dateTime || 'Chưa định'}
                      </span>
                    </td>
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
            <h2 class="text-xl font-bold">⚔️ Xếp Bảng (Hệ Thụy Sĩ)</h2>
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
              const standings = swiss.standings || [];
              const isCompleted = swiss.status === 'completed';
              const isFinalRound = swiss.currentRound >= swiss.totalRounds;

              return `
                <div class="card p-3 mb-3">
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
                      <p class="text-xs text-muted mb-0">💡 Nhấn chọn kết quả ván đấu (lưu tức thì, không chớp màn hình). Điểm số và thứ hạng sẽ được tính khi bấm "Bốc Thăm Vòng Tiếp" hoặc "Xác Nhận Kết Quả".</p>
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

                <!-- KHU VỰC THAO TÁC TIẾP TỤC / XÁC NHẬN KẾT QUẢ -->
                ${!isFinalRound ? `
                  <div class="card p-3 mb-3 d-flex justify-between align-center flex-wrap gap-2" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
                    <div>
                      <span class="text-sm font-bold text-white">Hoàn thành Vòng ${swiss.currentRound}?</span>
                      <p class="text-xs text-muted mb-0">Sau khi đã chọn kết quả các bàn đấu, nhấn nút bên cạnh để tính điểm và bốc thăm vòng tiếp theo.</p>
                    </div>
                    <button type="button" class="btn btn-gold font-bold" id="btnGenerateNextRoundSwiss">
                      🔄 Bốc Thăm Vòng ${swiss.currentRound + 1}
                    </button>
                  </div>
                ` : `
                  <div class="card p-3 mb-3" style="background: linear-gradient(135deg, rgba(212,175,55,0.16), rgba(15,23,42,0.95)); border: 2px solid var(--gold-primary);">
                    <div class="d-flex justify-between align-center flex-wrap gap-3">
                      <div>
                        <div class="d-flex align-center gap-2 mb-1">
                          <span class="badge ${isCompleted ? 'badge-emerald' : 'badge-gold'} font-bold">
                            ${isCompleted ? '🏁 ĐÃ XÁC NHẬN KẾT QUẢ' : `🏁 VÒNG CUỐI CÙNG (${swiss.totalRounds}/${swiss.totalRounds})`}
                          </span>
                          <h4 class="font-bold text-white text-base mb-0">
                            ${isCompleted ? 'KẾT QUẢ GIẢI ĐẤU ĐÃ ĐƯỢC CHỐT' : 'XÁC NHẬN KẾT QUẢ GIẢI ĐẤU'}
                          </h4>
                        </div>
                        <p class="text-xs text-muted mb-0">
                          ${isCompleted 
                            ? 'Bảng xếp hạng chung cuộc theo đúng 5 tiêu chí Swiss-Manager đã được tính toán chính xác bên dưới.' 
                            : 'Sau khi chọn kết quả cho tất cả các bàn đấu của vòng cuối cùng, nhấn nút bên cạnh để chốt và hiển thị kết quả cuối cùng luôn.'}
                        </p>
                      </div>
                      <div class="d-flex gap-2">
                        <button type="button" class="btn btn-gold font-bold" id="btnFinalizeSwissTournament" style="font-size: 0.95rem; padding: 8px 20px;">
                          ${isCompleted ? '🏆 Tính Lại / Chốt Kết Quả' : '🏆 Xác Nhận Kết Quả Chung Cuộc'}
                        </button>
                      </div>
                    </div>
                  </div>
                `}

                <!-- KẾT QUẢ CHUNG CUỘC HOẶC BẢNG XẾP HẠNG TẠM THỜI -->
                ${isCompleted ? `
                  <div class="card p-4 mb-4" style="background: linear-gradient(135deg, rgba(212,175,55,0.18), rgba(30,41,59,0.95)); border: 2px solid var(--gold-primary); box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                    <div class="text-center mb-4">
                      <span class="badge badge-gold" style="font-size: 0.75rem; letter-spacing: 1px;">KẾT QUẢ CHUNG CUỘC</span>
                      <h2 class="font-bold text-gold text-2xl mt-1 mb-1">🏆 BẢNG VÀNG DANH DỰ</h2>
                      <p class="text-xs text-muted mb-0">Vinh danh các kỳ thủ xuất sắc nhất giải đấu [${curEvent.title}]</p>
                    </div>

                    <!-- Bục vinh quang Top 3 -->
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;" class="mb-4">
                      ${standings[0] ? `
                        <div style="flex: 1; min-width: 220px; max-width: 280px; background: rgba(212,175,55,0.15); border: 2px solid var(--gold-primary); border-radius: 12px; padding: 20px; text-align: center;">
                          <div style="font-size: 2.8rem; margin-bottom: 4px;">🥇</div>
                          <span class="badge badge-gold font-bold" style="font-size: 0.75rem;">QUÁN QUÂN</span>
                          <h3 class="font-bold text-gold text-lg mt-2 mb-1">${standings[0].name}</h3>
                          <p class="text-xs text-dim mb-2">${standings[0].unit || 'CLB Cờ TNU'}</p>
                          <div class="d-flex justify-center gap-2 mt-2">
                            <span class="badge badge-outline text-gold font-bold">${standings[0].score} Điểm</span>
                            <span class="badge badge-outline text-cyan">BH: ${standings[0].buchholz}</span>
                          </div>
                        </div>
                      ` : ''}

                      ${standings[1] ? `
                        <div style="flex: 1; min-width: 220px; max-width: 280px; background: rgba(56,189,248,0.08); border: 1.5px solid #38bdf8; border-radius: 12px; padding: 20px; text-align: center;">
                          <div style="font-size: 2.8rem; margin-bottom: 4px;">🥈</div>
                          <span class="badge badge-outline text-cyan font-bold" style="font-size: 0.75rem; border-color: #38bdf8;">Á QUÂN</span>
                          <h3 class="font-bold text-white text-lg mt-2 mb-1">${standings[1].name}</h3>
                          <p class="text-xs text-dim mb-2">${standings[1].unit || 'CLB Cờ TNU'}</p>
                          <div class="d-flex justify-center gap-2 mt-2">
                            <span class="badge badge-outline font-bold">${standings[1].score} Điểm</span>
                            <span class="badge badge-outline text-cyan">BH: ${standings[1].buchholz}</span>
                          </div>
                        </div>
                      ` : ''}

                      ${standings[2] ? `
                        <div style="flex: 1; min-width: 220px; max-width: 280px; background: rgba(16,185,129,0.08); border: 1.5px solid #10b981; border-radius: 12px; padding: 20px; text-align: center;">
                          <div style="font-size: 2.8rem; margin-bottom: 4px;">🥉</div>
                          <span class="badge badge-outline text-emerald font-bold" style="font-size: 0.75rem; border-color: #10b981;">QUÝ QUÂN</span>
                          <h3 class="font-bold text-white text-lg mt-2 mb-1">${standings[2].name}</h3>
                          <p class="text-xs text-dim mb-2">${standings[2].unit || 'CLB Cờ TNU'}</p>
                          <div class="d-flex justify-center gap-2 mt-2">
                            <span class="badge badge-outline font-bold">${standings[2].score} Điểm</span>
                            <span class="badge badge-outline text-cyan">BH: ${standings[2].buchholz}</span>
                          </div>
                        </div>
                      ` : ''}
                    </div>

                    <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
                      <div>
                        <h4 class="font-bold text-gold text-sm mb-0">
                          📊 BẢNG KẾT QUẢ CHUNG CUỘC (5 TIÊU CHÍ SWISS-MANAGER)
                        </h4>
                        <p class="text-xs text-muted mb-0">
                          Trình tự: 1. Điểm ván [1] ➔ 2. Đối kháng (DE) [81] ➔ 3. Buchholz [37] ➔ 4. Điểm ván Đen [76] ➔ 5. Số ván thắng [68]
                        </p>
                      </div>
                      <button type="button" class="btn btn-outline btn-xs" id="btnExportFinalStandingsCsv" style="border-color: #38bdf8; color: #38bdf8;">
                        📥 Xuất Bảng Kết Quả (CSV)
                      </button>
                    </div>

                    <div class="table-responsive">
                      <table class="data-table" style="font-size: 0.82rem;">
                        <thead>
                          <tr>
                            <th style="width: 50px; text-align: center;">Hạng</th>
                            <th>Kỳ Thủ</th>
                            <th style="text-align: center; width: 70px;">Giới tính</th>
                            <th>Đơn vị</th>
                            <th style="text-align: center; width: 85px;" title="Điểm (điểm ván) [1]">Điểm (Pts)</th>
                            <th style="text-align: center; width: 85px;" title="Đối kháng trực tiếp [81]">Đối Kháng</th>
                            <th style="text-align: center; width: 85px;" title="Hệ số Buchholz [37]">Buchholz</th>
                            <th style="text-align: center; width: 85px;" title="Điểm ván riêng cho Trắng và Đen (Điểm ván Đen) [76]">Điểm Đen</th>
                            <th style="text-align: center; width: 70px;" title="Số ván thắng [68]">Thắng</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${standings.map((p, idx) => `
                            <tr>
                              <td class="font-bold text-center ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-cyan' : idx === 2 ? 'text-emerald' : 'text-muted'}">
                                ${idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : (idx + 1)}
                              </td>
                              <td>
                                <strong class="text-white">${p.name}</strong>
                                <span class="text-xs text-muted font-mono" style="margin-left: 4px;">(${p.studentId || p.phone || 'KT'})</span>
                              </td>
                              <td style="text-align: center;">
                                <span class="badge ${p.gender === 'Nữ' ? 'badge-pink' : 'badge-outline'}" style="font-size: 10px;">${p.gender || 'Nam'}</span>
                              </td>
                              <td class="text-dim">${p.unit || '-'}</td>
                              <td style="text-align: center;">
                                <span class="badge badge-gold font-bold" style="font-size: 0.85rem;">${p.score}</span>
                              </td>
                              <td style="text-align: center; color: var(--gold-secondary); font-weight: 600;">
                                ${p.playedAgainstTied ? p.directEncounterScore : '-'}
                              </td>
                              <td style="text-align: center; color: var(--accent-cyan); font-weight: 700;">
                                ${p.buchholz}
                              </td>
                              <td style="text-align: center; color: #a78bfa; font-weight: 600;">
                                ${p.blackPoints || 0}
                              </td>
                              <td style="text-align: center; font-weight: 600;">
                                ${p.wins || 0}
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ` : `
                  <div class="card p-3">
                    <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
                      <div>
                        <h3 class="font-bold text-gold text-base mb-1">
                          📊 Bảng Xếp Hạng Hệ Thụy Sĩ (Swiss-Manager)
                        </h3>
                        <p class="text-xs text-muted mb-0">Trình tự: 1. Điểm ván [1] ➔ 2. Đối kháng (DE) [81] ➔ 3. Buchholz [37] ➔ 4. Điểm ván Đen [76] ➔ 5. Số ván thắng [68]</p>
                      </div>
                      <button type="button" class="btn btn-outline btn-xs" id="btnExportFinalStandingsCsv" style="border-color: #38bdf8; color: #38bdf8;">
                        📥 Xuất Bảng (CSV)
                      </button>
                    </div>

                    <div class="table-responsive">
                      <table class="data-table" style="font-size: 0.82rem;">
                        <thead>
                          <tr>
                            <th style="width: 50px; text-align: center;">Hạng</th>
                            <th>Kỳ Thủ</th>
                            <th style="text-align: center; width: 70px;">Giới tính</th>
                            <th>Đơn vị</th>
                            <th style="text-align: center; width: 85px;">Điểm (Pts)</th>
                            <th style="text-align: center; width: 85px;">Đối Kháng</th>
                            <th style="text-align: center; width: 85px;">Buchholz</th>
                            <th style="text-align: center; width: 85px;">Điểm Đen</th>
                            <th style="text-align: center; width: 70px;">Thắng</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${standings.map((p, idx) => `
                            <tr>
                              <td class="font-bold text-center ${idx === 0 ? 'text-gold' : idx === 1 ? 'text-cyan' : idx === 2 ? 'text-emerald' : 'text-muted'}">
                                ${idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : (idx + 1)}
                              </td>
                              <td>
                                <strong class="text-white">${p.name}</strong>
                                <span class="text-xs text-muted font-mono" style="margin-left: 4px;">(${p.studentId || p.phone || 'KT'})</span>
                              </td>
                              <td style="text-align: center;">
                                <span class="badge ${p.gender === 'Nữ' ? 'badge-pink' : 'badge-outline'}" style="font-size: 10px;">${p.gender || 'Nam'}</span>
                              </td>
                              <td class="text-dim">${p.unit || '-'}</td>
                              <td style="text-align: center;">
                                <span class="badge badge-gold font-bold" style="font-size: 0.85rem;">${p.score}</span>
                              </td>
                              <td style="text-align: center; color: var(--gold-secondary); font-weight: 600;">
                                ${p.playedAgainstTied ? p.directEncounterScore : '-'}
                              </td>
                              <td style="text-align: center; color: var(--accent-cyan); font-weight: 700;">
                                ${p.buchholz}
                              </td>
                              <td style="text-align: center; color: #a78bfa; font-weight: 600;">
                                ${p.blackPoints || 0}
                              </td>
                              <td style="text-align: center; font-weight: 600;">
                                ${p.wins || 0}
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `}
              `;
            })()}
          `}
        `}
      </div>
    `;

    container.querySelector('#btnGoToCreateTournament')?.addEventListener('click', () => {
      sound.playClick();
      const mainEl = document.getElementById('mainViewport');
      this.switchAdminSubView(mainEl, 'admin-events');
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
          modalManager.showAlert('✅ Bốc thăm Vòng tiếp theo thành công! Hệ thống đã tính lại điểm và cập nhật bảng xếp hạng.');
          this.renderAdminSwiss(container);
          this.renderNotificationsList();
        } catch (err) {
          modalManager.showAlert('Chưa thể bốc thăm: ' + err.message);
        }
      }
    });

    container.querySelector('#btnFinalizeSwissTournament')?.addEventListener('click', () => {
      sound.playClick();
      if (!curEvent || !curEvent.swissData) return;
      const swissData = curEvent.swissData;
      const curRoundData = (swissData.rounds || []).find((r) => r.roundNumber === swissData.currentRound);
      const unrecorded = (curRoundData?.matches || []).filter((m) => !m.isBye && !m.result);
      if (unrecorded.length > 0) {
        modalManager.showAlert(`⚠️ Vẫn còn ${unrecorded.length} bàn đấu ở Vòng ${swissData.currentRound} chưa có kết quả! Vui lòng chọn kết quả cho tất cả các bàn trước khi xác nhận.`);
        return;
      }

      modalManager.showConfirm(
        `Xác nhận chốt kết quả giải đấu [${curEvent.title}] và hiển thị Bảng vàng danh dự cùng Bảng xếp hạng chung cuộc?`,
        () => {
          try {
            store.finalizeSwissTournament(curEvent.id);
            if (typeof confetti === 'function') {
              confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            }
            modalManager.showAlert('🎉 ĐÃ XÁC NHẬN KẾT QUẢ CHUNG CUỘC THÀNH CÔNG! Bảng vàng danh dự đã được công bố.');
            this.renderAdminSwiss(container);
            this.renderNotificationsList();
          } catch (err) {
            modalManager.showAlert('Lỗi: ' + err.message);
          }
        },
        null,
        { title: '🏆 XÁC NHẬN KẾT QUẢ CHUNG CUỘC', confirmText: 'Chốt & Công Bố Kết Quả' }
      );
    });

    container.querySelector('#btnExportFinalStandingsCsv')?.addEventListener('click', () => {
      sound.playClick();
      if (curEvent?.swissData) {
        exportSwissStandingsCsv(curEvent.swissData, curEvent.title);
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
        if (curEvent && curEvent.swissData && matchId && res) {
          // Lưu kết quả ngầm (không gọi re-render -> KHÔNG CHỚP MÀN HÌNH, CHƯA TÍNH ĐIỂM)
          store.setSwissMatchResultSilently(curEvent.id, curEvent.swissData.currentRound, matchId, res);

          // Cập nhật trạng thái nút trực tiếp trên DOM
          const parentCell = btn.closest('td') || btn.parentElement;
          if (parentCell) {
            parentCell.querySelectorAll('.btn-live-res').forEach((b) => {
              b.classList.remove('btn-gold');
              b.classList.add('btn-outline');
            });
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-gold');
          }
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

    const currentMonthRecords = fundRecords.filter((r) => {
      if (r.month && settings.month) {
        return r.month.trim() === settings.month.trim();
      }
      return r.term === settings.title;
    });
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

    const generalSyntax = `${settings.syntaxPrefix || 'QUY'} [HỌ VÀ TÊN] [MSSV]`;
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
            <div class="text-2xl font-bold text-gold font-mono">${(settings.amount || 40000).toLocaleString('vi-VN')} đ</div>
            <div class="text-xs text-dim mt-1">Áp dụng: ${settings.title}</div>
          </div>
          <div class="card p-3" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3);">
            <div class="text-xs text-muted mb-1">TIẾN ĐỘ THU QUỸ THÁNG ${settings.month || ''}</div>
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
                    <button type="button" class="btn btn-outline btn-xs font-bold btn-open-personal-qr" data-member-id="${m.id}" title="Mở mã QR đóng quỹ cho kỳ thủ này">
                      📱 Mã QR
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
    container.querySelector('#btnCopyDirectZalo')?.addEventListener('click', async () => {
      sound.playClick();
      if (unpaidMembers.length === 0) {
        modalManager.showAlert('🎉 Toàn bộ kỳ thủ đã hoàn thành đóng quỹ tháng này!');
        return;
      }
      const lines = unpaidMembers.map((m, idx) => `${idx + 1}. ${m.name} (${m.studentId || 'Kỳ thủ'})`).join('\n');
      const amountVal = Number(settings.amount) || 40000;
      const text = `📢 THÔNG BÁO THU QUỸ: ${settings.title || 'Quỹ Sinh Hoạt'}\n💰 Định mức: ${amountVal.toLocaleString('vi-VN')}đ / bạn\n\n⚠️ Danh sách kỳ thủ chưa hoàn thành (${unpaidMembers.length} bạn):\n${lines}\n\n👉 Các bạn vui lòng truy cập website CLB, vào mục "Thẻ Thành Viên" và bấm nút "💳 Nộp Quỹ CLB" để quét mã VietQR (hệ thống đã tự động điền sẵn số tiền và thông tin của bạn) nhé!\n🌐 Website: https://clb-co-tnu-hgc.vercel.app`;
      await copyToClipboard(text);
      modalManager.openZaloAnnouncementModal(text);
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
      const cls = (m.class || m.major || 'Chưa phân lớp').trim();
      classCountMap[cls] = (classCountMap[cls] || 0) + 1;
    });
    const classPalette = [
      '#d4af37', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
      '#06b6d4', '#f43f5e', '#14b8a6', '#a855f7', '#eab308', '#6366f1',
      '#84cc16', '#fb923c', '#22d3ee', '#94a3b8'
    ];
    const sortedAnalyticsClasses = Object.entries(classCountMap).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const classSegments = sortedAnalyticsClasses.map(([label, count], idx) => ({
      label,
      count,
      value: Math.round((count / (members.length || 1)) * 100),
      color: classPalette[idx % classPalette.length]
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
                <span class="badge badge-gold">QUẢN TRỊ VIÊN • THỐNG KÊ</span>
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

        <!-- 2 Visual Charts: Separated full-width boxes so no content is obscured -->
        <div class="chart-box mb-4">
          <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2">
            <div>
              <h3 class="font-bold text-white text-base mb-1">Tần Suất Tham Gia Sinh Hoạt Theo Các Tháng Trong Giai Đoạn</h3>
              <p class="text-xs text-muted mb-0">Số lượt kỳ thủ tham gia sinh hoạt và tập huấn trong khoảng thời gian đã chọn</p>
            </div>
            <span class="badge badge-cyan text-xs font-mono">${data.barLabels[0]} ➜ ${data.barLabels[data.barLabels.length - 1]}</span>
          </div>
          <div class="chart-canvas-wrap mt-3">
            <canvas id="analyticsBarChart"></canvas>
          </div>
        </div>

        <div class="chart-box mb-4">
          <div class="d-flex justify-between align-center flex-wrap gap-2 mb-2">
            <div>
              <h3 class="font-bold text-white text-base mb-1">Cơ Cấu Kỳ Thủ Tham Gia Tích Cực Theo Lớp</h3>
              <p class="text-xs text-muted mb-0">Tỷ lệ phần trăm và cơ cấu hội viên theo từng lớp học sinh hoạt năng nổ trong giai đoạn</p>
            </div>
            <span class="badge badge-gold text-xs font-mono">${data.classSegments.length} Lớp • Phân bố %</span>
          </div>
          <div class="chart-canvas-wrap mt-3">
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
      if (window.ResizeObserver && bar.parentElement) {
        const roBar = new ResizeObserver(() => {
          chartHelper.renderBarChart(bar, data.barLabels, data.barValues);
        });
        roBar.observe(bar.parentElement);
      }
    }

    const donut = container.querySelector('#analyticsDonutChart');
    if (donut) {
      chartHelper.renderDonutChart(donut, data.classSegments);
      if (window.ResizeObserver && donut.parentElement) {
        const ro = new ResizeObserver(() => {
          chartHelper.renderDonutChart(donut, data.classSegments);
        });
        ro.observe(donut.parentElement);
      }
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

        <!-- Dedicated Security & Password Settings Card -->
        <div class="card mb-4" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.08) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid var(--border-gold); padding: 22px;">
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
            <div>
              <div class="d-flex align-center gap-2 mb-1 flex-wrap">
                <span class="badge badge-gold">BẢO MẬT HỆ THỐNG</span>
                <span class="badge badge-cyan" id="badgeActivePassTab">MẬT KHẨU FIREBASE CLOUD</span>
                ${localStorage.getItem('TNU_HGC_FIREBASE_LOCK_PASSWORD') 
                  ? '<span class="badge badge-emerald" id="badgeFbPassStatus">🔒 ĐANG DÙNG MẬT KHẨU RIÊNG</span>' 
                  : '<span class="badge badge-outline" id="badgeFbPassStatus">🔑 MẶC ĐỊNH: admin123456</span>'}
              </div>
              <h3 class="font-bold text-white text-base">Cài Đặt & Đổi Mật Khẩu Bảo Mật</h3>
              <p class="text-xs text-muted mb-0">Quản lý mật khẩu mở khóa Firebase Cloud và mật khẩu đăng nhập Quản Trị Viên (Admin)</p>
            </div>

            <!-- Tab Switcher -->
            <div class="d-flex gap-1 p-1" style="background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <button type="button" class="btn btn-gold btn-xs" id="tabBtnFirebasePass" style="font-size: 0.78rem; padding: 6px 12px; font-weight: 700;">
                🔒 Mật khẩu Firebase Cloud
              </button>
              <button type="button" class="btn btn-outline btn-xs" id="tabBtnAdminPass" style="font-size: 0.78rem; padding: 6px 12px;">
                👑 Mật khẩu Đăng nhập Admin
              </button>
            </div>
          </div>

          <!-- Section 1: Firebase Password Form -->
          <div id="secFirebasePasswordForm">
            <form id="formChangeFirebaseLockPassword" class="app-form" style="max-width: 560px;">
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

          <!-- Section 2: Admin Password Form -->
          <div id="secAdminPasswordForm" style="display: none;">
            <form id="formChangeAdminLoginPassword" class="app-form" style="max-width: 560px;">
              <div class="form-group mb-3">
                <label class="form-label text-xs font-bold text-dim">MẬT KHẨU ĐĂNG NHẬP ADMIN HIỆN TẠI:</label>
                <div style="position: relative;">
                  <input type="password" id="inputAdminCurrentPass" class="form-input" placeholder="Nhập mật khẩu Admin hiện tại..." required style="padding-right: 42px;">
                  <button type="button" class="btn-toggle-eye" data-target="inputAdminCurrentPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
                </div>
              </div>

              <div class="form-group mb-3">
                <label class="form-label text-xs font-bold text-dim">MẬT KHẨU ADMIN MỚI (TỐI THIỂU 6 KÝ TỰ):</label>
                <div style="position: relative;">
                  <input type="password" id="inputAdminNewPass" class="form-input" placeholder="Nhập mật khẩu Admin mới..." required style="padding-right: 42px;">
                  <button type="button" class="btn-toggle-eye" data-target="inputAdminNewPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
                </div>
              </div>

              <div class="form-group mb-3">
                <label class="form-label text-xs font-bold text-dim">XÁC NHẬN MẬT KHẨU ADMIN MỚI:</label>
                <div style="position: relative;">
                  <input type="password" id="inputAdminConfirmPass" class="form-input" placeholder="Nhập lại mật khẩu Admin mới..." required style="padding-right: 42px;">
                  <button type="button" class="btn-toggle-eye" data-target="inputAdminConfirmPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
                </div>
              </div>

              <div id="adminChangePassAlert" style="display: none; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 0.8rem; font-weight: 600;"></div>

              <div class="d-flex justify-between align-center flex-wrap gap-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.08);">
                <button type="submit" class="btn btn-gold btn-sm" id="btnSaveAdminPassword" style="font-weight: 700; padding: 8px 22px;">
                  <span>💾</span> <span>Lưu Mật Khẩu Admin</span>
                </button>
                <button type="button" class="btn btn-outline btn-sm" id="btnResetDefaultAdminPass" style="font-size: 0.78rem;">
                  <span>🔄</span> Đặt lại về admin123456
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Web Push Notifications (FCM) Card -->
        <div class="card mb-4" style="background: radial-gradient(circle at 100% 0%, rgba(16,185,129,0.12) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1.5px solid rgba(16,185,129,0.4); padding: 22px;">
          <div class="d-flex justify-between align-center mb-3 flex-wrap gap-2">
            <div>
              <div class="d-flex align-center gap-2 mb-1 flex-wrap">
                <span class="badge badge-emerald">WEB PUSH NOTIFICATIONS</span>
                <span class="badge badge-cyan">FIREBASE CLOUD MESSAGING (FCM)</span>
                <span class="badge badge-gold">VAPID KEY HOẠT ĐỘNG</span>
              </div>
              <h3 class="font-bold text-white text-base">Thông Báo Đẩy Thiết Bị (Không Cần Mở Website)</h3>
              <p class="text-xs text-muted mb-0">Hệ thống gửi thông báo giải đấu, sự kiện đến màn hình điện thoại & máy tính thành viên qua Firebase Cloud Messaging (Web Push Service Worker).</p>
            </div>
            <div class="d-flex gap-2 align-center flex-wrap">
              <button type="button" id="btnTestDevicePushAdmin" class="btn btn-outline btn-sm">
                <span>🔔</span> <span>Bật & Thử Trên Máy Này</span>
              </button>
              <button type="button" id="btnBroadcastTestToAll" class="btn btn-gold btn-sm" title="Phát sóng thông báo thử nghiệm qua Vercel & Google FCM tới mọi máy kể cả khi đóng web">
                <span>🚀</span> <span>Bắn Thử Toàn CLB (Đóng Web Vẫn Nhận)</span>
              </button>
            </div>
          </div>

          <div class="grid grid-2 gap-3 mb-3">
            <div class="p-3" style="background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <div class="d-flex justify-between align-center mb-1">
                <span class="text-xs font-bold text-gold">VAPID Public Key (Khóa Công Khai FCM):</span>
                <button type="button" id="btnCopyVapidKey" class="btn btn-outline btn-xs" style="font-size:11px; padding:2px 8px;">📋 Sao chép</button>
              </div>
              <div class="font-mono text-xs text-cyan" style="word-break: break-all;">${FCM_VAPID_KEY}</div>
            </div>

            <div class="p-3" style="background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
              <div class="d-flex justify-between align-center mb-1">
                <span class="text-xs font-bold text-emerald">Trạng Thái Thiết Bị Này:</span>
                <span class="badge ${typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'badge-emerald' : typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'badge-rose' : 'badge-gold'}">
                  ${typeof Notification !== 'undefined' && Notification.permission === 'granted' ? '🟢 ĐÃ CẤP QUYỀN' : typeof Notification !== 'undefined' && Notification.permission === 'denied' ? '🔴 BỊ CHẶN' : '🟡 CHƯA KÍCH HOẠT'}
                </span>
              </div>
              <div class="text-xs text-muted" style="word-break: break-all;">
                ${pushNotificationService.getSavedToken() 
                  ? `Mã Token FCM: <span class="font-mono text-white">${pushNotificationService.getSavedToken().slice(0, 30)}...</span>` 
                  : 'Chưa lấy Token FCM trên trình duyệt này. Bấm <strong>"Bật & Thử Thông Báo"</strong> để kích hoạt.'}
              </div>
            </div>
          </div>

          <div class="p-3" style="background: rgba(15,23,42,0.6); border-radius: 8px; border-left: 3px solid var(--gold-color);">
            <div class="text-xs text-dim" style="line-height: 1.6;">
              <strong class="text-white">💡 Cơ chế Web Push khi tắt website:</strong><br>
              Khi thành viên bấm "Bật thông báo", thiết bị sẽ được cấp mã định danh Token và đăng ký chạy nền với Google FCM. Khi có giải đấu hoặc tin tức mới, máy chủ Google sẽ phát sóng trực tiếp tới hệ điều hành (Android / iOS qua Safari PWA / Windows / macOS) và làm rung chuông điện thoại mà không cần thành viên phải mở ứng dụng web.
            </div>
          </div>
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
      modalManager.showAlert({
        type: 'info',
        title: 'Đã khóa bảo vệ',
        message: 'Mục Firebase Cloud đã được khóa an toàn. Bạn sẽ cần nhập lại mật khẩu khi truy cập lần sau.'
      });
      const dashboard = document.getElementById('mainViewport');
      const fbBadge = document.getElementById('adminFirebaseSidebarBadge');
      if (fbBadge) {
        fbBadge.innerHTML = `🔒 ${firebaseService.status === 'connected' ? 'ONLINE' : (firebaseService.status === 'connecting' ? 'CONNECTING' : 'LOCAL')}`;
      }
      if (dashboard) this.switchAdminSubView(dashboard, 'admin-overview');
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

    const handleSaveFbPassword = () => {
      const curr = (inputFbCurr?.value || '').trim();
      const newP = (inputFbNew?.value || '').trim();
      const conf = (inputFbConf?.value || '').trim();

      const savedPass = localStorage.getItem('TNU_HGC_FIREBASE_LOCK_PASSWORD');
      const adminPass = localStorage.getItem('TNU_HGC_ADMIN_PASSWORD') || 'admin123456';
      const expected = savedPass || 'admin123456';

      // Accept current if it matches savedPass, adminPass, or default admin123456
      const isCurrValid = (curr === expected || curr === adminPass || (!savedPass && curr === 'admin123456'));
      if (!isCurrValid) {
        sound.playAlert();
        showFbPassAlert('⚠️ Mật khẩu Firebase hiện tại không đúng. Mật khẩu mặc định ban đầu là: admin123456');
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
      showFbPassAlert(`✅ Đã cập nhật mật khẩu mở khóa Firebase Cloud mới thành công! Mật khẩu mới: ${newP}`, true);

      if (inputFbCurr) inputFbCurr.value = '';
      if (inputFbNew) inputFbNew.value = '';
      if (inputFbConf) inputFbConf.value = '';

      const badge = container.querySelector('#badgeFbPassStatus');
      if (badge) {
        badge.className = 'badge badge-emerald';
        badge.textContent = '🔒 ĐANG DÙNG MẬT KHẨU RIÊNG';
      }

      modalManager.showAlert({
        type: 'success',
        title: 'ĐỔI MẬT KHẨU THÀNH CÔNG',
        message: `Mật khẩu mở khóa Firebase Cloud đã được cập nhật thành công!\n\nMật khẩu mới của bạn là: ${newP}\n\nHãy ghi nhớ mật khẩu này để mở khóa khi truy cập lần sau.`
      });
    };

    const btnSaveFbPass = container.querySelector('#btnSaveFirebasePassword');
    btnSaveFbPass?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSaveFbPassword();
    });

    formFbPass?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveFbPassword();
    });

    [inputFbCurr, inputFbNew, inputFbConf].forEach((inp) => {
      inp?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveFbPassword();
        }
      });
    });

    btnResetFbPass?.addEventListener('click', (e) => {
      e.preventDefault();
      sound.playAlert();
      modalManager.showConfirm({
        title: 'ĐẶT LẠI MẬT KHẨU GỐC?',
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

          const badge = container.querySelector('#badgeFbPassStatus');
          if (badge) {
            badge.className = 'badge badge-outline';
            badge.textContent = '🔑 MẶC ĐỊNH: admin123456';
          }

          modalManager.showAlert({
            title: 'ĐÃ ĐẶT LẠI MẬT KHẨU',
            message: 'Mật khẩu mở khóa Firebase Cloud đã được khôi phục về mặc định: admin123456'
          });
        }
      });
    });

    // Password Settings Tab Switcher
    const tabFbBtn = container.querySelector('#tabBtnFirebasePass');
    const tabAdminBtn = container.querySelector('#tabBtnAdminPass');
    const secFbForm = container.querySelector('#secFirebasePasswordForm');
    const secAdminForm = container.querySelector('#secAdminPasswordForm');
    const badgeActiveTab = container.querySelector('#badgeActivePassTab');

    const updateStatusBadge = (isFb) => {
      const badge = container.querySelector('#badgeFbPassStatus');
      if (!badge) return;
      if (isFb) {
        const hasCustomFb = Boolean(localStorage.getItem('TNU_HGC_FIREBASE_LOCK_PASSWORD'));
        badge.className = hasCustomFb ? 'badge badge-emerald' : 'badge badge-outline';
        badge.textContent = hasCustomFb ? '🔒 ĐANG DÙNG MẬT KHẨU RIÊNG' : '🔑 MẶC ĐỊNH: admin123456';
      } else {
        const hasCustomAdmin = Boolean(localStorage.getItem('TNU_HGC_ADMIN_PASSWORD'));
        badge.className = hasCustomAdmin ? 'badge badge-emerald' : 'badge badge-outline';
        badge.textContent = hasCustomAdmin ? '👑 ĐANG DÙNG MẬT KHẨU RIÊNG' : '🔑 MẶC ĐỊNH: admin123456';
      }
    };

    tabFbBtn?.addEventListener('click', () => {
      sound.playClick();
      tabFbBtn.className = 'btn btn-gold btn-xs';
      tabAdminBtn.className = 'btn btn-outline btn-xs';
      tabFbBtn.style.fontWeight = '700';
      tabAdminBtn.style.fontWeight = 'normal';
      if (secFbForm) secFbForm.style.display = 'block';
      if (secAdminForm) secAdminForm.style.display = 'none';
      if (badgeActiveTab) badgeActiveTab.textContent = 'MẬT KHẨU FIREBASE CLOUD';
      updateStatusBadge(true);
    });

    tabAdminBtn?.addEventListener('click', () => {
      sound.playClick();
      tabAdminBtn.className = 'btn btn-gold btn-xs';
      tabFbBtn.className = 'btn btn-outline btn-xs';
      tabAdminBtn.style.fontWeight = '700';
      tabFbBtn.style.fontWeight = 'normal';
      if (secAdminForm) secAdminForm.style.display = 'block';
      if (secFbForm) secFbForm.style.display = 'none';
      if (badgeActiveTab) badgeActiveTab.textContent = 'MẬT KHẨU ĐĂNG NHẬP ADMIN';
      updateStatusBadge(false);
    });

    // Change Admin Login Password Form
    const formAdminPass = container.querySelector('#formChangeAdminLoginPassword');
    const inputAdminCurr = container.querySelector('#inputAdminCurrentPass');
    const inputAdminNew = container.querySelector('#inputAdminNewPass');
    const inputAdminConf = container.querySelector('#inputAdminConfirmPass');
    const alertAdminBox = container.querySelector('#adminChangePassAlert');
    const btnSaveAdminPass = container.querySelector('#btnSaveAdminPassword');
    const btnResetAdminPass = container.querySelector('#btnResetDefaultAdminPass');

    const showAdminPassAlert = (msg, isSuccess = false) => {
      if (!alertAdminBox) return;
      alertAdminBox.textContent = msg;
      alertAdminBox.style.display = 'block';
      if (isSuccess) {
        alertAdminBox.style.background = 'rgba(16, 185, 129, 0.15)';
        alertAdminBox.style.color = '#34d399';
        alertAdminBox.style.border = '1px solid rgba(16, 185, 129, 0.35)';
      } else {
        alertAdminBox.style.background = 'rgba(244, 63, 94, 0.15)';
        alertAdminBox.style.color = '#fb7185';
        alertAdminBox.style.border = '1px solid rgba(244, 63, 94, 0.35)';
      }
    };

    const handleSaveAdminPassword = () => {
      const curr = (inputAdminCurr?.value || '').trim();
      const newP = (inputAdminNew?.value || '').trim();
      const conf = (inputAdminConfirmPass?.value || inputAdminConf?.value || '').trim();

      const savedAdmin = localStorage.getItem('TNU_HGC_ADMIN_PASSWORD');
      const expectedAdmin = savedAdmin || 'admin123456';

      if (curr !== expectedAdmin && (!savedAdmin && curr !== 'admin123456')) {
        sound.playAlert();
        showAdminPassAlert('⚠️ Mật khẩu Admin hiện tại không đúng. Mật khẩu mặc định là: admin123456');
        inputAdminCurr?.focus();
        return;
      }

      if (newP.length < 6) {
        sound.playAlert();
        showAdminPassAlert('⚠️ Mật khẩu mới phải có ít nhất 6 ký tự!');
        inputAdminNew?.focus();
        return;
      }

      if (newP !== conf) {
        sound.playAlert();
        showAdminPassAlert('⚠️ Xác nhận mật khẩu mới không trùng khớp!');
        inputAdminConf?.focus();
        return;
      }

      localStorage.setItem('TNU_HGC_ADMIN_PASSWORD', newP);
      sound.playSuccess();
      showAdminPassAlert(`✅ Đã đổi mật khẩu đăng nhập Admin thành công! Mật khẩu mới: ${newP}`, true);

      if (inputAdminCurr) inputAdminCurr.value = '';
      if (inputAdminNew) inputAdminNew.value = '';
      if (inputAdminConf) inputAdminConf.value = '';

      updateStatusBadge(false);

      modalManager.showAlert({
        type: 'success',
        title: 'ĐỔI MẬT KHẨU ADMIN THÀNH CÔNG',
        message: `Mật khẩu đăng nhập Quản Trị Viên (Admin) đã được cập nhật thành công!\n\nMật khẩu mới: ${newP}\n\nTừ bây giờ, bạn dùng mật khẩu này để đăng nhập quyền Admin.`
      });
    };

    btnSaveAdminPass?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSaveAdminPassword();
    });

    formAdminPass?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveAdminPassword();
    });

    [inputAdminCurr, inputAdminNew, inputAdminConf].forEach((inp) => {
      inp?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSaveAdminPassword();
        }
      });
    });

    btnResetAdminPass?.addEventListener('click', (e) => {
      e.preventDefault();
      sound.playAlert();
      modalManager.showConfirm({
        title: 'ĐẶT LẠI MẬT KHẨU ADMIN GỐC?',
        message: 'Bạn có chắc chắn muốn đặt lại mật khẩu đăng nhập Admin về mặc định "admin123456"?',
        confirmText: 'Đặt lại về admin123456',
        cancelText: 'Hủy bỏ',
        onConfirm: () => {
          localStorage.removeItem('TNU_HGC_ADMIN_PASSWORD');
          sound.playSuccess();
          showAdminPassAlert('✅ Đã khôi phục mật khẩu Admin về mặc định: admin123456', true);
          if (inputAdminCurr) inputAdminCurr.value = '';
          if (inputAdminNew) inputAdminNew.value = '';
          if (inputAdminConf) inputAdminConf.value = '';
          updateStatusBadge(false);
          modalManager.showAlert({
            title: 'ĐÃ ĐẶT LẠI MẬT KHẨU ADMIN',
            message: 'Mật khẩu đăng nhập Admin đã được khôi phục về mặc định: admin123456'
          });
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

    // Web Push FCM Events
    const btnTestPush = container.querySelector('#btnTestDevicePushAdmin');
    btnTestPush?.addEventListener('click', async () => {
      sound.playClick();
      await this.requestDeviceNotificationPermission();
      this.renderAdminFirebase(container);
    });

    const btnCopyVapid = container.querySelector('#btnCopyVapidKey');
    btnCopyVapid?.addEventListener('click', () => {
      copyToClipboard(FCM_VAPID_KEY);
      sound.playSuccess();
      modalManager.showAlert({
        type: 'success',
        title: 'Đã sao chép',
        message: 'Đã sao chép VAPID Public Key vào bộ nhớ tạm!'
      });
    });

    const btnBroadcastToAll = container.querySelector('#btnBroadcastTestToAll');
    btnBroadcastToAll?.addEventListener('click', async () => {
      sound.playClick();
      const origHtml = btnBroadcastToAll.innerHTML;
      btnBroadcastToAll.innerHTML = '<span>⏳</span> <span>Đang phát sóng tới Cloud...</span>';
      btnBroadcastToAll.disabled = true;

      try {
        const res = await pushNotificationService.broadcastPushNotification(
          '🏆 [THỬ NGHIỆM] CLB Cờ TNU - HGC',
          'Chào bạn! Tính năng thông báo tự động khi đóng website/khóa màn hình đang hoạt động hoàn hảo!',
          '/'
        );
        sound.playSuccess();
        const sent = res?.sentCount || 0;
        const total = res?.totalTargets || 0;
        modalManager.showAlert({
          type: 'success',
          title: '🚀 ĐÃ PHÁT SÓNG THÀNH CÔNG!',
          message: `Lệnh thông báo đã được gửi qua Vercel & Google FCM tới ${sent}/${total} thiết bị đã đăng ký!\n\nBạn hãy thử đóng hoàn toàn web hoặc khóa màn hình điện thoại để kiểm tra thông báo nảy lên.`
        });
      } catch (err) {
        sound.playAlert();
        modalManager.showAlert({
          type: 'error',
          title: 'Chưa thể phát sóng',
          message: err.message || 'Lỗi khi gửi yêu cầu tới máy chủ phát sóng.'
        });
      } finally {
        btnBroadcastToAll.innerHTML = origHtml;
        btnBroadcastToAll.disabled = false;
      }
    });
  }

  promptFirebasePassword(onSuccess) {
    const savedFbPass = localStorage.getItem('TNU_HGC_FIREBASE_LOCK_PASSWORD');
    const hasCustomPass = Boolean(savedFbPass);

    const contentHtml = `
      <div style="padding: 10px 4px;">
        <div class="text-center mb-3">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🔐</div>
          <h3 class="text-lg font-bold text-white mb-1">Xác Thực Truy Cập Firebase Cloud</h3>
          <p class="text-xs text-muted mb-0">
            Khu vực này chứa cấu hình máy chủ đám mây và đồng bộ cơ sở dữ liệu. Vui lòng nhập mật khẩu bảo vệ Firebase Cloud để mở khóa:
          </p>
        </div>

        <form id="formUnlockFirebase" class="app-form">
          <div class="form-group mb-4">
            <label class="form-label text-xs font-bold text-dim">MẬT KHẨU FIREBASE CLOUD BẢO VỆ:</label>
            <div style="position: relative;">
              <input type="password" id="inputFirebaseUnlockPass" class="form-input" placeholder="Nhập mật khẩu..." autofocus autocomplete="current-password" required style="padding-right: 42px;">
              <button type="button" class="btn-toggle-eye" data-target="inputFirebaseUnlockPass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 4px;">👁️</button>
            </div>
            <div id="firebaseUnlockError" class="text-xs text-rose mt-2" style="display:none; font-weight:600;">⚠️ Mật khẩu không chính xác!</div>
            <div class="text-xs text-muted mt-2 d-flex justify-between align-center flex-wrap gap-2" style="opacity: 0.95;">
              <span id="firebaseUnlockHintText">
                ${hasCustomPass 
                  ? '🔒 Đang bật mật khẩu bảo vệ riêng của Firebase Cloud.' 
                  : '💡 Mật khẩu mặc định: <strong class="text-gold">admin123456</strong>'}
              </span>
              <button type="button" id="btnForgotFirebasePass" style="background: none; border: none; color: var(--gold-light, #fbbf24); font-size: 0.75rem; text-decoration: underline; cursor: pointer; padding: 0;">
                🔄 Quên mật khẩu? Đặt lại gốc
              </button>
            </div>
          </div>

          <div class="d-flex gap-2 justify-end align-center flex-wrap">
            <button type="button" class="btn btn-outline btn-sm" id="btnCancelFirebaseUnlock">Hủy Bỏ</button>
            <button type="button" class="btn btn-gold btn-sm" id="btnConfirmFirebaseUnlock" style="font-weight:700; padding:8px 18px;">
              <span>🔓</span> <span>Mở Khóa Truy Cập</span>
            </button>
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
      const btnConfirm = modalEl.querySelector('#btnConfirmFirebaseUnlock');
      const btnForgot = modalEl.querySelector('#btnForgotFirebasePass');
      const eyeBtn = modalEl.querySelector('.btn-toggle-eye');

      if (passInp) passInp.focus();

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
        const currentSavedPass = localStorage.getItem('TNU_HGC_FIREBASE_LOCK_PASSWORD');
        const currentAdminPass = localStorage.getItem('TNU_HGC_ADMIN_PASSWORD') || 'admin123456';

        let isValid = false;
        if (currentSavedPass) {
          isValid = (entered === currentSavedPass || (currentAdminPass !== 'admin123456' && entered === currentAdminPass));
        } else {
          isValid = (entered === 'admin123456' || entered === currentAdminPass);
        }

        if (isValid) {
          sound.playSuccess();
          modalManager.close();
          onSuccess && onSuccess();
        } else {
          sound.playAlert();
          if (errEl) {
            errEl.style.display = 'block';
            errEl.innerHTML = currentSavedPass
              ? '⚠️ Mật khẩu không chính xác! Vui lòng nhập đúng mật khẩu bảo vệ riêng đã đổi (hoặc bấm "Quên mật khẩu? Đặt lại gốc" bên dưới).'
              : '⚠️ Mật khẩu không chính xác! Mật khẩu mặc định là: <strong>admin123456</strong>.';
          }
          if (passInp) {
            passInp.value = '';
            passInp.focus();
          }
        }
      };

      btnForgot?.addEventListener('click', () => {
        sound.playAlert();
        modalManager.showConfirm({
          title: 'ĐẶT LẠI MẬT KHẨU GỐC?',
          message: 'Bạn có chắc chắn muốn đặt lại mật khẩu mở khóa Firebase Cloud về mặc định "admin123456"?',
          confirmText: 'Đặt lại về admin123456',
          cancelText: 'Hủy bỏ',
          onConfirm: () => {
            localStorage.removeItem('TNU_HGC_FIREBASE_LOCK_PASSWORD');
            sound.playSuccess();
            const hint = modalEl.querySelector('#firebaseUnlockHintText');
            if (hint) {
              hint.innerHTML = '💡 Mật khẩu mặc định: <strong class="text-gold">admin123456</strong>';
            }
            if (errEl) errEl.style.display = 'none';
            if (passInp) {
              passInp.value = 'admin123456';
              passInp.focus();
            }
            modalManager.showAlert({
              title: 'ĐÃ ĐẶT LẠI MẬT KHẨU',
              message: 'Đã đặt lại mật khẩu về mặc định: admin123456. Bạn có thể bấm "Mở Khóa Truy Cập" ngay!'
            });
          }
        });
      });

      passInp?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleUnlock();
        }
      });

      btnConfirm?.addEventListener('click', (e) => {
        e.preventDefault();
        handleUnlock();
      });

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
