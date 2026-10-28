/**
 * swissSystem.js - Swiss-System Pairing & Standings Engine
 * Chuẩn bốc thăm & tính điểm thi đấu Hệ Thụy Sĩ (Swiss System) cho CLB Cờ TNU - HGC
 */

export class SwissTournament {
  /**
   * Khởi tạo giải đấu hệ Thụy Sĩ
   * @param {Object} options
   * @param {string} options.id - Mã giải đấu
   * @param {string} options.title - Tên giải đấu
   * @param {Array} options.players - Danh sách kỳ thủ tham gia [{ id, name, elo }]
   * @param {number} options.totalRounds - Tổng số vòng đấu dự kiến (mặc định 3 hoặc 5)
   */
  constructor(options = {}) {
    this.id = options.id || `SWISS-${Date.now().toString().slice(-6)}`;
    this.title = options.title || 'Giải Cờ Hệ Thụy Sĩ';
    this.totalRounds = options.totalRounds || 3;
    this.currentRound = options.currentRound || 0;
    this.status = options.status || 'draft'; // draft, ongoing, completed
    this.rounds = options.rounds || []; // [{ roundNumber, matches: [...] }]
    
    // Khởi tạo danh sách người chơi
    this.players = (options.players || []).map((p) => ({
      id: p.id,
      name: p.name || p.fullName || 'Kỳ thủ',
      gender: p.gender || 'Nam',
      unit: p.unit || p.faculty || p.class || '',
      phone: p.phone || '',
      studentId: p.studentId || '',
      elo: p.elo || 1200,
      score: p.score !== undefined ? p.score : 0,
      buchholz: p.buchholz !== undefined ? p.buchholz : 0,
      wins: p.wins !== undefined ? p.wins : 0,
      blackPoints: p.blackPoints !== undefined ? p.blackPoints : 0,
      directEncounterScore: p.directEncounterScore !== undefined ? p.directEncounterScore : 0,
      playedAgainstTied: p.playedAgainstTied || false,
      colorHistory: p.colorHistory || [], // ['W', 'B', 'W'...]
      opponentsPlayed: p.opponentsPlayed || [], // ['id1', 'id2'...]
      receivedBye: p.receivedBye || false
    }));
    this.standings = options.standings || null;
  }

  /**
   * Tính toán Bảng xếp hạng tạm thời / chung cuộc theo chuẩn Swiss-Manager FIDE
   * Căn cứ theo đúng trình tự 5 tiêu chí:
   * 1. Điểm (điểm ván) [1]
   * 2. Đối kháng trực tiếp (DE) (-) [81]
   * 3. Hệ số Buchholz (với các tham số) (1,1,K,3,0,K) [37]
   * 4. Điểm ván riêng cho Trắng và Đen (Điểm ván Đen) [76]
   * 5. Số ván thắng (WIN) (GP,0,P) [68]
   * 6. Elo dự phòng
   */
  computeStandings() {
    const playerMap = new Map();
    this.players.forEach((p) => playerMap.set(p.id, p));

    // 1. Tính lại điểm, số ván thắng, điểm ván Đen từ lịch sử các vòng đấu
    this.players.forEach((p) => {
      let score = 0;
      let wins = 0;
      let blackPoints = 0;
      const opponents = [];

      this.rounds.forEach((rnd) => {
        (rnd.matches || []).forEach((m) => {
          if (m.result === null || m.result === undefined) return;

          // Ván Bye (miễn đấu: được tính 1 điểm & 1 ván thắng)
          if (m.isBye && m.whiteId === p.id) {
            score += 1;
            wins += 1;
            return;
          }

          if (m.whiteId === p.id) {
            opponents.push(m.blackId);
            if (m.result === '1-0') {
              score += 1;
              wins += 1;
            } else if (m.result === '0.5-0.5' || m.result === '1/2-1/2') {
              score += 0.5;
            }
          } else if (m.blackId === p.id) {
            opponents.push(m.whiteId);
            if (m.result === '0-1') {
              score += 1;
              wins += 1;
              blackPoints += 1; // Thắng bằng quân Đen
            } else if (m.result === '0.5-0.5' || m.result === '1/2-1/2') {
              score += 0.5;
              blackPoints += 0.5; // Hòa khi cầm quân Đen
            }
          }
        });
      });

      p.score = score;
      p.wins = wins;
      p.blackPoints = blackPoints;
      p.opponentsPlayed = opponents;
    });

    // 2. Tính hệ số Buchholz (Tổng điểm của các đối thủ đã thi đấu cùng)
    this.players.forEach((p) => {
      let bScore = 0;
      (p.opponentsPlayed || []).forEach((oppId) => {
        const opp = playerMap.get(oppId);
        if (opp) bScore += opp.score;
      });
      p.buchholz = bScore;
    });

    // 3. Tính Đối kháng trực tiếp (Direct Encounter - DE) [81] giữa các kỳ thủ bằng điểm nhau
    const scoreGroups = new Map();
    this.players.forEach((p) => {
      if (!scoreGroups.has(p.score)) scoreGroups.set(p.score, []);
      scoreGroups.get(p.score).push(p);
    });

    scoreGroups.forEach((group) => {
      if (group.length <= 1) {
        group[0].directEncounterScore = 0;
        group[0].playedAgainstTied = false;
        return;
      }
      const groupIds = new Set(group.map((x) => x.id));
      group.forEach((p) => {
        let dePts = 0;
        let playedTied = false;
        this.rounds.forEach((rnd) => {
          (rnd.matches || []).forEach((m) => {
            if (!m.result || m.isBye) return;
            if (m.whiteId === p.id && groupIds.has(m.blackId)) {
              playedTied = true;
              if (m.result === '1-0') dePts += 1;
              else if (m.result === '0.5-0.5' || m.result === '1/2-1/2') dePts += 0.5;
            } else if (m.blackId === p.id && groupIds.has(m.whiteId)) {
              playedTied = true;
              if (m.result === '0-1') dePts += 1;
              else if (m.result === '0.5-0.5' || m.result === '1/2-1/2') dePts += 0.5;
            }
          });
        });
        p.directEncounterScore = dePts;
        p.playedAgainstTied = playedTied;
      });
    });

    // 4. Sắp xếp thứ hạng theo đúng 5 tiêu chí chuẩn Swiss-Manager:
    // 1. Điểm ván (score) [1]
    // 2. Đối kháng trực tiếp (DE) (-) [81]
    // 3. Hệ số Buchholz [37]
    // 4. Điểm ván riêng cho Trắng và Đen (Điểm ván Đen) [76]
    // 5. Số ván thắng (WIN) [68]
    // 6. Elo dự phòng
    const sorted = [...this.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.directEncounterScore !== a.directEncounterScore) {
        return b.directEncounterScore - a.directEncounterScore;
      }
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      if (b.blackPoints !== a.blackPoints) return b.blackPoints - a.blackPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.elo || 0) - (a.elo || 0);
    });

    this.standings = sorted.map((p, idx) => ({
      rank: idx + 1,
      ...p
    }));

    return this.standings;
  }

  generateRound1() {
    return this.generateNextRound();
  }

  /**
   * Bốc thăm tạo cặp đấu cho vòng tiếp theo (Swiss Pairing Algorithm)
   */
  generateNextRound() {
    if (this.players.length < 2) {
      throw new Error('Cần ít nhất 2 kỳ thủ để bốc thăm thi đấu hệ Thụy Sĩ.');
    }

    // Nếu vòng trước chưa hoàn tất kết quả thì không cho bốc thăm vòng sau
    if (this.currentRound > 0) {
      const prevRound = this.rounds.find((r) => r.roundNumber === this.currentRound);
      if (prevRound) {
        const unrecorded = prevRound.matches.some((m) => !m.isBye && m.result === null);
        if (unrecorded) {
          throw new Error(`Vòng ${this.currentRound} vẫn còn trận chưa có kết quả. Vui lòng nhập kết quả trước khi bốc thăm vòng tiếp theo!`);
        }
      }
    }

    if (this.currentRound >= this.totalRounds) {
      throw new Error(`Giải đấu đã hoàn thành tối đa ${this.totalRounds} vòng theo quy định.`);
    }

    // Cập nhật điểm & xếp hạng trước khi bốc thăm
    this.computeStandings();

    const nextRoundNum = this.currentRound + 1;
    let pool = [...this.players];

    // Sắp xếp kỳ thủ theo đúng 5 tiêu chí: Điểm ➔ Đối kháng ➔ Buchholz ➔ Điểm Đen ➔ Số Thắng ➔ Elo
    pool.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.directEncounterScore !== a.directEncounterScore) return b.directEncounterScore - a.directEncounterScore;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      if (b.blackPoints !== a.blackPoints) return b.blackPoints - a.blackPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.elo || 0) - (a.elo || 0);
    });

    const matches = [];
    let boardNum = 1;

    // Xử lý kỳ thủ được Bye nếu số người là số lẻ
    if (pool.length % 2 !== 0) {
      // Tìm kỳ thủ xếp dưới cùng mà chưa từng nhận Bye
      let byeIdx = -1;
      for (let i = pool.length - 1; i >= 0; i--) {
        if (!pool[i].receivedBye) {
          byeIdx = i;
          break;
        }
      }
      if (byeIdx === -1) byeIdx = pool.length - 1;

      const byePlayer = pool.splice(byeIdx, 1)[0];
      byePlayer.receivedBye = true;

      matches.push({
        id: `M-${nextRoundNum}-BYE`,
        roundNumber: nextRoundNum,
        board: 0,
        isBye: true,
        whiteId: byePlayer.id,
        whiteName: byePlayer.name,
        whiteUnit: byePlayer.unit || '',
        blackId: null,
        blackName: 'Nghỉ ván (Bye +1đ)',
        blackUnit: '',
        result: '1-0', // Tự động cộng 1 điểm
        note: 'Kỳ thủ được miễn đấu vòng này (Bye +1đ)'
      });
    }

    // Ghép cặp các kỳ thủ còn lại trong pool
    const paired = new Set();

    for (let i = 0; i < pool.length; i++) {
      const p1 = pool[i];
      if (paired.has(p1.id)) continue;

      let bestOpponentIdx = -1;

      // Tìm đối thủ trong cùng nhóm điểm hoặc điểm gần nhất mà chưa từng đối đầu
      for (let j = i + 1; j < pool.length; j++) {
        const p2 = pool[j];
        if (paired.has(p2.id)) continue;

        const hasPlayed = (p1.opponentsPlayed || []).includes(p2.id);
        if (!hasPlayed) {
          bestOpponentIdx = j;
          break;
        }
      }

      // Nếu trong trường hợp ngặt nghèo không tìm được ai chưa đối đầu, ghép với người chưa ghép
      if (bestOpponentIdx === -1) {
        for (let j = i + 1; j < pool.length; j++) {
          if (!paired.has(pool[j].id)) {
            bestOpponentIdx = j;
            break;
          }
        }
      }

      if (bestOpponentIdx !== -1) {
        const p2 = pool[bestOpponentIdx];
        paired.add(p1.id);
        paired.add(p2.id);

        // Xác định màu quân (Trắng / Đen) để cân bằng
        const p1WhiteCount = (p1.colorHistory || []).filter((c) => c === 'W').length;
        const p2WhiteCount = (p2.colorHistory || []).filter((c) => c === 'W').length;

        let whitePlayer = p1;
        let blackPlayer = p2;

        if (p1WhiteCount > p2WhiteCount) {
          whitePlayer = p2;
          blackPlayer = p1;
        } else if (p1WhiteCount === p2WhiteCount && p1.colorHistory?.slice(-1)[0] === 'W') {
          whitePlayer = p2;
          blackPlayer = p1;
        }

        whitePlayer.colorHistory = [...(whitePlayer.colorHistory || []), 'W'];
        blackPlayer.colorHistory = [...(blackPlayer.colorHistory || []), 'B'];

        matches.push({
          id: `M-${nextRoundNum}-${boardNum}`,
          roundNumber: nextRoundNum,
          board: boardNum,
          isBye: false,
          whiteId: whitePlayer.id,
          whiteName: whitePlayer.name,
          whiteUnit: whitePlayer.unit || '',
          blackId: blackPlayer.id,
          blackName: blackPlayer.name,
          blackUnit: blackPlayer.unit || '',
          result: null, // null, '1-0', '0-1', '0.5-0.5'
          note: ''
        });

        boardNum++;
      }
    }

    const newRound = {
      roundNumber: nextRoundNum,
      createdAt: new Date().toISOString(),
      matches
    };

    this.rounds.push(newRound);
    this.currentRound = nextRoundNum;
    this.status = 'ongoing';

    return newRound;
  }

  /**
   * Ghi nhận kết quả trận đấu ngầm (không tính lại thứ hạng, phục vụ bấm nút không chớp màn hình)
   * Thứ hạng và điểm số chỉ được tính khi bấm "Bốc thăm vòng tiếp" hoặc "Xác nhận kết quả".
   */
  setMatchResultSilently(roundNumber, matchId, result) {
    const round = this.rounds.find((r) => r.roundNumber === roundNumber);
    if (!round) throw new Error(`Không tìm thấy vòng đấu số ${roundNumber}`);

    const match = round.matches.find((m) => m.id === matchId);
    if (!match) throw new Error(`Không tìm thấy bàn đấu ${matchId}`);

    match.result = result;
    return match;
  }

  /**
   * Xác nhận kết quả chung cuộc giải đấu
   */
  finalizeTournament() {
    this.computeStandings();
    this.status = 'completed';
    return this.standings;
  }

  /**
   * Ghi nhận kết quả trận đấu có tính điểm ngay (tùy chọn)
   */
  recordResult(roundNumber, matchId, result) {
    this.setMatchResultSilently(roundNumber, matchId, result);
    this.computeStandings();

    // Kiểm tra nếu tất cả các trận của vòng cuối cùng đã xong -> kết thúc giải
    if (this.currentRound >= this.totalRounds) {
      const allRoundsDone = this.rounds.every((r) =>
        r.matches.every((m) => m.result !== null)
      );
      if (allRoundsDone) {
        this.status = 'completed';
      }
    }

    return result;
  }

  /**
   * Xuất trạng thái để lưu trữ vào Store / Firebase
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      totalRounds: this.totalRounds,
      currentRound: this.currentRound,
      status: this.status,
      rounds: this.rounds,
      players: this.players,
      standings: this.standings || this.computeStandings()
    };
  }

  /**
   * Tái tạo từ dữ liệu JSON
   */
  static fromJSON(data) {
    return new SwissTournament(data);
  }
}

/**
 * Hàm xuất bảng xếp hạng ra file CSV chuẩn 5 tiêu chí Swiss-Manager
 */
export function exportSwissStandingsCsv(swissData, tournamentTitle) {
  const standings = swissData?.standings || [];
  let csv = '\uFEFFHạng,Họ và tên,Giới tính,Đơn vị,Điểm ván (Pts),Đối kháng (DE),Hệ số Buchholz (BH),Điểm ván Đen,Số ván thắng (WIN)\r\n';
  standings.forEach((p, idx) => {
    const deDisplay = p.playedAgainstTied ? p.directEncounterScore : '-';
    const row = [
      idx + 1,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      p.gender || 'Nam',
      `"${(p.unit || '').replace(/"/g, '""')}"`,
      p.score,
      deDisplay,
      p.buchholz,
      p.blackPoints || 0,
      p.wins || 0
    ].join(',');
    csv += row + '\r\n';
  });

  if (typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (tournamentTitle || 'Giai_Co').replace(/[^\w\d-_]/g, '_');
    a.download = `Ket_Qua_${cleanTitle}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return csv;
}
