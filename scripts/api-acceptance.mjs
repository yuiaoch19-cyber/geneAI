const API = process.env.GENEAI_API_URL ?? 'http://127.0.0.1:8000/api'
let pass = 0
let fail = 0
const failures = []
function check(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`PASS ${name}`)
  } else {
    fail++
    failures.push(`${name} ${extra}`)
    console.log(`FAIL ${name} ${extra}`)
  }
}
const json = async (res) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

// health
let res = await fetch(`${API}/health`)
let body = await json(res)
check('health 200', res.status === 200)
check(
  'health payload',
  body?.status === 'ok' && body?.database === 'ok' && body?.version === '0.8.0',
  JSON.stringify(body)
)

// analyze canonical
res = await fetch(`${API}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sequence: 'ATGC' }),
})
body = await json(res)
check('analyze ATGC 200', res.status === 200)
check(
  'analyze counts',
  body?.counts?.a === 1 &&
    body?.counts?.t === 1 &&
    body?.counts?.g === 1 &&
    body?.counts?.c === 1
)
check(
  'analyze gc/at',
  body?.gc_content === 50 && body?.at_content === 50,
  `${body?.gc_content}/${body?.at_content}`
)
check('complement', body?.complement === 'TACG', body?.complement)
check(
  'reverse complement',
  body?.reverse_complement === 'GCAT',
  body?.reverse_complement
)
check('rna', body?.rna === 'AUGC', body?.rna)

// lowercase + whitespace
res = await fetch(`${API}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sequence: ' atg c\n' }),
})
body = await json(res)
check(
  'normalize lowercase/space',
  res.status === 200 && body?.sequence === 'ATGC'
)

// all A / all G / N
for (const [seq, gc, at, comp] of [
  ['AAAA', 0, 100, 'TTTT'],
  ['GGGG', 100, 0, 'CCCC'],
]) {
  res = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence: seq }),
  })
  body = await json(res)
  check(
    `analyze ${seq}`,
    body?.gc_content === gc &&
      body?.at_content === at &&
      body?.complement === comp
  )
}
res = await fetch(`${API}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sequence: 'ATGN' }),
})
body = await json(res)
check(
  'N semantics',
  body?.counts?.n === 1 &&
    Math.abs(body?.gc_content - 33.3) < 0.05 &&
    Math.abs(body?.at_content - 66.7) < 0.05 &&
    body?.reverse_complement === 'NCAT',
  JSON.stringify({ gc: body?.gc_content, rc: body?.reverse_complement })
)

// invalid inputs
res = await fetch(`${API}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sequence: 'ATGX' }),
})
body = await json(res)
check(
  'invalid X 400',
  res.status === 400 &&
    body?.code === 'INVALID_SEQUENCE' &&
    body?.field === 'sequence',
  JSON.stringify(body)
)
res = await fetch(`${API}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sequence: 'ATGU' }),
})
body = await json(res)
check(
  'U rejected',
  res.status === 400 && /尿嘧啶/.test(body?.detail ?? ''),
  body?.detail
)
res = await fetch(`${API}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sequence: '' }),
})
body = await json(res)
check(
  'empty 422',
  res.status === 422 &&
    body?.code === 'VALIDATION_ERROR' &&
    body?.field === 'sequence',
  JSON.stringify(body)
)

// FASTA uploads
async function upload(name, content, type = 'text/plain') {
  const form = new FormData()
  form.append('file', new Blob([content], { type }), name)
  return fetch(`${API}/upload/fasta`, { method: 'POST', body: form })
}
res = await upload('demo.fasta', '>demo 描述\nATGCATGC\n')
body = await json(res)
check(
  'fasta upload',
  res.status === 200 &&
    body?.sequence_name === 'demo' &&
    body?.sequence === 'ATGCATGC',
  JSON.stringify(body?.sequence_name)
)
res = await upload('multi.fasta', '>a\nAT\n>b\nGC\n')
body = await json(res)
check(
  'fasta multi 400',
  res.status === 400 && body?.code === 'INVALID_FASTA',
  body?.detail
)
res = await upload('empty.fasta', '')
body = await json(res)
check('fasta empty 400', res.status === 400 && body?.code === 'EMPTY_FILE')
res = await upload('big.fasta', '>x\n' + 'A'.repeat(2 * 1024 * 1024))
body = await json(res)
check(
  'fasta too large 413',
  res.status === 413 && body?.code === 'FILE_TOO_LARGE',
  `${res.status}`
)

// history lifecycle
res = await fetch(`${API}/history`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sequence_name: '阶段10 验收序列',
    original_sequence: 'ATGCATGCATGC',
    source: 'manual',
    note: 'acceptance',
  }),
})
body = await json(res)
const recordId = body?.id
check('history create 201', res.status === 201 && typeof recordId === 'number')
check(
  'history persisted stats',
  body?.sequence_length === 12 && Math.abs(body?.gc_content - 50) < 0.01
)

res = await fetch(
  `${API}/history?q=${encodeURIComponent('验收')}&page_size=10&include_sequence=false`
)
body = await json(res)
check(
  'history search',
  res.status === 200 &&
    body?.total === 1 &&
    body?.items?.[0]?.original_sequence === '',
  JSON.stringify(body?.total)
)

const today = new Date().toLocaleDateString('en-CA')
res = await fetch(
  `${API}/history?date_from=${today}&date_to=${today}&include_sequence=false`
)
body = await json(res)
check('history local-date filter', res.status === 200 && body?.total >= 1)

res = await fetch(`${API}/history?date_from=2999-01-01&date_to=2999-12-31`)
body = await json(res)
check('history future empty', res.status === 200 && body?.total === 0)

res = await fetch(`${API}/history/${recordId}`)
body = await json(res)
check(
  'history detail',
  res.status === 200 && body?.original_sequence === 'ATGCATGCATGC'
)

res = await fetch(`${API}/history/${recordId}/gc-windows?window=4&step=4`)
body = await json(res)
check(
  'gc windows',
  res.status === 200 && body?.points?.length === 3,
  JSON.stringify(body?.points?.length)
)

res = await fetch(`${API}/history/${recordId}/report`)
const pdf = Buffer.from(await res.arrayBuffer())
check(
  'pdf report',
  res.status === 200 &&
    res.headers.get('content-type')?.includes('application/pdf') &&
    pdf.subarray(0, 5).toString() === '%PDF-' &&
    pdf.length > 2000,
  `${res.status} ${pdf.length}`
)
check(
  'pdf disposition',
  /attachment; filename="GeneAI-report-\d+\.pdf"/.test(
    res.headers.get('content-disposition') ?? ''
  )
)

// comparisons
async function compare(ref, query, name = 'cmp') {
  const r = await fetch(`${API}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: ref,
      query,
      reference_name: `${name}-ref`,
      query_name: `${name}-q`,
    }),
  })
  return { status: r.status, body: await json(r) }
}
const base =
  'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAG'
let cmp = await compare(base, base, 'same')
check(
  'compare identical',
  cmp.status === 200 &&
    cmp.body?.difference_count === 0 &&
    cmp.body?.identity === 100,
  JSON.stringify(cmp.body?.difference_count)
)
cmp = await compare(base, base.slice(0, 20) + 'A' + base.slice(21), 'sub')
check(
  'compare substitution',
  cmp.body?.substitutions === 1 && cmp.body?.difference_count === 1,
  JSON.stringify(cmp.body?.substitutions)
)
cmp = await compare(base, base.slice(0, 30) + 'T' + base.slice(30), 'ins')
check(
  'compare insertion',
  cmp.body?.insertions === 1 && cmp.body?.deletions === 0,
  `${cmp.body?.insertions}/${cmp.body?.deletions}`
)
cmp = await compare(base, base.slice(0, 30) + base.slice(31), 'del')
check(
  'compare deletion',
  cmp.body?.deletions === 1 && cmp.body?.insertions === 0,
  `${cmp.body?.insertions}/${cmp.body?.deletions}`
)
cmp = await compare('ATGCATGC', 'ATGCATGCATGC', 'len')
check(
  'compare length mismatch',
  cmp.status === 200 && cmp.body?.insertions === 4,
  JSON.stringify(cmp.body?.insertions)
)
cmp = await compare('ATGX', 'ATGC', 'bad')
check(
  'compare invalid field',
  cmp.status === 400 && cmp.body?.field === 'reference',
  JSON.stringify(cmp.body)
)
const long = 'A'.repeat(5001)
cmp = await compare(long, long, 'long')
check(
  'compare too long 413',
  cmp.status === 413 && cmp.body?.code === 'ALIGNMENT_TOO_LONG',
  `${cmp.status}`
)

// save comparison + search + stats + delete
res = await fetch(`${API}/comparisons`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reference: base,
    query: base.slice(0, 20) + 'A' + base.slice(21),
    reference_name: '验收参考',
    query_name: '验收查询',
  }),
})
body = await json(res)
const comparisonId = body?.id
check(
  'comparison save 201',
  res.status === 201 && typeof comparisonId === 'number'
)
res = await fetch(
  `${API}/comparisons?q=${encodeURIComponent('验收')}&page_size=10&include_sequence=false`
)
body = await json(res)
check(
  'comparison search',
  res.status === 200 && body?.total === 1,
  JSON.stringify(body?.total)
)

res = await fetch(`${API}/stats/overview`)
body = await json(res)
check(
  'stats aggregate',
  res.status === 200 &&
    body?.total_analyses === 2 &&
    body?.total_sequences === 3 &&
    body?.base_counts?.a > 0,
  JSON.stringify({ a: body?.total_analyses, s: body?.total_sequences })
)

// errors
res = await fetch(`${API}/history/999999`)
body = await json(res)
check('not found 404 shape', res.status === 404 && body?.code === 'NOT_FOUND')
res = await fetch(`${API}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
})
body = await json(res)
check(
  'validation 422 shape',
  res.status === 422 && body?.code === 'VALIDATION_ERROR',
  JSON.stringify(body?.code)
)

// CORS
res = await fetch(`${API}/analyze`, {
  method: 'OPTIONS',
  headers: {
    Origin: 'http://localhost:5208',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type',
  },
})
check(
  'cors preflight',
  res.status === 200 &&
    (res.headers.get('access-control-allow-origin') ?? '').includes(
      'localhost:5208'
    ),
  `${res.status} ${res.headers.get('access-control-allow-origin')}`
)

// cleanup
await fetch(`${API}/history/${recordId}`, { method: 'DELETE' })
await fetch(`${API}/comparisons/${comparisonId}`, { method: 'DELETE' })
res = await fetch(`${API}/stats/overview`)
body = await json(res)
check(
  'cleanup empty stats',
  body?.total_analyses === 0 && body?.total_sequences === 0,
  JSON.stringify(body)
)

console.log(`\nRESULT pass=${pass} fail=${fail}`)
if (fail) {
  console.log(failures.join('\n'))
  process.exit(1)
}
