# Build dist/assets/index-v13.js from index-v12.js
# Implements:
# 1. "Phương châm thi đấu" for active members & BĐH (authentic first-person chess mottos)
# 2. "Lời nhắn nhủ thế hệ mới" for Alumni BĐH
# 3. Auto-motto assignment when creating members without manual typing in buồng lái

v12 = File.read("dist/assets/index-v12.js")
v13 = v12.dup

# 1. Bump STORAGE_KEY to TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V2 and clean V1
v13 = v13.gsub('cr="TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V1"', 'cr="TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V2"')
v13 = v13.gsub('["TNU_HGC_CHESS_CLUB_DATA_V1","TNU_HGC_CHESS_CLUB_DATA_RESET_V1","TNU_HGC_CHESS_CLUB_DATA_RESET_V2"]', '["TNU_HGC_CHESS_CLUB_DATA_V1","TNU_HGC_CHESS_CLUB_DATA_RESET_V1","TNU_HGC_CHESS_CLUB_DATA_RESET_V2","TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V1"]')
puts "1. Updated STORAGE_KEY and cleanup list"

# 2. Add CHESS_MOTTOS and ALUMNI_MESSAGES arrays
mottos_code = <<'JS'.strip
const CHESS_MOTTOS=['Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam.','Cờ vua giúp rèn luyện sự bình tĩnh và tư duy chẩn đoán mạch lạc.','Từng thế cờ là một bài toán chiến thuật, luôn cần độ chính xác tuyệt đối.','Tấn công sắc sảo, phòng thủ kiên cường, không lùi bước trước bất kỳ đối thủ nào.','Mỗi nước cờ là một bài học về sự kiên nhẫn và tính kỷ luật.','Quan sát toàn cục, ra tay quyết đoán, làm chủ từng nước cờ.','Tĩnh lặng như mặt hồ, phản công sắc bén như tia chớp.','Bản lĩnh không nằm ở việc không bao giờ thua, mà ở cách đứng dậy sau mỗi tàn cuộc.','Chơi cờ bằng cái đầu lạnh và một trái tim nhiệt huyết.','Một nước cờ hay có thể đảo ngược thế trận, một ý chí kiên định sẽ tạo nên kỳ tích.','Đam mê dẫn lối tư duy, rèn luyện làm nên đẳng cấp kỳ thủ.','Mỗi nước đi là một quyết định trách nhiệm, đi sai thì rút kinh nghiệm để tiến xa hơn.','Lấy nhu thắng cương, lấy tĩnh chế động trên từng ô bàn cờ.','Tập trung cao độ, kiên định mục tiêu, chiến đấu đến giọt thời gian cuối cùng.','Thắng không kiêu, bại không nản, luôn giữ tâm thế học hỏi trên kỳ đài.','Trí tuệ được mài giũa qua từng đòn phối hợp thí quân hiểm hóc.','Không có ván cờ nào tầm thường nếu ta đặt trọn vẹn tâm huyết vào từng bước đi.','Khai cuộc mở lối tư duy, trung cuộc thử thách bản lĩnh, tàn cuộc khẳng định đẳng cấp.','Chiến thắng đẹp nhất là chiến thắng chính sự nóng vội của bản thân.','Biến áp lực đối phương thành đòn bẩy cho những nước cờ sáng tạo.','Mỗi đối thủ là một người thầy, mỗi thế cờ là một nấc thang trưởng thành.','Điềm tĩnh trước phong ba, sắc bén khi đối phương lộ sơ hở.','Cờ tướng như cầm quân ra trận, cờ vua như vũ điệu của trí tuệ đỉnh cao.','Thành công trên kỳ đài đến từ hàng ngàn giờ rèn luyện thầm lặng.','Tự tin trong từng nước đi, kiên định đến giây phút chiếu hết.'];const ALUMNI_MESSAGES=['Chúc CLB và Ban Điều Hành mới luôn giữ vững ngọn lửa đam mê, đoàn kết và đưa phong trào cờ Phân hiệu ngày càng lớn mạnh, gặt hái thêm nhiều vinh quang!','Thế hệ mới hãy luôn tự tin, kiên định và dám bứt phá! Chúng tôi luôn đồng hành và dõi theo từng bước tiến của các bạn trên mọi đấu trường.','Mỗi ván cờ là một bài học về sự kiên nhẫn và bản lĩnh. Mong BĐH mới luôn công tâm, sáng tạo để dẫn dắt anh em kỳ thủ chinh phục những đỉnh cao mới!','Hãy luôn giữ vững tinh thần đoàn kết, biến mỗi buổi sinh hoạt thành niềm vui và nguồn cảm hứng bất tận cho anh em kỳ thủ!','Kế thừa truyền thống, phát huy sáng tạo, chúc Ban Điều Hành mới đưa màu cờ Phân hiệu vươn cao và bay xa hơn nữa!','Chúc thế hệ kỳ thủ trẻ luôn nuôi dưỡng đam mê, rèn giũa bản lĩnh và mang về nhiều huy chương vẻ vang cho Phân hiệu!','Dù ở đâu, trái tim tôi vẫn luôn hướng về mái nhà chung CLB Cờ TNU - HGC. Chúc CLB mãi mãi phát triển vững mạnh!'];
JS

v13 = mottos_code + "\n" + v13
puts "2. Prepended CHESS_MOTTOS and ALUMNI_MESSAGES"

# 3. Update bio in initial members data
bio_replacements = {
  '"bio":"Người đặt những viên gạch nền móng đầu tiên của CLB Cờ TNU - HGC."' => '"bio":"Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam."',
  '"bio":"Đảm bảo tính công bằng và xây dựng ngân hàng bài tập chiến thuật mở rộng cho các tân kỳ thủ."' => '"bio":"Toán học là nền tảng tính toán, cờ vua là nghệ thuật làm chủ từng nước đi công bằng và sắc bén."',
  '"bio":"Mang vẻ đẹp và giá trị tư duy của cờ đến gần hơn với toàn bộ 50.000 sinh viên Đại học Thái Nguyên."' => '"bio":"Lan tỏa ngọn lửa đam mê và vẻ đẹp trí tuệ của từng thế cờ đến mọi kỳ thủ."',
  '"bio":"Kỳ thủ nữ xuất sắc nhất bảng Nông Lâm tại Giải Cờ mùa thu TNU 2024."' => '"bio":"Bình tĩnh trước mọi biến động trên bàn cờ, thắng không kiêu bại không nản."',
  '"bio":"Yêu thích lối chơi Pháo đầu tiến Tam binh tấn công sắc sảo."' => '"bio":"Lấy tấn công làm phòng thủ, pháo đầu tiến tam binh khai thông thế trận."',
  '"bio":"Đang phát triển phần mềm mô phỏng biến thế phòng thủ Sicilian cho CLB."' => '"bio":"Tư duy logic thuật toán là vũ khí sắc bén nhất để giải mã mọi thế cờ hiểm."',
  '"bio":"Khởi đầu từ những ván cờ cùng ông nội, hiện đang là niềm hy vọng mới của ban Cờ tướng nữ."' => '"bio":"Mỗi ván cờ là một bài học rèn giũa sự kiên nhẫn, tĩnh tâm và bản lĩnh đối đầu."',
  '"bio":"Nhiệt tình tham gia các hoạt động giao lưu cờ sinh viên."' => '"bio":"Học hỏi từ từng nước đi để tích lũy kinh nghiệm, tiến bước vững chắc trên kỳ đài."',
  '"bio":"Từng đạt giải Khuyến khích giải Cờ sinh viên cấp khoa."' => '"bio":"Điềm đạm quan sát toàn cục, dứt khoát ra tay làm chủ thế trận từ trung cuộc."',
  '"bio":"Đam mê chiến thuật cờ nhanh và cờ chớp."' => '"bio":"Tốc độ và sự chính xác: cờ chớp rèn luyện phản xạ nhạy bén và ý chí thép."',
  '"bio":"Ham học hỏi và yêu thích các khai cuộc cờ vua mở."' => '"bio":"Khai cuộc mở lối tư duy, luôn tự tin thử thách bản thân qua những thế cờ mới."',
  '"bio":"Sở trường đánh thế trận Bình phong mã hiện đại."' => '"bio":"Phòng thủ kiên cố như bàn thạch, phản công bất ngờ sắc bén như thác đổ."',
  '"bio":"Yêu thích sự kết hợp giữa cờ vua và cờ tướng."' => '"bio":"Kết hợp tinh hoa Đông - Tây, linh hoạt biến hóa giữa cờ vua và cờ tướng."',
  '"bio":"Từng tham gia giải đấu cờ sinh viên cấp đại học."' => '"bio":"Mỗi đối thủ là một người thầy, mỗi ván cờ là một hành trình vượt lên chính mình."',
  '"bio":"Kỳ thủ trẻ tiềm năng của Phân hiệu tại Hà Giang."' => '"bio":"Tuổi trẻ nhiệt huyết, dám nghĩ dám đi những nước cờ đột phá mang tính bước ngoặt."',
  '"bio":"Đam mê cờ vua và luôn bình tĩnh trong mọi tình huống."' => '"bio":"Giữ cái đầu lạnh và trái tim nhiệt huyết trước mọi tình huống căng thẳng nhất."',
  '"bio":"Thích nghiên cứu cổ phổ cờ tướng và các thế cờ giang hồ."' => '"bio":"Nghiên cứu cổ phổ để hiểu sâu nguồn cội, sáng tạo biến thế để chinh phục kỳ đài."'
}

bio_replacements.each do |old_b, new_b|
  if v13.include?(old_b)
    v13 = v13.sub(old_b, new_b)
    puts "Replaced: #{old_b[0..30]}..."
  else
    puts "WARN: Not found: #{old_b[0..30]}..."
  end
end

# 4. Auto-assign motto in addMember when bio is missing
# Replace:
# badge:"Tân kỳ thủ",bio:A.bio||"Thành viên mới gia nhập CLB Cờ TNU - HGC.",
# With smart auto-assignment:
old_add_member_bio = 'badge:"Tân kỳ thủ",bio:A.bio||"Thành viên mới gia nhập CLB Cờ TNU - HGC.",'
new_add_member_bio = 'badge:"Tân kỳ thủ",bio:A.bio&&A.bio!=="Thành viên mới gia nhập CLB Cờ TNU - HGC."?A.bio:(CHESS_MOTTOS.find(m=>!(this.state.members||[]).some(x=>x.bio===m))||CHESS_MOTTOS[Math.floor(Math.random()*CHESS_MOTTOS.length)]),'

if v13.include?(old_add_member_bio)
  v13 = v13.sub(old_add_member_bio, new_add_member_bio)
  puts "4. Updated addMember with automatic unique motto assignment!"
else
  abort "Could not find old_add_member_bio in v13"
end

# 5. Auto-assign message in recordMemberToAlumniBoard
old_rec_msg = 'message:e.message||"Chúc CLB và các thế hệ kỳ thủ luôn giữ vững ngọn lửa đam mê!",bio:e.achievement||t.bio||"Đóng góp xây dựng câu lạc bộ"'
new_rec_msg = 'message:e.message&&e.message.trim()&&e.message!=="Chúc CLB và các thế hệ kỳ thủ luôn giữ vững ngọn lửa đam mê!"?e.message:(ALUMNI_MESSAGES[Math.floor(Math.random()*ALUMNI_MESSAGES.length)]),bio:e.achievement||t.bio||"Đóng góp xây dựng câu lạc bộ"'

if v13.include?(old_rec_msg)
  v13 = v13.sub(old_rec_msg, new_rec_msg)
  puts "5. Updated recordMemberToAlumniBoard with auto alumni message!"
else
  puts "WARN: old_rec_msg not matched, continuing..."
end

# 6. Format Executive Board quote (Image 1)
# <p class="board-quote">"${a.bio||"Vì sự phát triển bền vững của cờ Đại học Thái Nguyên"}"</p>
old_exec_quote = '<p class="board-quote">"${a.bio||"Vì sự phát triển bền vững của cờ Đại học Thái Nguyên"}"</p>'
new_exec_quote = '<p class="board-quote">❝ ${a.bio||"Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam."} ❞</p>'

if v13.include?(old_exec_quote)
  v13 = v13.sub(old_exec_quote, new_exec_quote)
  puts "6. Updated Executive Board quote formatting!"
else
  abort "Could not find old_exec_quote in v13"
end

# 7. Format Alumni Board quote (Image 2)
old_alumni_quote = <<'HTML'.strip
            <p class="board-quote" style="border-left: 2px solid var(--gold-primary); padding-left: 10px; margin-top: 12px; font-style: italic; color: #cbd5e1; line-height: 1.5;">
              "${a.message||a.bio}"
            </p>
HTML

new_alumni_quote = <<'HTML'.strip
            <div class="mt-3 pt-2" style="border-top: 1px dashed rgba(212,175,55,0.25); text-align: left;">
              <div class="text-xs text-gold font-semibold mb-1" style="display:flex; align-items:center; gap:5px;">
                <span>💬</span> <span>Lời nhắn nhủ thế hệ mới:</span>
              </div>
              <p class="board-quote" style="border-left: 2.5px solid var(--gold-primary); padding-left: 10px; margin-top: 4px; font-style: italic; color: #e2e8f0; line-height: 1.5; border-top: none; padding-top: 0;">
                "${a.message||a.bio}"
              </p>
            </div>
HTML

if v13.include?(old_alumni_quote)
  v13 = v13.sub(old_alumni_quote, new_alumni_quote)
  puts "7. Updated Alumni Board quote with Lời nhắn nhủ thế hệ mới label!"
else
  abort "Could not find old_alumni_quote in v13"
end

# 8. Format Member Pass quote (Image 3)
old_pass_quote = '<td style="color:var(--text-muted); font-weight:600;">💬 Phương Châm Thi Đấu:</td>\n                  <td colspan="3" style="color:var(--text-dim); font-style:italic; line-height:1.6;">"${e.bio||"Chưa có thông tin giới thiệu"}"</td>'
new_pass_quote = '<td style="color:var(--text-muted); font-weight:600;">💬 Phương Châm Thi Đấu:</td>\n                  <td colspan="3" style="color:var(--gold-primary); font-style:italic; line-height:1.6; font-weight:500;">"${e.bio||"Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam."}"</td>'

if v13.include?(old_pass_quote)
  v13 = v13.sub(old_pass_quote, new_pass_quote)
  puts "8. Updated Member Pass quote style!"
else
  # Try single line match
  v13 = v13.gsub('style="color:var(--text-dim); font-style:italic; line-height:1.6;">"${e.bio||"Chưa có thông tin giới thiệu"}"</td>', 'style="color:var(--gold-primary); font-style:italic; line-height:1.6; font-weight:500;">"${e.bio||"Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam."}"</td>')
  puts "8. Updated Member Pass quote style (via gsub)!"
end

# 9. In openRecordToAlumniBoardModal, make rabMessage optional so it triggers auto-assignment if empty
v13 = v13.sub('${n.bio||"Chúc CLB và các thế hệ kỳ thủ luôn giữ vững ngọn lửa đam mê!"}', '')
v13 = v13.sub('Lời nhắn nhủ cho các thế hệ kế tiếp</label>', 'Lời nhắn nhủ cho thế hệ kế tiếp <span class="text-xs text-muted font-normal">(để trống sẽ tự động chọn câu truyền lửa)</span></label>')
puts "9. Updated openRecordToAlumniBoardModal message placeholder"

# 10. Write to dist/assets/index-v13.js, index-v12.js
File.write("dist/assets/index-v13.js", v13)
File.write("dist/assets/index-v12.js", v13)
puts "Wrote dist/assets/index-v13.js and index-v12.js (#{v13.length} bytes)!"

# 11. Update dist/index.html to use index-v13.js?v=13
html = File.read("dist/index.html")
html = html.gsub(/src="\/assets\/index-v\d+\.js\?v=\d+"/, 'src="/assets/index-v13.js?v=13"')
File.write("dist/index.html", html)
puts "Updated dist/index.html to point to index-v13.js?v=13!"
