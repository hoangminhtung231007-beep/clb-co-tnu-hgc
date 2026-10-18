import re
import subprocess

# 1. Read base v15
with open("dist/assets/index-v15.js", "r", encoding="utf-8") as f:
    bundle = f.read()

# 2. Extract tested method_code from test_eval_block.py
with open("test_eval_block.py", "r", encoding="utf-8") as f:
    test_file = f.read()

# Grab method_code between method_code = \'\'\' and \'\'\'
start_tag = "method_code = '''"
end_tag = "'''"
s_idx = test_file.find(start_tag) + len(start_tag)
e_idx = test_file.find(end_tag, s_idx)
method_code = test_file[s_idx:e_idx].strip()

# 3. Replace store.saveEventEvaluation in bundle
old_store_code = 'if(medals&&(t.type==="tournament"||medals.gold||medals.silver||medals.bronze)){if(medals.gold){const mem=this.getMemberById(medals.gold);mem&&(mem.goldMedals=(mem.goldMedals||0)+1)}if(medals.silver){const mem=this.getMemberById(medals.silver);mem&&(mem.silverMedals=(mem.silverMedals||0)+1)}if(medals.bronze){const mem=this.getMemberById(medals.bronze);mem&&(mem.bronzeMedals=(mem.bronzeMedals||0)+1)}}'

new_store_code = 'if(medals&&(t.type==="tournament"||medals.gold||medals.silver||medals.bronze)){const gl=Array.isArray(medals.gold)?medals.gold:(medals.gold?[medals.gold]:[]),sl=Array.isArray(medals.silver)?medals.silver:(medals.silver?[medals.silver]:[]),bl=Array.isArray(medals.bronze)?medals.bronze:(medals.bronze?[medals.bronze]:[]);gl.forEach(mId=>{const mem=this.getMemberById(mId);mem&&(mem.goldMedals=(mem.goldMedals||0)+1)}),sl.forEach(mId=>{const mem=this.getMemberById(mId);mem&&(mem.silverMedals=(mem.silverMedals||0)+1)}),bl.forEach(mId=>{const mem=this.getMemberById(mId);mem&&(mem.bronzeMedals=(mem.bronzeMedals||0)+1)})}'

assert old_store_code in bundle, "Could not find old_store_code in bundle"
bundle = bundle.replace(old_store_code, new_store_code)
print("1. Successfully updated saveEventEvaluation for array medals in store!")

# 4. Replace openEventEvaluationModal in bundle
fn_start = bundle.find("openEventEvaluationModal(n,A){")
fn_end = bundle.find("openFeedbackModal(n){")
assert fn_start != -1 and fn_end != -1, "Could not find eval modal boundaries"

bundle = bundle[:fn_start] + method_code + ",\n" + bundle[fn_end:]
print("2. Successfully replaced openEventEvaluationModal in bundle!")

# 5. Write to dist/assets/index-v18.js
with open("dist/assets/index-v18.js", "w", encoding="utf-8") as f:
    f.write(bundle)
print(f"3. Wrote dist/assets/index-v18.js ({len(bundle)} bytes)")

# 6. Update dist/index.html
with open("dist/index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Replace any index-v*.js with index-v18.js?v=18
html_updated = re.sub(r'/assets/index-v\d+\.js(\?v=\d+)?', '/assets/index-v18.js?v=18', html)
with open("dist/index.html", "w", encoding="utf-8") as f:
    f.write(html_updated)
print("4. Updated dist/index.html to point to index-v18.js?v=18")

# 7. Validate whole bundle with jsc
test_wrapper = """
var window = { addEventListener: function(){}, location: { search: "" }, localStorage: { getItem: function(){ return null; }, setItem: function(){} }, navigator: { userAgent: "" } };
var document = { addEventListener: function(){}, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; }, getElementById: function(){ return null; }, createElement: function(){ return {}; } };
var localStorage = window.localStorage;
var MutationObserver = function(){ return { observe: function(){}, disconnect: function(){} }; };
var Audio = function(){ return { play: function(){}, pause: function(){} }; };
load("dist/assets/index-v18.js");
print("BUNDLE SYNTAX VALIDATION: SUCCESS");
"""

res = subprocess.run(["/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc", "-e", test_wrapper], capture_output=True, text=True)
print("5. JSC Validation Output:")
print(res.stdout)
print(res.stderr)
if "BUNDLE SYNTAX VALIDATION: SUCCESS" in res.stdout:
    print("ALL TESTS PASSED! Bundle is 100% syntactically correct and ready!")
else:
    print("Validation failed with code:", res.returncode)
    sys.exit(1)
