const { createPool } = require('mysql2/promise')
const db_config = require('./config/db-config')

function init() {
    try {
    const pool = new createPool({
            host: db_config.host,
            user: db_config.user,
            password: db_config.password,
            port: db_config.port,
            database: db_config.database
        }) 
    console.log('DB connected')
    return pool
    } catch (error) {
        console.log(error)
    }
}

module.exports = { pool: init() }