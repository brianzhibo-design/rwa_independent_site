import { readFile, writeFile } from 'node:fs/promises'
const p = 'src/server.js'
let s = await readFile(p,'utf8')
if(!s.includes(`import "dotenv/config"`)) s = `import "dotenv/config"\n` + s
if(!s.includes(`import debugRouter from './routes/debug.js'`)) {
  s = s.replace(
    /import\s+ordersRouter\s+from\s+'\.\/routes\/orders\.js'\s*;?/,
    m => `${m}\nimport debugRouter from './routes/debug.js'`
  )
}
if(!s.includes(`app.use('/debug', debugRouter)`)) {
  s = s.replace(
    /app\.use\('\/orders',\s*ordersRouter\)\s*;?/,
    m => `${m}\napp.use('/debug', debugRouter)`
  )
}
await writeFile(p,s)
console.log('patched server.js')
