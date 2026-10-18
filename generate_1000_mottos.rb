# Generator for 1,000 unique, beautiful Vietnamese chess mottos
# Output: src/js/state/chessMottos.js

base_100 = [
  # 1-20: CLB 20 active members
  "Lấy sự tĩnh tâm để nhìn thấu đại cuộc, lấy đam mê làm kim chỉ nam.",
  "Cờ vua giúp rèn luyện sự bình tĩnh và tư duy chẩn đoán mạch lạc của người thầy thuốc tương lai.",
  "Từng thế cờ là một bài toán cơ học chiến thuật. Bất kỳ nước đi nào cũng cần độ chính xác cơ khí tuyệt đối.",
  "Toán học là nền tảng tính toán, cờ vua là nghệ thuật làm chủ từng nước đi công bằng và sắc bén.",
  "Lan tỏa ngọn lửa đam mê và vẻ đẹp trí tuệ của từng thế cờ đến mọi kỳ thủ.",
  "Đam mê khai cuộc sắc sảo và những đòn phối hợp thí quân kinh điển.",
  "Bình tĩnh trước mọi biến động trên bàn cờ, thắng không kiêu bại không nản.",
  "Lấy tấn công làm phòng thủ, pháo đầu tiến tam binh khai thông thế trận.",
  "Tư duy logic thuật toán là vũ khí sắc bén nhất để giải mã mọi thế cờ hiểm.",
  "Mỗi ván cờ là một bài học rèn giũa sự kiên nhẫn, tĩnh tâm và bản lĩnh đối đầu.",
  "Học hỏi từ từng nước đi để tích lũy kinh nghiệm, tiến bước vững chắc trên kỳ đài.",
  "Điềm đạm quan sát toàn cục, dứt khoát ra tay làm chủ thế trận từ trung cuộc.",
  "Tốc độ và sự chính xác: cờ chớp rèn luyện phản xạ nhạy bén và ý chí thép.",
  "Khai cuộc mở lối tư duy, luôn tự tin thử thách bản thân qua những thế cờ mới.",
  "Phòng thủ kiên cố như bàn thạch, phản công bất ngờ sắc bén như thác đổ.",
  "Kết hợp tinh hoa Đông - Tây, linh hoạt biến hóa giữa cờ vua và cờ tướng.",
  "Mỗi đối thủ là một người thầy, mỗi ván cờ là một hành trình vượt lên chính mình.",
  "Tuổi trẻ nhiệt huyết, dám nghĩ dám đi những nước cờ đột phá mang tính bước ngoặt.",
  "Giữ cái đầu lạnh và trái tim nhiệt huyết trước mọi tình huống căng thẳng nhất.",
  "Nghiên cứu cổ phổ để hiểu sâu nguồn cội, sáng tạo biến thế để chinh phục kỳ đài.",

  # 21-50: Triết lý đại kiện tướng cờ vua thế giới
  "Cờ vua là sự tra tấn của trí óc, nhưng là đỉnh cao thăng hoa của tư duy chiến lược.",
  "Tôi không tin vào may mắn trên kỳ đài, tôi chỉ tin vào những nước cờ chuẩn xác nhất.",
  "Kỳ thủ học được nhiều điều sâu sắc từ một ván thua hơn là từ trăm ván thắng dễ dàng.",
  "Mục tiêu cao nhất của người chơi cờ là tạo nên những ván đấu lưu danh bất tử.",
  "Hãy đưa đối thủ vào rừng rậm chiến thuật, nơi chỉ có bản lĩnh thép mới tìm thấy lối ra.",
  "Nước cờ khó khăn nhất chính là nước đi khi bạn tưởng mình đã nắm chắc phần thắng.",
  "Hãy để lối chơi của bạn đơn giản như một cái bắt tay, nhưng sâu thẳm như đại dương.",
  "Cờ vua không có chỗ cho sự do dự, chiến thắng thuộc về người dám quyết đoán.",
  "Cờ vua là nghệ thuật phân tích khoa học và rèn luyện phẩm chất kiên cường.",
  "Phòng thủ không phải là thụ động, mà là nghệ thuật bẻ gãy ý chí tấn công của đối thủ.",
  "Khi bạn nhìn thấy một nước đi tốt, hãy kiên nhẫn tìm một nước đi còn tốt hơn nữa.",
  "Tốc độ trong cờ chớp là sự kết hợp kỳ diệu giữa trực giác nhạy bén và kinh nghiệm dày dạn.",
  "Không có kỳ thủ nào hoàn hảo, người chiến thắng là người mắc ít sai lầm hơn đối phương.",
  "Sự tự tin và tốc độ phản xạ là chìa khóa mở toang cánh cửa áp đảo kỳ đài.",
  "Tốt là linh hồn của thế trận cờ vua, cấu trúc tốt định hình số phận ván cờ.",
  "Một kế hoạch tồi vẫn tốt hơn nhiều so với việc chơi cờ mà không có bất kỳ kế hoạch nào.",
  "Đòn thí quân chuẩn xác chính là khoảnh khắc nghệ thuật đẹp nhất trên bàn cờ 64 ô.",
  "Làm chủ trung tâm là nguyên tắc vàng để điều động lực lượng công phá hai cánh.",
  "Cờ tàn là bài kiểm tra khắc nghiệt nhất cho sự chính xác và tính kiên nhẫn của kỳ thủ.",
  "Mỗi quân cờ đều có tiếng nói riêng, kỳ thủ giỏi là người biết lắng nghe và kết nối chúng.",
  "Chiến thắng trên bàn cờ bắt đầu từ sự chuẩn bị chu đáo và một ý chí không khuất phục.",
  "Đừng sợ mất quân nếu nước đi đó mang lại cho bạn thế chủ động vĩnh viễn.",
  "Áp lực thời gian là kẻ thù của sự nóng vội nhưng là bạn đồng hành của trực giác sắc bén.",
  "Thế trận kín đòi hỏi sự kiên nhẫn luồn lách, thế trận mở đòi hỏi những đòn công kích vũ bão.",
  "Kỳ thủ vĩ đại không bao giờ than phiền về thế cờ xấu, họ tìm cách biến nó thành kiệt tác.",
  "Học khai cuộc cho ta hiểu biết, rèn trung cuộc cho ta bản lĩnh, luyện tàn cuộc cho ta đẳng cấp.",
  "Mỗi ván cờ hòa là một cuộc đấu trí ngang tài ngang sức đầy danh dự.",
  "Đừng bao giờ đánh giá thấp sức mạnh tiềm ẩn của một quân tốt đã tiến sang hàng năm.",
  "Chiếu tướng là mục tiêu, nhưng kiểm soát bàn cờ mới là con đường dẫn tới vinh quang.",
  "Kỷ luật trong tập luyện tạo nên sự thanh thoát trong từng nước đi thực chiến.",

  # 51-80: Triết lý danh thủ cờ tướng phương Đông
  "Kỳ nghệ như nhân sinh, thắng bại là lẽ thường, giữ được phong độ đĩnh đạc mới là kỳ vương.",
  "Xuất quân như sấm sét, công thủ biến hóa khôn lường, đó là tinh thần Khoái Mã giang hồ.",
  "Tàn cuộc thâm sâu như đáy biển, một con tốt sang sông có thể định đoạt cả giang sơn.",
  "Tâm tĩnh như nước thì nước cờ mới sâu, không màng hư danh thì kỳ nghệ tự thăng hoa.",
  "Lối đánh bão táp, lấy công làm thủ, luôn dấn thân vào những thế trận hiểm hóc nhất.",
  "Cờ mù rèn luyện bức tranh tư duy toàn cảnh, thấu suốt từng nước đi trong tâm trí.",
  "Pháo đầu hoành xe, tiến tốt khai thông, dũng mãnh uy phong như hổ gầm vang núi.",
  "Bình phong mã tiến tam binh, phòng ngự vững như Thái Sơn, phản công sắc như đao bén.",
  "Xe mười điểm, mã tám điểm, nhưng vị trí đắc địa làm nên giá trị vô giá cho quân cờ.",
  "Nhất bộ sai, vạn lý nguy; đi sai một nước hỏng cả thế cờ tích lũy bao công phu.",
  "Lùi Mã về cung không phải là thoái lui, mà là chuẩn bị cho đòn hồi mã thương chí mạng.",
  "Thí Xe đoạt Sĩ, bẻ gãy thành lũy đối phương để mở đường cho Pháo Mã lập công.",
  "Cờ thế giang hồ thiên biến vạn hóa, giữ tâm bất biến giữa muôn trùng biến động kỳ đài.",
  "Sĩ Tượng vững vàng, cung Vua an định, đó là nền tảng cho mọi đòn công kích phương xa.",
  "Đơn xe nghênh vạn mã, bản lĩnh của kỳ thủ thể hiện rõ nhất lúc cô quân độc mã.",
  "Pháo giăng bẫy ngầm, Mã phi ngàn dặm, Xe quét chiến trường định đoạt giang sơn.",
  "Khéo dùng Tốt nhỏ qua sông, chậm rãi từng bước mà dồn ép đối thủ vào đường cùng.",
  "Xem cờ không nói mới là quân tử, đấu cờ công tâm mới xứng mặt trượng phu.",
  "Kỳ đạo hòa hợp âm dương, lấy cương nhu tương tế làm bí quyết bất bại.",
  "Gặp địch mạnh chớ nản lòng, gặp địch yếu chớ khinh suất, giữ tâm bình thản trên kỳ đài.",
  "Tấn công không thành thì phải biết củng cố, phòng thủ chắc chắn mới mong ngày phản công.",
  "Một nước đi tinh tế có thể cứu vãn cả ván cờ đang đứng bên bờ vực thẳm.",
  "Học cờ từ căn bản, mài giũa qua thực chiến, đúc kết thành phong cách độc đáo của riêng mình.",
  "Chiến trường không tiếng súng nhưng khốc liệt từng giây, đó chính là vẻ đẹp của cờ tướng.",
  "Dụng quân như dụng binh, lấy mưu lược làm gốc, lấy tốc độ làm ưu thế tiên phong.",
  "Thắng một ván cờ vui một lúc, học một triết lý cờ ích lợi cả một đời.",
  "Đi cờ có thủy có chung, tôn trọng từng quân cờ dù là binh tốt nhỏ bé nhất.",
  "Đòn Mã điếu ngư hiểm hóc, khóa chặt đường lui của Tướng giặc trong chớp mắt.",
  "Pháo trùng liên hoàn, sức công phá ngút trời, làm tan rã mọi hàng phòng thủ.",
  "Cờ tàn Pháo Mã chốt, nghệ thuật phối hợp đỉnh cao tạo nên chiến thắng thanh tao.",

  # 81-100: Tinh thần thể thao trí tuệ & Tu dưỡng sinh viên
  "Rèn luyện tư duy cờ là bước đệm vững chắc cho thành công trong học tập và nghiên cứu.",
  "Đến với CLB cờ bằng đam mê, ở lại bằng tình bạn, và tỏa sáng bằng tinh thần đồng đội.",
  "Bàn cờ là nơi hội tụ của tri thức, bản lĩnh tuổi trẻ và khát vọng chinh phục đỉnh cao.",
  "Thất bại hôm nay là hạt mầm cho chiến thắng rực rỡ ngày mai trên kỳ đài sinh viên.",
  "Mỗi buổi sinh hoạt CLB là một ngày hội ngộ của những tâm hồn yêu mến thể thao trí tuệ.",
  "Điềm tĩnh trong từng quyết định, kiên định với mục tiêu, không ngừng vươn tới sự hoàn thiện.",
  "Cờ không phân biệt tuổi tác hay chuyên ngành, chỉ có chung niềm say mê và trí tuệ kết nối.",
  "Chiến thắng ngọt ngào nhất là khi ta vượt qua được sự giới hạn của chính bản thân mình.",
  "Một cái bắt tay chân thành trước ván đấu khởi đầu cho một tình bạn kỳ thủ bền chặt.",
  "Dám nghĩ dám làm, dám đi những nước cờ sáng tạo phá vỡ mọi lối mòn tư duy cũ kỹ.",
  "Tập trung trí lực, giữ vững phong độ, mang niềm vinh quang về cho mái trường thân yêu.",
  "Tinh thần đồng đội gắn kết tạo nên sức mạnh vô song cho đội tuyển cờ Phân hiệu.",
  "Mỗi nước cờ hay là sự đúc kết của óc quan sát tinh tường và tư duy phản biện sắc bén.",
  "Chơi cờ giúp ta học cách chịu trách nhiệm với từng quyết định của mình trong cuộc sống.",
  "Biến những ván cờ căng thẳng thành nguồn năng lượng tích cực cho những giờ học tập hăng say.",
  "Kỳ đài là nơi rèn giũa ý chí sắt đá, tôi luyện bản lĩnh người sinh viên thời đại mới.",
  "Tự hào là một kỳ thủ của CLB Cờ TNU - HGC, luôn giữ vững ngọn lửa nhiệt huyết tiên phong.",
  "Tôn trọng luật chơi, tôn trọng trọng tài, và luôn thi đấu với tinh thần thượng võ cao nhất.",
  "Khi tiếng chuông đồng hồ điểm giây cuối cùng, người kiên trì nhất sẽ là người mỉm cười.",
  "Kỳ đạo là hành trình tu dưỡng suốt đời, mỗi ván đấu là một nấc thang hoàn thiện nhân cách."
]

actions = [
  "Kiên nhẫn kiểm soát các ô cờ trung tâm",
  "Tận dụng triệt để từng ưu thế nhỏ trên bàn cờ",
  "Chủ động làm chủ các đường mở trọng yếu",
  "Phối hợp nhịp nhàng giữa các quân lực trên sân",
  "Quan sát sâu sắc từng biến thể phức tạp",
  "Giữ vững cự ly và cấu trúc quân kiên cố",
  "Tập trung cao độ trong từng giai đoạn trận đấu",
  "Dự đoán chính xác ý đồ chiến thuật của đối phương",
  "Tấn công sắc bén vào cánh yếu đối thủ",
  "Bảo vệ chặt chẽ vị trí của quân vua đầu não",
  "Tạo thế trận mở rộng tầm hoạt động quân cờ",
  "Khóa chặt mọi ngả đường phản công tiềm tàng",
  "Khai thác tối đa sơ hở nhỏ nhất của đối thủ",
  "Biến hóa linh hoạt giữa thế trận công và thủ",
  "Điều quân nhịp nhàng tạo thành gọng kìm hiểm hóc",
  "Lấy thế trận vững chắc làm bàn đạp bứt phá",
  "Chớp thời cơ tung đòn chiến thuật quyết định",
  "Rèn luyện phản xạ nhạy bén trong từng thế cờ",
  "Đơn giản hóa thế trận khi nắm giữ ưu thế",
  "Tìm kiếm nước cờ tối ưu trong thế trận hiểm nghèo",
  "Không nóng vội trước hàng phòng thủ kín kẽ",
  "Tạo sức ép liên tục lên trận địa đối phương",
  "Phát huy tối đa uy lực của từng quân cờ chiến lược",
  "Làm chủ thời gian trên đồng hồ thi đấu căng thẳng",
  "Duy trì thế chủ động trên toàn bộ mặt trận",
  "Phân tích thấu đáo mọi đòn phản kích bất ngờ",
  "Thí quân tinh tế mở toang đường tấn công trung lộ",
  "Xây dựng thế trận phòng ngự vững như bàn thạch",
  "Phát triển quân thần tốc ngay từ giai đoạn khai cuộc",
  "Lấy sự chuẩn xác làm thước đo cho từng nước đi"
]

goals = [
  "từng bước làm chủ hoàn toàn bàn cờ.",
  "kiến tạo chiến thắng thuyết phục và vẻ vang.",
  "mở ra con đường tiến vào trung cuộc áp đảo.",
  "dồn ép đối phương vào thế bị động khó lường.",
  "biến mỗi ván cờ thành tác phẩm nghệ thuật trí tuệ.",
  "khẳng định bản lĩnh kiên cường của người kỳ thủ.",
  "biến áp lực thi đấu thành sức mạnh đột phá.",
  "chuyển hóa từng nước cờ thành lợi thế vững chắc.",
  "giữ vững sự tự tin đến tận giây phút cuối cùng.",
  "không để lại bất kỳ sơ hở nào trên trận địa.",
  "chinh phục những nấc thang mới trên kỳ đài.",
  "rèn luyện tư duy logic và ý chí kiên định.",
  "tạo nên những màn lội ngược dòng ngoạn mục.",
  "kiểm soát trọn vẹn nhịp đập của trận đấu.",
  "rút ra bài học kinh nghiệm sâu sắc cho tương lai.",
  "đưa thế cờ về quỹ đạo chiến thắng quen thuộc.",
  "phát huy tối đa tiềm năng trí tuệ của bản thân.",
  "bảo vệ màu cờ sắc áo của câu lạc bộ.",
  "tạo dựng phong cách chơi cờ đĩnh đạc và sắc sảo.",
  "chạm tay vào đỉnh cao vinh quang của giải đấu.",
  "khẳng định vị thế vững chắc trong làng cờ sinh viên.",
  "tạo ra những đòn phối hợp chấn động bàn cờ.",
  "dẫn dắt ván đấu theo đúng chiến lược đã định.",
  "rèn giũa bản lĩnh không lùi bước trước nghịch cảnh.",
  "lan tỏa tình yêu và vẻ đẹp của cờ đến mọi người.",
  "khắc chế mọi đòn tấn công bất ngờ từ đối thủ.",
  "khai thông bế tắc và tạo bước ngoặt trận đấu.",
  "nâng tầm tư duy chiến lược qua từng ván cờ.",
  "chứng minh giá trị của sự kiên trì và bền bỉ.",
  "bảo toàn ưu thế cho đến nước đi cuối cùng."
]

connectors = ["nhằm ", "để ", "từ đó "]

generated = []
actions.each_with_index do |act, i|
  goals.each_with_index do |gol, j|
    conn = connectors[(i + j) % connectors.length]
    generated << "#{act} #{conn}#{gol}"
  end
end

all_1000 = (base_100 + generated)[0...1000]

puts "Total generated: #{all_1000.length}"
puts "Unique check: #{all_1000.uniq.length}"

# Write to src/js/state/chessMottos.js
content = "// 1,000 Triết Lý & Phương Châm Thi Đấu Kỳ Thủ CLB Cờ TNU - HGC\n"
content += "// Vận hành theo chu kỳ tuần hoàn từ 1 đến 1000 và quay vòng lại\n"
content += "export const CHESS_MOTTOS = [\n"
all_1000.each_with_index do |motto, idx|
  escaped = motto.gsub('"', '\"')
  content += "  \"#{escaped}\", // ##{idx + 1}\n"
end
content += "];\n\n"
content += "export function getMottoByIndex(index) {\n"
content += "  const safeIdx = Math.abs(index) % CHESS_MOTTOS.length;\n"
content += "  return {\n"
content += "    mottoNumber: safeIdx + 1,\n"
content += "    mottoText: CHESS_MOTTOS[safeIdx]\n"
content += "  };\n"
content += "}\n"

File.write("src/js/state/chessMottos.js", content)
puts "Wrote src/js/state/chessMottos.js successfully (#{content.length} bytes)!"
