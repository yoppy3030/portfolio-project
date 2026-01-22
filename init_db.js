require('dotenv').config({ path: './backend/.env' });
const mysql = require('mysql');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'portfolio_user',
    password: process.env.DB_PASSWORD || 'pfBuilder2025',
    database: process.env.DB_NAME || 'portfolio_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const connection = mysql.createConnection(DB_CONFIG);

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database.');

    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT PRIMARY KEY DEFAULT 1,
      maintenance_mode BOOLEAN DEFAULT FALSE,
      maintenance_message TEXT,
      scheduled_end_time DATETIME,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

    connection.query(createTableQuery, (err) => {
        if (err) {
            console.error('Failed to create table:', err);
            connection.end();
            process.exit(1);
        }
        console.log('Table system_settings created or already exists.');

        const insertDefaultQuery = `
      INSERT IGNORE INTO system_settings (id, maintenance_mode, maintenance_message) 
      VALUES (1, FALSE, 'システムメンテナンス中です。しばらくお待ちください。')
    `;

        connection.query(insertDefaultQuery, (err) => {
            if (err) {
                console.error('Failed to insert default row:', err);
            } else {
                console.log('Default system settings row inserted (if not exists).');
            }
            connection.end();
        });
    });
});
