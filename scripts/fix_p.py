content = open('app/ai-analysis/page.tsx').read()
old = '''                 Processing Time: {analysisResult.processingTime}
                </p>

                <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>'''
new = '''                 Processing Time: {analysisResult.processingTime}
               </p>

               <h4 style={{ color: COLORS.text, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Image Metrics</h4>'''
assert old in content, 'old not found'
content = content.replace(old, new, 1)
open('app/ai-analysis/page.tsx', 'w').write(content)
print('Fixed')