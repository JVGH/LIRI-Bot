console.log('this is loaded');

exports.spotify = {
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET
};

exports.omdb = process.env.OMDB_KEY;

exports.tmdb = process.env.TMDB_KEY;

exports.bandsInTown = process.env.BANDSINTOWN_KEY;
