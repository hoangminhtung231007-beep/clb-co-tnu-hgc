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
    zaloGroupLink: "https://zalo.me/g/ugejmj655",
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
  eventFeedback: [],
  fundRecords: [],
  fundCampaigns: [
    {
      id: "CAMP-1026",
      title: "Quỹ Sinh Hoạt Tháng 10/2026",
      amount: 30000,
      deadline: "2026-10-31",
      description: "Tiền trà nước sinh hoạt, mua sắm quân cờ mới và khen thưởng kỳ thủ tích cực",
      bankAccount: "80402233445566",
      bankCode: "MB",
      bankOwner: "HOANG MINH TUNG",
      qrImage: "/vietqr-fund.png",
      status: "active",
      createdAt: "2026-10-01"
    }
  ],
  fundSettings: {
    month: "10/2026",
    title: "Quỹ Sinh Hoạt Tháng 10/2026",
    amount: 30000,
    syntaxPrefix: "QUY T10",
    bankAccount: "80402233445566",
    bankCode: "MB",
    bankOwner: "HOANG MINH TUNG",
    qrImage: "/vietqr-fund.png"
  }
};
