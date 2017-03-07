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

                that.ordersCollection = yield that.mongodb.createCollection("orders");
                yield that.ordersCollection.createIndex({ uuid : -1 }, { unique:true });
                yield that.ordersCollection.createIndex({ locked : -1 });
                yield that.ordersCollection.createIndex({ rider : -1 });
                yield that.ordersCollection.createIndex({ driver : -1 });
                yield that.ordersCollection.createIndex({ "start_location" : "2dsphere" });
                yield that.ordersCollection.createIndex({ "end_location" : "2dsphere" });

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
    
    placeOrder(trip, uuid, user) {
        return new Promise((fulfill, reject) => {
            try {
            var start_location = { type: "Point", coordinates: [trip.routes[0].legs[0].start_location.lng,
                                                                trip.routes[0].legs[0].start_location.lat]};
            var end_location = { type: "Point", coordinates: [trip.routes[0].legs[0].end_location.lng,
                                                              trip.routes[0].legs[0].end_location.lat]};
            this.ordersCollection.insertOne({
                uuid: uuid,
                start_location: start_location,
                end_location: end_location,
                trip: trip,
                rider: user
            }).then(fulfill).catch((err) => {
                this.logger.log("error", "MongoDBHelper:placeOrder", err);
                reject(err);
            });
            } catch (err) {
                this.logger.log('error', err)
            }
        });
    }

    assignOrder(driver) {
        return new Promise((fulfill, reject) => {
            this.ordersCollection.findOneAndUpdate({
                driver: null,
                start_location : {
                    $near : {
                        $geometry : {
                            type : "Point" ,
                            coordinates : [ driver.coords.longitude, driver.coords.latitude ]
                        },
                        $maxDistance : 10000
                    }
                }
            }, {
                $set: {
                    driver: driver.driver
                }
            }).then(fulfill).catch((err) => {
                this.logger.log("error", "MongoDBHelper:assignOrder", err);
                reject(err);
            });
        }); 
    }
}
