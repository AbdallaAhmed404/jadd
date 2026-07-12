const mongoose = require('mongoose');

const connect = async () => {
    try {
        const uri = 'mongodb://jaddwebdev_db_user:QiYLY8vWHRWOs8K2@ac-osqrun6-shard-00-00.ifjjxfm.mongodb.net:27017,ac-osqrun6-shard-00-01.ifjjxfm.mongodb.net:27017,ac-osqrun6-shard-00-02.ifjjxfm.mongodb.net:27017/?ssl=true&replicaSet=atlas-14h7f1-shard-0&authSource=admin&appName=Cluster0';
        
        await mongoose.connect(uri);
        console.log('✅ MongoDB Atlas connected successfully');
    } catch (err) {
        console.error('❌ Error connecting to MongoDB Atlas:', err.message);
        process.exit(1); 
    }
    
};

module.exports = connect;