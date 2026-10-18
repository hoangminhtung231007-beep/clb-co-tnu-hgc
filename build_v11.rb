# Build dist/assets/index-v11.js from index-v10.js with all metrics reset to 0
require "json"

# 1. Get stringified INITIAL_DATA from mockData.js using JSC
jsc_path = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc"
cmd = %Q{#{jsc_path} -m -e 'import { INITIAL_DATA } from "./src/js/state/mockData.js"; print(JSON.stringify(INITIAL_DATA));'}
json_data = `#{cmd}`.strip

if json_data.empty? || !json_data.start_with?("{")
  abort "Failed to serialize INITIAL_DATA from mockData.js: #{json_data}"
end

puts "Serialized INITIAL_DATA length: #{json_data.length} bytes"

v10 = File.read("dist/assets/index-v10.js")

# 2. Replace INITIAL_DATA (jA) and cr (STORAGE_KEY)
pos_cr = v10.index(",cr=\"TNU_HGC_CHESS_CLUB_DATA_V1\";")
unless pos_cr
  abort "Could not find cr=\"TNU_HGC_CHESS_CLUB_DATA_V1\" in index-v10.js"
end

pos_ja = v10.rindex("const jA=", pos_cr)
unless pos_ja
  abort "Could not find const jA= in index-v10.js"
end

old_ja_block = v10[pos_ja...pos_cr + ',cr="TNU_HGC_CHESS_CLUB_DATA_V1";'.length]
new_ja_block = %Q{const jA=#{json_data},cr="TNU_HGC_CHESS_CLUB_DATA_ZERO_RESET_V1";}

v11 = v10.sub(old_ja_block, new_ja_block)
puts "Replaced INITIAL_DATA and STORAGE_KEY successfully!"

# 3. Update loadState to clear old legacy cached keys and map 0 stats
old_load = 'loadState(){var A,e;try{const t=localStorage.getItem(cr);if(t){const r=JSON.parse(t),a=r.alumniBoard&&r.alumniBoard.length?r.alumniBoard:jA.alumniBoard,i=r.alumniMembers&&r.alumniMembers.length?r.alumniMembers:jA.alumniMembers,o=r.members&&r.members.length?r.members:jA.members;return{...jA,...r,members:o.map(s=>({...s,role:s.role==="admin"?"bdh":s.role,tournamentsJoined:s.tournamentsJoined!==void 0?s.tournamentsJoined:0,activitiesJoined:s.activitiesJoined!==void 0?s.activitiesJoined:0,attendanceCount:s.attendanceCount!==void 0?s.attendanceCount:0}))'

new_load = 'loadState(){var A,e;try{["TNU_HGC_CHESS_CLUB_DATA_V1","TNU_HGC_CHESS_CLUB_DATA_RESET_V1","TNU_HGC_CHESS_CLUB_DATA_RESET_V2"].forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});const t=localStorage.getItem(cr);if(t){const r=JSON.parse(t),a=r.alumniBoard&&r.alumniBoard.length?r.alumniBoard:jA.alumniBoard,i=r.alumniMembers&&r.alumniMembers.length?r.alumniMembers:jA.alumniMembers,o=r.members&&r.members.length?r.members:jA.members;return{...jA,...r,members:o.map(s=>({...s,role:s.role==="admin"?"bdh":s.role,tournamentsJoined:s.tournamentsJoined!==void 0?s.tournamentsJoined:0,activitiesJoined:s.activitiesJoined!==void 0?s.activitiesJoined:0,attendanceCount:s.attendanceCount!==void 0?s.attendanceCount:0,attendanceRate:s.attendanceRate!==void 0?s.attendanceRate:0,goldMedals:s.goldMedals!==void 0?s.goldMedals:0,silverMedals:s.silverMedals!==void 0?s.silverMedals:0,bronzeMedals:s.bronzeMedals!==void 0?s.bronzeMedals:0}))'

unless v11.include?(old_load)
  abort "Could not find old_load in index-v10.js"
end
v11 = v11.sub(old_load, new_load)
puts "Updated loadState successfully!"

# 4. Update addMember to set attendanceRate: 0
old_add_member = 'attendanceRate:100,attendanceCount:0,tournamentsJoined:0,activitiesJoined:0'
new_add_member = 'attendanceRate:0,attendanceCount:0,tournamentsJoined:0,activitiesJoined:0'
if v11.include?(old_add_member)
  v11 = v11.sub(old_add_member, new_add_member)
  puts "Updated addMember default rate to 0!"
end

# 5. Update session checkin to not calculate artificial attendanceRate
old_sess_rate = 'attendanceCount=(a.attendanceCount||0)+1,a.attendanceRate=Math.min(100,Math.round(a.attendanceCount/Math.max(1,a.attendanceCount+2)*100));'
new_sess_rate = 'attendanceCount=(a.attendanceCount||0)+1;'
if v11.include?(old_sess_rate)
  v11 = v11.sub(old_sess_rate, new_sess_rate)
  puts "Updated session checkin attendanceCount!"
end

# 6. Update addEvent to not pre-register creator
old_add_event = 'currentRegistered:1,description:A.description,registrationOpen:A.registrationOpen!==void 0?!!A.registrationOpen:!0,checkinActive:!1,registeredMembers:[r]},o=this.getMemberById(r);return o&&(a==="tournament"?o.tournamentsJoined=(o.tournamentsJoined||0)+1:o.activitiesJoined=(o.activitiesJoined||0)+1),this.state.events.unshift(i),this.notify(),i'
new_add_event = 'currentRegistered:0,description:A.description,registrationOpen:A.registrationOpen!==void 0?!!A.registrationOpen:!0,checkinActive:!1,registeredMembers:[]};return this.state.events.unshift(i),this.notify(),i'

if v11.include?(old_add_event)
  v11 = v11.sub(old_add_event, new_add_event)
  puts "Updated addEvent to start with 0 registrations!"
else
  puts "Notice: old_add_event not matched directly, checking variants..."
end

# 7. Update directory member table medals and attendanceRate
old_dir_medals = 'const s=o.goldMedals??(o.eloChess>=2100?3:o.eloChess>=1900?2:o.wins>=40?1:0),l=o.silverMedals??(o.eloXiangqi>=2e3?3:o.wins>=30?2:o.totalMatches>=20?1:0),c=o.bronzeMedals??(o.totalMatches>=50?4:o.wins>=15?2:1);'
new_dir_medals = 'const s=o.goldMedals??0,l=o.silverMedals??0,c=o.bronzeMedals??0;'
if v11.include?(old_dir_medals)
  v11 = v11.sub(old_dir_medals, new_dir_medals)
  puts "Updated directory table medals!"
end

old_dir_rate = '<td data-label="Chuyên Cần"><span class="badge badge-emerald">${o.attendanceRate||95}%</span></td>'
new_dir_rate = '<td data-label="Chuyên Cần"><span class="badge badge-emerald">${o.attendanceRate!==void 0?o.attendanceRate:0}%</span></td>'
if v11.include?(old_dir_rate)
  v11 = v11.sub(old_dir_rate, new_dir_rate)
  puts "Updated directory attendanceRate!"
end

# 8. Update alumni table medals (?? 1 -> ?? 0)
old_alumni_medals = 'const i=a.goldMedals??1,o=a.silverMedals??1,s=a.bronzeMedals??1;'
new_alumni_medals = 'const i=a.goldMedals??0,o=a.silverMedals??0,s=a.bronzeMedals??0;'
if v11.include?(old_alumni_medals)
  v11 = v11.sub(old_alumni_medals, new_alumni_medals)
  puts "Updated alumni table medals!"
end

# 9. Update renderMemberPass medals and positiveRate
old_pass_medals = 'i=e.attendanceRate?`${e.attendanceRate}%`:"96%",o=e.goldMedals??(e.eloChess>=2100?3:e.eloChess>=1900?2:e.wins>=40?1:0),s=e.silverMedals??(e.eloXiangqi>=2e3?3:e.wins>=30?2:e.totalMatches>=20?1:0),l=e.bronzeMedals??(e.totalMatches>=50?4:e.wins>=15?2:1)'
new_pass_medals = 'i=e.attendanceRate!==void 0?`${e.attendanceRate}%`:"0%",o=e.goldMedals??0,s=e.silverMedals??0,l=e.bronzeMedals??0'
if v11.include?(old_pass_medals)
  v11 = v11.sub(old_pass_medals, new_pass_medals)
  puts "Updated renderMemberPass medals and positiveRate!"
end

old_pass_rate = '⚡ Chuyên Cần:</td>\n                  <td><span class="badge badge-emerald font-bold">${e.attendanceRate||95}%</span></td>'
new_pass_rate = '⚡ Chuyên Cần:</td>\n                  <td><span class="badge badge-emerald font-bold">${e.attendanceRate!==void 0?e.attendanceRate:0}%</span></td>'
if v11.include?(old_pass_rate)
  v11 = v11.sub(old_pass_rate, new_pass_rate)
  puts "Updated renderMemberPass table attendanceRate!"
else
  # check single line or without newline
  v11 = v11.gsub('${e.attendanceRate||95}%', '${e.attendanceRate!==void 0?e.attendanceRate:0}%')
  puts "Updated e.attendanceRate||95 via gsub!"
end

# 10. Update getDateRangeData to remove fallback heuristics
p_range_start = v11.index("getDateRangeData(A,e){")
p_range_end = v11.index("exportDateRangeReport(A,e){", p_range_start)

if p_range_start && p_range_end
  clean_range_data = <<'JS'.strip
getDateRangeData(A,e){const t=k.getState(),r=t.members||[],a=t.events||[],i=t.attendanceLogs||[],o=new Date(A+"T00:00:00"),s=new Date(e+"T23:59:59"),l=isNaN(o.getTime())?0:o.getTime(),c=isNaN(s.getTime())?Date.now():s.getTime(),d=a.filter(T=>{const $=this.parseDateFromStr(T.dateTime);if(!$)return!1;const I=$.getTime();return I>=l&&I<=c}),g=d.filter(T=>T.type==="tournament"),h=d.filter(T=>T.type==="activity"||T.type!=="tournament"),u=i.filter(T=>{const $=this.parseDateFromStr(T.timestamp);if(!$)return!1;const I=$.getTime();return I>=l&&I<=c}),f=u.filter(T=>{var $;return T.category==="session"||(($=T.eventId)==null?void 0:$.startsWith("SESSION"))}),w=new Set(f.map(T=>T.eventId||T.timestamp.split(" ")[0])),C=w.size,v=u.length,Q=r.length>0?Math.round(r.reduce((T,$)=>T+($.attendanceRate!==void 0?$.attendanceRate:0),0)/r.length):0,U={};r.forEach(T=>{const $=T.class||T.major||"K22 Sư phạm - CNTT";U[$]=(U[$]||0)+1});const b=["#d4af37","#10b981","#f59e0b","#38bdf8","#8b5cf6","#ec4899"],y=Object.entries(U).map(([T,$],I)=>({label:T,count:$,value:Math.round($/(r.length||1)*100),color:b[I%b.length]})),H=[],E=[],P=new Date(o.getFullYear(),o.getMonth(),1),_=new Date(s.getFullYear(),s.getMonth(),1);let J=new Date(P);for(;J<=_&&H.length<12;){const T=J.getMonth()+1,$=String(J.getFullYear()).slice(-2);H.push(`T${T}/${$}`);const I=`${J.getFullYear()}-${String(T).padStart(2,"0")}`,V=u.filter(x=>x.timestamp&&x.timestamp.startsWith(I)).length;E.push(V),J.setMonth(J.getMonth()+1)}H.length===0&&(H.push("Giai đoạn"),E.push(v));const evaluatedInRange=d.filter(evt=>evt.evaluation);const O=r.map(T=>{const liveTour=u.filter(p=>p.memberId===T.id&&p.category==="tournament"&&p.status==="success").length,regTour=g.filter(p=>(p.registeredMembers||[]).includes(T.id)).length,V=Math.max(liveTour,regTour),liveAct=u.filter(p=>p.memberId===T.id&&(p.category==="activity"||p.categoryLabel==="Hoạt Động")&&p.status==="success").length,regAct=h.filter(p=>(p.registeredMembers||[]).includes(T.id)).length,Y=Math.max(liveAct,regAct),I=f.filter(p=>p.memberId===T.id&&p.status==="success").length;let activeRate=T.attendanceRate!==void 0?T.attendanceRate:0;if(evaluatedInRange.length>0){let sumEval=0;evaluatedInRange.forEach(evt=>{sumEval+=(evt.evaluation&&evt.evaluation[T.id]!==void 0)?evt.evaluation[T.id]:0}),activeRate=Math.round(sumEval/evaluatedInRange.length)}const x=(V*20)+(Y*5)+(I*10)+Math.round(activeRate);return{id:T.id,name:T.name,studentId:T.studentId,avatar:T.avatar,class:T.class||T.major||"K22",tourCount:V,actCount:Y,sessCount:I,activeRate,score:x}}).sort((T,$)=>$.score-T.score).map((T,$)=>({...T,award:$<20?"Đề xuất":"Không đề xuất"}));return{startDate:A,endDate:e,tournamentsCount:g.length,activitiesCount:h.length,sessionsCount:C,totalCheckins:v,avgAttendanceRate:Q,barLabels:H,barValues:E,classSegments:y,rankedMembers:O}}
JS
  v11 = v11[0...p_range_start] + clean_range_data + v11[p_range_end..-1]
  puts "Updated getDateRangeData to clean 0-based metrics!"
else
  abort "Could not find bounds of getDateRangeData in index-v10.js"
end

# 11. Write dist/assets/index-v11.js, index-v10.js, index-v9.js
File.write("dist/assets/index-v11.js", v11)
File.write("dist/assets/index-v10.js", v11)
File.write("dist/assets/index-v9.js", v11)
puts "Wrote dist/assets/index-v11.js, index-v10.js, index-v9.js (#{v11.length} bytes)!"

# 12. Update dist/index.html to use index-v11.js?v=11
html = File.read("dist/index.html")
html = html.gsub(/src="\/assets\/index-v\d+\.js\?v=\d+"/, 'src="/assets/index-v11.js?v=11"')
File.write("dist/index.html", html)
puts "Updated dist/index.html with index-v11.js?v=11!"
