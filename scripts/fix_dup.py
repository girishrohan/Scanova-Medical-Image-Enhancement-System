content = open('app/ai-analysis/page.tsx').read()
dup = '               <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>\n\n               <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>'
single = '               <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>'
assert dup in content, 'dup not found'
content = content.replace(dup, single, 1)
open('app/ai-analysis/page.tsx', 'w').write(content)
print('Fixed')