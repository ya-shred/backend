module.exports = {
    "socketPort": process.env.PORT || 8010,
    "dbConnectionUrl": process.env.MONGOLAB_URI || "mongodb://localhost:27017/myproject"
};
