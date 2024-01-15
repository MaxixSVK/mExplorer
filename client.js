const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const os = require('os');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:3000';
console.clear();
console.log('Welcome to mExplorer By: Maxix');

function requestToken() {
    rl.question('Enter your token: ', (token) => {
        axios.defaults.headers.common['Authorization'] = token;

        axios.get(`${BASE_URL}/check-token`)
            .then(() => {
                console.clear();
                console.log('Welcome to mExplorer By: Maxix\nLogged in as: Maxix\n');
                console.log('0.     Show all options');
                console.log('1.     Get a manga list');
                console.log('2.     Save a manga list');
                console.log('3.     Get a specific manga information');
                console.log('10.    Add a manga');
                console.log('11.    Update a manga');
                console.log('12.    Delete a manga');
                menu();
            })
            .catch((error) => {
                if (error.response && error.response.status === 403) {
                    console.clear();
                    console.log('The token is wrong. Please try again.');
                    requestToken();
                } else {
                    console.error(error);
                    rl.close();
                }
            });
    });
}

function getChapters(callback) {
    let chapters = [];
    function askForChapter() {
        rl.question('Enter the name of the chapter (or "exit" to finish): ', (name) => {
            if (name.toLowerCase() === 'exit') {
                callback(chapters);
            } else {
                rl.question('Enter the date of the chapter (YYYY-MM-DD): ', (date) => {
                    chapters.push({ name: name, date: new Date(date) });
                    askForChapter();
                });
            }
        });
    }
    askForChapter();
}

requestToken();

function menu() {
    rl.question('Choose an option: ', (answer) => {
        switch (answer) {
            case '0':
                console.log('1.     Get a manga list');
                console.log('2.     Save a manga list');
                console.log('3.     Get a specific manga entrie');
                console.log('10.    Add a manga entrie');
                console.log('11.    Update manga entrie');
                console.log('12.    Delete manga entrie');
                console.log('998.   Clear console');
                console.log('999.   Exit');
                menu();
                break;
            case '1':
                axios.get(`${BASE_URL}/mangas`)
                    .then(response => console.log(response.data))
                    .catch(error => console.log(error))
                    .finally(() => menu());
                break;
            case '2':
                axios.get(`${BASE_URL}/mangas`)
                    .then(response => {
                        const ids = response.data;
                        const promises = ids.map(obj => {
                            return axios.get(`${BASE_URL}/manga/${obj.id}`);
                        });
                        return Promise.all(promises);
                    })
                    .then(responses => {
                        const data = responses.map(response => {
                            const item = response.data;
                            const newItem = { ...item };
                            delete newItem._id;
                            delete newItem.id;
                            delete newItem.__v;

                            newItem.startedReading = newItem.startedReading.split('T')[0];
                            if (newItem.endedReading) {
                                newItem.endedReading = newItem.endedReading.split('T')[0];
                            }

                            newItem.chapters = newItem.chapters.map(chapter => {
                                const newChapter = { ...chapter };
                                delete newChapter._id;
                                newChapter.date = newChapter.date.split('T')[0];
                                return newChapter;
                            });

                            return newItem;
                        });
                        const filePath = path.join(os.homedir(), 'Documents', 'mangaList.json');
                        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
                            if (err) {
                                console.error('Error writing file:', err);
                            } else {
                                console.log(`File written successfully\n${filePath}`);
                                menu();
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                    });
                menu();
                break;
            case '3':
                rl.question('Enter the id of the manga: ', (id) => {
                    axios.get(`${BASE_URL}/manga/${id}`)
                        .then(response => {
                            console.log(response.data);
                            menu();
                        })
                        .catch(error => {
                            if (error.response && error.response.status === 404) {
                                console.log('Manga not found');
                            } else {
                                console.log(error);
                            }
                            menu();
                        });
                });
                break;
            case '10':
                rl.question('Enter the id of the manga: ', (id) => {
                    rl.question('Enter the name of the manga: ', (name) => {
                        rl.question('Enter the started reading date (YYYY-MM-DD): ', (startedReading) => {
                            rl.question('Enter the ended reading date (YYYY-MM-DD): ', (endedReading) => {
                                getChapters((chapters) => {
                                    const newManga = {
                                        id: parseInt(id),
                                        name: name,
                                        startedReading: new Date(startedReading),
                                        endedReading: new Date(endedReading),
                                        chapters: chapters
                                    };
                                    axios.post(`${BASE_URL}/manga`, newManga)
                                        .then(response => {
                                            console.log(response.data);
                                            menu();
                                        })
                                        .catch(error => console.log(error));
                                });
                            });
                        });
                    });
                });
                menu();
                break;
            case '11':
                rl.question('Enter the id of the manga: ', (id) => {
                    rl.question('Enter the new name of the manga: ', (name) => {
                        rl.question('Enter the new started reading date (YYYY-MM-DD): ', (startedReading) => {
                            rl.question('Enter the new ended reading date (YYYY-MM-DD): ', (endedReading) => {
                                getChapters((chapters) => {
                                    const updatedManga = {
                                        id: parseInt(id),
                                        name: name,
                                        startedReading: new Date(startedReading),
                                        endedReading: new Date(endedReading),
                                        chapters: chapters
                                    };
                                    axios.put(`${BASE_URL}/manga/${updatedManga.id}`, updatedManga)
                                        .then(response => {
                                            console.log(response.data);
                                            menu();
                                        })
                                        .catch(error => console.log(error));
                                });
                            });
                        });
                    });
                });
                menu();
                break;
            case '12':
                rl.question('Enter the id of the manga you want to delete: ', (id) => {
                    axios.delete(`${BASE_URL}/manga/${id}`)
                        .then(response => {
                            console.log(response.data);
                            menu();
                        })
                        .catch(error => console.log(error));
                });
                break;
            case '998':
                console.clear();
                console.log('Welcome to mExplorer By: Maxix\nLogged in as: Maxix\n');
                menu();
                break;
            case '999':
                console.log('Bye!');
                rl.close();
                break;
            default:
                console.log('Invalid option');
                menu();
        }
    });
}