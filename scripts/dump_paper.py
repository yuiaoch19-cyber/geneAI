import glob
import os
import docx

path = sorted(glob.glob('docs/*.docx'), key=os.path.getmtime)[-1]
d = docx.Document(path)
parts = []
for p in d.paragraphs:
    if p.text.strip():
        parts.append(f'[{p.style.name}] {p.text}')
for i, table in enumerate(d.tables, 1):
    parts.append(f'--- TABLE {i} ---')
    for row in table.rows:
        parts.append(' | '.join(c.text.strip() for c in row.cells))
text = '\n'.join(parts)
with open('.tmp/paper/paper-text.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print('chars', len(text), 'paras', len(d.paragraphs), 'tables', len(d.tables), 'images', len(d.inline_shapes))
