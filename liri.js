'use strict';
// read-set env vars
require('dotenv').config();

// import modules
const fs = require('fs');
const inquirer = require('inquirer');
const axios = require('axios');
const moment = require('moment');
const Spotify = require('node-spotify-api');

// import keys from the env
const keys = require('./keys.js');
const spotify = new Spotify(keys.spotify);
const omdbKey = keys.omdb;
const tmdbKey = keys.tmdb;
const bandsInTown = keys.bandsInTown;

// declare some global vars
let command;
let keyword;
let printOutput;

const white = '\x1b[37m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const magenta = '\x1b[35m'
const reset = '\x1b[0m';

const surpriseFile = 'random.txt'
const logFile = 'log.txt';
let logText;

// Build Question list
const questionsArray = [{
        'main': 'Concert',
        'followup': 'What is the artist/band name?'
    },
    {
        'main': 'Song',
        'followup': 'What is the song name?'
    },
    {
        'main': 'Movie',
        'followup': 'What is the movie name?'
    },
    {
        'main': 'Surprise me',
        'followup': ''
    }
];
// console.log(questionsArray.map(a => a.main));
// console.log(questionsArray.map(a => a.followup));

// Ask for user preference
inquirer
    .prompt([{
        type: 'rawlist',
        name: 'command',
        message: 'What can I help you search for?',
        choices: questionsArray.map(a => a.main)
    }])
    .then(mainAnswer => {
        command = Object.values(mainAnswer).toString();

        if (questionsArray.find(o => o.main === command).followup !== '') {
            inquirer
                .prompt([{
                    type: 'input',
                    name: 'keyword',
                    message: questionsArray.find(o => o.main === command).followup,
                    validate: function validateAnswer(name) {
                        return name !== '';
                    }
                }]).then(followupAnswer => {
                    keyword = Object.values(followupAnswer).toString();
                    callAPI(command, keyword);
                });
        } else {
            surpriseUser();
        }
    });

// Driver fx
const callAPI = (command, keyword) => {
    console.info(`Calling API for ${command}`);

    switch (command) {
        case 'Concert':
        case 'concert-this':
            logSearches(command, keyword);
            callBandsInTown(command, keyword);
            break;
        case 'Song':
        case 'spotify-this-song':
            logSearches(command, keyword);
            callSpotify(command, keyword);
            break;
        case 'Movie':
        case 'movie-this':
            logSearches(command, keyword);
            callOMDB(command, keyword);
            break;
        default:
            console.warn('Please choose a valid command');
    };
};

// Bands In Town API call fx
const callBandsInTown = (command, keyword) => {
    axios.get(`https://rest.bandsintown.com/artists/${keyword}/events?`, {
            params: {
                app_id: bandsInTown
            }
        })
        .then((response) => {
            //console.log(response.data);
            if (response.data === `\n{warn=Not found}\n` || response.data.length == 0) {
                console.warn(`${yellow}No entry found for ${magenta}${keyword}`);
                console.log(reset);
            } else {
                printOutput = `\n\n***********************************`;
                printOutput += `\nHere's the upcoming Concert(s) list`
                printOutput += `\n***********************************`;
                response.data.forEach((element) => {
                    printOutput += `\n-----------------------------------`;
                    printOutput += `\nVenue Name: ${element.venue.name}`;
                    printOutput += `\nLocation: ${element.venue.city}${element.venue.region !== '' ? + `' - ' ` + element.venue.region : ''}, ${element.venue.country}`;
                    printOutput += `\nDate: ${moment(element.datetime).format('MM/DD/YYYY')}`;
                    printOutput += `\n-----------------------------------`;
                });
                console.log(printOutput);
            }
        })
        .catch((err) => {
            console.log('erroring out');
            showError('BandsInTown', err);
        });
};

// Spotify API call fx
const callSpotify = (command, keyword) => {
    spotify
        .search({
            type: 'track',
            query: keyword,
            limit: 10
        })
        .then((response) => {
            if (response.tracks.total === 0) {
                console.warn(`${yellow}No entry found for ${magenta}${keyword}`);
                console.log(reset);
            } else {
                //console.log(response.tracks.items);
                printOutput = `\n\n***********************************`;
                printOutput += `\nHere's the Song(s) list`
                printOutput += `\n***********************************`;
                response.tracks.items.forEach((element) => {
                    printOutput += `\n-----------------------------------`;
                    printOutput += `\nArtist(s): ${element.artists.map(a => a.name).join(', ')}`;
                    printOutput += `\nSong: ${element.name}`;
                    printOutput += `\nLink: ${element.preview_url}`;
                    printOutput += `\nAlbum: ${element.album.name}`;
                    printOutput += `\n-----------------------------------`;
                });
                console.log(printOutput);
            };
        })
        .catch((err) => {
            showError('Spotify', err);
        });
};

// TMDB API call fx
// const callTMDB = (command, keyword) => {
//     axios.get(`https://api.themoviedb.org/3/search/movie?`, {
//             params: {
//                 api_key: tmdbKey,
//                 query: keyword
//             }
//         })
//         .then( (response) => {
//             console.log(response.data.results);
//         })
//         .catch( (err) => {
//            showError('TMDB', err);
//         });
// };

// OMDB API call fx
const callOMDB = (command, keyword) => {
    axios.get(`https://www.omdbapi.com/?`, {
            params: {
                apikey: omdbKey,
                t: keyword
            }
        })
        .then((response) => {
            //console.log(response.data);
            if (response.data.Response === 'False') {
                console.warn(`${yellow}No entry found for ${magenta}${keyword}`);
                console.log(reset);
            } else {
                printOutput = `\n***********************************`;
                printOutput += `\nHere's the Movie info`
                printOutput += `\n***********************************`;
                printOutput += `\n-----------------------------------`;
                printOutput += `\nTitle: ${response.data.Title}`;
                printOutput += `\nYear: ${response.data.Year}`;
                printOutput += `\nIMDB Rating: ${response.data.Ratings.find( a => a.Source === 'Internet Movie Database') ? response.data.Ratings.find( a => a.Source === 'Internet Movie Database').Value : 'N/A'}`
                printOutput += `\nRotten Tomatoes Rating: ${response.data.Ratings.find( a => a.Source === 'Rotten Tomatoes') ? response.data.Ratings.find( a => a.Source === 'Rotten Tomatoes').Value : 'N/A'}`
                printOutput += `\nCountry: ${response.data.Country}`;
                printOutput += `\nLanguage: ${response.data.Language}`;
                printOutput += `\nPlot: ${response.data.Plot}`;
                printOutput += `\nActors: ${response.data.Actors}`;
                printOutput += `\n-----------------------------------`;
                console.log(printOutput);
            };
        })
        .catch((err) => {
            showError('OMDB', err);
        });
};

// Surprise user fx
const surpriseUser = () => {
    fs.readFile(surpriseFile, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
        } else {
            const randomArray = data.split('\n');
            const randomCMDArray = [];
            const randomKWArray = [];
            randomArray.forEach((element) => {
                randomCMDArray.push(element.split(',')[0])
                randomKWArray.push(element.split(',')[1])
            });
            const possibleCMDArray = ['concert-this', 'spotify-this-song', 'movie-this'];
            const areAllValidCMDs = randomCMDArray.every((val) => possibleCMDArray.includes(val))
            if (areAllValidCMDs) {
                randomArray.forEach((element, index) => {
                    callAPI(randomCMDArray[index], randomKWArray[index].replace(/["]/g, ''))
                });
            } else {
                console.error(`${surpriseFile} has invalid command(s)!`)
            };
        };
    });
};

// Logging fx
const logSearches = (command, keyword) => {
    // Create log file if it does not exist and log cmds
    try {
        const stats = fs.statSync(logFile);
    } catch (err) {
        // Create log file
        console.error(`${logFile} does not exist`);
        fs.writeFile(logFile, `${moment().format('MM/DD/YYYY h:mm:ss a')} : Captain's Log`, 'utf8', (err) => {
            if (err) {
                showError(err);
            }
            console.info(`${logFile} is created`);
        });
    };

    // Append search queries
    logText = `\r\n${moment().format('MM/DD/YYYY h:mm:ss a')} : Search Option = ${command} | Search Keyword = ${keyword}`;
    fs.appendFile(logFile, logText, 'utf8', (err) => {
        if (err) {
            console.error(err);
        } else {
            console.info(`Your query is logged`);
        };
    });
};

// Env based error msg fx
const showError = (api, err) => {
    const customError = `\nSorry! Something went wrong. (Please verify ${yellow}${api} API ${red}keys)\n`;
    const ERROR = `${'='.repeat(customError.length)}${customError}${'='.repeat(customError.length)}`;
    if (!!process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
        console.error(`API Error: ${err}`);
    } else {
        console.log(red, `\n${ERROR}`);
        console.error(`Error: ${err}`);
        console.log(reset);
    };
};
