# Build dist/assets/index-v15.js: Hide philosophy number, only show quote and label
v14 = File.read("dist/assets/index-v14.js")
v15 = v14.dup

# 1. Remove badge from Executive Board card
old_exec_badge = '${(()=>{const idx=typeof CHESS_MOTTOS!=="undefined"?CHESS_MOTTOS.indexOf(a.bio):-1;return idx!==-1?`<div class="mt-1"><span class="badge badge-gold" style="font-size:0.65rem; padding:1px 6px;">✨ Triết lý #${idx+1} / 1000</span></div>`:""})()}'
if v15.include?(old_exec_badge)
  v15 = v15.sub(old_exec_badge, '')
  puts "1. Removed philosophy number badge from Executive Board!"
else
  abort "Could not find old_exec_badge in v15"
end

# 2. Remove badge from Member Pass table
old_pass_badge = '<td style="color:var(--text-muted); font-weight:600;">💬 Phương Châm Thi Đấu: ${(()=>{const idx=typeof CHESS_MOTTOS!=="undefined"?CHESS_MOTTOS.indexOf(e.bio):-1;return idx!==-1?`<span class="badge badge-gold" style="font-size:0.68rem; padding:1px 6px; margin-left:4px;">Triết lý #${idx+1}/1000</span>`:""})()}</td>'
new_pass_clean = '<td style="color:var(--text-muted); font-weight:600;">💬 Phương Châm Thi Đấu:</td>'
if v15.include?(old_pass_badge)
  v15 = v15.sub(old_pass_badge, new_pass_clean)
  puts "2. Removed philosophy number badge from Member Pass table!"
else
  abort "Could not find old_pass_badge in v15"
end

# 3. Bump STORAGE_KEY to V4 and add V3 to cleanup list
v15 = v15.gsub('cr="TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V3"', 'cr="TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V4"')
v15 = v15.gsub('"TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V2"', '"TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V2","TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V3"')
puts "3. Updated STORAGE_KEY to V4 and added V3 to cleanup list"

# 4. Write dist/assets/index-v15.js, index-v14.js, index-v13.js
File.write("dist/assets/index-v15.js", v15)
File.write("dist/assets/index-v14.js", v15)
File.write("dist/assets/index-v13.js", v15)
puts "Wrote dist/assets/index-v15.js (#{v15.length} bytes)!"

# 5. Update dist/index.html to use index-v15.js?v=15
html = File.read("dist/index.html")
html = html.gsub(/src="\/assets\/index-v\d+\.js\?v=\d+"/, 'src="/assets/index-v15.js?v=15"')
File.write("dist/index.html", html)
puts "Updated dist/index.html to point to index-v15.js?v=15!"
