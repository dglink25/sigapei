module.exports = async () => {
  const pg = globalThis.__PG__
  if (!pg) return
  await pg.serveur.stop().catch(() => {})
  require('fs').rmSync(pg.dir, { recursive: true, force: true })
}
