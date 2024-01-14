const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

const mangaSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    startedReading: {
        type: Date,
    },
    endedReading: {
        type: Date
    },
    chapters: [{
        name: String,
        date: Date
    }]
});

const Manga = mongoose.model('Manga', mangaSchema);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== process.env.AUTH_TOKEN) {
        return res.status(403).send('Forbidden');
    }
    next();
});

app.get('/check-token', (req, res) => {
    res.status(200).send('Token is valid');
});

app.get('/mangas', async (req, res) => {
    const mangas = await Manga.find({}, 'id name'); 
    res.send(mangas);
});

app.get('/manga/:id', async (req, res) => {
    const manga = await Manga.findOne({ id: req.params.id });
    if (!manga) return res.status(404).send('Manga not found');
    res.send(manga);
});


app.post('/manga', async (req, res) => {
    const manga = new Manga({
        id: req.body.id,
        name: req.body.name,
        startedReading: req.body.startedReading,
        endedReading: req.body.endedReading,
        chapters: req.body.chapters
    });
    await manga.save();
    res.send(manga);
});

app.put('/manga/:id', async (req, res) => {
    const manga = await Manga.findOne({ id: req.params.id });
    if (!manga) return res.status(404).send('Manga not found');

    manga.id = req.body.id;
    manga.name = req.body.name;
    manga.startedReading = req.body.startedReading;
    manga.endedReading = req.body.endedReading;
    manga.chapters = req.body.chapters;
    await manga.save();
    res.send(manga);
});

app.delete('/manga/:id', async (req, res) => {
    const manga = await Manga.findOneAndDelete({ id: req.params.id });
    if (!manga) return res.status(404).send('Manga not found');
    res.send('Manga deleted successfully');
});

const port = 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));