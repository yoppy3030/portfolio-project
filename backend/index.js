const express = require('express');
const cors = require('cors'); // CORS対策用（後述）
const app = express();
app.use(cors()); // フロントエンドからのアクセスを許可

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello Express!' });
});

app.listen(5000, () => {
  console.log('Server running!');
});
