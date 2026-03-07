const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/resilinet')
  .then(async () => {
      console.log('Connected to Database');
      try {
          await mongoose.connection.db.collection('sos').dropIndexes();
          console.log('Dropped SOS legacy indexes');
      } catch(e) { console.log('sos collection error or no indexes to drop'); }

      try {
          await mongoose.connection.db.collection('sosmessages').dropIndexes();
          console.log('Dropped SOSMessage legacy indexes');
      } catch(e) { console.log('sosmessages collection error or no indexes to drop'); }

      process.exit(0);
  });
