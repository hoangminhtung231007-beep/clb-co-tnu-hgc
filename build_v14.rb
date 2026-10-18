# Build dist/assets/index-v14.js with 1,000 cyclic mottos
require 'json'

v13 = File.read("dist/assets/index-v13.js")
mottos_src = File.read("src/js/state/chessMottos.js")

# Extract the 1000 mottos array from src/js/state/chessMottos.js
pos_start = mottos_src.index("export const CHESS_MOTTOS = [") + "export const CHESS_MOTTOS = ".length
pos_end = mottos_src.index("];", pos_start) + 1
raw_array_code = mottos_src[pos_start..pos_end]

# Clean array code for bundling
# Remove comments and extra whitespace
lines = raw_array_code.lines.map do |line|
  line = line.strip
  next nil if line.empty?
  next nil if line.start_with?("//")
  line.sub(/\/\/.*$/, "").strip
end.compact

mottos_clean_js = lines.join("")

puts "Extracted 1000 mottos JS cleanly (chars: #{mottos_clean_js.length})"

v14 = v13.dup

# 1. Replace the top 25 CHESS_MOTTOS with the 1000 CHESS_MOTTOS
old_top_mottos_start = v14.index("const CHESS_MOTTOS=[")
old_top_mottos_end = v14.index("];const ALUMNI_MESSAGES=[", old_top_mottos_start) + 1

if old_top_mottos_start && old_top_mottos_end
  v14 = v14[0...old_top_mottos_start] + "const CHESS_MOTTOS=" + mottos_clean_js + ";" + v14[(old_top_mottos_end + 1)..-1]
  puts "1. Replaced CHESS_MOTTOS with 1000 mottos array!"
else
  abort "Could not find old top mottos in v13"
end

# 2. Bump STORAGE_KEY to V3 and clean V2
v14 = v14.gsub('cr="TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V2"', 'cr="TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V3"')
v14 = v14.gsub('"TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V1"', '"TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V1","TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V2"')
puts "2. Updated STORAGE_KEY to V3 and added V2 to cleanup list"

# 3. Update addMember cyclic assignment (1 -> 1000 -> 1)
# Find the motto assignment inside addMember in v14:
old_add_motto = 'badge:"Tân kỳ thủ",bio:A.bio&&A.bio!=="Thành viên mới gia nhập CLB Cờ TNU - HGC."?A.bio:(CHESS_MOTTOS.find(m=>!(this.state.members||[]).some(x=>x.bio===m))||CHESS_MOTTOS[Math.floor(Math.random()*CHESS_MOTTOS.length)]),'
new_add_motto = 'badge:"Tân kỳ thủ",bio:A.bio&&A.bio!=="Thành viên mới gia nhập CLB Cờ TNU - HGC."?A.bio:(()=>{this.state.mottoCounter===void 0&&(this.state.mottoCounter=(this.state.members||[]).length);const mIdx=this.state.mottoCounter%CHESS_MOTTOS.length;this.state.mottoCounter=(mIdx+1)%CHESS_MOTTOS.length;return CHESS_MOTTOS[mIdx];})(),'

if v14.include?(old_add_motto)
  v14 = v14.sub(old_add_motto, new_add_motto)
  puts "3. Updated addMember with cyclic 1->1000->1 logic!"
else
  abort "Could not find old_add_motto in v14"
end

# 4. Add motto index badge to Executive Board card
old_exec_render = '<p class="board-quote">❝ ${a.bio||"Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam."} ❞</p>'
new_exec_render = '<p class="board-quote">❝ ${a.bio||"Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam."} ❞</p>${(()=>{const idx=typeof CHESS_MOTTOS!=="undefined"?CHESS_MOTTOS.indexOf(a.bio):-1;return idx!==-1?`<div class="mt-1"><span class="badge badge-gold" style="font-size:0.65rem; padding:1px 6px;">✨ Triết lý #${idx+1} / 1000</span></div>`:""})()}'

if v14.include?(old_exec_render)
  v14 = v14.sub(old_exec_render, new_exec_render)
  puts "4. Added Triết lý #X / 1000 badge to Executive Board!"
else
  abort "Could not find old_exec_render in v14"
end

# 5. Add motto index badge to Member Pass detail table
old_pass_render = '<td style="color:var(--text-muted); font-weight:600;">💬 Phương Châm Thi Đấu:</td>'
new_pass_render = '<td style="color:var(--text-muted); font-weight:600;">💬 Phương Châm Thi Đấu: ${(()=>{const idx=typeof CHESS_MOTTOS!=="undefined"?CHESS_MOTTOS.indexOf(e.bio):-1;return idx!==-1?`<span class="badge badge-gold" style="font-size:0.68rem; padding:1px 6px; margin-left:4px;">Triết lý #${idx+1}/1000</span>`:""})()}</td>'

if v14.include?(old_pass_render)
  v14 = v14.sub(old_pass_render, new_pass_render)
  puts "5. Added Triết lý #X / 1000 badge to Member Pass table!"
else
  abort "Could not find old_pass_render in v14"
end

# 6. Write dist/assets/index-v14.js, and mirror to index-v13.js & index-v12.js
File.write("dist/assets/index-v14.js", v14)
File.write("dist/assets/index-v13.js", v14)
File.write("dist/assets/index-v12.js", v14)
puts "Wrote dist/assets/index-v14.js (#{v14.length} bytes)!"

# 7. Update dist/index.html to point to index-v14.js?v=14
html = File.read("dist/index.html")
html = html.gsub(/src="\/assets\/index-v\d+\.js\?v=\d+"/, 'src="/assets/index-v14.js?v=14"')
File.write("dist/index.html", html)
puts "Updated dist/index.html to point to index-v14.js?v=14!"
