import co from 'co';
import Promise from 'promise';
import MongoClient from 'mongodb';

import config from './config';

export default class MongoDBHelper {
    constructor (logger) {
        this.logger = logger;
    }
    init() {
        var that = this;

        return new Promise(function (fulfill, reject) {
            co(function*() {
                // Use connect method to connect to the server
                that.mongodb = yield MongoClient.connect(`mongodb://${config.mongoDB.address}:${config.mongoDB.port}/${config.mongoDB.database}`);

                that.usersCollection = yield that.mongodb.createCollection("users");
                yield that.usersCollection.createIndex({ email : -1 }, { unique:true });
                yield that.usersCollection.createIndex({ username : -1 });
                yield that.usersCollection.createIndex({ "position" : "2dsphere" });

                fulfill(that.mongodb);
            }).catch(function(err) {
                that.logger.log("error", "MongoDBHelper.init", err);
                reject(err);
            });
        });
    }
}

MongoDBHelper.prototype.findUser = function (email) {
    var that = this;

    return new Promise(function (fulfill, reject) {
        that.usersCollection.findOne({
            email: email
        }).then(fulfill).catch((err) => {
            that.logger.log("error", "MongoDBHelper:findUser", err);
            reject(err);
        });
    }); 
};

MongoDBHelper.prototype.createUser = function (user) {
    var that = this;

    return new Promise(function (fulfill, reject) {
        var doc = {
            "email": user.email,
            "username": user.username,
            "password": user.password
        };

        if (user.coordinates) {
            doc["position"] = {
                type: "Point",
                coordinates: user.coordinates
            };
        }

        that.usersCollection.insertOne(doc).then(fulfill).catch((err) => {
            that.logger.log("error", "MongoDBHelper:createUser", err);
            reject(err);
        });
    });
};

MongoDBHelper.prototype.updateUserLocation = function (username, coordinates) {
    var that = this;

    return new Promise(function (fulfill, reject) {
        that.usersCollection.findOneAndUpdate({
            email: email
        }, {
            $set: {
                coordinates: coordinates
            }
        }).then(fulfill).catch((err) => {
            that.logger.log("error", "MongoDBHelper:updateUserLocation", err);
            reject(err);
        });
    });    
}

MongoDBHelper.prototype.assureUniqueUsername = function (username) {
    var that = this;

    return new Promise(function (fulfill, reject) {
        that.usersCollection.find({username: username}).toArray().then(function(result) {
            fulfill(result.length === 0);
        }).catch((err) => {
            that.logger.log("error", "MongoDBHelper:assureUniqueUsername", err);
            reject(err);
        });
    });
}

MongoDBHelper.prototype.assureUniqueEmail = function (email) {
    var that = this;

    return new Promise(function (fulfill, reject) {
        that.usersCollection.find({email: email}).toArray().then(function(result) {
            fulfill(result.length === 0);
        }).catch((err) => {
            that.logger.log("error", "MongoDBHelper:assureUniqueEmail", err);
            reject(err);
        });
    });
}