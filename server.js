const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Konfigurasi Koneksi MySQL dari Environment Variables
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
});

db.connect(err => {
    if (err) throw err;
    console.log('Terhubung ke MySQL Azure Database');
});

// Konfigurasi Azure Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('tugas-praktikum');

// Setup Multer untuk membaca file ke memory sementara
const upload = multer({ storage: multer.memoryStorage() });

// Route Halaman Utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route untuk Proses Submit Form
app.post('/submit', upload.single('taskFile'), async (req, res) => {
    try {
        const { nim, name, class: kelas, course } = req.body;
        const file = req.file;

        // Proses Upload File ke Azure Blob Storage
        const blobName = `${nim}_${Date.now()}_${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(file.buffer);
        const fileUrl = blockBlobClient.url;

        // Proses Simpan Data ke MySQL
        const query = 'INSERT INTO submissions (nim, name, class, course, file_url) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [nim, name, kelas, course, fileUrl], (err, results) => {
            if (err) throw err;
            res.send('<h3>Tugas berhasil dikumpulkan!</h3><a href="/">Kembali ke form</a>');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan sistem saat memproses tugas.');
    }
});

app.listen(port, () => {
    console.log(`Server PraktikumSubmit berjalan di port ${port}`);
});
