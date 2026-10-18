# Build dist/assets/index-v17.js: Bulletproof unlimited participants toggle UI
v16 = File.read("dist/assets/index-v16.js")
v17 = v16.dup

idx_start = v17.index("openCreateEventModal(){")
idx_end = v17.index("renderNews(", idx_start)

if !idx_start || !idx_end
  abort "Could not find openCreateEventModal in v16"
end

new_modal_code = %q{openCreateEventModal(){sA.open("Lên lịch sự kiện / giải đấu mới",`
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
                <span class="text-xs text-muted" style="display: block; line-height: 1.35;"><strong>Không giới hạn số lượng kỳ thủ.</strong> Không cần đăng ký trước (tương tự buổi sinh hoạt). Kỳ thủ đến tham gia trực tiếp quét mã QR để điểm danh. Khi kết thúc sự kiện vẫn mở bảng đánh giá & xếp hạng.</span>
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
            <div id="evMaxInputWrapper">
              <input type="number" id="evMax" class="form-input" value="64" min="1" placeholder="Nhập số kỳ thủ tối đa...">
            </div>
            <div id="evMaxUnlimitedNotice" style="display: none; padding: 8px 12px; border-radius: 6px; background: rgba(244,63,94,0.1); border: 1px dashed var(--rose-color); color: #fda4af; font-size: 0.82rem; font-weight: 600; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span>♾️</span> <span>Không giới hạn số lượng kỳ thủ (Tự do tham gia)</span>
            </div>
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
      </form>
    `,e=>{var o,s;const t=e.querySelector("#evTitle").value.trim();if(!t)return alert("Vui lòng nhập tên sự kiện!"),!1;const r=((o=e.querySelector('input[name="evTypeSelect"]:checked'))==null?void 0:o.value)||"session",i=(((s=e.querySelector('input[name="evRegistrationMode"]:checked'))==null?void 0:s.value)||"open")==="open",mVal=e.querySelector("#evMax")?.value,maxP=i?(parseInt(mVal)||64):null;return k.addEvent({title:t,type:r,dateTime:e.querySelector("#evDateTime").value.trim(),maxParticipants:maxP,location:e.querySelector("#evLocation").value.trim(),description:e.querySelector("#evDesc").value.trim(),registrationOpen:i,status:"upcoming"}),alert(`Đã lên lịch ${r==="tournament"?"giải đấu":"hoạt động"} mới thành công!\n(Trạng thái mặc định: SẮP DIỄN RA ⏰ | Cổng đăng ký: ${i?`ĐANG MỞ (Giới hạn ${maxP} kỳ thủ)`:"ĐÃ ĐÓNG (Không giới hạn số kỳ thủ - Tham gia tự do)"})`),!0},"Tạo sự kiện");const mEl=document.getElementById("globalAppModal");if(mEl){const rds=mEl.querySelectorAll('input[name="evRegistrationMode"]'),inpWrap=mEl.querySelector("#evMaxInputWrapper"),unlNotice=mEl.querySelector("#evMaxUnlimitedNotice"),lbl=mEl.querySelector("#evMaxLabel"),hnt=mEl.querySelector("#evMaxHint"),cards=mEl.querySelectorAll(".reg-mode-card"),syncUI=()=>{const sel=mEl.querySelector('input[name="evRegistrationMode"]:checked')?.value;if(sel==="closed"){if(inpWrap)inpWrap.style.display="none";if(unlNotice)unlNotice.style.display="flex";if(lbl)lbl.innerHTML='Giới hạn số kỳ thủ: <span class="badge badge-gold" style="font-size:0.75rem; vertical-align:middle; margin-left:4px;">♾️ KHÔNG GIỚI HẠN</span>';if(hnt)hnt.innerHTML='<span class="text-rose font-medium">♾️ Đã đóng đăng ký trước: <strong>Không giới hạn số lượng kỳ thủ</strong> (Tham gia điểm danh trực tiếp).</span>';if(cards[0]){cards[0].style.borderColor="rgba(255,255,255,0.15)";cards[0].style.background="rgba(255,255,255,0.03)"}if(cards[1]){cards[1].style.borderColor="var(--rose-color)";cards[1].style.background="rgba(244,63,94,0.1)"}}else{if(inpWrap)inpWrap.style.display="block";if(unlNotice)unlNotice.style.display="none";if(lbl)lbl.textContent="Giới hạn số kỳ thủ *";if(hnt)hnt.innerHTML='<span class="text-muted">Số lượng kỳ thủ tối đa được phép đăng ký trực tuyến.</span>';if(cards[0]){cards[0].style.borderColor="var(--border-gold)";cards[0].style.background="rgba(212,175,55,0.08)"}if(cards[1]){cards[1].style.borderColor="rgba(255,255,255,0.15)";cards[1].style.background="rgba(255,255,255,0.03)"}}};rds.forEach(r=>{r.addEventListener("change",syncUI);r.addEventListener("click",syncUI)});cards.forEach(c=>c.addEventListener("click",()=>setTimeout(syncUI,10)));syncUI()}}
}

v17 = v17[0...idx_start] + new_modal_code + v17[idx_end..-1]

# Write dist/assets/index-v17.js, index-v16.js, index-v15.js
File.write("dist/assets/index-v17.js", v17)
File.write("dist/assets/index-v16.js", v17)
File.write("dist/assets/index-v15.js", v17)
puts "Wrote dist/assets/index-v17.js (#{v17.length} bytes)!"

# Update dist/index.html to point to index-v17.js?v=17
html = File.read("dist/index.html")
html = html.gsub(/src="\/assets\/index-v\d+\.js\?v=\d+"/, 'src="/assets/index-v17.js?v=17"')
File.write("dist/index.html", html)
puts "Updated dist/index.html to point to index-v17.js?v=17!"
