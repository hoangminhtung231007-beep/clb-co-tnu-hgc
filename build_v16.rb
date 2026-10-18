# Build dist/assets/index-v16.js: Remove participant limit when registration is closed
v15 = File.read("dist/assets/index-v15.js")
v16 = v15.dup

# 1. Update store.addEvent to set maxParticipants to null when registration is closed
old_add_event = 'maxParticipants:parseInt(A.maxParticipants)||64,currentRegistered:0,description:A.description,registrationOpen:A.registrationOpen!==void 0?!!A.registrationOpen:!0'
new_add_event = 'maxParticipants:(A.registrationOpen!==!1&&A.maxParticipants)?(parseInt(A.maxParticipants)||64):null,currentRegistered:0,description:A.description,registrationOpen:A.registrationOpen!==void 0?!!A.registrationOpen:!0'

if v16.include?(old_add_event)
  v16 = v16.sub(old_add_event, new_add_event)
  puts "1. Updated store.addEvent in bundle!"
else
  abort "Could not find old_add_event in v15"
end

# 2. Update toggleEventRegistration in store
old_toggle_reg = 'e.registrationOpen=!e.registrationOpen,this.notify()'
new_toggle_reg = 'e.registrationOpen=!e.registrationOpen,e.registrationOpen?(!e.maxParticipants&&(e.maxParticipants=64)):(e.maxParticipants=null),this.notify()'

if v16.include?(old_toggle_reg)
  v16 = v16.sub(old_toggle_reg, new_toggle_reg)
  puts "2. Updated toggleEventRegistration in bundle!"
else
  abort "Could not find old_toggle_reg in v15"
end

# 3. Update public renderEvents participant display & button
old_render_events_part = '<div class="text-xs mb-3">👥 <strong>Đăng ký:</strong> ${a.currentRegistered}/${a.maxParticipants} kỳ thủ</div>'
new_render_events_part = '<div class="text-xs mb-3">👥 <strong>${a.registrationOpen?"Đăng ký:":"Tham gia:"}</strong> ${a.currentRegistered||0}${a.registrationOpen&&a.maxParticipants?`/${a.maxParticipants}`:""} kỳ thủ ${(!a.registrationOpen||!a.maxParticipants)?\'<span class="text-gold font-medium">(Không giới hạn)</span>\':""}</div>'

if v16.include?(old_render_events_part)
  v16 = v16.sub(old_render_events_part, new_render_events_part)
  puts "3. Updated public renderEvents participant display!"
else
  abort "Could not find old_render_events_part in v15"
end

old_closed_badge = '<span class="badge badge-rose text-xs" style="padding: 6px 12px;">🔒 Đã đóng đơn đăng ký</span>'
new_closed_badge = '<span class="badge badge-rose text-xs" style="padding: 6px 12px;">🔒 Đóng đăng ký trước • Điểm danh tự do</span>'

if v16.include?(old_closed_badge)
  v16 = v16.sub(old_closed_badge, new_closed_badge)
  puts "4. Updated public closed registration badge!"
else
  abort "Could not find old_closed_badge in v15"
end

# 5. Update admin events table header & cell display
old_admin_th = '<th>Số Đăng Ký</th>'
new_admin_th = '<th>Đăng Ký / Tham Gia</th>'

if v16.include?(old_admin_th)
  v16 = v16.sub(old_admin_th, new_admin_th)
  puts "5. Updated admin table header!"
else
  abort "Could not find old_admin_th in v15"
end

old_admin_cell = '<td data-label="Đăng Ký"><span class="badge badge-cyan">${r.currentRegistered}/${r.maxParticipants}</span></td>'
new_admin_cell = '<td data-label="Đăng Ký / Tham Gia">${(!r.registrationOpen||!r.maxParticipants)?`<span class="badge badge-gold" title="Không giới hạn kỳ thủ (Tham gia tự do)">${r.currentRegistered||0} / ∞ (Tự do)</span>`:`<span class="badge badge-cyan">${r.currentRegistered||0}/${r.maxParticipants}</span>`}</td>'

if v16.include?(old_admin_cell)
  v16 = v16.sub(old_admin_cell, new_admin_cell)
  puts "6. Updated admin table cell display!"
else
  abort "Could not find old_admin_cell in v15"
end

# 7. Update openCreateEventModal in bundle
idx_modal_start = v16.index("openCreateEventModal(){")
idx_modal_end = v16.index("renderNews(", idx_modal_start)

if idx_modal_start && idx_modal_end
  old_modal_chunk = v16[idx_modal_start...idx_modal_end]
  
  new_modal_chunk = %q{openCreateEventModal(){sA.open("Lên lịch sự kiện / giải đấu mới",`
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
              <input type="radio" name="evTypeSelect" value="session" checked style="margin-top: 3px; accent-color: var(--gold-color);">
              <div>
                <strong class="text-gold" style="display: block; font-size: 0.92rem; margin-bottom: 3px;">🎯 1. Hoạt Động</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.35;">Sinh hoạt thường kỳ, tập huấn chuyên môn. <em>(Tự động tính vào số Hoạt Động tham gia của kỳ thủ)</em></span>
              </div>
            </label>

            <label class="radio-option-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; border: 1.5px solid rgba(6,182,212,0.4); background: rgba(6,182,212,0.05); cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="evTypeSelect" value="tournament" style="margin-top: 3px; accent-color: #06b6d4;">
              <div>
                <strong class="text-cyan" style="display: block; font-size: 0.92rem; margin-bottom: 3px;">🏆 2. Giải Đấu</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.35;">Giải vô địch CLB, Cup TNU, giải cờ tranh cúp. <em>(Tự động tính vào số Giải Đấu tham gia của kỳ thủ)</em></span>
              </div>
            </label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Thời gian tổ chức *</label>
            <input type="text" id="evDateTime" class="form-input" value="2026-10-24 14:00 - 17:30">
          </div>
          <div class="form-group flex-1" id="evMaxGroup">
            <label class="form-label" id="evMaxLabel">Giới hạn số kỳ thủ</label>
            <input type="number" id="evMax" class="form-input" value="64" min="1" placeholder="VD: 64">
            <div id="evMaxHint" class="text-xs text-muted mt-1">Số lượng kỳ thủ tối đa được phép đăng ký trực tuyến.</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Địa điểm tổ chức *</label>
          <input type="text" id="evLocation" class="form-input" value="Trung tâm Học liệu - CNTT - ĐHTN">
        </div>
        <div class="form-group">
          <label class="form-label">Mô tả / Thể thức thi đấu</label>
          <textarea id="evDesc" class="form-textarea" rows="3" placeholder="Thể thức Thụy Sĩ 7 ván, thời gian 5 phút + 3 giây..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label font-bold text-white mb-2" style="display: flex; align-items: center; gap: 6px;">
            <span>⚙️</span> <span>Cài đặt cổng đăng ký thành viên *</span>
          </label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px;">
            <label class="radio-option-card reg-mode-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; border: 1.5px solid var(--border-gold); background: rgba(212,175,55,0.08); cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="evRegistrationMode" value="open" checked style="margin-top: 3px; accent-color: var(--gold-color);">
              <div>
                <strong class="text-gold" style="display: block; font-size: 0.92rem; margin-bottom: 3px;">🟢 1. Mở đăng ký</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.35;">Thành viên sẽ nhìn thấy nút <strong>"Đăng Ký Tham Gia"</strong> và được phép gửi đơn tham gia trực tuyến.</span>
              </div>
            </label>

            <label class="radio-option-card reg-mode-card" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="evRegistrationMode" value="closed" style="margin-top: 3px; accent-color: var(--rose-color);">
              <div>
                <strong class="text-rose" style="display: block; font-size: 0.92rem; margin-bottom: 3px;">🔒 2. Đóng đăng ký (Giống điểm danh sinh hoạt)</strong>
                <span class="text-xs text-muted" style="display: block; line-height: 1.35;"><strong>Không giới hạn số lượng kỳ thủ.</strong> Không cần đăng ký trước (tương tự buổi sinh hoạt). Kỳ thủ đến tham gia trực tiếp quét mã QR để điểm danh. Khi kết thúc sự kiện vẫn mở bảng đánh giá tích cực & trao huy chương.</span>
              </div>
            </label>
          </div>
        </div>
      </form>
    `,e=>{var o,s;const t=e.querySelector("#evTitle").value.trim();if(!t)return alert("Vui lòng nhập tên sự kiện!"),!1;const r=((o=e.querySelector('input[name="evTypeSelect"]:checked'))==null?void 0:o.value)||"session",i=(((s=e.querySelector('input[name="evRegistrationMode"]:checked'))==null?void 0:s.value)||"open")==="open",mVal=e.querySelector("#evMax").value,maxP=i?(parseInt(mVal)||64):null;return k.addEvent({title:t,type:r,dateTime:e.querySelector("#evDateTime").value.trim(),maxParticipants:maxP,location:e.querySelector("#evLocation").value.trim(),description:e.querySelector("#evDesc").value.trim(),registrationOpen:i,status:"upcoming"}),alert(`Đã lên lịch ${r==="tournament"?"giải đấu":"hoạt động"} mới thành công!\n(Trạng thái mặc định: SẮP DIỄN RA ⏰ | Cổng đăng ký: ${i?`ĐANG MỞ (Giới hạn ${maxP} kỳ thủ)`:"ĐÃ ĐÓNG (Không giới hạn số kỳ thủ - Tham gia tự do)"})`),!0},"Tạo sự kiện");const mEl=document.getElementById("globalAppModal");if(mEl){const rds=mEl.querySelectorAll('input[name="evRegistrationMode"]'),inp=mEl.querySelector("#evMax"),hnt=mEl.querySelector("#evMaxHint"),cards=mEl.querySelectorAll(".reg-mode-card"),syncUI=()=>{const sel=mEl.querySelector('input[name="evRegistrationMode"]:checked')?.value;if(sel==="closed"){if(inp){inp.disabled=!0;if(inp.value&&inp.value!=="Không giới hạn (∞)")inp.dataset.prevVal=inp.value;inp.value="Không giới hạn (∞)";inp.style.background="rgba(244,63,94,0.08)";inp.style.color="#fb7185";inp.style.borderColor="rgba(244,63,94,0.4)";inp.style.fontWeight="600";inp.style.cursor="not-allowed"}if(hnt)hnt.innerHTML='<span class="text-rose font-medium">♾️ Đã đóng đăng ký: <strong>Không giới hạn số kỳ thủ</strong> (Tham gia điểm danh trực tiếp).</span>';if(cards[0]){cards[0].style.borderColor="rgba(255,255,255,0.15)";cards[0].style.background="rgba(255,255,255,0.03)"}if(cards[1]){cards[1].style.borderColor="var(--rose-color)";cards[1].style.background="rgba(244,63,94,0.1)"}}else{if(inp){inp.disabled=!1;inp.value=(inp.dataset.prevVal&&inp.dataset.prevVal!=="Không giới hạn (∞)")?inp.dataset.prevVal:"64";inp.style.background="";inp.style.color="";inp.style.borderColor="";inp.style.fontWeight="";inp.style.cursor=""}if(hnt)hnt.innerHTML='<span class="text-muted">Số lượng kỳ thủ tối đa được phép đăng ký trực tuyến.</span>';if(cards[0]){cards[0].style.borderColor="var(--border-gold)";cards[0].style.background="rgba(212,175,55,0.08)"}if(cards[1]){cards[1].style.borderColor="rgba(255,255,255,0.15)";cards[1].style.background="rgba(255,255,255,0.03)"}}};rds.forEach(r=>r.addEventListener("change",syncUI))}}
}
  v16 = v16[0...idx_modal_start] + new_modal_chunk + v16[idx_modal_end..-1]
  puts "7. Updated openCreateEventModal in bundle!"
else
  abort "Could not find openCreateEventModal in v15"
end

# 8. Write dist/assets/index-v16.js, and mirror to v15 & v14
File.write("dist/assets/index-v16.js", v16)
File.write("dist/assets/index-v15.js", v16)
File.write("dist/assets/index-v14.js", v16)
puts "Wrote dist/assets/index-v16.js (#{v16.length} bytes)!"

# 9. Update dist/index.html to point to index-v16.js?v=16
html = File.read("dist/index.html")
html = html.gsub(/src="\/assets\/index-v\d+\.js\?v=\d+"/, 'src="/assets/index-v16.js?v=16"')
File.write("dist/index.html", html)
puts "Updated dist/index.html to point to index-v16.js?v=16!"
