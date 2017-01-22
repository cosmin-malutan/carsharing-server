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

    findUser(email) {
        return new Promise((fulfill, reject) => {
            this.usersCollection.findOne({
                email: email
            }).then(fulfill).catch((err) => {
                this.logger.log("error", "MongoDBHelper:findUser", err);
                reject(err);
            });
        }); 
    }

    createUser(user) {
        return new Promise((fulfill, reject) => {
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

            this.usersCollection.insertOne(doc).then(fulfill).catch((err) => {
                this.logger.log("error", "MongoDBHelper:createUser", err);
                reject(err);
            });
        });
    };

    assureUniqueEmail(email) {
        return new Promise((fulfill, reject) => {
            this.usersCollection.find({email: email}).toArray().then((result) => {
                fulfill(result.length === 0);
            }).catch((err) => {
                this.logger.log("error", "MongoDBHelper:assureUniqueEmail", err);
                reject(err);
            });
        });
    }

    assureUniqueUsername(username) {
        return new Promise((fulfill, reject) => {
            this.usersCollection.find({username: username}).toArray().then((result) => {
                fulfill(result.length === 0);
            }).catch((err) => {
                this.logger.log("error", "MongoDBHelper:assureUniqueUsername", err);
                reject(err);
            });
        });
    }

    updateUserLocation(username, coordinates) {
        return new Promise((fulfill, reject) => {
            this.usersCollection.findOneAndUpdate({
                email: email
            }, {
                $set: {
                    coordinates: coordinates
                }
            }).then(fulfill).catch((err) => {
                this.logger.log("error", "MongoDBHelper:updateUserLocation", err);
                reject(err);
            });
        });    
    }
}
