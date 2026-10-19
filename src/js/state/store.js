import { INITIAL_DATA } from './mockData.js';
import { CHESS_MOTTOS, getMottoByIndex } from './chessMottos.js';
import { firebaseService } from '../services/firebaseService.js';
import { SwissTournament } from '../utils/swissSystem.js';
export { CHESS_MOTTOS, getMottoByIndex, firebaseService, SwissTournament };

export const ALUMNI_MESSAGES = [
  'Chúc CLB và Ban Điều Hành mới luôn giữ vững ngọn lửa đam mê, đoàn kết và đưa phong trào cờ Phân hiệu ngày càng lớn mạnh, gặt hái thêm nhiều vinh quang!',
  'Thế hệ mới hãy luôn tự tin, kiên định và dám bứt phá! Chúng tôi luôn đồng hành và dõi theo từng bước tiến của các bạn trên mọi đấu trường.',
  'Mỗi ván cờ là một bài học về sự kiên nhẫn và bản lĩnh. Mong BĐH mới luôn công tâm, sáng tạo để dẫn dắt anh em kỳ thủ chinh phục những đỉnh cao mới!',
  'Hãy luôn giữ vững tinh thần đoàn kết, biến mỗi buổi sinh hoạt thành niềm vui và nguồn cảm hứng bất tận cho anh em kỳ thủ!',
  'Kế thừa truyền thống, phát huy sáng tạo, chúc Ban Điều Hành mới đưa màu cờ Phân hiệu vươn cao và bay xa hơn nữa!',
  'Chúc thế hệ kỳ thủ trẻ luôn nuôi dưỡng đam mê, rèn giũa bản lĩnh và mang về nhiều huy chương vẻ vang cho Phân hiệu!',
  'Dù ở đâu, trái tim tôi vẫn luôn hướng về mái nhà chung CLB Cờ TNU - HGC. Chúc CLB mãi mãi phát triển vững mạnh!'
];

const STORAGE_KEY = 'TNU_HGC_CHESS_CLUB_DATA_ZERO_V3';

function syncAlumniCardId(id, idx = 0) {
  if (id && /^TNU-HGC-\d{3}$/.test(id)) return id;
  const num = String(idx + 1).padStart(3, '0');
  return `TNU-HGC-${num}`;
}

class Store {
  constructor() {
    this.listeners = new Set();
    this.isRemoteUpdating = false;
    this.state = this.loadState();
    this.initFirebaseSync();
  }

  initFirebaseSync() {
    firebaseService.init((remoteData, metadata) => {
      if (!remoteData) return;
      if (metadata && metadata.hasPendingWrites) return;
      this.applyRemoteData(remoteData);
    });
  }

  applyRemoteData(remoteData) {
    this.isRemoteUpdating = true;
    try {
      if (Array.isArray(remoteData.members)) this.state.members = remoteData.members;
      if (Array.isArray(remoteData.events)) this.state.events = remoteData.events;
      if (Array.isArray(remoteData.attendanceLogs)) this.state.attendanceLogs = remoteData.attendanceLogs;
      if (Array.isArray(remoteData.articles)) this.state.articles = remoteData.articles;
      if (Array.isArray(remoteData.pendingApplications)) this.state.pendingApplications = remoteData.pendingApplications;
      if (Array.isArray(remoteData.alumniBoard)) this.state.alumniBoard = remoteData.alumniBoard;
      if (Array.isArray(remoteData.alumniMembers)) this.state.alumniMembers = remoteData.alumniMembers;
      if (Array.isArray(remoteData.eventFeedback)) this.state.eventFeedback = remoteData.eventFeedback;
      if (Array.isArray(remoteData.fundRecords)) this.state.fundRecords = remoteData.fundRecords;
      if (Array.isArray(remoteData.fundCampaigns)) this.state.fundCampaigns = remoteData.fundCampaigns;
      if (remoteData.clubInfo && typeof remoteData.clubInfo === 'object') {
        this.state.clubInfo = { ...this.state.clubInfo, ...remoteData.clubInfo };
      }

      this.saveState();
      this.listeners.forEach((listener) => {
        try {
          listener(this.state);
        } catch (e) {
          console.error('Error in state listener on remote Firebase update:', e);
        }
      });
    } finally {
      this.isRemoteUpdating = false;
    }
  }

  loadState() {
    try {
      // Clear old legacy cached states so they do not resurrect stale stats
      ['TNU_HGC_CHESS_CLUB_DATA_V1', 'TNU_HGC_CHESS_CLUB_DATA_RESET_V1', 'TNU_HGC_CHESS_CLUB_DATA_RESET_V2', 'TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V1', 'TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V2', 'TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V3', 'TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V4', 'TNU_HGC_CHESS_CLUB_DATA_CLEAN_V1', 'TNU_HGC_CHESS_CLUB_DATA_ZERO_MOCK_V2'].forEach((k) => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const rawBoard = Array.isArray(parsed.alumniBoard) ? parsed.alumniBoard : (INITIAL_DATA.alumniBoard || []);
        const rawMembers = Array.isArray(parsed.alumniMembers) ? parsed.alumniMembers : (INITIAL_DATA.alumniMembers || []);
        const rawClubMembers = Array.isArray(parsed.members) ? parsed.members : (INITIAL_DATA.members || []);
        const rawArticles = Array.isArray(parsed.articles) ? parsed.articles : (INITIAL_DATA.articles || []);

        const rawPending = Array.isArray(parsed.pendingApplications) ? parsed.pendingApplications : (INITIAL_DATA.pendingApplications || []);
        const rawEvents = Array.isArray(parsed.events) ? parsed.events : (INITIAL_DATA.events || []);
        const rawLogs = Array.isArray(parsed.attendanceLogs) ? parsed.attendanceLogs : (INITIAL_DATA.attendanceLogs || []);

        const validEventMap = new Map();
        rawEvents.forEach((e) => validEventMap.set(e.id, e));

        const cleanedLogs = rawLogs.filter((log) => {
          if (log.category === 'session') return true;
          const ev = validEventMap.get(log.eventId);
          // Nếu sự kiện đã bị xóa -> xóa bỏ log mồ côi
          if (!ev) return false;
          // Nếu sự kiện có tồn tại nhưng registeredMembers không chứa memberId (sự kiện mới tạo lại bị trùng ID cũ)
          if (Array.isArray(ev.registeredMembers) && !ev.registeredMembers.includes(log.memberId)) {
            return false;
          }
          return true;
        });

        return {
          ...INITIAL_DATA,
          ...parsed,
          events: rawEvents,
          attendanceLogs: cleanedLogs,
          clubInfo: {
            ...INITIAL_DATA.clubInfo,
            ...(parsed.clubInfo || {}),
            zaloGroupLink: (!parsed.clubInfo?.zaloGroupLink || parsed.clubInfo.zaloGroupLink.includes('clbcotnuhgc'))
              ? INITIAL_DATA.clubInfo.zaloGroupLink
              : parsed.clubInfo.zaloGroupLink
          },
          articles: rawArticles,
          pendingApplications: rawPending,
          members: rawClubMembers.map((m, idx) => ({
            ...m,
            role: m.role === 'admin' ? 'bdh' : m.role,
            roleTitle: (m.roleTitle === 'Hội viên' || m.roleTitle === 'Hội viên Mới' || m.roleTitle === 'Hội viên mới' || !m.roleTitle)
              ? (m.role === 'bdh' ? 'Chủ nhiệm' : 'Thành viên')
              : (m.role === 'bdh' && (m.roleTitle === 'Chủ nhiệm CLB' || m.roleTitle === 'Ủy viên Ban Điều Hành' || m.roleTitle === 'Ban Điều Hành') ? 'Chủ nhiệm' : m.roleTitle),
            bio: (!m.bio || m.bio.includes('Giao lưu học hỏi') || m.bio.includes('Sinh viên đăng ký') || m.bio.includes('Thành viên mới') || !CHESS_MOTTOS.includes(m.bio))
              ? CHESS_MOTTOS[idx % CHESS_MOTTOS.length]
              : m.bio,
            tournamentsJoined: m.tournamentsJoined !== undefined ? m.tournamentsJoined : 0,
            activitiesJoined: m.activitiesJoined !== undefined ? m.activitiesJoined : 0,
            attendanceCount: m.attendanceCount !== undefined ? m.attendanceCount : 0,
            attendanceRate: m.attendanceRate !== undefined ? m.attendanceRate : 0,
            goldMedals: m.goldMedals !== undefined ? m.goldMedals : 0,
            silverMedals: m.silverMedals !== undefined ? m.silverMedals : 0,
            bronzeMedals: m.bronzeMedals !== undefined ? m.bronzeMedals : 0
          })),
          currentSession: {
            role: parsed.currentSession?.role || INITIAL_DATA.currentSession.role || 'guest',
            activeMemberId: parsed.currentSession?.activeMemberId || (rawClubMembers[0]?.id || null)
          },
          alumniBoard: rawBoard.map((m, idx) => ({ ...m, id: syncAlumniCardId(m.id, idx) })),
          alumniMembers: rawMembers.map((m, idx) => ({ ...m, id: syncAlumniCardId(m.id, idx) })),
          fundRecords: Array.isArray(parsed.fundRecords) ? parsed.fundRecords : (INITIAL_DATA.fundRecords || []),
          fundCampaigns: (Array.isArray(parsed.fundCampaigns) && parsed.fundCampaigns.length > 0) ? parsed.fundCampaigns : (INITIAL_DATA.fundCampaigns || [])
        };
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage, using initial mock data', e);
    }
    this.saveState(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveState(stateToSave) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave || this.state));
    } catch (e) {
      console.error('Error saving state', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.saveState();
    if (!this.isRemoteUpdating) {
      firebaseService.syncToFirestore(this.state);
    }
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (e) {
        console.error('Error in state listener:', e);
      }
    });
  }

  getState() {
    return this.state;
  }

  resetToDefault() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    this.state = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveState(this.state);
    this.notify();
  }

  // --- Session & Role Management ---
  setRole(role) {
    if (['guest', 'member', 'admin'].includes(role)) {
      this.state.currentSession.role = role;
      this.notify();
    }
  }

  setActiveMember(memberId) {
    const member = this.getMemberById(memberId);
    if (member) {
      this.state.currentSession.activeMemberId = memberId;
      this.notify();
    }
  }

  getActiveMember() {
    return this.getMemberById(this.state.currentSession.activeMemberId) || this.state.members[0] || null;
  }

  getMemberById(id) {
    return this.state.members.find((m) => m.id === id);
  }

  // --- Members CRUD ---
  addMember(memberData) {
    let maxNum = 0;
    (this.state.members || []).forEach((m) => {
      const match = m.id && m.id.match(/^TNU-HGC-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    const newId = `TNU-HGC-${nextNum}`;

    // Tự động gán phương châm thi đấu tuần hoàn từ 1 đến 1000 câu CHESS_MOTTOS rồi quay lại 1
    if (this.state.mottoCounter === undefined) {
      this.state.mottoCounter = (this.state.members || []).length;
    }
    const mottoIdx = this.state.mottoCounter % CHESS_MOTTOS.length;
    const autoBio = (memberData.bio && CHESS_MOTTOS.includes(memberData.bio))
      ? memberData.bio
      : CHESS_MOTTOS[mottoIdx];
    this.state.mottoCounter = (mottoIdx + 1) % CHESS_MOTTOS.length;

    const newMember = {
      id: newId,
      name: memberData.name || 'Kỳ thủ TNU',
      avatar: memberData.avatar || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 5000)}?auto=format&fit=crop&w=400&q=80`,
      gender: memberData.gender || 'Nam',
      dob: memberData.dob || '2005-01-01',
      studentId: memberData.studentId || `HGC${2250000000 + Math.floor(Math.random() * 99999)}`,
      university: memberData.university || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang',
      major: memberData.major || memberData.class || 'Chưa phân ngành',
      class: memberData.class || memberData.major || 'Chưa phân lớp',
      faculty: memberData.faculty || 'Khoa Sư phạm',
      cohort: memberData.cohort || '2024 - 2028',
      discipline: memberData.discipline || 'Cả hai',
      role: memberData.role || 'member',
      roleTitle: memberData.roleTitle || (memberData.role === 'bdh' ? 'Chủ nhiệm' : 'Thành viên'),
      eloChess: parseInt(memberData.eloChess) || 1500,
      eloXiangqi: parseInt(memberData.eloXiangqi) || 1500,
      totalMatches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      status: memberData.status || 'active',
      joinDate: new Date().toISOString().split('T')[0],
      phone: memberData.phone || '0988.000.111',
      email: memberData.email || `${newId.toLowerCase()}@tnu.edu.vn`,
      badge: memberData.role === 'bdh' ? 'Ban Điều Hành' : 'Tân kỳ thủ',
      bio: autoBio,
      attendanceRate: 0,
      attendanceCount: 0,
      tournamentsJoined: 0,
      activitiesJoined: 0
    };

    this.state.members.unshift(newMember);
    this.state.clubInfo.totalMembers = this.state.members.length;
    if (!this.state.currentSession.activeMemberId || !this.getMemberById(this.state.currentSession.activeMemberId)) {
      this.state.currentSession.activeMemberId = newMember.id;
    }
    this.notify();
    return newMember;
  }

  calculateMemberScore(member) {
    if (!member) return 0;
    const tour = member.tournamentsJoined !== undefined ? member.tournamentsJoined : (member.tournamentsCount || 0);
    const act = member.activitiesJoined !== undefined ? member.activitiesJoined : 0;
    const sess = member.attendanceCount !== undefined ? member.attendanceCount : 0;
    const activeRate = member.attendanceRate !== undefined ? member.attendanceRate : 0;
    return (tour * 20) + (act * 5) + (sess * 10) + Math.round(activeRate);
  }

  updateMember(id, updatedFields) {
    const idx = this.state.members.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.state.members[idx] = { ...this.state.members[idx], ...updatedFields };
      this.notify();
      return this.state.members[idx];
    }
    return null;
  }

  deleteMember(id) {
    this.state.members = this.state.members.filter((m) => m.id !== id);
    this.state.clubInfo.totalMembers = this.state.members.length;
    if (this.state.currentSession.activeMemberId === id) {
      this.state.currentSession.activeMemberId = this.state.members[0]?.id || null;
    }
    this.notify();
  }

  toggleMemberStatus(id) {
    const member = this.getMemberById(id);
    if (member) {
      member.status = member.status === 'active' ? 'locked' : 'active';
      this.notify();
      return member.status;
    }
    return null;
  }

  // --- Registration Applications (Đơn Đăng Ký Chờ Duyệt) ---
  addApplication(data) {
    if (!Array.isArray(this.state.pendingApplications)) {
      this.state.pendingApplications = [];
    }
    let maxNum = 0;
    this.state.pendingApplications.forEach((app) => {
      const match = app.id && app.id.match(/^DK-2026-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    const newId = `DK-2026-${nextNum}`;

    const newApp = {
      id: newId,
      name: data.name || 'Sinh viên',
      studentId: data.studentId || '',
      faculty: data.faculty || '',
      class: data.class || '',
      cohort: data.cohort || '',
      dob: data.dob || '',
      gender: data.gender || 'Nam',
      phone: data.phone || '',
      avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: data.bio || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.state.pendingApplications.unshift(newApp);
    this.notify();
    return newApp;
  }

  approveApplication(appId) {
    if (!this.state.pendingApplications) return null;
    const appIndex = this.state.pendingApplications.findIndex((a) => a.id === appId);
    if (appIndex === -1) return null;

    const app = this.state.pendingApplications[appIndex];
    const newMember = this.addMember({
      name: app.name,
      studentId: app.studentId,
      faculty: app.faculty,
      class: app.class,
      major: app.class,
      cohort: app.cohort,
      dob: app.dob,
      gender: app.gender,
      phone: app.phone,
      avatar: app.avatar,
      role: 'member',
      roleTitle: 'Thành viên',
      status: 'active'
    });

    this.state.pendingApplications.splice(appIndex, 1);
    this.notify();
    return newMember;
  }

  rejectApplication(appId) {
    if (!this.state.pendingApplications) return false;
    const appIndex = this.state.pendingApplications.findIndex((a) => a.id === appId);
    if (appIndex === -1) return false;
    this.state.pendingApplications.splice(appIndex, 1);
    this.notify();
    return true;
  }

  // --- Alumni Management ---
  addAlumniBoard(data) {
    if (!this.state.alumniBoard) this.state.alumniBoard = [];
    const nextNum = (this.state.alumniBoard.length + 1).toString().padStart(3, '0');
    let autoMessage = data.message;
    if (!autoMessage || autoMessage.trim() === '' || autoMessage === 'Chúc CLB và các thế hệ kỳ thủ luôn giữ vững ngọn lửa đam mê!') {
      autoMessage = ALUMNI_MESSAGES[Math.floor(Math.random() * ALUMNI_MESSAGES.length)];
    }
    const newAlumni = {
      id: `TNU-HGC-${nextNum}`,
      name: data.name || 'Cựu Thành viên BĐH',
      avatar: data.avatar || `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80`,
      term: data.term || 'Nhiệm kỳ 2024 - 2025',
      roleTitle: data.roleTitle || 'Cựu Thành viên BĐH',
      university: data.university || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang',
      major: data.major || 'K55',
      discipline: data.discipline || 'Cả hai',
      eloChess: parseInt(data.eloChess) || 1800,
      eloXiangqi: parseInt(data.eloXiangqi) || 1800,
      badge: data.badge || 'Kỳ Thủ Xuất Sắc Tiền Nhiệm',
      achievement: data.achievement || 'Đóng góp tích cực cho phong trào cờ',
      message: autoMessage,
      bio: data.bio || data.achievement || 'Đóng góp xây dựng câu lạc bộ'
    };
    this.state.alumniBoard.unshift(newAlumni);
    this.notify();
    return newAlumni;
  }

  addAlumniMember(data) {
    if (!this.state.alumniMembers) this.state.alumniMembers = [];
    const nextNum = (this.state.alumniMembers.length + 1).toString().padStart(3, '0');
    const newMember = {
      id: `TNU-HGC-${nextNum}`,
      name: data.name || 'Cựu Thành viên',
      avatar: data.avatar || `https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80`,
      graduationYear: data.graduationYear || 'Khóa 2021 - 2025',
      roleTitle: data.roleTitle || 'Cựu Thành viên',
      university: data.university || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang',
      major: data.major || 'K55',
      discipline: data.discipline || 'Cả hai',
      eloChess: parseInt(data.eloChess) || 1800,
      eloXiangqi: parseInt(data.eloXiangqi) || 1800,
      goldMedals: parseInt(data.goldMedals) || 0,
      silverMedals: parseInt(data.silverMedals) || 0,
      bronzeMedals: parseInt(data.bronzeMedals) || 0,
      badge: data.badge || 'Kiện Tướng Vinh Danh',
      bio: data.bio || 'Đóng góp tích cực cho phong trào cờ Phân hiệu.'
    };
    this.state.alumniMembers.unshift(newMember);
    this.notify();
    return newMember;
  }

  updateAlumniBoard(id, updatedFields) {
    if (!this.state.alumniBoard) return null;
    const idx = this.state.alumniBoard.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.state.alumniBoard[idx] = { ...this.state.alumniBoard[idx], ...updatedFields };
      this.notify();
      return this.state.alumniBoard[idx];
    }
    return null;
  }

  deleteAlumniBoard(id) {
    if (!this.state.alumniBoard) return false;
    this.state.alumniBoard = this.state.alumniBoard.filter(m => m.id !== id);
    this.notify();
    return true;
  }

  updateAlumniMember(id, updatedFields) {
    if (!this.state.alumniMembers) return null;
    const idx = this.state.alumniMembers.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.state.alumniMembers[idx] = { ...this.state.alumniMembers[idx], ...updatedFields };
      this.notify();
      return this.state.alumniMembers[idx];
    }
    return null;
  }

  deleteAlumniMember(id) {
    if (!this.state.alumniMembers) return false;
    this.state.alumniMembers = this.state.alumniMembers.filter(m => m.id !== id);
    this.notify();
    return true;
  }

  recordMemberToAlumniBoard(memberId, alumniData) {
    const mem = this.getMemberById(memberId);
    if (!mem) return false;
    if (!this.state.alumniBoard) this.state.alumniBoard = [];
    const nextNum = (this.state.alumniBoard.length + 1).toString().padStart(3, '0');
    let autoMessage = alumniData.message;
    if (!autoMessage || autoMessage.trim() === '' || autoMessage === 'Chúc CLB và các thế hệ kỳ thủ luôn giữ vững ngọn lửa đam mê!') {
      autoMessage = ALUMNI_MESSAGES[Math.floor(Math.random() * ALUMNI_MESSAGES.length)];
    }
    const newRecord = {
      id: `TNU-HGC-${nextNum}`,
      name: mem.name,
      avatar: mem.avatar || alumniData.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      term: alumniData.term || 'Nhiệm kỳ 2024 - 2025',
      roleTitle: alumniData.roleTitle || 'Cựu Thành viên BĐH',
      university: mem.university || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang',
      major: mem.class || mem.major || 'Chưa phân lớp',
      discipline: mem.discipline || 'Cả hai',
      eloChess: mem.eloChess || 1800,
      eloXiangqi: mem.eloXiangqi || 1800,
      badge: alumniData.badge || 'Kỳ Thủ Xuất Sắc Tiền Nhiệm',
      achievement: alumniData.achievement || 'Đóng góp tích cực cho phong trào cờ',
      message: autoMessage,
      bio: alumniData.achievement || mem.bio || 'Đóng góp xây dựng câu lạc bộ'
    };
    this.state.alumniBoard.unshift(newRecord);
    // VẪN GIỮ NGUYÊN trong this.state.members vì kỳ thủ vẫn đang học / sinh hoạt
    this.notify();
    return newRecord;
  }

  graduateMemberToAlumni(memberId, alumniData) {
    const mem = this.getMemberById(memberId);
    if (!mem) return false;
    if (!this.state.alumniMembers) this.state.alumniMembers = [];
    const nextNum = (this.state.alumniMembers.length + 1).toString().padStart(3, '0');
    const newAlumni = {
      id: `TNU-HGC-${nextNum}`,
      name: mem.name,
      avatar: mem.avatar || alumniData.avatar || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
      graduationYear: alumniData.graduationYear || 'Khóa 2021 - 2025',
      roleTitle: 'Cựu Thành viên',
      university: mem.university || 'Đại học Thái Nguyên Phân hiệu tại Hà Giang',
      major: mem.class || mem.major || 'Chưa phân lớp',
      discipline: mem.discipline || 'Cả hai',
      eloChess: mem.eloChess || 1800,
      eloXiangqi: mem.eloXiangqi || 1800,
      goldMedals: mem.goldMedals || 0,
      silverMedals: mem.silverMedals || 0,
      bronzeMedals: mem.bronzeMedals || 0,
      badge: alumniData.badge || 'Kiện Tướng Vinh Danh',
      bio: alumniData.bio || 'Đóng góp tích cực cho phong trào cờ Phân hiệu.'
    };
    this.state.alumniMembers.unshift(newAlumni);
    // GỠ KHỎI this.state.members (đã ra trường, không còn trong danh sách thành viên thường niên)
    this.state.members = this.state.members.filter(m => m.id !== memberId);
    if (this.state.clubInfo) {
      this.state.clubInfo.totalMembers = this.state.members.length;
      this.state.clubInfo.retiredMembers = (this.state.clubInfo.retiredMembers || 0) + 1;
    }
    this.notify();
    return newAlumni;
  }

  // --- Smart Check-in Engine ---
  processCheckIn(qrDataOrId, checkInTarget, method = 'QR Camera') {
    // Extract memberId from QR payload: "TNU-HGC:{member_id}:{hash}:{name}" or plain ID
    let extractedMemberId = qrDataOrId;
    if (qrDataOrId.startsWith('TNU-HGC:')) {
      const parts = qrDataOrId.split(':');
      if (parts.length >= 2) {
        extractedMemberId = parts[1];
      }
    }

    const member = this.getMemberById(extractedMemberId);
    if (!member) {
      return {
        success: false,
        type: 'MEMBER_NOT_FOUND',
        message: `Mã QR không hợp lệ hoặc không tìm thấy kỳ thủ với mã [${extractedMemberId}] trong hệ thống!`
      };
    }

    if (member.status === 'locked') {
      return {
        success: false,
        type: 'MEMBER_LOCKED',
        member,
        message: `Tài khoản của kỳ thủ [${member.name}] đang bị KHÓA. Vui lòng liên hệ Ban Điều Hành!`
      };
    }

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dateYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dateVN = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Determine mode & target
    let mode = 'session';
    let targetEventId = null;

    if (typeof checkInTarget === 'object' && checkInTarget !== null) {
      mode = checkInTarget.mode || (checkInTarget.eventId === 'SESSION' ? 'session' : 'activity');
      targetEventId = checkInTarget.eventId;
    } else if (typeof checkInTarget === 'string') {
      if (checkInTarget === 'SESSION' || checkInTarget === 'REGULAR_SESSION') {
        mode = 'session';
      } else {
        targetEventId = checkInTarget;
        const ev = this.state.events.find((e) => e.id === targetEventId);
        if (ev) {
          mode = ev.type === 'tournament' ? 'tournament' : 'activity';
        } else {
          mode = 'activity';
        }
      }
    } else {
      // Default fallback: check if any event is active, otherwise default to session
      const activeEvent = this.state.events.find((e) => e.checkinActive);
      if (activeEvent) {
        targetEventId = activeEvent.id;
        mode = activeEvent.type === 'tournament' ? 'tournament' : 'activity';
      } else {
        mode = 'session';
      }
    }

    // Branch 1: Sinh hoạt CLB định kỳ -> cộng thẳng vào Số Buổi Sinh Hoạt (attendanceCount)
    if (mode === 'session') {
      const sessionId = `SESSION-${dateYMD}`;
      const sessionTitle = `Buổi Sinh Hoạt Định Kỳ CLB (${dateVN})`;

      // Duplicate check: only once per day
      const alreadyCheckedIn = this.state.attendanceLogs.find(
        (log) => (log.eventId === sessionId || (log.category === 'session' && log.timestamp && log.timestamp.startsWith(dateYMD))) &&
          log.memberId === member.id && log.status === 'success'
      );

      if (alreadyCheckedIn) {
        return {
          success: false,
          type: 'DUPLICATE',
          member,
          category: 'session',
          existingTime: alreadyCheckedIn.timestamp,
          message: `TRÙNG LẶP: Kỳ thủ ${member.name} (${member.studentId}) đã được điểm danh buổi sinh hoạt hôm nay vào lúc ${alreadyCheckedIn.timestamp}!`
        };
      }

      // Increment attendanceCount (Số buổi sinh hoạt)
      member.attendanceCount = (member.attendanceCount || 0) + 1;

      const logId = `ATT-${Date.now().toString().slice(-5)}`;
      const newLog = {
        id: logId,
        eventId: sessionId,
        eventTitle: sessionTitle,
        category: 'session',
        categoryLabel: 'Buổi Sinh Hoạt',
        memberId: member.id,
        memberName: member.name,
        studentId: member.studentId,
        university: member.university,
        timestamp: timeStr,
        method: method,
        status: 'success',
        impact: '+1 Buổi Sinh Hoạt',
        note: `${member.roleTitle} - Hợp lệ`
      };

      this.state.attendanceLogs.unshift(newLog);
      this.notify();

      return {
        success: true,
        type: 'SUCCESS',
        category: 'session',
        member,
        impactText: '+1 Buổi Sinh Hoạt',
        currentCount: member.attendanceCount,
        log: newLog,
        message: `ĐIỂM DANH SINH HOẠT THÀNH CÔNG: Chào mừng ${member.name} (${member.roleTitle}) đến sinh hoạt CLB!`
      };
    }

    // Branch 2: Hoạt Động (🎯 Hoạt Động) -> cộng thẳng vào Số Hoạt Động (activitiesJoined)
    if (mode === 'activity') {
      let activeEvent = null;
      if (targetEventId) {
        activeEvent = this.state.events.find((e) => e.id === targetEventId);
      }
      if (!activeEvent) {
        // Tìm hoạt động đang checkinActive hoặc hoạt động đầu tiên trong danh sách sự kiện (không lấy giải đấu)
        activeEvent = this.state.events.find((e) => (e.type === 'activity' || e.type !== 'tournament') && e.checkinActive)
          || this.state.events.find((e) => e.type === 'activity' || e.type !== 'tournament');
      }
      if (!activeEvent) {
        return {
          success: false,
          type: 'NO_EVENT',
          message: 'Hiện chưa có hoạt động nào trong danh sách sự kiện! Vui lòng tạo hoạt động trước.'
        };
      }

      // Dọn dẹp log rác cũ nếu có log mang eventId này nhưng sự kiện mới hoàn toàn chưa ghi nhận member này
      if (Array.isArray(activeEvent.registeredMembers) && !activeEvent.registeredMembers.includes(member.id)) {
        this.state.attendanceLogs = (this.state.attendanceLogs || []).filter(
          (log) => !(log.eventId === activeEvent.id && log.memberId === member.id)
        );
      }

      // Duplicate check: CHỈ kiểm tra trong các lượt quét Hoạt Động cho cùng hoạt động này
      const alreadyCheckedIn = this.state.attendanceLogs.find(
        (log) => log.category === 'activity' &&
          log.eventId === activeEvent.id &&
          log.memberId === member.id &&
          log.status === 'success'
      );

      if (alreadyCheckedIn) {
        return {
          success: false,
          type: 'DUPLICATE',
          member,
          event: activeEvent,
          category: 'activity',
          existingTime: alreadyCheckedIn.timestamp,
          message: `TRÙNG LẶP: Kỳ thủ ${member.name} (${member.studentId}) đã được điểm danh hoạt động [${activeEvent.title}] vào lúc ${alreadyCheckedIn.timestamp}!`
        };
      }

      // Cộng dồn chỉ số hoạt động
      member.activitiesJoined = (member.activitiesJoined || 0) + 1;

      // Cập nhật registeredMembers nếu là sự kiện thực tế trong state
      if (activeEvent.registeredMembers && Array.isArray(activeEvent.registeredMembers)) {
        if (!activeEvent.registeredMembers.includes(member.id)) {
          activeEvent.registeredMembers.push(member.id);
          activeEvent.currentRegistered = activeEvent.registeredMembers.length;
        }
      }

      const logId = `ATT-${Date.now().toString().slice(-5)}`;
      const newLog = {
        id: logId,
        eventId: activeEvent.id,
        eventTitle: activeEvent.title,
        category: 'activity',
        categoryLabel: 'Hoạt Động',
        memberId: member.id,
        memberName: member.name,
        studentId: member.studentId,
        university: member.university,
        timestamp: timeStr,
        method: method,
        status: 'success',
        impact: '+1 Hoạt Động Tham Gia',
        note: `${member.roleTitle} - Hợp lệ`
      };

      this.state.attendanceLogs.unshift(newLog);
      this.notify();

      return {
        success: true,
        type: 'SUCCESS',
        category: 'activity',
        member,
        event: activeEvent,
        impactText: '+1 Hoạt Động Tham Gia',
        currentCount: member.activitiesJoined,
        log: newLog,
        message: `ĐIỂM DANH HOẠT ĐỘNG THÀNH CÔNG: Chào mừng ${member.name} (${member.roleTitle}) tham dự ${activeEvent.title}!`
      };
    }

    // Branch 3: Giải Đấu (🏆 Giải Đấu) -> cộng thẳng vào Số Giải Tham Gia (tournamentsJoined)
    if (mode === 'tournament') {
      let activeEvent = null;
      if (targetEventId) {
        activeEvent = this.state.events.find((e) => e.id === targetEventId);
      }
      if (!activeEvent) {
        // Tìm giải đấu đang checkinActive hoặc giải đấu đầu tiên trong danh sách sự kiện
        activeEvent = this.state.events.find((e) => e.type === 'tournament' && e.checkinActive)
          || this.state.events.find((e) => e.type === 'tournament');
      }
      if (!activeEvent) {
        return {
          success: false,
          type: 'NO_EVENT',
          message: 'Hiện chưa có giải đấu nào trong danh sách sự kiện! Vui lòng tạo giải đấu trước.'
        };
      }

      // Dọn dẹp log rác cũ nếu có log mang eventId này nhưng sự kiện mới hoàn toàn chưa ghi nhận member này
      if (Array.isArray(activeEvent.registeredMembers) && !activeEvent.registeredMembers.includes(member.id)) {
        this.state.attendanceLogs = (this.state.attendanceLogs || []).filter(
          (log) => !(log.eventId === activeEvent.id && log.memberId === member.id)
        );
      }

      // Duplicate check: CHỈ kiểm tra trong các lượt quét Giải Đấu cho cùng giải đấu này
      const alreadyCheckedIn = this.state.attendanceLogs.find(
        (log) => log.category === 'tournament' &&
          log.eventId === activeEvent.id &&
          log.memberId === member.id &&
          log.status === 'success'
      );

      if (alreadyCheckedIn) {
        return {
          success: false,
          type: 'DUPLICATE',
          member,
          event: activeEvent,
          category: 'tournament',
          existingTime: alreadyCheckedIn.timestamp,
          message: `TRÙNG LẶP: Kỳ thủ ${member.name} (${member.studentId}) đã được điểm danh giải đấu [${activeEvent.title}] vào lúc ${alreadyCheckedIn.timestamp}!`
        };
      }

      // Cộng dồn chỉ số giải đấu
      member.tournamentsJoined = (member.tournamentsJoined || 0) + 1;

      // Cập nhật registeredMembers nếu là sự kiện thực tế trong state
      if (activeEvent.registeredMembers && Array.isArray(activeEvent.registeredMembers)) {
        if (!activeEvent.registeredMembers.includes(member.id)) {
          activeEvent.registeredMembers.push(member.id);
          activeEvent.currentRegistered = activeEvent.registeredMembers.length;
        }
      }

      const logId = `ATT-${Date.now().toString().slice(-5)}`;
      const newLog = {
        id: logId,
        eventId: activeEvent.id,
        eventTitle: activeEvent.title,
        category: 'tournament',
        categoryLabel: 'Giải Đấu',
        memberId: member.id,
        memberName: member.name,
        studentId: member.studentId,
        university: member.university,
        timestamp: timeStr,
        method: method,
        status: 'success',
        impact: '+1 Số Giải Tham Gia',
        note: `${member.roleTitle} - Hợp lệ`
      };

      this.state.attendanceLogs.unshift(newLog);
      this.notify();

      return {
        success: true,
        type: 'SUCCESS',
        category: 'tournament',
        member,
        event: activeEvent,
        impactText: '+1 Số Giải Tham Gia',
        currentCount: member.tournamentsJoined,
        log: newLog,
        message: `ĐIỂM DANH GIẢI ĐẤU THÀNH CÔNG: Chào mừng ${member.name} (${member.roleTitle}) tham dự ${activeEvent.title}!`
      };
    }

    return {
      success: false,
      type: 'INVALID_MODE',
      message: 'Chế độ điểm danh không hợp lệ!'
    };
  }

  // --- Events & Tournaments ---
  addEvent(eventData) {
    const uniqueSuffix = Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90);
    const newId = `EVT-2026-${uniqueSuffix}`;
    const eventType = eventData.type === 'tournament' ? 'tournament' : 'activity';

    const isOpen = eventData.registrationOpen !== undefined ? !!eventData.registrationOpen : true;
    const maxParticipants = (isOpen && eventData.maxParticipants !== null && eventData.maxParticipants !== undefined && eventData.maxParticipants !== '')
      ? (parseInt(eventData.maxParticipants) || 64)
      : null;

    const newEvent = {
      id: newId,
      title: eventData.title,
      type: eventType, // 'activity' (Hoạt động) | 'tournament' (Giải đấu)
      discipline: eventData.discipline || (eventType === 'tournament' ? 'Giải đấu tranh cúp' : 'Sinh hoạt CLB'),
      status: 'upcoming', // Mặc định luôn là sắp diễn ra sau khi ấn tạo sự kiện
      dateTime: eventData.dateTime,
      location: eventData.location,
      organizer: eventData.organizer || 'Ban Chuyên môn TNU - HGC',
      maxParticipants: maxParticipants,
      currentRegistered: 0,
      description: eventData.description,
      registrationOpen: isOpen,
      checkinActive: false,
      registeredMembers: []
    };

    this.state.events.unshift(newEvent);
    this.notify();
    return newEvent;
  }

  deleteEvent(id) {
    const ev = this.state.events.find((e) => e.id === id);
    if (ev && ev.registeredMembers) {
      // Giảm lại số lượng đã tính cho các thành viên tham gia:
      ev.registeredMembers.forEach((mId) => {
        const mem = this.getMemberById(mId);
        if (mem) {
          if (ev.type === 'tournament' && (mem.tournamentsJoined || 0) > 0) {
            mem.tournamentsJoined -= 1;
          } else if (ev.type !== 'tournament' && (mem.activitiesJoined || 0) > 0) {
            mem.activitiesJoined -= 1;
          }
        }
      });
    }
    this.state.events = this.state.events.filter((e) => e.id !== id);
    // Xóa toàn bộ logs điểm danh thuộc sự kiện bị xóa để không bao giờ để lại log rác
    this.state.attendanceLogs = (this.state.attendanceLogs || []).filter((log) => log.eventId !== id);
    this.notify();
  }

  toggleEventRegistration(eventId) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (event) {
      event.registrationOpen = !event.registrationOpen;
      if (!event.registrationOpen) {
        event.maxParticipants = null; // Khi đóng cổng đăng ký thì không giới hạn số lượng kỳ thủ
      } else if (!event.maxParticipants) {
        event.maxParticipants = 64; // Khi mở lại cổng đăng ký, nếu chưa có giới hạn thì đặt mặc định 64
      }
      this.notify();
      return event.registrationOpen;
    }
    return false;
  }

  registerForEvent(eventId, memberId) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (!event) return { success: false, message: 'Sự kiện không tồn tại' };
    if (!event.registrationOpen) {
      return { success: false, message: 'Sự kiện này hiện đã đóng hoặc chưa mở cổng đăng ký!' };
    }
    if (!event.registeredMembers.includes(memberId)) {
      event.registeredMembers.push(memberId);
      event.currentRegistered = event.registeredMembers.length;

      // Tính vào hoạt động hoặc giải đấu cho thành viên tham gia:
      const member = this.getMemberById(memberId);
      if (member) {
        if (event.type === 'tournament') {
          member.tournamentsJoined = (member.tournamentsJoined || 0) + 1;
        } else {
          member.activitiesJoined = (member.activitiesJoined || 0) + 1;
        }
      }

      this.notify();
      return { success: true, message: 'Đăng ký tham gia thành công!' };
    }
    return { success: false, message: 'Bạn đã đăng ký sự kiện này rồi!' };
  }

  toggleEventCheckin(eventId) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (event) {
      // Set others to false if opening this one
      if (!event.checkinActive) {
        this.state.events.forEach((e) => (e.checkinActive = false));
        event.checkinActive = true;
        event.status = 'ongoing'; // Khi mở máy quét sẽ tự động chuyển thành Đang diễn ra
      } else {
        event.checkinActive = false;
      }
      this.notify();
      return event.checkinActive;
    }
    return false;
  }

  setEventStatus(eventId, status) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (event) {
      event.status = status;
      // If completed, shut down active check-in scanner and close registration
      if (status === 'completed') {
        event.checkinActive = false;
        event.registrationOpen = false;
      }
      this.notify();
      return true;
    }
    return false;
  }

  saveEventEvaluation(eventId, evaluations, medals = {}) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (!event) return false;

    event.status = 'completed';
    event.checkinActive = false;
    event.registrationOpen = false;
    event.evaluation = evaluations;
    event.medals = medals;
    event.evaluatedAt = new Date().toISOString();

    // Trao huy chương giải đấu và tự động cộng dồn vào hồ sơ thành viên:
    if (medals && (event.type === 'tournament' || medals.gold || medals.silver || medals.bronze)) {
      const goldList = Array.isArray(medals.gold) ? medals.gold : (medals.gold ? [medals.gold] : []);
      const silverList = Array.isArray(medals.silver) ? medals.silver : (medals.silver ? [medals.silver] : []);
      const bronzeList = Array.isArray(medals.bronze) ? medals.bronze : (medals.bronze ? [medals.bronze] : []);

      goldList.forEach((mId) => {
        const mem = this.getMemberById(mId);
        if (mem) mem.goldMedals = (mem.goldMedals || 0) + 1;
      });
      silverList.forEach((mId) => {
        const mem = this.getMemberById(mId);
        if (mem) mem.silverMedals = (mem.silverMedals || 0) + 1;
      });
      bronzeList.forEach((mId) => {
        const mem = this.getMemberById(mId);
        if (mem) mem.bronzeMedals = (mem.bronzeMedals || 0) + 1;
      });
    }

    // Recompute attendanceRate (Tỷ lệ tích cực) for all members:
    // Formula: Average rate across all evaluated events (absent is 0%)
    const evaluatedEvents = this.state.events.filter((e) => e.evaluation);
    if (evaluatedEvents.length > 0) {
      this.state.members.forEach((m) => {
        let totalScore = 0;
        evaluatedEvents.forEach((evt) => {
          const score = (evt.evaluation && evt.evaluation[m.id] !== undefined)
            ? evt.evaluation[m.id]
            : 0; // ai không tham gia là 0%
          totalScore += score;
        });
        m.attendanceRate = Math.round(totalScore / evaluatedEvents.length);
      });
    }

    this.notify();
    return true;
  }

  addEventFeedback(eventId, memberName, rating, comment) {
    const newFb = {
      id: `FB-${Date.now().toString().slice(-4)}`,
      eventId,
      memberName,
      rating: parseInt(rating) || 5,
      comment,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    this.state.eventFeedback.unshift(newFb);
    this.notify();
    return newFb;
  }

  // --- CMS Articles ---
  addArticle(articleData) {
    const nextNum = (this.state.articles.length + 1).toString().padStart(3, '0');
    const newArticle = {
      id: `ART-${nextNum}`,
      title: articleData.title,
      category: articleData.category || 'Tin hoạt động',
      author: articleData.author || 'CLB Cờ TNU - HGC',
      publishDate: new Date().toISOString().split('T')[0],
      thumbnail: articleData.thumbnail || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80',
      imageLayout: articleData.imageLayout || 'center',
      summary: articleData.summary || articleData.content.replace(/<[^>]*>/g, '').slice(0, 150) + '...',
      content: articleData.content,
      gallery: Array.isArray(articleData.gallery) ? articleData.gallery : [],
      featured: articleData.featured || false,
      status: 'published'
    };
    this.state.articles.unshift(newArticle);
    this.notify();
    return newArticle;
  }

  deleteArticle(id) {
    this.state.articles = this.state.articles.filter((a) => a.id !== id);
    this.notify();
  }

  // ==========================================
  // SWISS-SYSTEM TOURNAMENT OPERATIONS
  // ==========================================
  initSwissTournament(eventId, { totalRounds = 3, playerIds = [] } = {}) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (!event) throw new Error('Không tìm thấy giải đấu.');

    let players = [];
    if (Array.isArray(playerIds) && playerIds.length >= 2) {
      players = this.state.members.filter((m) => playerIds.includes(m.id));
    } else if (Array.isArray(event.registeredMembers) && event.registeredMembers.length >= 2) {
      players = this.state.members.filter((m) => event.registeredMembers.includes(m.id));
    } else {
      players = this.state.members.slice(0, 16);
    }

    if (players.length < 2) {
      throw new Error('Cần ít nhất 2 kỳ thủ tham gia để tạo giải đấu Hệ Thụy Sĩ.');
    }

    const tournament = new SwissTournament({
      id: `SWISS-${eventId}`,
      title: event.title,
      totalRounds: parseInt(totalRounds) || 3,
      players: players.map((p) => ({
        id: p.id,
        name: p.name || p.fullName,
        studentId: p.studentId,
        elo: p.eloRating || 1200
      }))
    });

    // Bốc thăm vòng 1 ngay lập tức
    tournament.generateNextRound();

    event.swissData = tournament.toJSON();
    event.type = 'tournament';
    this.notify();
    return event.swissData;
  }

  generateNextSwissRound(eventId) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (!event || !event.swissData) throw new Error('Giải đấu chưa được cấu hình Hệ Thụy Sĩ.');

    const tournament = SwissTournament.fromJSON(event.swissData);
    const newRound = tournament.generateNextRound();
    event.swissData = tournament.toJSON();
    this.notify();
    return newRound;
  }

  recordSwissMatchResult(eventId, roundNumber, matchId, result) {
    const event = this.state.events.find((e) => e.id === eventId);
    if (!event || !event.swissData) throw new Error('Giải đấu chưa được cấu hình Hệ Thụy Sĩ.');

    const tournament = SwissTournament.fromJSON(event.swissData);
    tournament.recordResult(roundNumber, matchId, result);
    event.swissData = tournament.toJSON();
    this.notify();
    return event.swissData;
  }

  // ==========================================
  // FUND / QUỸ CLB OPERATIONS
  // ==========================================
  addFundRecord({ memberId, amount, term, note, confirmedBy }) {
    const member = this.state.members.find((m) => m.id === memberId);
    const newRecord = {
      id: `FND-${Date.now().toString().slice(-5)}`,
      memberId: memberId || '',
      memberName: member?.name || member?.fullName || 'Kỳ thủ',
      studentId: member?.studentId || '',
      amount: parseInt(amount) || 50000,
      term: term || 'Học kỳ I (2026 - 2027)',
      date: new Date().toISOString().slice(0, 10),
      note: note || 'Đóng hội phí CLB Cờ',
      confirmedBy: confirmedBy || 'Ban Chủ Nhiệm',
      status: 'confirmed'
    };
    if (!Array.isArray(this.state.fundRecords)) {
      this.state.fundRecords = [];
    }
    this.state.fundRecords.unshift(newRecord);
    this.notify();
    return newRecord;
  }

  getMemberFundRecords(memberId) {
    return (this.state.fundRecords || []).filter((r) => r.memberId === memberId);
  }

  deleteFundRecord(id) {
    this.state.fundRecords = (this.state.fundRecords || []).filter((r) => r.id !== id);
    this.notify();
  }

  // ==========================================
  // FUND CAMPAIGNS (ĐỢT THU QUỸ MỖI THÁNG)
  // ==========================================
  addFundCampaign({ title, amount, deadline, description, bankAccount, bankCode, bankOwner }) {
    const newCamp = {
      id: `CAMP-${Date.now().toString().slice(-5)}`,
      title: title || 'Đợt Thu Quỹ Sinh Hoạt',
      amount: parseInt(amount) || 50000,
      deadline: deadline || '',
      description: description || 'Thu quỹ hoạt động định kỳ của CLB Cờ',
      bankAccount: bankAccount || '0346578422',
      bankCode: bankCode || 'MB',
      bankOwner: bankOwner || 'CLB CO TNU HGC',
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    if (!Array.isArray(this.state.fundCampaigns)) {
      this.state.fundCampaigns = [];
    }
    this.state.fundCampaigns.unshift(newCamp);
    this.notify();
    return newCamp;
  }

  toggleFundCampaignStatus(campaignId) {
    const camp = (this.state.fundCampaigns || []).find((c) => c.id === campaignId);
    if (camp) {
      camp.status = camp.status === 'active' ? 'closed' : 'active';
      this.notify();
    }
    return camp;
  }

  deleteFundCampaign(campaignId) {
    this.state.fundCampaigns = (this.state.fundCampaigns || []).filter((c) => c.id !== campaignId);
    this.notify();
  }

  // ==========================================
  // AUTO-RECORDING: TỰ ĐỘNG GHI NHẬN KHI ĐÓNG QUỸ
  // ==========================================
  memberSelfPayFund({ campaignId, memberId, note, method = 'VietQR Tự Động' }) {
    const member = this.state.members.find((m) => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy thông tin thành viên!');

    const camp = (this.state.fundCampaigns || []).find((c) => c.id === campaignId);
    const amount = camp ? camp.amount : 50000;
    const term = camp ? camp.title : 'Đóng Quỹ CLB';

    if (!Array.isArray(this.state.fundRecords)) {
      this.state.fundRecords = [];
    }
    const alreadyPaid = this.state.fundRecords.some(
      (r) => r.memberId === memberId && (r.campaignId === campaignId || r.term === term)
    );
    if (alreadyPaid) {
      throw new Error(`Kỳ thủ ${member.name} đã được ghi nhận hoàn thành đợt thu [${term}] rồi!`);
    }

    const newRecord = {
      id: `FND-${Date.now().toString().slice(-5)}`,
      campaignId: campaignId || '',
      memberId: member.id,
      memberName: member.name || member.fullName,
      studentId: member.studentId || '',
      amount: amount,
      term: term,
      date: new Date().toISOString().slice(0, 10),
      note: note || `Đóng qua ${method} - Tự động đối soát cú pháp [${member.studentId || 'Kỳ thủ'}]`,
      confirmedBy: 'Hệ Thống Tự Động (VietQR)',
      status: 'confirmed'
    };

    this.state.fundRecords.unshift(newRecord);
    this.notify();
    return newRecord;
  }
}

export const store = new Store();
