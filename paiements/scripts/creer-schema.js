/* Crée le schéma de base de données avant les migrations (TypeORM a besoin du schéma pour sa table de suivi). */
require('dotenv').config()
const { Client } = require('pg')

const schema = process.env.DB_SCHEMA || 'paiement'
if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
  console.error(`Nom de schéma invalide : ${schema}`)
  process.exit(1)
}

;(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })
  await client.connect()
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
  await client.end()
  console.log(`Schéma "${schema}" prêt.`)
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
