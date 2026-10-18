// Completely clean database for TNU - HGC Chess Club (Zero sample data)
export const INITIAL_DATA = {
  currentSession: {
    role: "guest",
    activeMemberId: null
  },
  clubInfo: {
    name: "CLB Cờ TNU - HGC, Đại học Thái Nguyên Phân hiệu tại Hà Giang",
    shortName: "CLB Cờ TNU - HGC",
    slogan: "Nơi giao thoa của trí tuệ, bản lĩnh và sự điềm tĩnh",
    established: "2026",
    foundedDate: "18/03/2026",
    hq: "Đại học Thái Nguyên Phân hiệu tại Hà Giang",
    logo: "/logo.png",
    email: "clbcotnuhgc@gmail.com",
    hotline: "0346578422",
    fanpage: "CLB Cờ TNU - HGC",
    zaloGroupLink: "https://zalo.me/g/clbcotnuhgc",
    bankInfo: "",
    totalMembers: 0,
    retiredMembers: 0,
    activeTournaments: 0,
    matchesPlayed: 0
  },
  members: [],
  pendingApplications: [],
  alumniBoard: [],
  alumniMembers: [],
  events: [],
  attendanceLogs: [],
  articles: [],
  eventFeedback: []
};
