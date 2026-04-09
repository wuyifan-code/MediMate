const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres', // check if postgres db itself is reachable
});
client.connect()
  .then(() => {
    console.log('Connected successfully to default database');
    return client.query('SELECT current_database();');
  })
  .then(res => {
    console.log('Database:', res.rows[0].current_database);
    return client.end();
  })
  .catch(err => {
    console.error('Connection error', err.stack);
    process.exit(1);
  });
