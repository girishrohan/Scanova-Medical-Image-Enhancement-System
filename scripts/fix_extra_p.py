content = open('app/ai-analysis/page.tsx').read()
old = '               </div>\n              </p>\n            </div>'
new = '               </div>\n            </div>'
assert old in content, 'old not found'
content = content.replace(old, new, 1)
open('app/ai-analysis/page.tsx', 'w').write(content)
print('Fixed')