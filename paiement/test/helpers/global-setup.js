/* Démarre UN PostgreSQL embarqué pour toute la session de tests (chaque fichier de test crée sa propre base). */
module.exports = async () => {
  const os = require('os'), path = require('path'), fs = require('fs')
  const { default: EmbeddedPostgres } = await import('embedded-postgres')
  const dir = path.join(os.tmpdir(), 'pg-paiement-' + process.pid + '-' + Date.now())
  const port = 55400 + Math.floor(Math.random() * 400)
  const serveur = new EmbeddedPostgres({
    databaseDir: dir, user: 'postgres', password: 'pw', port, persistent: false,
    createPostgresUser: typeof process.getuid === 'function' && process.getuid() === 0,
    onLog: () => {}, onError: () => {},
  })
  await serveur.initialise()
  await serveur.start()
  globalThis.__PG__ = { serveur, dir }
  process.env.PG_TEST_PORT = String(port)
}
