const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

//MONGODB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.log(err));

//SCHEMAS
const animeSchema = new mongoose.Schema({
    name: String,
    episodes: Number,
});

const mangaSchema = new mongoose.Schema({
    name: String,
    author: String,
    chapters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter'
    }],
});

const chapterSchema = new mongoose.Schema({
    name: String,
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    anime: [{
        animeInfoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Anime'
        },
        startedWatching: Date,
        endedWatching: Date,
        episodesWatched: Number,
    }],
    manga: [{
        mangaInfo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Manga'
        },
        startedReading: Date,
        endedReading: Date,
        chaptersRead: [{
            name: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Chapter'
            },
            data: {
                dateRead: Date
            }
        }]
    }]
});

const Anime = mongoose.model('Anime', animeSchema);
const Manga = mongoose.model('Manga', mangaSchema);
const Chapter = mongoose.model('Chapter', chapterSchema);
const User = mongoose.model('User', userSchema);

//EXPRESS
const app = express();
app.use(express.json());

app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== process.env.AUTH_TOKEN) {
        return res.status(403).send('Forbidden');
    }
    next();
});

app.get('/', (req, res) => {
    res.send('Welcome to Manga Explorer');
});

app.get('/check-token', (req, res) => {
    res.status(200).send('Token is valid');
});

const salt = bcrypt.genSalt(10);
// TODO HASH PASSWORD
app.post('/register', async (req, res) => {
    try {
        const user = new User({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            anime: [],
            manga: []
        });
        await user.save();
        res.send(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.get('/mangauserlist', async (req, res) => {
    try {
        let user = await User.findById(req.headers.userid)
            .populate('manga.mangaInfo', 'name author -_id')
            .populate('manga.chaptersRead.name', 'name -_id')
            .select('-manga._id -manga.chaptersRead._id')
            .exec();

        if (!user) {
            return res.status(404).send('User not found');
        }
        user = user.toObject();
        user.manga.forEach(manga => {
            if (manga.startedReading) {
                manga.startedReading = manga.startedReading.toISOString().split('T')[0];
            }
            if (manga.endedReading) {
                manga.endedReading = manga.endedReading.toISOString().split('T')[0];
            }
            manga.chaptersRead.forEach(chapter => {
                if (chapter.dateRead) {
                    chapter.dateRead = chapter.dateRead.toISOString().split('T')[0];
                }
            });
        });

        res.json(user.manga);
    } catch (err) {
        console.log(err);
        res.status(500).send('Server error');
    }
});

app.get('/mangauserlist/:mangaid', async (req, res) => {
    try {
        let mangaid = req.params.mangaid;
        let user = await User.findById(req.headers.userid);

        if (!user) {
            return res.status(404).send('User not found');
        }

        user = user.toObject();
        let manga = user.manga.find(manga => manga.mangaInfo._id == mangaid);
        if (!manga) {
            return res.status(404).send('Manga not found');
        }

        if (manga.startedReading) {
            manga.startedReading = manga.startedReading.toISOString().split('T')[0];
        }
        if (manga.endedReading) {
            manga.endedReading = manga.endedReading.toISOString().split('T')[0];
        }

        manga.chaptersRead.forEach(chapter => {
            if (chapter.dateRead) {
                chapter.dateRead = chapter.dateRead.toISOString().split('T')[0];
            }
        });
        //TODO - id's to names
        res.json(manga);
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Server error');
    }
});

app.post('/mangauserupload', async (req, res) => {
    try {
        const user = await User.findById(req.headers.userid);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const mangaEntry = {
            mangaInfo: req.body.mangaInfo,
            startedReading: req.body.startedReading,
            endedReading: req.body.endedReading,
            chaptersRead: req.body.chaptersRead
        };

        user.manga.push(mangaEntry);
        await user.save();

        res.send(user.manga[user.manga.length - 1]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/mangaupload', async (req, res) => {
    try {
        const chapterIds = await Promise.all(req.body.chapters.map(async chapterName => {
            const chapter = new Chapter({ name: chapterName });
            await chapter.save();
            return chapter._id;
        }));

        const manga = new Manga({
            name: req.body.name,
            author: req.body.author,
            chapters: chapterIds
        });

        await manga.save();
        res.send(manga);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

app.post('/animeupload', async (req, res) => {
    try {
        const anime = new Anime({
            name: req.body.name,
            episodes: req.body.episodes
        });
        await anime.save();
        res.send(anime);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

const port = 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));