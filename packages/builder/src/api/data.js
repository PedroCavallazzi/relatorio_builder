import client from './client'

export const runQuery = (sql) =>
  client.post('/data/query', { sql }).then(r => r.data)
