# Build dist/assets/index-v18.js: Multi-medal award system (unlimited gold/silver/bronze per tournament)
v17 = File.read("dist/assets/index-v17.js")
v18 = v17.dup

# 1. Update saveEventEvaluation in store (line 2 of bundle)
old_save_eval = 'if(medals&&(t.type==="tournament"||medals.gold||medals.silver||medals.bronze)){if(medals.gold){const mem=this.getMemberById(medals.gold);mem&&(mem.goldMedals=(mem.goldMedals||0)+1)}if(medals.silver){const mem=this.getMemberById(medals.silver);mem&&(mem.silverMedals=(mem.silverMedals||0)+1)}if(medals.bronze){const mem=this.getMemberById(medals.bronze);mem&&(mem.bronzeMedals=(mem.bronzeMedals||0)+1)}}'
new_save_eval = 'if(medals&&(t.type==="tournament"||medals.gold||medals.silver||medals.bronze)){const gList=Array.isArray(medals.gold)?medals.gold:(medals.gold?[medals.gold]:[]);const sList=Array.isArray(medals.silver)?medals.silver:(medals.silver?[medals.silver]:[]);const bList=Array.isArray(medals.bronze)?medals.bronze:(medals.bronze?[medals.bronze]:[]);gList.forEach(id=>{const m=this.getMemberById(id);m&&(m.goldMedals=(m.goldMedals||0)+1)});sList.forEach(id=>{const m=this.getMemberById(id);m&&(m.silverMedals=(m.silverMedals||0)+1)});bList.forEach(id=>{const m=this.getMemberById(id);m&&(m.bronzeMedals=(m.bronzeMedals||0)+1)});} '

if v18.include?(old_save_eval)
  v18 = v18.sub(old_save_eval, new_save_eval)
  puts "1. Updated saveEventEvaluation in bundle!"
elsif v18.include?("gList.forEach")
  puts "1. saveEventEvaluation already updated in bundle!"
else
  abort "Could not find old_save_eval in v17"
end

# 2. Update openEventEvaluationModal in modalManager
idx_start = v18.index("openEventEvaluationModal(")
idx_end = v18.index("openFeedbackModal(", idx_start)

if !idx_start || !idx_end
  abort "Could not find openEventEvaluationModal in v17"
end

new_eval_modal = <<~'JAVASCRIPT'
openEventEvaluationModal(n,A){const e=k.getState(),t=e.members||[];let isTournament=n.type==="tournament"||n.type==="Giải Đấu";const r=new Set((e.attendanceLogs||[]).filter(i=>i.eventId===n.id&&i.status==="success").map(i=>i.memberId)),a={};t.forEach(i=>{a[i.id]=r.has(i.id)?50:0});const o=r.size,s=t.length,selectedMedals={gold:[],silver:[],bronze:[]};const renderMedalList=(type,colorClass,borderColor,badgeIcon,badgeTitle)=>{const list=selectedMedals[type]||[];return `<div style="background:rgba(0,0,0,0.25); border:1px solid ${borderColor}; border-radius:8px; padding:10px; display:flex; flex-direction:column;"><div class="d-flex justify-between align-center mb-2"><label class="form-label ${colorClass} font-bold text-xs" style="margin-bottom:0;">${badgeIcon} ${badgeTitle} <span class="badge" style="background:rgba(255,255,255,0.1); color:#fff; font-size:0.7rem; padding:1px 6px;">${list.length}</span></label></div><div class="medal-tags-list" style="flex:1; min-height:44px; max-height:110px; overflow-y:auto; margin-bottom:8px; display:flex; flex-direction:column; gap:4px;">${list.length===0?'<div class="text-xs text-muted" style="font-style:italic; padding:10px 4px;">Chưa trao giải nào</div>':list.map((mId,index)=>{const mem=t.find(x=>x.id===mId);return `<div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:4px 8px; background:rgba(255,255,255,0.06); border:1px solid ${borderColor}; border-radius:6px; font-size:0.75rem;"><span class="text-white font-medium text-truncate" style="max-width:170px;" title="${mem?mem.name:mId}">${badgeIcon} <strong>${mem?mem.name:mId}</strong> <span class="text-dim text-xs font-mono">(${mem?(mem.studentId||mem.id):mId})</span></span><button type="button" class="btn-remove-medal-item" data-type="${type}" data-index="${index}" style="background:none; border:none; color:#f87171; cursor:pointer; font-weight:bold; font-size:1.1rem; line-height:1; padding:0 3px;" title="Gỡ huy chương này">&times;</button></div>`;}).join('')}</div><div><select class="form-select form-select-sm select-add-medal" data-type="${type}" style="background:#0b1329; color:#f8fafc; border-color:${borderColor}; font-size:0.76rem; width:100%;"><option value="">+ Chọn kỳ thủ nhận ${badgeIcon}...</option>${t.map(m=>`<option value="${m.id}">${m.name} (${m.studentId||m.id}) ${r.has(m.id)?'🟢':''}</option>`).join('')}</select></div></div>`;};const renderMedalColumns=()=>`${renderMedalList('gold','text-gold','rgba(212,175,55,0.5)','🥇','Huy Chương Vàng')}${renderMedalList('silver','text-cyan','rgba(56,189,248,0.5)','🥈','Huy Chương Bạc')}${renderMedalList('bronze','text-rose','rgba(251,113,133,0.5)','🥉','Huy Chương Đồng')}`;let l="all",c="";const d=()=>{const i=t.filter(m=>{const g=r.has(m.id);if(l==="checked"&&!g)return!1;if(l==="absent"&&g)return!1;if(c){const h=c.toLowerCase();return(m.name&&m.name.toLowerCase().includes(h))||(m.studentId&&m.studentId.toLowerCase().includes(h))||(m.id&&m.id.toLowerCase().includes(h))}return!0});if(i.length===0)return'<tr><td colspan="4" class="text-center text-muted p-4">Không tìm thấy thành viên phù hợp</td></tr>';return i.map((m,g)=>{const h=r.has(m.id),u=(n.registeredMembers||[]).includes(m.id),f=a[m.id];let w="";h?w='<span class="badge badge-emerald" style="font-size:0.75rem;">🟢 Đã Quét QR</span>':u?w='<span class="badge" style="font-size:0.75rem; background:rgba(234,179,8,0.15); color:#facc15; border:1px solid rgba(234,179,8,0.4);">🟡 Đăng Ký - Vắng</span>':w='<span class="badge badge-outline" style="font-size:0.75rem; color:#94a3b8; border-color:rgba(255,255,255,0.15);">⚪ Không Tham Gia</span>';let badges=[];if(isTournament){const gc=selectedMedals.gold.filter(id=>id===m.id).length,sc=selectedMedals.silver.filter(id=>id===m.id).length,bc=selectedMedals.bronze.filter(id=>id===m.id).length;gc>0&&badges.push(`<span class="badge badge-gold" style="font-size:0.72rem; padding:2px 7px; font-weight:800; border-radius:4px;">🥇 ${gc>1?`${gc}x `:''}HCV</span>`),sc>0&&badges.push(`<span class="badge badge-cyan" style="font-size:0.72rem; padding:2px 7px; font-weight:800; border-radius:4px;">🥈 ${sc>1?`${sc}x `:''}HCB</span>`),bc>0&&badges.push(`<span class="badge badge-rose" style="font-size:0.72rem; padding:2px 7px; font-weight:800; border-radius:4px;">🥉 ${bc>1?`${bc}x `:''}HCĐ</span>`);}return`<tr data-member-id="${m.id}"><td style="width: 50px;" class="text-center font-mono text-dim font-bold">${g+1}</td><td><div class="member-cell"><img src="${m.avatar}" alt="${m.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;"><div><div class="font-bold text-white text-sm d-flex align-center gap-1.5 flex-wrap"><span>${m.name}</span>${badges.join(' ')}</div><div class="text-xs text-dim font-mono">${m.studentId||""} • ${m.class||m.major||"K22"}</div></div></div></td><td style="width: 150px;">${w}</td><td><div class="eval-pill-group" data-member-id="${m.id}" style="display:flex; gap:6px; flex-wrap:wrap;"><button type="button" class="eval-pill ${f===100?"active":""}" data-score="100" title="Xuất sắc, đóng góp nổi bật hoặc đoạt giải">🌟 100% Xuất Sắc</button><button type="button" class="eval-pill ${f===75?"active":""}" data-score="75" title="Tham gia đầy đủ, nhiệt tình">🟢 75% Năng Nổ</button><button type="button" class="eval-pill ${f===50?"active":""}" data-score="50" title="Có mặt đầy đủ (Mặc định)">🟡 50% Bình Thường</button><button type="button" class="eval-pill ${f===30?"active":""}" data-score="30" title="Đến muộn, bỏ dở giữa chừng, ít tích cực">🟠 30% Chưa Tích Cực</button><button type="button" class="eval-pill ${f===0?"active":""}" data-score="0" title="Không tham gia">⚫ 0% Vắng Mặt</button></div></td></tr>`}).join("")},p=`
      <div class="eval-modal-content" style="max-height: 75vh; display: flex; flex-direction: column;">
        <!-- Header Info Card -->
        <div class="mb-3 p-3" style="background: radial-gradient(circle at 100% 0%, rgba(212,175,55,0.12) 0%, transparent 60%), linear-gradient(135deg, rgba(14,23,46,0.95) 0%, rgba(26,42,82,0.85) 100%); border: 1px solid var(--border-gold); border-radius: 12px;">
          <div class="d-flex justify-between align-center flex-wrap gap-2">
            <div>
              <div class="d-flex align-center gap-2 mb-1 flex-wrap">
                <span class="badge ${isTournament?"badge-gold":"badge-cyan"}" id="evalTypeBadge" style="font-size:0.75rem; font-weight:700;">
                  🏁 KẾT THÚC ${isTournament?"GIẢI ĐẤU & TRAO HUY CHƯƠNG":"HOẠT ĐỘNG & ĐÁNH GIÁ THÁI ĐỘ"}
                </span>
                <button type="button" class="btn btn-outline btn-xs" id="btnToggleEvalMode" style="font-size:0.72rem; padding:2px 10px; border-color:rgba(212,175,55,0.5); color:#facc15; font-weight:600;" title="Bấm để chuyển đổi giữa Giải Đấu và Hoạt Động Thường">
                  🔄 ${isTournament?"Đổi sang Hoạt Động Thường":"Đổi sang Giải Đấu (Mở Trao Huy Chương)"}
                </button>
              </div>
              <h3 class="font-bold text-white text-base mt-1 mb-0.5">${n.title}</h3>
              <p class="text-xs text-muted mb-0">📅 ${n.dateTime||"Hôm nay"} • 📍 ${n.location||"CLB Cờ TNU - HGC"}</p>
            </div>
            <div class="d-flex align-center gap-3">
              <div style="text-align: center; padding: 6px 14px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div class="text-xs text-muted">Đã Quét QR</div>
                <div class="text-base font-bold text-emerald">${o}/${s}</div>
              </div>
              <div style="text-align: center; padding: 6px 14px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div class="text-xs text-muted">Vắng Mặt</div>
                <div class="text-base font-bold text-dim">${s-o}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Trao Huy Chương Giải Đấu (Chỉ hiển thị cho Giải Đấu) -->
        <div id="evalMedalSectionWrapper" style="display: ${isTournament?"block":"none"};">
          <div class="card mb-3 p-3" style="background: radial-gradient(circle at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 70%), linear-gradient(135deg, rgba(14,23,46,0.98) 0%, rgba(26,42,82,0.9) 100%); border: 1.5px solid var(--border-gold); border-radius: 12px;">
            <div class="d-flex justify-between align-center mb-2 flex-wrap gap-1">
              <span class="badge badge-gold" style="font-size:0.75rem; font-weight:800;">🏆 TRAO HUY CHƯƠNG GIẢI ĐẤU (TỰ ĐỘNG CỘNG VÀO HỒ SƠ KỲ THỦ)</span>
              <span class="text-xs text-dim">Trao không giới hạn số lượng (2 Vàng, 4 Bạc, 5 Đồng...)</span>
            </div>
            <div id="evalMedalColumnsGrid" class="grid grid-cols-3 gap-3">
              ${renderMedalColumns()}
            </div>
          </div>
        </div>

        <!-- Quick Set Toolbar & Filters -->
        <div class="d-flex justify-between align-center flex-wrap gap-2 mb-3">
          <div class="d-flex align-center gap-2 flex-wrap">
            <span class="text-xs text-muted">Thao tác nhanh cho người có mặt:</span>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet50" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(234,179,8,0.4); color: #facc15;">
              🟡 Đặt lại 50% (Bình Thường)
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet75" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(16,185,129,0.4); color: #34d399;">
              🟢 Đặt tất cả 75% (Năng Nổ)
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet100" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(245,158,11,0.4); color: #fbbf24;">
              🌟 Đặt tất cả 100% (Xuất Sắc)
            </button>
            <button type="button" class="btn btn-sm btn-outline" id="btnQuickSet30" style="padding: 4px 10px; font-size: 0.76rem; border-color: rgba(249,115,22,0.4); color: #fb923c;">
              🟠 Đặt tất cả 30% (Chưa Tích Cực)
            </button>
          </div>

          <div class="d-flex align-center gap-2 flex-wrap">
            <div class="role-btn-group" id="evalFilterTabs">
              <button type="button" class="role-pill active" data-tab="all" style="font-size:0.75rem; padding:4px 10px;">Tất cả (${s})</button>
              <button type="button" class="role-pill" data-tab="checked" style="font-size:0.75rem; padding:4px 10px;">Đã quét QR (${o})</button>
              <button type="button" class="role-pill" data-tab="absent" style="font-size:0.75rem; padding:4px 10px;">Vắng (${s-o})</button>
            </div>
            <input type="text" id="evalSearchInput" placeholder="Tìm tên/MSSV..." class="form-input form-input-sm" style="width: 140px; font-size:0.78rem; padding:4px 8px; background:#0b1329;">
          </div>
        </div>

        <!-- Scrollable Table -->
        <div class="table-responsive mobile-card-view" style="flex: 1; max-height: 380px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: 8px;">
          <table class="data-table" style="font-size: 0.84rem;">
            <thead>
              <tr style="position: sticky; top: 0; z-index: 2; background: #0b1329;">
                <th style="width: 50px;">STT</th>
                <th>Kỳ Thủ</th>
                <th style="width: 150px;">Trạng Thái</th>
                <th>Thái Độ Sinh Hoạt (BDH Chấm)</th>
              </tr>
            </thead>
            <tbody id="evalTableBody">
              ${d()}
            </tbody>
          </table>
        </div>

        <!-- Note info below table -->
        <div class="mt-2 text-xs text-muted" style="line-height: 1.5;">
          💡 <em>Ghi chú: Thành viên có mặt quét mã mặc định 50% (Bình thường). BDH có thể nâng lên 75%, 100% hoặc hạ xuống 30% (Chưa tích cực). ${isTournament?"Kỳ thủ được trao huy chương sẽ tự động được ghi nhận 100% và cộng huy chương vào hồ sơ cá nhân.":"Thành viên không tham gia được tính 0%."} Tỷ Lệ Tích Cực sẽ tự động cập nhật trên Bảng Xếp Hạng.</em>
        </div>
      </div>
    `;this.open(`Chấm Điểm & Kết Thúc: ${n.title}`,p,()=>{const i=isTournament?selectedMedals:{gold:[],silver:[],bronze:[]};k.saveEventEvaluation(n.id,a,i);const totalMedals=(selectedMedals.gold.length||0)+(selectedMedals.silver.length||0)+(selectedMedals.bronze.length||0);let msg=`Đã lưu bảng đánh giá cho ${isTournament?"giải đấu":"hoạt động"} [${n.title}] thành công!\nTrạng thái hoạt động đã chuyển sang "ĐÃ KẾT THÚC" 🏁 và Tỷ lệ chuyên cần trên Bảng Xếp Hạng đã được tự động cập nhật!`;if(isTournament&&totalMedals>0){msg+=`\n\n🏆 KẾT QUẢ TRAO HUY CHƯƠNG GIẢI ĐẤU (Tổng: ${totalMedals} huy chương):\n`;if(selectedMedals.gold.length>0){msg+=`🥇 ${selectedMedals.gold.length} Huy Chương Vàng:\n`+selectedMedals.gold.map(id=>{const m=t.find(x=>x.id===id);return `   • ${m?m.name:id} (${m?.studentId||id})`;}).join("\n")+"\n";}if(selectedMedals.silver.length>0){msg+=`🥈 ${selectedMedals.silver.length} Huy Chương Bạc:\n`+selectedMedals.silver.map(id=>{const m=t.find(x=>x.id===id);return `   • ${m?m.name:id} (${m?.studentId||id})`;}).join("\n")+"\n";}if(selectedMedals.bronze.length>0){msg+=`🥉 ${selectedMedals.bronze.length} Huy Chương Đồng:\n`+selectedMedals.bronze.map(id=>{const m=t.find(x=>x.id===id);return `   • ${m?m.name:id} (${m?.studentId||id})`;}).join("\n")+"\n";}msg+=`\n✅ Toàn bộ huy chương đã được tự động cộng dồn vào hồ sơ cá nhân của các kỳ thủ!`;}alert(msg),A&&A();return!0},"💾 Lưu Đánh Giá & Hoàn Tất Kết Thúc");const B=document.getElementById("globalAppModal");if(!B)return;const w=B.querySelector("#evalTableBody"),y=()=>{w&&w.querySelectorAll(".eval-pill").forEach(i=>{i.onclick=m=>{m.preventDefault(),D.playClick();const g=i.closest(".eval-pill-group"),h=g?.getAttribute("data-member-id");if(!h)return;const u=parseInt(i.getAttribute("data-score"),10);a[h]=u,g.querySelectorAll(".eval-pill").forEach(f=>f.classList.remove("active")),i.classList.add("active")}}})};y();const bindMedalEvents=()=>{const grid=B.querySelector('#evalMedalColumnsGrid');if(!grid)return;grid.querySelectorAll('.select-add-medal').forEach(sel=>{sel.onchange=()=>{const type=sel.getAttribute('data-type'),mId=sel.value;if(!mId||!type)return;D.playClick(),selectedMedals[type].push(mId),a[mId]=100,grid.innerHTML=renderMedalColumns(),bindMedalEvents(),w&&(w.innerHTML=d()),y()};});grid.querySelectorAll('.btn-remove-medal-item').forEach(btn=>{btn.onclick=e=>{e.preventDefault(),D.playClick();const type=btn.getAttribute('data-type'),idx=parseInt(btn.getAttribute('data-index'),10);type&&!isNaN(idx)&&selectedMedals[type]&&(selectedMedals[type].splice(idx,1),grid.innerHTML=renderMedalColumns(),bindMedalEvents(),w&&(w.innerHTML=d()),y())};});};bindMedalEvents();const K=B.querySelector("#btnToggleEvalMode"),q=B.querySelector("#evalMedalSectionWrapper"),F=B.querySelector("#evalTypeBadge");K?.addEventListener("click",()=>{D.playClick(),isTournament=!isTournament,n.type=isTournament?"tournament":"session",q&&(q.style.display=isTournament?"block":"none"),F&&(F.className=`badge ${isTournament?"badge-gold":"badge-cyan"}`,F.textContent=`🏁 KẾT THÚC ${isTournament?"GIẢI ĐẤU & TRAO HUY CHƯƠNG":"HOẠT ĐỘNG & ĐÁNH GIÁ THÁI ĐỘ"}`),K.textContent=`🔄 ${isTournament?"Đổi sang Hoạt Động Thường":"Đổi sang Giải Đấu (Mở Trao Huy Chương)"}`,w&&(w.innerHTML=d()),y()});B.querySelector("#btnQuickSet50")?.addEventListener("click",()=>{D.playClick(),r.forEach(i=>{a[i]=50}),w&&(w.innerHTML=d()),y()}),B.querySelector("#btnQuickSet75")?.addEventListener("click",()=>{D.playClick(),r.forEach(i=>{a[i]=75}),w&&(w.innerHTML=d()),y()}),B.querySelector("#btnQuickSet100")?.addEventListener("click",()=>{D.playClick(),r.forEach(i=>{a[i]=100}),w&&(w.innerHTML=d()),y()}),B.querySelector("#btnQuickSet30")?.addEventListener("click",()=>{D.playClick(),r.forEach(i=>{a[i]=30}),w&&(w.innerHTML=d()),y()}),B.querySelectorAll("#evalFilterTabs .role-pill").forEach(i=>{i.onclick=()=>{D.playClick(),l=i.getAttribute("data-tab"),B.querySelectorAll("#evalFilterTabs .role-pill").forEach(m=>m.classList.remove("active")),i.classList.add("active"),w&&(w.innerHTML=d()),y()}}),B.querySelector("#evalSearchInput")?.addEventListener("input",i=>{c=i.target.value.trim(),w&&(w.innerHTML=d()),y()})}},
JAVASCRIPT

v18 = v18[0...idx_start] + new_eval_modal.strip + v18[idx_end..-1]

# Write dist/assets/index-v18.js, index-v17.js, index-v16.js
File.write("dist/assets/index-v18.js", v18)
File.write("dist/assets/index-v17.js", v18)
File.write("dist/assets/index-v16.js", v18)
puts "Wrote dist/assets/index-v18.js (#{v18.length} bytes)!"

# Update dist/index.html to point to index-v18.js?v=18
html = File.read("dist/index.html")
html = html.gsub(/src="\/assets\/index-v\d+\.js\?v=\d+"/, 'src="/assets/index-v18.js?v=18"')
File.write("dist/index.html", html)
puts "Updated dist/index.html to point to index-v18.js?v=18!"
