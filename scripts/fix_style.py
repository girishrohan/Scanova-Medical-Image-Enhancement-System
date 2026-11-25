content = open('app/page.tsx').read()
old = "        </div>\n      </main>\n    </div>"
new = "        </div>\n\n      <style>{`\n        @media (min-width: 768px) {\n          .mobile-menu-btn { display: none !important; }\n        }\n        @media (max-width: 767px) {\n          .mobile-menu-btn { display: flex !important; }\n        }\n      `}</style>\n      </main>\n    </div>"
assert old in content, 'old not found'
content = content.replace(old, new, 1)
open('app/page.tsx', 'w').write(content)
print('Fixed')